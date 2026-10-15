import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler middleware.
 */
export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[ErrorHandler]', err.message);

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';

  // Handle Multer upload errors and file filter rejections
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.message.includes('File too large') || (err as any).code === 'LIMIT_FILE_SIZE') {
      code = 'FILE_TOO_LARGE';
    } else {
      code = 'UPLOAD_ERROR';
    }
  } else if (
    err.message.includes('Invalid file type') ||
    err.message.includes('Invalid model file type')
  ) {
    statusCode = 400;
    code = 'INVALID_FILE_TYPE';
  }

  // Don't expose internal details in production
  const message =
    statusCode === 500 && process.env.NODE_ENV !== 'development'
      ? 'An internal server error occurred.'
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};

/**
 * 404 handler for unknown routes.
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

/**
 * Create an application error with status code.
 */
export function createAppError(
  message: string,
  statusCode: number = 500,
  code: string = 'INTERNAL_ERROR'
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
