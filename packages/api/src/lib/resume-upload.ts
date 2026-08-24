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

/**
 * Keep only the user-facing basename and remove control characters before a
 * filename is persisted or placed in a response header.
 */
export function safeOriginalFilename(originalname: string): string {
  const basename = originalname.split(/[\\/]/).pop() ?? "resume";
  const sanitized = [...basename]
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127;
    })
    .join("")
    .trim();

  return (sanitized || "resume").slice(0, 255);
}

/** Legacy rows may have a stored file but no captured original filename. */
export function resolveResumeFilename(
  originalFilename: string | null | undefined,
  storageReference: string,
): string {
  if (originalFilename?.trim()) {
    return safeOriginalFilename(originalFilename);
  }

  return path.extname(storageReference).toLowerCase() === ".docx"
    ? "resume.docx"
    : "resume.pdf";
}

export function resumeContentType(storageReference: string): string {
  return path.extname(storageReference).toLowerCase() === ".pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

/** Converts this app's public upload URL back to its provider key. */
export function publicResumeStorageKey(resumeUrl: string): string | null {
  const prefix = "/uploads/";
  return resumeUrl.startsWith(prefix) ? resumeUrl.slice(prefix.length) : null;
}

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
