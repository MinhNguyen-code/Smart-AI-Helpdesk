import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const handle = action => (req, res, next) => Promise.resolve(action(req, res, next)).catch(next);
function fail(statusCode, message) { throw Object.assign(new Error(message), { statusCode }); }

router.use('/notifications', requireAuth, handle(async (req, res, next) => {
  const user = await db('users').where({ id: req.session.user.id, is_active: true }).select('id').first();
  if (!user) fail(401, 'Account inactive');
  req.notificationUserId = user.id;
  next();
}));

router.get('/notifications', handle(async (req, res) => {
  const [items, [{ count }]] = await Promise.all([
    db('notifications').where({ recipient_id: req.notificationUserId })
      .select('id', 'ticket_id', 'notification_type', 'title', 'message', 'is_read', 'created_at')
      .orderBy('id', 'desc').limit(50),
    db('notifications').where({ recipient_id: req.notificationUserId, is_read: false }).count('* as count'),
  ]);
  res.json({ items, unreadCount: Number(count) });
}));

router.patch('/notifications/:id/read', handle(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) fail(400, 'Invalid notification');
  const updated = await db('notifications').where({ id, recipient_id: req.notificationUserId }).update({ is_read: true });
  if (!updated) fail(404, 'Notification not found');
  res.status(204).end();
}));

router.post('/notifications/read-all', handle(async (req, res) => {
  await db('notifications').where({ recipient_id: req.notificationUserId, is_read: false }).update({ is_read: true });
  res.status(204).end();
}));

export default router;
