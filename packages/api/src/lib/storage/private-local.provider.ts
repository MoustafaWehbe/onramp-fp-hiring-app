import { promises as fs } from "fs";
import path from "path";
import type {
  PrivateStorageProvider,
  UploadResult,
} from "./types";

export const PRIVATE_UPLOADS_DIR = path.resolve(
  process.cwd(),
  "private-uploads",
);

function resolvePrivateKey(key: string): string {
  const destination = path.resolve(PRIVATE_UPLOADS_DIR, key);

  if (!destination.startsWith(PRIVATE_UPLOADS_DIR + path.sep)) {
    throw new Error(`Refusing to access outside private storage: ${key}`);
  }

  return destination;
}

/**
 * Private local-disk storage for application CVs. Unlike `uploads/`, this
 * directory is never mounted with express.static; files are only read through
 * an authorized API controller.
 */
export class PrivateLocalDiskStorageProvider
  implements PrivateStorageProvider
{
  async upload(
    key: string,
    body: Buffer,
    _contentType: string,
  ): Promise<UploadResult> {
    const destination = resolvePrivateKey(key);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, body);

    return { key, url: key };
  }

  read(key: string): Promise<Buffer> {
    return fs.readFile(resolvePrivateKey(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(resolvePrivateKey(key));
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }
}
