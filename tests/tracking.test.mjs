import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import handler from "../server/handler.js";
import { FileStore } from "../server/file-store.js";
import { validatePosition, publicPosition } from "../server/tracking.js";
const deviceA = "test-only-device-a-".repeat(3),
  deviceB = "test-only-device-b-".repeat(3),
  dispatcher = "test-only-dispatcher-".repeat(3);
const sample = (id = "bus-01", age = 0) => ({
  vehicleId: id,
  latitude: 42.679,
  longitude: -74.49,
  accuracy: 12,
  measuredAt: new Date(Date.now() - age).toISOString(),
});
async function setup(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "coby-gps-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const env = {
    LOCAL_ASSET_CONTENTS: {},
    BUCKET: new FileStore(dir),
    GPS_DEVICES_JSON: JSON.stringify({ "bus-01": deviceA, "bus-02": deviceB }),
    DISPATCH_TOKEN: dispatcher,
  };
  const call = (url, body, token, headers = {}) =>
    handler.fetch(
      new Request("https://transit.example" + url, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
      env,
    );
  return { env, call, dir };
}
test("GPS is disabled without configuration; admin and device APIs reject missing/wrong credentials", async (t) => {
  const response = await handler.fetch(
    new Request("https://transit.example/api/vehicles"),
    { LOCAL_ASSET_CONTENTS: {} },
  );
  assert.deepEqual((await response.json()).vehicles, []);
  const { call } = await setup(t);
  assert.equal((await call("/api/operations")).status, 401);
  assert.equal((await call("/api/gps", sample(), deviceB)).status, 401);
  assert.equal((await call("/api/gps", sample(), dispatcher)).status, 401);
  assert.equal(
    (
      await call(
        "/api/assignments",
        { routeId: "2", vehicleId: "bus-01", expectedRevision: "initial" },
        deviceA,
      )
    ).status,
    401,
  );
});
test("GPS rejects future/old/out-of-region/inaccurate coordinates and never accepts timestamp coercion", () => {
  for (const change of [
    { latitude: 0 },
    { longitude: 0 },
    { latitude: "42.6" },
    { accuracy: 501 },
    { accuracy: -1 },
    { vehicleId: "../private" },
    { measuredAt: new Date(Date.now() + 120000).toISOString() },
    { measuredAt: new Date(Date.now() - 901000).toISOString() },
    { measuredAt: 5 },
  ])
    assert.throws(() => validatePosition({ ...sample(), ...change }));
  assert.equal(validatePosition(sample()).vehicleId, "bus-01");
});
test("assigned positions publish safely, persist across store instances and replacement removes old bus", async (t) => {
  const { call, dir, env } = await setup(t);
  assert.equal((await call("/api/gps", sample(), deviceA)).status, 202);
  assert.equal((await (await call("/api/vehicles")).json()).vehicles.length, 0);
  assert.equal(
    (
      await call(
        "/api/assignments",
        { routeId: "2", vehicleId: "bus-01", expectedRevision: "initial" },
        dispatcher,
      )
    ).status,
    200,
  );
  const result = await (await call("/api/vehicles")).json();
  assert.equal(result.vehicles[0].state, "live");
  assert.equal(result.vehicles[0].routeId, "2");
  assert.ok(!JSON.stringify(result).includes(deviceA));
  env.BUCKET = new FileStore(dir);
  const operations = await (
    await call("/api/operations", undefined, dispatcher)
  ).json();
  assert.equal(operations.routes["2"], "bus-01");
  assert.equal((await call("/api/gps", sample("bus-02"), deviceB)).status, 202);
  assert.equal(
    (
      await call(
        "/api/assignments",
        {
          routeId: "2",
          vehicleId: "bus-02",
          expectedRevision: operations.revision,
        },
        dispatcher,
      )
    ).status,
    200,
  );
  const changed = await (await call("/api/vehicles")).json();
  assert.deepEqual(
    changed.vehicles.map((v) => v.vehicleId),
    ["bus-02"],
  );
  const current = await (
    await call("/api/operations", undefined, dispatcher)
  ).json();
  assert.equal(
    (
      await call(
        "/api/assignments",
        { routeId: "2", vehicleId: null, expectedRevision: current.revision },
        dispatcher,
      )
    ).status,
    200,
  );
  assert.equal((await (await call("/api/vehicles")).json()).vehicles.length, 0);
});
test("freshness uses measurement time, not the time the server received a report", async (t) => {
  const now = Date.now();
  assert.equal(
    publicPosition(
      { ...sample(), measuredAt: new Date(now - 90000).toISOString() },
      now,
    ).state,
    "live",
  );
  assert.equal(
    publicPosition(
      { ...sample(), measuredAt: new Date(now - 91000).toISOString() },
      now,
    ).state,
    "stale",
  );
  assert.equal(
    publicPosition(
      { ...sample(), measuredAt: new Date(now - 901000).toISOString() },
      now,
    ),
    null,
  );
  const { call } = await setup(t);
  assert.equal(
    (await call("/api/gps", sample("bus-01", 120000), deviceA)).status,
    202,
  );
  await call(
    "/api/assignments",
    { routeId: "2", vehicleId: "bus-01", expectedRevision: "initial" },
    dispatcher,
  );
  assert.equal(
    (await (await call("/api/vehicles")).json()).vehicles[0].state,
    "stale",
  );
});
test("replays, excessive writes, stale dispatcher revisions and racing writes are rejected", async (t) => {
  const { call } = await setup(t);
  const position = sample();
  const writes = await Promise.all([
    call("/api/gps", position, deviceA),
    call("/api/gps", position, deviceA),
  ]);
  assert.deepEqual(writes.map((r) => r.status).sort(), [202, 409]);
  assert.equal((await call("/api/gps", position, deviceA)).status, 409);
  assert.equal(
    (
      await call(
        "/api/gps",
        {
          ...position,
          measuredAt: new Date(
            Date.parse(position.measuredAt) + 1000,
          ).toISOString(),
        },
        deviceA,
      )
    ).status,
    429,
  );
  const assignments = await Promise.all(
    ["2", "3"].map((routeId) =>
      call(
        "/api/assignments",
        { routeId, vehicleId: "bus-01", expectedRevision: "initial" },
        dispatcher,
      ),
    ),
  );
  assert.deepEqual(assignments.map((r) => r.status).sort(), [200, 409]);
  const state = await (
    await call("/api/operations", undefined, dispatcher)
  ).json();
  assert.equal(Object.keys(state.routes).length, 1);
  assert.equal(
    (
      await call(
        "/api/assignments",
        {
          routeId: "22",
          vehicleId: "bus-01",
          expectedRevision: state.revision,
        },
        dispatcher,
      )
    ).status,
    200,
  );
  assert.deepEqual(
    (await (await call("/api/operations", undefined, dispatcher)).json())
      .routes,
    { 22: "bus-01" },
  );
});
test("cross-origin writes, oversized JSON, unsupported methods and unknown routes fail closed", async (t) => {
  const { call, env } = await setup(t);
  assert.equal(
    (
      await call("/api/gps", sample(), deviceA, {
        Origin: "https://attacker.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (await call("/api/gps", { ...sample(), extra: "x".repeat(5000) }, deviceA))
      .status,
    400,
  );
  assert.equal((await call("/api/gps")).status, 405);
  assert.equal(
    (
      await call(
        "/api/assignments",
        {
          routeId: "<script>",
          vehicleId: "bus-01",
          expectedRevision: "initial",
        },
        dispatcher,
      )
    ).status,
    422,
  );
  assert.equal((await call("/api/gps", null, deviceA)).status, 401);
  const head = await handler.fetch(
    new Request("https://transit.example/api/vehicles", { method: "HEAD" }),
    env,
  );
  assert.equal(await head.text(), "");
  assert.equal(head.headers.get("Cache-Control"), "no-store");
});
test("removed device credentials immediately remove its position from passenger responses", async (t) => {
  const { call, env } = await setup(t);
  await call("/api/gps", sample(), deviceA);
  await call(
    "/api/assignments",
    { routeId: "2", vehicleId: "bus-01", expectedRevision: "initial" },
    dispatcher,
  );
  env.GPS_DEVICES_JSON = JSON.stringify({ "bus-02": deviceB });
  assert.equal((await (await call("/api/vehicles")).json()).vehicles.length, 0);
});
test("only the explicit GPS device page receives geolocation permission", async () => {
  const env = {
    LOCAL_ASSET_CONTENTS: {
      "/driver.html": { body: "<title>Device</title>", type: "text/html" },
      "/operations.html": {
        body: "<title>Operations</title>",
        type: "text/html",
      },
    },
  };
  for (const page of ["driver", "operations"]) {
    const r = await handler.fetch(
      new Request(`https://transit.example/${page}.html`),
      env,
    );
    assert.match(
      r.headers.get("Permissions-Policy"),
      page === "driver" ? /geolocation=\(self\)/ : /geolocation=\(\)/,
    );
  }
});
