import { randomBytes, timingSafeEqual } from 'node:crypto';
import config from '../config/index.js';

export function csrfToken(req, res) {
  req.session.csrfToken ||= randomBytes(32).toString('hex');
  res.json({ csrfToken: req.session.csrfToken });
}

export function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const supplied = Buffer.from(String(req.get('X-CSRF-Token') || ''));
  const expected = Buffer.from(req.session.csrfToken || '');
  if (req.get('Origin') !== config.clientUrl || !expected.length || supplied.length !== expected.length
      || !timingSafeEqual(supplied, expected)) return res.status(403).json({ error: { code: 'CSRF_REJECTED', message: 'Invalid request origin or CSRF token' } });
  next();
}
