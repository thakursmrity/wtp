import { query } from '../_lib/db.js';
import { send, readJson, ipHash, sameOrigin, isJsonRequest } from '../_lib/util.js';
import { makeToken, passwordMatches, sessionCookie } from '../_lib/auth.js';

const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' }, { Allow: 'POST' });
  if (!sameOrigin(req) || !isJsonRequest(req)) return send(res, 403, { error: 'That request was not allowed.' });

  const body = await readJson(req);
  if (!body || typeof body.password !== 'string') return send(res, 400, { error: 'Enter your password.' });

  try {
    const hash = ipHash(req);
    const since = new Date(Date.now() - WINDOW_MS);
    const failures = await query('SELECT COUNT(*)::int AS n FROM wtp_login_attempts WHERE ip_hash = $1 AND created_at > $2', [hash, since]);
    if (failures.rows[0].n >= MAX_FAILURES) {
      return send(res, 429, { error: 'Too many wrong passwords. Wait 15 minutes and try again.' });
    }

    if (!passwordMatches(body.password)) {
      await query('INSERT INTO wtp_login_attempts (ip_hash) VALUES ($1)', [hash]);
      return send(res, 401, { error: 'That password is not right.' });
    }

    await query('DELETE FROM wtp_login_attempts WHERE ip_hash = $1', [hash]);
    return send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(makeToken()) });
  } catch (err) {
    console.error('login failed:', err);
    return send(res, 500, { error: 'The inbox is not set up yet. Check the environment variables in Vercel.' });
  }
}
