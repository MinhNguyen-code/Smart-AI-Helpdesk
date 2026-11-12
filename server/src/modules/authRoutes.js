import { Router } from 'express';
import * as oidc from 'openid-client';
import { promisify } from 'node:util';
import config from '../config/index.js';
import { db } from '../db/index.js';
import { verifyCsrf } from '../middleware/csrf.js';

const router = Router();
let provider;
async function configuration() {
  if (!config.google.clientId || !config.google.clientSecret) {
    throw Object.assign(new Error('Google OAuth chưa được cấu hình'), { statusCode: 503 });
  }
  provider ||= oidc.discovery(new URL('https://accounts.google.com'), config.google.clientId, config.google.clientSecret)
    .catch(error => { provider = undefined; throw error; });
  return provider;
}
router.get('/google', async (req, res, next) => {
  try {
    const client = await configuration();
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    req.session.oidc = { verifier, state, nonce, created: Date.now() };
    await promisify(req.session.save.bind(req.session))();
    const url = oidc.buildAuthorizationUrl(client, { redirect_uri: config.google.callbackUrl,
      scope: 'openid email profile', code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', state, nonce });
    res.redirect(url.href);
  } catch (error) { next(error); }
});
router.get('/google/callback', async (req, res) => {
  try {
    const pending = req.session.oidc;
    delete req.session.oidc;
    await promisify(req.session.save.bind(req.session))();
    if (!pending || Date.now() - pending.created > 600000) throw new Error('Expired login');
    const callback = new URL(config.google.callbackUrl);
    callback.search = new URL(req.originalUrl, config.clientUrl).search;
    const tokens = await oidc.authorizationCodeGrant(await configuration(), callback,
      { pkceCodeVerifier: pending.verifier, expectedState: pending.state, expectedNonce: pending.nonce, idTokenExpected: true });
    const claims = tokens.claims();
    if (claims?.email_verified !== true || typeof claims.email !== 'string' || !claims.sub) throw new Error('Unverified identity');
    const user = await db.transaction(async trx => {
      const approved = await trx('users').where({ email: claims.email.toLowerCase().trim(), is_active: true }).forUpdate().first();
      if (!approved || (approved.google_sub && approved.google_sub !== claims.sub)) throw new Error('Account not approved');
      await trx('users').where('id', approved.id).update({ google_sub: claims.sub });
      return approved;
    });
    await promisify(req.session.regenerate.bind(req.session))();
    req.session.user = { id: user.id, role: user.role };
    await promisify(req.session.save.bind(req.session))();
    res.redirect(config.clientUrl);
  } catch { res.status(401).json({ error: { code: 'LOGIN_REJECTED', message: 'Đăng nhập bị từ chối hoặc tài khoản chưa được phê duyệt' } }); }
});
router.get('/me', async (req, res, next) => {
  try {
    const user = req.session.user && await db('users').where({ id: req.session.user.id, is_active: true }).select('id', 'full_name', 'role').first();
    res.status(user ? 200 : 401).json(user ? { user } : { error: { message: 'Authentication required' } });
  } catch (error) { next(error); }
});
router.post('/logout', verifyCsrf, (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie(config.session.name, { path: '/', httpOnly: true, sameSite: 'lax', secure: config.isProduction });
    res.status(204).end();
  });
});
export default router;
