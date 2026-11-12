import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

// Verify the generated Worker includes the map runtime and binary vendor assets,
// and that its live API imports survive source embedding.
for (const [asset, type] of [
  ['/assets/vendor/leaflet.js', 'text/javascript'],
  ['/assets/vendor/leaflet.css', 'text/css'],
  ['/assets/vendor/images/marker-icon.png', 'image/png'],
  ['/assets/live-data.js', 'text/javascript'],
]) {
  const response = await workerModule.default.fetch(new Request('https://app.example' + asset));
  assert.equal(response.status, 200, asset);
  assert.ok(response.headers.get('Content-Type').startsWith(type), asset);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.ok(bytes.length > 0, asset);
  if (type === 'image/png') assert.deepEqual([...bytes.slice(0, 4)], [137, 80, 78, 71]);
}
for (const path of ['/api/vehicles', '/api/traffic']) {
  const response = await workerModule.default.fetch(new Request('https://app.example' + path));
  assert.equal((await response.json()).status, 'unconfigured', path);
}

console.log("Artifact is valid ESM and exports default.fetch");
