import { randomUUID } from "crypto";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import path from "path";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const RESUME_MIME_TYPES = Object.freeze(
  Object.keys(EXTENSION_BY_MIME_TYPE),
);

function resumeFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  const expectedExtension = EXTENSION_BY_MIME_TYPE[file.mimetype];
  const actualExtension = path.extname(file.originalname).toLowerCase();

  if (!expectedExtension || actualExtension !== expectedExtension) {
    cb(new Error("Only PDF or DOCX files are allowed"));
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

export function applicationResumeStorageKey(
  userId: string,
  mimetype: string,
): string {
  const extension = EXTENSION_BY_MIME_TYPE[mimetype] ?? "";
  return `application-resumes/${userId}/${randomUUID()}${extension}`;
}
