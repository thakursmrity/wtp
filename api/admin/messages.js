import { query } from '../_lib/db.js';
import { send, readJson, sameOrigin, isJsonRequest, clean } from '../_lib/util.js';
import { isAdmin } from '../_lib/auth.js';

const STATUSES = new Set(['new', 'read', 'replied', 'archived']);
const COLUMNS = 'id, created_at, kind, name, email, body, status, note';

export default async function handler(req, res) {
  if (!isAdmin(req)) return send(res, 401, { error: 'Not signed in.' });

  try {
    if (req.method === 'GET') {
      const { rows } = await query(`SELECT ${COLUMNS} FROM wtp_messages ORDER BY created_at DESC, id DESC LIMIT 500`);
      return send(res, 200, { messages: rows });
    }

    if (req.method !== 'PATCH' && req.method !== 'DELETE') {
      return send(res, 405, { error: 'Use GET, PATCH or DELETE.' }, { Allow: 'GET, PATCH, DELETE' });
    }
    if (!sameOrigin(req) || !isJsonRequest(req)) return send(res, 403, { error: 'That request was not allowed.' });

    const body = await readJson(req);
    const id = Number(body && body.id);
    if (!Number.isInteger(id) || id < 1) return send(res, 400, { error: 'Missing message id.' });

    if (req.method === 'DELETE') {
      await query('DELETE FROM wtp_messages WHERE id = $1', [id]);
      return send(res, 200, { ok: true });
    }

    let status = null;
    if (body.status !== undefined) {
      if (!STATUSES.has(body.status)) return send(res, 400, { error: 'Unknown status.' });
      status = body.status;
    }
    const note = body.note === undefined ? null : clean(body.note, 2000);
    if (status === null && note === null) return send(res, 400, { error: 'Nothing to update.' });

    const { rows } = await query(
      `UPDATE wtp_messages SET status = COALESCE($2::text, status), note = COALESCE($3::text, note) WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, status, note]
    );
    if (!rows.length) return send(res, 404, { error: 'That message no longer exists.' });
    return send(res, 200, { message: rows[0] });
  } catch (err) {
    console.error('messages failed:', err);
    return send(res, 500, { error: 'Could not reach the database. Check DATABASE_URL in Vercel.' });
  }
}
