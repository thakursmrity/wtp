// Runs the API handlers against an in-memory Postgres. Usage: npm test
import { newDb } from 'pg-mem';
import assert from 'node:assert/strict';
import fs from 'node:fs';

process.env.SESSION_SECRET = 'test-secret-that-is-long-enough';
process.env.ADMIN_PASSWORD = 'correct horse battery';
const mem = newDb();
const { Pool } = mem.adapters.createPg();
globalThis.__WTP_TEST_POOL = new Pool();

const contact = (await import('../api/contact.js')).default;
const login = (await import('../api/admin/login.js')).default;
const logout = (await import('../api/admin/logout.js')).default;
const messages = (await import('../api/admin/messages.js')).default;
const { makeToken } = await import('../api/_lib/auth.js');

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok  ' + name); }
  catch (err) { console.error('FAIL  ' + name + '\n      ' + err.message); process.exitCode = 1; }
}

function call(handler, { method = 'POST', body, headers = {}, ip = '1.1.1.1', json = true } = {}) {
  const req = {
    method, body,
    headers: { host: 'wtp.test', origin: 'https://wtp.test', 'content-type': json ? 'application/json' : 'text/plain', 'x-forwarded-for': ip, ...headers },
    socket: { remoteAddress: ip },
  };
  return new Promise((resolve) => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(text) { resolve({ status: this.statusCode, headers: this.headers, json: text ? JSON.parse(text) : null }); } };
    handler(req, res);
  });
}

const good = { kind: 'product', name: 'Asha', email: 'asha@example.com', message: 'Please break down Zomato checkout.', website: '', elapsed: 6000 };
const count = async () => (await globalThis.__WTP_TEST_POOL.query('SELECT COUNT(*)::int AS n FROM wtp_messages')).rows[0].n;

console.log('Contact form');
await test('saves a valid message', async () => {
  const r = await call(contact, { body: good, ip: '2.2.2.2' });
  assert.equal(r.status, 200); assert.equal(await count(), 1);
});
await test('honeypot pretends success but saves nothing', async () => {
  const r = await call(contact, { body: { ...good, website: 'http://spam.example' }, ip: '3.3.3.3' });
  assert.equal(r.status, 200); assert.equal(await count(), 1);
});
await test('rejects a message sent too fast', async () => {
  const r = await call(contact, { body: { ...good, elapsed: 300 }, ip: '4.4.4.4' });
  assert.equal(r.status, 400); assert.equal(await count(), 1);
});
await test('rejects a bad email and names the field', async () => {
  const r = await call(contact, { body: { ...good, email: 'nope' }, ip: '5.5.5.5' });
  assert.equal(r.status, 400); assert.equal(r.json.field, 'email');
});
await test('rejects missing name, short message and unknown kind', async () => {
  assert.equal((await call(contact, { body: { ...good, name: ' ' }, ip: '6.6.6.6' })).json.field, 'name');
  assert.equal((await call(contact, { body: { ...good, message: 'hi' }, ip: '6.6.6.6' })).json.field, 'message');
  assert.equal((await call(contact, { body: { ...good, kind: 'bogus' }, ip: '6.6.6.6' })).json.field, 'kind');
});
await test('rejects other sites and non-JSON posts', async () => {
  assert.equal((await call(contact, { body: good, headers: { origin: 'https://evil.example' }, ip: '7.7.7.7' })).status, 403);
  assert.equal((await call(contact, { body: good, json: false, ip: '7.7.7.7' })).status, 403);
});
await test('only allows POST', async () => {
  assert.equal((await call(contact, { method: 'GET' })).status, 405);
});
await test('limits one connection to 5 messages an hour', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await call(contact, { body: good, ip: '8.8.8.8' })).status, 200);
  assert.equal((await call(contact, { body: good, ip: '8.8.8.8' })).status, 429);
});
await test('stores hostile text as plain text, trimmed and capped', async () => {
  const evil = '<script>alert(1)</script>' + 'x'.repeat(5000);
  await call(contact, { body: { ...good, name: '<img src=x onerror=alert(1)>', message: evil }, ip: '9.9.9.9' });
  const row = (await globalThis.__WTP_TEST_POOL.query("SELECT * FROM wtp_messages WHERE ip_hash <> '' ORDER BY id DESC LIMIT 1")).rows[0];
  assert.equal(row.body.length, 4000); assert.ok(row.body.startsWith('<script>'));
});
await test('never stores a raw IP address', async () => {
  const rows = (await globalThis.__WTP_TEST_POOL.query('SELECT ip_hash FROM wtp_messages')).rows;
  assert.ok(rows.every((r) => /^[0-9a-f]{32}$/.test(r.ip_hash)));
});

