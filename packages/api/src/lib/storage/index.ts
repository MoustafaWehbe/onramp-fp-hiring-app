import { LocalDiskStorageProvider } from "./local.provider";
import { PrivateLocalDiskStorageProvider } from "./private-local.provider";
import type { StorageProvider } from "./types";

export type {
  PrivateStorageProvider,
  StorageProvider,
  UploadResult,
} from "./types";
export { LOCAL_UPLOADS_DIR } from "./local.provider";
export { PRIVATE_UPLOADS_DIR } from "./private-local.provider";

// Swap this line for `new S3StorageProvider()` once S3_BUCKET/AWS
// credentials are configured — every caller goes through this one export,
// so nothing else changes.
export const storageProvider: StorageProvider = new LocalDiskStorageProvider();

// Application CVs contain sensitive personal data. They live outside the
// public uploads directory and can only be read through an authorized route.
export const privateStorageProvider = new PrivateLocalDiskStorageProvider();
