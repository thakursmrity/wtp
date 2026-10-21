'use strict';

const store = require('./_lib/store');
const auth = require('./_lib/auth');
const { send, readJson, sameOrigin, clientKey } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'This request was blocked.' });

  if (!auth.ready() || !store.configured()) {
    return send(res, 503, { error: 'The inbox is not set up yet. Add ADMIN_PASSWORD, SESSION_SECRET and the Redis store in Vercel, then redeploy.' });
  }

  const body = await readJson(req);
  const password = body && typeof body.password === 'string' ? body.password : '';

  try {
    if (!(await store.allow('login', clientKey(req), 5, 900))) {
      return send(res, 429, { error: 'Too many tries. Please wait 15 minutes and try again.' });
    }
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong. Please try again.' });
  }

  if (!password || !auth.passwordOk(password)) {
    return send(res, 401, { error: 'That password is not right.' });
  }
  return send(res, 200, { ok: true }, { 'Set-Cookie': auth.sessionCookie(req) });
};
