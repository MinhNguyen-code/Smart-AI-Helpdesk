import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const handle = action => (req, res, next) => Promise.resolve(action(req, res, next)).catch(next);
function fail(statusCode, message) { throw Object.assign(new Error(message), { statusCode }); }
const roles = ['ADMIN', 'IT_AGENT', 'END_USER'];
const publicFields = ['id', 'email', 'full_name', 'role', 'is_active', 'google_sub'];
function withDuplicateAsConflict(action) {
  return handle(async (req, res) => {
    try { await action(req, res); }
    catch (error) {
      if (error.code === 'ER_DUP_ENTRY') fail(409, 'User already approved');
      throw error;
    }
  });
}
function present(row) {
  return { id: row.id, email: row.email, full_name: row.full_name, role: row.role,
    is_active: Boolean(row.is_active), google_linked: Boolean(row.google_sub) };
}

router.use('/users', requireAuth, handle(async (req, res, next) => {
  const user = await db('users').where({ id: req.session.user.id, is_active: true }).select('id', 'role').first();
  if (!user) fail(401, 'Account inactive');
  if (user.role !== 'ADMIN') fail(403, 'Admin role required');
  req.adminUserId = user.id;
  next();
}));
router.get('/users', handle(async (req, res) => {
  const rows = await db('users').select(publicFields).orderBy('id');
  res.json(rows.map(present));
}));
router.post('/users', withDuplicateAsConflict(async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 || !roles.includes(role)) fail(400, 'Invalid user fields');
  const row = await db.transaction(async trx => {
    if (await trx('users').where({ email }).first()) fail(409, 'User already approved');
    const [id] = await trx('users').insert({ email, full_name: 'Pending Google sign-in', role, is_active: true });
    await trx('audit_logs').insert({ actor_id: req.adminUserId, action: 'USER_APPROVED', entity_type: 'user', entity_id: String(id),
      safe_metadata: JSON.stringify({ role }) });
    return trx('users').where({ id }).select(publicFields).first();
  });
  res.status(201).json(present(row));
}));
router.patch('/users/:id', handle(async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  if (!Number.isSafeInteger(id) || id < 1 || id === req.adminUserId || !roles.includes(body.role)
      || typeof body.is_active !== 'boolean') fail(400, 'Invalid user change');
  const row = await db.transaction(async trx => {
    const before = await trx('users').where({ id }).forUpdate().first();
    if (!before) fail(404, 'User not found');
    await trx('users').where({ id }).update({ role: body.role, is_active: body.is_active, updated_at: new Date() });
    await trx('audit_logs').insert({ actor_id: req.adminUserId, action: 'USER_UPDATED', entity_type: 'user', entity_id: String(id),
      safe_metadata: JSON.stringify({ old_role: before.role, new_role: body.role,
        old_active: Boolean(before.is_active), new_active: body.is_active }) });
    return trx('users').where({ id }).select(publicFields).first();
  });
  res.json(present(row));
}));
export default router;
