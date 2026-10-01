const crypto = require('node:crypto');
const { sql, ensureSchema } = require('../_lib/db');
const { json, method, requireSameOrigin } = require('../_lib/http');
const { createSession, publicPlayer } = require('../_lib/auth');
const {
  normalizeNickname, validateNickname, validatePassword,
  hashPassword, createRecoveryCode, tokenHash
} = require('../_lib/security');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  try {
    await ensureSchema();
    const nickname = String(req.body?.nickname || '').normalize('NFKC').trim();
    const password = String(req.body?.password || '');
    if (!validateNickname(nickname)) return json(res, 400, { error: 'invalid_nickname' });
    if (!validatePassword(password)) return json(res, 400, { error: 'invalid_password' });

    const q = sql();
    const normalized = normalizeNickname(nickname);
    const exists = await q`SELECT 1 FROM players WHERE nickname_normalized = ${normalized} LIMIT 1`;
    if (exists[0]) return json(res, 409, { error: 'nickname_taken' });

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const recoveryCode = createRecoveryCode();
    const recoveryHash = tokenHash(recoveryCode);

    await q`
      INSERT INTO players (id, nickname, nickname_normalized, password_hash, recovery_hash)
      VALUES (${id}, ${nickname}, ${normalized}, ${passwordHash}, ${recoveryHash})
    `;
    await q`INSERT INTO player_stats (player_id) VALUES (${id})`;
    await createSession(id, res);

    const rows = await q`
      SELECT p.id, p.nickname, p.created_at, s.*
      FROM players p JOIN player_stats s ON s.player_id = p.id
      WHERE p.id = ${id}
    `;
    json(res, 201, { player: publicPlayer(rows[0]), recoveryCode });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return json(res, 409, { error: 'nickname_taken' });
    json(res, err.code === 'DB_NOT_CONFIGURED' ? 503 : 500, { error: err.code === 'DB_NOT_CONFIGURED' ? 'cloud_unavailable' : 'server_error' });
  }
};
