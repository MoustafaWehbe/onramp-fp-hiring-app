export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Anything a controller uploads a file through. LocalDiskStorageProvider is
 * the only implementation wired up today; S3StorageProvider exists as a
 * stub so swapping storage/index.ts's export is the only change needed once
 * S3_BUCKET/AWS credentials are configured.
 */
export interface StorageProvider {
  upload(key: string, body: Buffer, contentType: string): Promise<UploadResult>;
}
