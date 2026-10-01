const { sql, ensureSchema } = require('../_lib/db');
const { json, method, requireSameOrigin } = require('../_lib/http');
const { createSession, publicPlayer } = require('../_lib/auth');
const { normalizeNickname, verifyPassword } = require('../_lib/security');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  try {
    await ensureSchema();
    const normalized = normalizeNickname(req.body?.nickname);
    const password = String(req.body?.password || '');
    const q = sql();
    const rows = await q`
      SELECT p.id, p.nickname, p.password_hash, p.created_at, s.*
      FROM players p JOIN player_stats s ON s.player_id = p.id
      WHERE p.nickname_normalized = ${normalized}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return json(res, 401, { error: 'invalid_credentials' });
    }
    await createSession(row.id, res);
    json(res, 200, { player: publicPlayer(row) });
  } catch (err) {
    console.error(err);
    json(res, err.code === 'DB_NOT_CONFIGURED' ? 503 : 500, { error: err.code === 'DB_NOT_CONFIGURED' ? 'cloud_unavailable' : 'server_error' });
  }
};
