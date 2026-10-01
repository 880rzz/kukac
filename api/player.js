const { sql, ensureSchema } = require('./_lib/db');
const { json, method } = require('./_lib/http');
const { normalizeNickname } = require('./_lib/security');
const { publicPlayer } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    await ensureSchema();
    const nickname = normalizeNickname(req.query?.nickname);
    const q = sql();
    const rows = await q`
      SELECT p.id, p.nickname, p.created_at, s.*,
        (SELECT COUNT(*) + 1
         FROM player_stats s2
         WHERE s2.high_score > s.high_score AND s2.total_games > 0) AS rank
      FROM players p
      JOIN player_stats s ON s.player_id = p.id
      WHERE p.nickname_normalized = ${nickname}
      LIMIT 1
    `;
    if (!rows[0]) return json(res, 404, { error: 'player_not_found' });
    json(res, 200, { player: { ...publicPlayer(rows[0]), rank: Number(rows[0].rank) } });
  } catch (err) {
    console.error(err);
    json(res, err.code === 'DB_NOT_CONFIGURED' ? 503 : 500, { error: err.code === 'DB_NOT_CONFIGURED' ? 'cloud_unavailable' : 'server_error' });
  }
};
