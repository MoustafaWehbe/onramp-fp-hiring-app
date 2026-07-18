import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { createError } from "./error-handler";

/**
 * multer's own errors (file too large, fileFilter rejection) aren't
 * AppErrors, so left alone they'd fall through errorHandler as an opaque 500.
 * Placed after upload.single(...) in a route: Express skips the terminal
 * route handler and invokes this instead whenever multer calls next(err).
 */
export function handleUploadError(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      next(createError("File is too large", 413));
      return;
    }
    next(createError(err.message, 422));
    return;
  }

  if (err instanceof Error) {
    next(createError(err.message, 422));
    return;
  }

  next(err);
}
