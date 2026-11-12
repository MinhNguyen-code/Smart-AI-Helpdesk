import { Router } from 'express';
import { checkDatabaseHealth } from '../../db/index.js';

const router = Router();
const serverStartTime = Date.now();

/**
 * Liveness Probe: Returns 200 if the Node.js/Express process is running.
 */
router.get('/health', (req, res) => {
  const uptimeSeconds = Math.round((Date.now() - serverStartTime) / 1000);
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    nodeVersion: process.version,
  });
});

/**
 * Readiness Probe: Checks MySQL connection and returns system readiness.
 */
router.get('/ready', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const isReady = dbHealth.connected && dbHealth.isTargetVerified;

  const payload = {
    status: isReady ? 'READY' : 'NOT_READY',
    database: dbHealth,
    timestamp: new Date().toISOString(),
  };

  res.status(isReady ? 200 : 503).json(payload);
});

export default router;
