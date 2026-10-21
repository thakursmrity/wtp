'use strict';

const auth = require('./_lib/auth');
const { send, sameOrigin } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'This request was blocked.' });
  return send(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie(req) });
};
