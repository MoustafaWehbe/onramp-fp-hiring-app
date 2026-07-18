import { promises as fs } from "fs";
import path from "path";
import type { StorageProvider, UploadResult } from "./types";

export const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
const PUBLIC_PREFIX = "/uploads";

/**
 * Writes to a local uploads/ dir, served statically by app.ts. Callers build
 * `key` themselves (see resumeStorageKey in the resume upload route) rather
 * than deriving it from a client-supplied filename, so there's nothing here
 * to sanitize from user input — this defensive resolve() check just makes
 * sure that invariant holds instead of trusting it silently.
 */
export class LocalDiskStorageProvider implements StorageProvider {
  async upload(key: string, body: Buffer, _contentType: string): Promise<UploadResult> {
    const destination = path.resolve(LOCAL_UPLOADS_DIR, key);

    if (!destination.startsWith(LOCAL_UPLOADS_DIR + path.sep)) {
      throw new Error(`Refusing to write outside the uploads directory: ${key}`);
    }

    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, body);

    return { key, url: `${PUBLIC_PREFIX}/${key.split(path.sep).join("/")}` };
  }
}
