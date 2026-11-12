/**
 * Authentication and Role-Based Access Control (RBAC) middleware.
 */

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: {
        message: 'Authentication required. Please sign in.',
        code: 'UNAUTHENTICATED',
        statusCode: 401,
      },
      timestamp: new Date().toISOString(),
    });
  }
  next();
}

/**
 * Require specific user role(s).
 * @param {string[]} allowedRoles - Array of allowed roles ('ADMIN', 'IT_AGENT', 'END_USER')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required.',
          code: 'UNAUTHENTICATED',
          statusCode: 401,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: {
          message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}.`,
          code: 'FORBIDDEN',
          statusCode: 403,
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}
