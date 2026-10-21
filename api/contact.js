'use strict';

const store = require('./_lib/store');
const { send, readJson, hostOf, isLocal, sameOrigin, clientKey, cleanText } = require('./_lib/http');

const TYPES = {
  product: 'Suggest a product',
  call: 'Discovery call',
  question: 'Interview question',
  hi: 'Just saying hi'
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function notify(m, req) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  const origin = (isLocal(req) ? 'http://' : 'https://') + hostOf(req);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Why That Product <onboarding@resend.dev>',
        to: [to],
        reply_to: m.email,
        subject: 'New message: ' + TYPES[m.type],
        text: [
          TYPES[m.type],
          '',
          'From: ' + (m.name || '(no name)') + ' <' + m.email + '>',
          '',
          m.message,
          '',
          'Open your inbox: ' + origin + '/admin'
        ].join('\n')
      })
    });
  } catch (e) {
    // The message is already saved. A failed email should never lose it.
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'This request was blocked.' });

  const body = await readJson(req);
  if (!body) return send(res, 400, { error: 'That message could not be read. Please try again.' });

  // Hidden field only bots fill in. Pretend it worked.
  if (body.website) return send(res, 200, { ok: true });

  const type = TYPES[body.type] ? body.type : 'hi';
  const name = cleanText(body.name, 80);
  const email = cleanText(body.email, 254);
  const message = cleanText(body.message, 2000);

  if (!EMAIL.test(email)) return send(res, 400, { error: 'Please enter an email address I can reply to.', field: 'email' });
  if (message.length < 5) return send(res, 400, { error: 'Please write a few words so I know what you have in mind.', field: 'message' });

  if (!store.configured()) {
    return send(res, 503, { error: 'Messages are not switched on yet. Please email whythatproduct@gmail.com instead.' });
  }

  try {
    if (!(await store.allow('contact', clientKey(req), 5, 3600))) {
      return send(res, 429, { error: 'That is a lot of messages in a short time. Please try again in an hour.' });
    }
    const m = { id: store.newId(), createdAt: Date.now(), type, name, email, message, read: false, archived: false, note: '' };
    await store.saveMessage(m);
    await notify(m, req);
    return send(res, 200, { ok: true });
  } catch (e) {
    return send(res, 500, { error: 'Something went wrong on my side. Please try again, or email whythatproduct@gmail.com.' });
  }
};
