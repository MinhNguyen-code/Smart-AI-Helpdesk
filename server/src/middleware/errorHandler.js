/**
 * Centralized error handler middleware.
 * Sanitizes errors, hides sensitive details in production, and standardizes API response structure.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isServerFault = statusCode >= 500;

  // Structured logging for debugging
  console.error(`[ERROR] ${new Date().toISOString()} ${req.method} ${req.originalUrl}:`, {
    message: err.message,
    statusCode,
    code: err.code,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  const response = {
    error: {
      message: isServerFault && process.env.NODE_ENV === 'production'
        ? 'Internal server error. Please try again later.'
        : err.message || 'An unexpected error occurred.',
      code: err.code || (isServerFault ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      statusCode,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

/**
 * 404 Route Not Found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Endpoint '${req.method} ${req.originalUrl}' not found.`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
    },
    timestamp: new Date().toISOString(),
  });
}
