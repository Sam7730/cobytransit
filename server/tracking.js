// GPS ingestion and dispatch. Credentials never enter public responses.
export const TRACKING_ROUTES = [
  "1",
  "2",
  "2A",
  "3",
  "5",
  "20",
  "20W",
  "22",
  "23",
];
const FLEET_KEY = "cobytransit/v2/assignments.json";
const positionKey = (id) => `cobytransit/v2/positions/${id}.json`;
const validVehicleId = (id) =>
  typeof id === "string" &&
  /^[A-Za-z0-9_-]{1,40}$/.test(id) &&
  !["__proto__", "constructor", "prototype"].includes(id);

function devices(env) {
  let value;try{value=JSON.parse(env.GPS_DEVICES_JSON || "{}");}catch{throw Error("Invalid device configuration");}
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length > 100
  )
    throw Error("Invalid device configuration");
  for (const [id, token] of Object.entries(value)) {
    if (
      !validVehicleId(id) ||
      typeof token !== "string" ||
      token.length < 32 ||
      token.length > 256
    )
      throw Error("Invalid device configuration");
  }
  if (new Set(Object.values(value)).size !== Object.keys(value).length)
    throw Error("Device credentials must be unique");
  return value;
}
async function tokenMatches(request, expected) {
  if (typeof expected !== "string" || expected.length < 32) return false;
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ") || header.length > 263) return false;
  const digest = (value) =>
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const [a, b] = await Promise.all([digest(header.slice(7)), digest(expected)]);
  const av = new Uint8Array(a),
    bv = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i];
  return diff === 0;
}
async function readStored(bucket, key, fallback) {
  const object = await bucket.get(key);
  return { value: object ? await object.json() : fallback, etag: object?.etag };
}
async function writeStored(bucket, key, value, etag) {
  // Conditional writes prevent concurrent samples or dispatch changes overwriting newer data.
  return bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
    onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: "*" },
  });
}
export function publicPosition(position, now = Date.now()) {
  if (!position) return null;
  const ageSeconds = Math.max(
    0,
    Math.floor((now - Date.parse(position.measuredAt)) / 1000),
  );
  if (!Number.isFinite(ageSeconds) || ageSeconds > 900) return null;
  return {
    vehicleId: position.vehicleId,
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy,
    measuredAt: position.measuredAt,
    ageSeconds,
    state: ageSeconds > 90 ? "stale" : "live",
  };
}
export function validatePosition(input, now = Date.now()) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw Error("Expected a GPS object");
  const { vehicleId, latitude, longitude, accuracy, measuredAt } = input;
  // Restrict this deployment to the county and surrounding service region.
  if (
    !validVehicleId(vehicleId) ||
    !Number.isFinite(latitude) ||
    latitude <= 41 ||
    latitude >= 44 ||
    !Number.isFinite(longitude) ||
    longitude <= -76 ||
    longitude >= -72 ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    accuracy > 500 ||
    typeof measuredAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(measuredAt) ||
    !Number.isFinite(Date.parse(measuredAt)) ||
    now - Date.parse(measuredAt) > 900000 ||
    Date.parse(measuredAt) - now > 30000
  ) {
    throw Error(
      "Invalid coordinates, accuracy, vehicle ID, or measurement time",
    );
  }
  return {
    vehicleId,
    latitude,
    longitude,
    accuracy,
    measuredAt: new Date(measuredAt).toISOString(),
    receivedAt: new Date(now).toISOString(),
  };
}

