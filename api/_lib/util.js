import crypto from 'node:crypto';

export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(data));
}

export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return null; }
    }
    if (Buffer.isBuffer(req.body)) {
      try { return JSON.parse(req.body.toString('utf8')); } catch { return null; }
    }
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 20000) return null;
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// We never store raw IP addresses, only a salted hash used for rate limiting.
export function ipHash(req) {
  return crypto
    .createHash('sha256')
    .update(clientIp(req) + '|' + (process.env.SESSION_SECRET || 'wtp'))
    .digest('hex')
    .slice(0, 32);
}

// Blocks cross-site form posts. Browsers always send Origin on POST, PATCH and DELETE.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export function isJsonRequest(req) {
  return String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json');
}

// Trim, drop control characters (keeps tabs and newlines), cap the length.
export function clean(value, max) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/\r/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}
