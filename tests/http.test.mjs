import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createNodeServer } from "../server/node.js";
import { FileStore } from "../server/file-store.js";
import { loadAssets } from "../scripts/assets.mjs";

test("real HTTP server forwards POST bodies and persists GPS; protected operations reject visitors", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "coby-http-"));
  const token = "test-only-http-device-".repeat(3);
  const server = createNodeServer({
    LOCAL_ASSET_CONTENTS: await loadAssets(),
    BUCKET: new FileStore(directory),
    GPS_DEVICES_JSON: JSON.stringify({ testbus: token }),
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(origin + "/")).status, 200);
  assert.equal((await fetch(origin + "/api/operations")).status, 401);
  const response = await fetch(origin + "/api/gps", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Origin: origin,
    },
    body: JSON.stringify({
      vehicleId: "testbus",
      latitude: 42.68,
      longitude: -74.49,
      accuracy: 15,
      measuredAt: new Date().toISOString(),
    }),
  });
  assert.equal(response.status, 202, await response.text());
  assert.equal(
    (
      await new FileStore(directory).get(
        "cobytransit/v2/positions/testbus.json",
      )
    ).etag.length,
    64,
  );
  assert.equal(
    (
      await fetch(origin + "/api/gps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    401,
  );
});