console.log('Admin sign in');
await test('inbox is closed without a session', async () => {
  assert.equal((await call(messages, { method: 'GET' })).status, 401);
});
await test('wrong password is refused', async () => {
  assert.equal((await call(login, { body: { password: 'nope' }, ip: '10.0.0.1' })).status, 401);
});
await test('locks out after 8 wrong passwords, even for the right one', async () => {
  for (let i = 0; i < 7; i++) await call(login, { body: { password: 'bad' + i }, ip: '10.0.0.2' });
  assert.equal((await call(login, { body: { password: 'bad8' }, ip: '10.0.0.2' })).status, 401);
  assert.equal((await call(login, { body: { password: 'correct horse battery' }, ip: '10.0.0.2' })).status, 429);
});
let cookie;
await test('right password sets a secure, HttpOnly session cookie', async () => {
  const r = await call(login, { body: { password: 'correct horse battery' }, ip: '10.0.0.3' });
  assert.equal(r.status, 200);
  const set = r.headers['set-cookie'];
  assert.match(set, /HttpOnly/); assert.match(set, /Secure/); assert.match(set, /SameSite=Strict/);
  cookie = set.split(';')[0];
});
await test('rejects forged and expired cookies', async () => {
  assert.equal((await call(messages, { method: 'GET', headers: { cookie: 'wtp_admin=abc.def' } })).status, 401);
  const tampered = cookie.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
  assert.equal((await call(messages, { method: 'GET', headers: { cookie: tampered } })).status, 401);
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() - 1000 })).toString('base64url');
  const realSig = makeToken().split('.')[1];
  assert.equal((await call(messages, { method: 'GET', headers: { cookie: `wtp_admin=${payload}.${realSig}` } })).status, 401);
});

console.log('Inbox');
let first;
await test('lists messages, newest first', async () => {
  const r = await call(messages, { method: 'GET', headers: { cookie } });
  assert.equal(r.status, 200); assert.ok(r.json.messages.length >= 6);
  first = r.json.messages[0];
  assert.ok(!('ip_hash' in first));
});
await test('updates status and saves a note', async () => {
  const a = await call(messages, { method: 'PATCH', headers: { cookie }, body: { id: first.id, status: 'replied' } });
  assert.equal(a.json.message.status, 'replied');
  const b = await call(messages, { method: 'PATCH', headers: { cookie }, body: { id: first.id, note: 'Sent the Zomato video.' } });
  assert.equal(b.json.message.note, 'Sent the Zomato video.'); assert.equal(b.json.message.status, 'replied');
});
await test('rejects unknown statuses, empty updates and missing ids', async () => {
  assert.equal((await call(messages, { method: 'PATCH', headers: { cookie }, body: { id: first.id, status: 'hacked' } })).status, 400);
  assert.equal((await call(messages, { method: 'PATCH', headers: { cookie }, body: { id: first.id } })).status, 400);
  assert.equal((await call(messages, { method: 'PATCH', headers: { cookie }, body: { status: 'read' } })).status, 400);
  assert.equal((await call(messages, { method: 'PATCH', headers: { cookie }, body: { id: 99999, status: 'read' } })).status, 404);
});
await test('blocks changes from another site', async () => {
  assert.equal((await call(messages, { method: 'DELETE', headers: { cookie, origin: 'https://evil.example' }, body: { id: first.id } })).status, 403);
});
await test('deletes a message', async () => {
  const before = await count();
  assert.equal((await call(messages, { method: 'DELETE', headers: { cookie }, body: { id: first.id } })).status, 200);
  assert.equal(await count(), before - 1);
});
await test('sign out clears the cookie', async () => {
  const r = await call(logout, { body: {} });
  assert.match(r.headers['set-cookie'], /Max-Age=0/);
});

console.log('Front end safety');
await test('inbox page never writes message text as HTML', () => {
  for (const f of ['assets/admin.js', 'assets/site.js']) {
    const src = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.ok(!/innerHTML|insertAdjacentHTML|document\.write/.test(src), f + ' uses an HTML sink');
  }
});

console.log(`\n${passed} checks passed${process.exitCode ? ', some failed' : ''}`);
