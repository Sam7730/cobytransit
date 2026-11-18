// Portable HTTP server. Run behind HTTPS in production; no runtime npm packages.
import http from "node:http";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { FileStore } from "./file-store.js";
import { loadAssets } from "../scripts/assets.mjs";
import handler, { SECURITY_HEADERS } from "./handler.js";
const root = fileURLToPath(new URL("../", import.meta.url));
export function createNodeServer(env, publicOrigin) {
  const server = http.createServer(async (req, res) => {
    try {
      const origin = publicOrigin || `http://${req.headers.host}`;
      const url = new URL(req.url, origin);
      if (url.origin !== new URL(origin).origin) {
        res.writeHead(400, SECURITY_HEADERS).end("Invalid request target");
        return;
      }
      const init = { method: req.method, headers: req.headers };
      if (!["GET", "HEAD"].includes(req.method)) {
        init.body = Readable.toWeb(req);
        init.duplex = "half";
      }
      if (env.RELOAD_ASSETS)
        env.LOCAL_ASSET_CONTENTS = await env.RELOAD_ASSETS();
      const result = await handler.fetch(new Request(url, init), env);
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(
        req.method === "HEAD"
          ? undefined
          : Buffer.from(await result.arrayBuffer()),
      );
    } catch {
      res
        .writeHead(500, { ...SECURITY_HEADERS, "Content-Type": "text/plain" })
        .end("Service unavailable");
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return server;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const env = {
    LOCAL_ASSET_CONTENTS: await loadAssets(root),
    BUCKET: new FileStore(
      process.env.DATA_DIR || path.join(root, ".local-data"),
    ),
    RELOAD_ASSETS: process.argv.includes("--dev")
      ? () => loadAssets(root)
      : null,
    GPS_DEVICES_JSON: process.env.GPS_DEVICES_JSON,
    DISPATCH_TOKEN: process.env.DISPATCH_TOKEN,
    ADMIN_TOKEN:process.env.ADMIN_TOKEN,
    SCPT_VEHICLES_URL:process.env.SCPT_VEHICLES_URL,SCPT_VEHICLES_TOKEN:process.env.SCPT_VEHICLES_TOKEN,SCPT_ROUTE_MAP:process.env.SCPT_ROUTE_MAP,TOMTOM_API_KEY:process.env.TOMTOM_API_KEY,
    // Snapshot writes rely on the Sites owner-only boundary and stay disabled on Node.
  };
  const server = createNodeServer(env, process.env.PUBLIC_ORIGIN);
  server.listen(
    Number(process.env.PORT || 4173),
    process.env.HOST || "0.0.0.0",
    () => console.log(`CobyTransit ready on port ${process.env.PORT || 4173}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => server.close(() => process.exit(0)));
}
