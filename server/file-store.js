// Local/single-server equivalent of the R2 methods used by the application.
// Keep one Node process per DATA_DIR. For multiple replicas use the Worker + R2 deployment.
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
export class FileStore {
  constructor(directory) {
    this.directory = path.resolve(directory);
    this.queue = Promise.resolve();
  }
  filename(key) {
    return path.join(
      this.directory,
      createHash("sha256").update(key).digest("hex") + ".json",
    );
  }
  async get(key) {
    try {
      const text = await readFile(this.filename(key), "utf8");
      return {
        etag: createHash("sha256").update(text).digest("hex"),
        json: async () => JSON.parse(text),
      };
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }
  async put(key, value, options = {}) {
    const write = async () => {
      const prior = await this.get(key),
        condition = options.onlyIf;
      if (condition?.etagMatches && prior?.etag !== condition.etagMatches)
        return null;
      if (condition?.etagDoesNotMatch === "*" && prior) return null;
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const target = this.filename(key),
        temp = target + "." + randomUUID() + ".tmp";
      await writeFile(temp, value, { mode: 0o600 });
      await rename(temp, target);
      return { etag: createHash("sha256").update(value).digest("hex") };
    };
    const result = this.queue.then(write);
    this.queue = result.catch(() => {});
    return result;
  }
}
