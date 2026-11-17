import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();
const handle = action => (req, res, next) => Promise.resolve(action(req, res, next)).catch(next);
function fail(statusCode, message) { throw Object.assign(new Error(message), { statusCode }); }

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(400, 'Invalid date range');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail(400, 'Invalid date range');
  return date;
}
function range(req) {
  const end = req.query.endDate ? parseDate(req.query.endDate) : new Date(new Date().toISOString().slice(0, 10));
  const start = req.query.startDate ? parseDate(req.query.startDate) : new Date(end.getTime() - 6 * 86400000);
  const days = Math.round((end - start) / 86400000);
  if (days < 0 || days > 365) fail(400, 'Date range must be 1–366 days');
  return { start: start.toISOString().slice(0, 10), endExclusive: new Date(end.getTime() + 86400000).toISOString().slice(0, 10) };
}
function ticketsInRange(req) {
  const { start, endExclusive } = range(req);
  return db('tickets').where('tickets.created_at', '>=', `${start} 00:00:00`).where('tickets.created_at', '<', `${endExclusive} 00:00:00`);
}

router.use('/analytics', requireAuth, handle(async (req, res, next) => {
  const user = await db('users').where({ id: req.session.user.id, is_active: true }).select('role').first();
  if (!user) fail(401, 'Account inactive');
  if (user.role !== 'ADMIN') fail(403, 'Admin role required');
  next();
}));

router.get('/analytics/summary', handle(async (req, res) => {
  const row = await ticketsInRange(req).select(db.raw(`COUNT(*) AS total,
    AVG(CASE WHEN acknowledged_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, created_at, acknowledged_at) END) AS mtta_seconds,
    AVG(CASE WHEN first_response_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, created_at, first_response_at) END) AS first_response_seconds,
    AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, created_at, resolved_at) END) AS mttr_seconds,
    SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS sla_evaluated,
    SUM(CASE WHEN status = 'RESOLVED' AND first_response_at IS NOT NULL
      AND first_response_at <= response_deadline_at AND resolved_at <= resolution_deadline_at
      THEN 1 ELSE 0 END) AS sla_compliant`)).first();
  const evaluated = Number(row.sla_evaluated || 0);
  const compliant = Number(row.sla_compliant || 0);
  res.json({ total: Number(row.total), mttaSeconds: row.mtta_seconds === null ? null : Number(row.mtta_seconds),
    firstResponseSeconds: row.first_response_seconds === null ? null : Number(row.first_response_seconds),
    mttrSeconds: row.mttr_seconds === null ? null : Number(row.mttr_seconds),
    slaEvaluated: evaluated, slaCompliant: compliant,
    slaCompliancePercent: evaluated ? Math.round(compliant / evaluated * 10000) / 100 : null });
}));
router.get('/analytics/daily', handle(async (req, res) => {
  const rows = await ticketsInRange(req).select(db.raw('DATE(created_at) AS day')).count('* as count').groupByRaw('DATE(created_at)').orderBy('day');
  res.json(rows.map(row => ({ day: row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day).slice(0, 10), count: Number(row.count) })));
}));
router.get('/analytics/priorities', handle(async (req, res) => {
  const rows = await ticketsInRange(req).select('priority').count('* as count').groupBy('priority').orderBy('priority');
  const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
  res.json(rows.map(row => ({ priority: row.priority, count: Number(row.count), percent: Math.round(Number(row.count) / total * 10000) / 100 })));
}));
router.get('/analytics/categories', handle(async (req, res) => {
  const rows = await ticketsInRange(req).leftJoin('categories', 'categories.id', 'tickets.category_id')
    .select('tickets.category_id', 'categories.name').count('* as count')
    .groupBy('tickets.category_id', 'categories.name').orderBy('count', 'desc');
  const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
  res.json(rows.map(row => ({ category_id: row.category_id, name: row.name || 'Chưa phân loại',
    count: Number(row.count), percent: Math.round(Number(row.count) / total * 10000) / 100 })));
}));

export default router;
