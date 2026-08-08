import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';
import multer from 'multer';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: { message: err.issues[0]?.message ?? 'Invalid request data' },
    });
  }

  if (err instanceof multer.MulterError) {
    const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must not exceed 5 MB' : err.message;
    return res.status(statusCode).json({ success: false, error: { message } });
  }

  if (err instanceof Error) {
    return res.status(500).json({
      success: false,
      error: { message: 'Unexpected server error' },
    });
  }

  return res.status(500).json({
    success: false,
    error: { message: 'Unexpected server error' },
  });
}
