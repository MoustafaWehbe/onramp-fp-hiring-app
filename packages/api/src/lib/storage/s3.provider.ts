// Uncomment the S3 implementation once AWS credentials are configured, then
// point storage/index.ts at this provider instead of LocalDiskStorageProvider.

// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import type { StorageProvider, UploadResult } from "./types";

export class S3StorageProvider implements StorageProvider {
  async upload(_key: string, _body: Buffer, _contentType: string): Promise<UploadResult> {
    // TODO: implement S3 upload
    throw new Error(
      "Storage not configured. Set S3_BUCKET and AWS credentials in .env",
    );
  }
}
