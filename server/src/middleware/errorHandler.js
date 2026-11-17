/**
 * Centralized error handler middleware.
 * Sanitizes errors, hides sensitive details in production, and standardizes API response structure.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const isServerFault = statusCode >= 500;

  if (isServerFault) console.error(JSON.stringify({ event: 'http_error', at: new Date().toISOString(),
    method: req.method, route: req.route?.path || 'unmatched', statusCode, code: err.code || 'INTERNAL_ERROR' }));

  const response = {
    error: {
      message: isServerFault
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
      message: `Endpoint '${req.method} ${req.path}' not found.`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
    },
    timestamp: new Date().toISOString(),
  });
}
