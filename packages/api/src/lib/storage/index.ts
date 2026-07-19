import { LocalDiskStorageProvider } from "./local.provider";
import type { StorageProvider } from "./types";

export type { StorageProvider, UploadResult } from "./types";
export { LOCAL_UPLOADS_DIR } from "./local.provider";

// Swap this line for `new S3StorageProvider()` once S3_BUCKET/AWS
// credentials are configured — every caller goes through this one export,
// so nothing else changes.
export const storageProvider: StorageProvider = new LocalDiskStorageProvider();