export async function trackingApi(request, env, json, boundedBody) {
  const url = new URL(request.url),
    path = url.pathname;
  if (
    ![
      "/api/vehicles",
      "/api/gps",
      "/api/operations",
      "/api/assignments",
    ].includes(path)
  )
    return null;
  const method =
    path === "/api/gps" || path === "/api/assignments" ? "POST" : "GET";
  if (
    request.method !== method &&
    !(method === "GET" && request.method === "HEAD")
  )
    return json({ error: "Method not allowed" }, 405);
  const configured = devices(env),
    ids = Object.keys(configured);
  const enabled = !!env.BUCKET && ids.length > 0;
  if (!enabled)
    return json(
      path === "/api/vehicles"
        ? {
            configured: false,connected:false,status:'unconfigured',message:'No authorized GPS devices are connected.',
            vehicles: [],
            reason: "No authorized GPS devices are connected.",
          }
        : { error: "GPS storage and device credentials must be configured" },
      path === "/api/vehicles" ? 200 : 503,
    );
  if (path === "/api/operations" || path === "/api/assignments") {
    if (!(await tokenMatches(request, env.DISPATCH_TOKEN)))
      return json({ error: "Dispatcher authorization required" }, 401);
  }
  if (method === "POST") {
    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin)
      return json({ error: "Origin rejected" }, 403);
    if (
      (request.headers.get("Content-Type") || "").split(";")[0] !==
      "application/json"
    )
      return json({ error: "Expected application/json" }, 415);
    if (Number(request.headers.get("Content-Length") || 0) > 4096)
      return json({ error: "Payload too large" }, 413);
  }
  let body;
  if (method === "POST") {
    try {
      body = JSON.parse(
        new TextDecoder().decode(await boundedBody(request.body, 4096)),
      );
    } catch {
      return json({ error: "Invalid or oversized JSON" }, 400);
    }
  }
  if (path === "/api/gps") {
    if (
      !validVehicleId(body?.vehicleId) ||
      !Object.hasOwn(configured, body.vehicleId) ||
      !(await tokenMatches(request, configured[body.vehicleId]))
    )
      return json({ error: "Device authorization required" }, 401);
    let position;
    try {
      position = validatePosition(body);
    } catch (error) {
      return json({ error: error.message }, 422);
    }
    const prior = await readStored(
      env.BUCKET,
      positionKey(position.vehicleId),
      null,
    );
    if (
      prior.value &&
      Date.parse(position.measuredAt) <= Date.parse(prior.value.measuredAt)
    )
      return json({ error: "Duplicate or older measurement" }, 409);
    if (prior.value && Date.now() - Date.parse(prior.value.receivedAt) < 5000)
      return json({ error: "Send at most one sample every five seconds" }, 429);
    if (
      !(await writeStored(
        env.BUCKET,
        positionKey(position.vehicleId),
        position,
        prior.etag,
      ))
    )
      return json(
        { error: "Newer sample already accepted; send the next measurement" },
        409,
      );
    return json({ ok: true, measuredAt: position.measuredAt }, 202);
  }
  const fleet = await readStored(env.BUCKET, FLEET_KEY, {
    revision: "initial",
    routes: {},
  });
  if (path === "/api/assignments") {
    if (
      !body ||
      !TRACKING_ROUTES.includes(body.routeId) ||
      (body.vehicleId !== null &&
        (!validVehicleId(body.vehicleId) ||
          !Object.hasOwn(configured, body.vehicleId)))
    )
      return json({ error: "Unknown route or vehicle" }, 422);
    if (body.expectedRevision !== fleet.value.revision)
      return json(
        { error: "Assignments changed. Refresh before saving." },
        409,
      );
    const routes = { ...fleet.value.routes };
    // Replacing a bus is one atomic fleet update. A bus cannot serve two routes at once.
    if (body.vehicleId)
      for (const [route, id] of Object.entries(routes))
        if (id === body.vehicleId) delete routes[route];
    if (body.vehicleId === null) delete routes[body.routeId];
    else routes[body.routeId] = body.vehicleId;
    const next = {
      revision: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
      routes,
    };
    if (!(await writeStored(env.BUCKET, FLEET_KEY, next, fleet.etag)))
      return json(
        { error: "Assignments changed. Refresh before saving." },
        409,
      );
    return json({ ok: true, revision: next.revision });
  }
  const readings = await Promise.all(
    ids.map(async (id) => [
      id,
      (await readStored(env.BUCKET, positionKey(id), null)).value,
    ]),
  );
  const byId = Object.fromEntries(readings);
  if (path === "/api/operations")
    return json({
      revision: fleet.value.revision,
      routes: fleet.value.routes,
      routeIds: TRACKING_ROUTES,
      devices: ids.map((vehicleId) => ({
        vehicleId,
        position: publicPosition(byId[vehicleId]),
      })),
    });
  const vehicles = Object.entries(fleet.value.routes).flatMap(
    ([routeId, id]) => {
      const position = Object.hasOwn(configured, id)
        ? publicPosition(byId[id])
        : null;
      return position ? [{ ...position, routeId, id:position.vehicleId, label:position.vehicleId, lat:position.latitude, lon:position.longitude, timestamp:Date.parse(position.measuredAt)/1000 }] : [];
    },
  );
  return json({
    configured: true,
    connected: true, status:'live', message:vehicles.length?'Authorized device reports; only readings under 90 seconds appear on the passenger map.':'No assigned vehicles have recent GPS reports.',
    generatedAt: new Date().toISOString(),
    staleAfterSeconds: 90,
    vehicles,
    reason: vehicles.length
      ? null
      : "No assigned vehicles have recent GPS reports.",
  });
}
