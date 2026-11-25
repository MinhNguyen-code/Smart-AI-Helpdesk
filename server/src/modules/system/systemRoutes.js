import { Router } from 'express';
import { checkDatabaseHealth } from '../../db/index.js';

export function createSystemRouter(checkHealth = checkDatabaseHealth, logger = console) {
  const router = Router();
  let lastReady;
  const recordState = (ready, health = {}) => {
    if (!ready && lastReady !== false) {
      const code = /^[A-Z0-9_]{1,64}$/.test(health.code || '') ? health.code : 'UNAVAILABLE';
      logger.warn(JSON.stringify({ event: 'readiness_failed', connected: health.connected === true,
        targetVerified: health.isTargetVerified === true, code }));
    } else if (ready && lastReady === false) {
      logger.info(JSON.stringify({ event: 'readiness_recovered' }));
    }
    lastReady = ready;
  };

  // Public probes disclose only status, while readiness still checks real MySQL.
  router.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));
  router.get('/ready', async (req, res) => {
    try {
      const health = await checkHealth();
      const ready = health.connected === true && health.isTargetVerified === true;
      recordState(ready, health);
      res.status(ready ? 200 : 503).json({ status: ready ? 'READY' : 'NOT_READY' });
    } catch (error) {
      recordState(false, { code: error?.code });
      res.status(503).json({ status: 'NOT_READY' });
    }
  });

  return router;
}

export default createSystemRouter();
