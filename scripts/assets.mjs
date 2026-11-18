// One asset loader for Node and the Worker build. Documentation is not duplicated in web/.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
const types = {
  ".png": "image/png",
  ".zip": "application/zip",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
export async function loadAssets(root = process.cwd()) {
  const assets = {};
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && types[path.extname(file)])
        assets[
          "/" +
            path
              .relative(path.join(root, "web"), file)
              .split(path.sep)
              .join("/")
        ] = {
          type: types[path.extname(file)],
          body: (await readFile(file)).toString(/\.(png|zip)$/.test(file)?"base64":"utf8"),
          base64:/\.(png|zip)$/.test(file),
        };
    }
  }
  await walk(path.join(root, "web"));
  for (const file of [
    "SECURITY.md",
    "LICENSE",
    "DATA_SOURCES.md",
    "docs/LIVE_TRACKING.md",
    "STAFF_SETUP.md",
  ]) {
    assets["/" + file] = {
      type: "text/plain; charset=utf-8",
      body: await readFile(path.join(root, file), "utf8"),
    };
  }
  return assets;
}
