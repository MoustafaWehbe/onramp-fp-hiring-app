import type { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  /** Machine-readable error identifier (e.g. "UPGRADE_REQUIRED") for clients
   * that need to branch on more than the HTTP status code. Optional — most
   * errors don't need one. */
  code?: string;
}

export function createError(
  message: string,
  statusCode = 500,
  code?: string,
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  if (code) {
    error.code = code;
  }
  return error;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.isOperational ? err.message : "Internal server error";
  const exposeStack =
    process.env.NODE_ENV === "development" && !err.isOperational;

  if (process.env.NODE_ENV !== "test") {
    console.error("[Error]", err);
  }

  res.status(statusCode).json({
    error: message,
    ...(err.isOperational && err.code && { code: err.code }),
    ...(exposeStack && { stack: err.stack }),
  });
}
