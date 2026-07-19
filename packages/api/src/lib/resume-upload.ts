import { randomUUID } from "crypto";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

function resumeFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (!(file.mimetype in EXTENSION_BY_MIME_TYPE)) {
    cb(new Error("Only PDF and Word documents (.pdf, .doc, .docx) are allowed"));
    return;
  }
  cb(null, true);
}

/** Buffers in memory; the storage provider (local disk today, S3 later) does the actual write. */
export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES },
  fileFilter: resumeFileFilter,
});

/**
 * Key is built from the authenticated userId + a fresh UUID — never from the
 * client-supplied filename — so there's no path-traversal or collision
 * surface from user input.
 */
export function resumeStorageKey(userId: string, mimetype: string): string {
  const extension = EXTENSION_BY_MIME_TYPE[mimetype] ?? "";
  return `resumes/${userId}/${randomUUID()}${extension}`;
}
