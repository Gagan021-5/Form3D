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

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

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
