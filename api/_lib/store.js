'use strict';
// Tiny Redis client over the Upstash REST API. No dependencies.
// Works with the env vars Vercel adds when you connect an Upstash Redis store.

const crypto = require('crypto');

const INDEX = 'wtp:msgs';
const keyOf = (id) => 'wtp:msg:' + id;

function conf() {
  return {
    url: (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/$/, ''),
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || ''
  };
}

function configured() {
  const c = conf();
  return Boolean(c.url && c.token);
}

async function call(path, body) {
  const c = conf();
  const r = await fetch(c.url + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j && j.error ? j.error : 'Store error ' + r.status);
  return j;
}

async function cmd(args) {
  const j = await call('', args.map(String));
  if (j.error) throw new Error(j.error);
  return j.result;
}

async function pipeline(cmds) {
  const j = await call('/pipeline', cmds.map((c) => c.map(String)));
  return j.map((x) => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
}

function newId() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

async function saveMessage(m) {
  await pipeline([
    ['SET', keyOf(m.id), JSON.stringify(m)],
    ['ZADD', INDEX, m.createdAt, m.id]
  ]);
}

async function listMessages(limit) {
  const ids = await cmd(['ZREVRANGE', INDEX, 0, (limit || 300) - 1]);
  if (!ids || !ids.length) return [];
  const vals = await cmd(['MGET'].concat(ids.map(keyOf)));
  return vals
    .map((v) => {
      try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
    })
    .filter(Boolean);
}

async function getMessage(id) {
  const v = await cmd(['GET', keyOf(id)]);
  return v ? JSON.parse(v) : null;
}

async function updateMessage(m) {
  await cmd(['SET', keyOf(m.id), JSON.stringify(m)]);
}

async function deleteMessage(id) {
  await pipeline([['DEL', keyOf(id)], ['ZREM', INDEX, id]]);
}

// Returns true while the caller is under the limit.
async function allow(bucket, who, max, windowSec) {
  const k = 'wtp:rl:' + bucket + ':' + who;
  const r = await pipeline([['INCR', k], ['EXPIRE', k, windowSec, 'NX']]);
  return Number(r[0]) <= max;
}

module.exports = {
  configured, newId, saveMessage, listMessages, getMessage, updateMessage, deleteMessage, allow
};
