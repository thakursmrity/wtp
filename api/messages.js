'use strict';

const store = require('./_lib/store');
const auth = require('./_lib/auth');
const { send, readJson, sameOrigin, cleanText } = require('./_lib/http');

const ID = /^[a-z0-9]{6,40}$/;

module.exports = async function handler(req, res) {
  if (!auth.ready() || !store.configured()) {
    return send(res, 503, { error: 'The inbox is not set up yet. Add ADMIN_PASSWORD, SESSION_SECRET and the Redis store in Vercel, then redeploy.' });
  }
  if (!auth.loggedIn(req)) return send(res, 401, { error: 'Please log in.' });

  try {
    if (req.method === 'GET') {
      return send(res, 200, { messages: await store.listMessages(300) });
    }

    if (!sameOrigin(req)) return send(res, 403, { error: 'This request was blocked.' });

    if (req.method === 'PATCH') {
      const body = await readJson(req);
      if (!body || !ID.test(String(body.id || ''))) return send(res, 400, { error: 'Unknown message.' });
      const m = await store.getMessage(body.id);
      if (!m) return send(res, 404, { error: 'That message no longer exists.' });
      if (typeof body.read === 'boolean') m.read = body.read;
      if (typeof body.archived === 'boolean') m.archived = body.archived;
      if (typeof body.note === 'string') m.note = cleanText(body.note, 2000);
      await store.updateMessage(m);
      return send(res, 200, { message: m });
    }

    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://x').searchParams.get('id') || '';
      if (!ID.test(id)) return send(res, 400, { error: 'Unknown message.' });
      await store.deleteMessage(id);
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { error: 'Method not allowed.' }, { Allow: 'GET, PATCH, DELETE' });
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong. Please try again.' });
  }
};
