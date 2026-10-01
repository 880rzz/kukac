const { sql, ensureSchema } = require('./_lib/db');
const { json, method } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    await ensureSchema();
    const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 50)));
    const rows = await sql()`
      SELECT p.nickname, s.high_score, s.highest_level, s.total_games,
             ROW_NUMBER() OVER (ORDER BY s.high_score DESC, s.updated_at ASC, p.created_at ASC) AS rank
      FROM players p
      JOIN player_stats s ON s.player_id = p.id
      WHERE s.total_games > 0
      ORDER BY s.high_score DESC, s.updated_at ASC, p.created_at ASC
      LIMIT ${limit}
    `;
    json(res, 200, {
      leaderboard: rows.map(r => ({
        rank: Number(r.rank),
        nickname: r.nickname,
        highScore: Number(r.high_score),
        highestLevel: Number(r.highest_level),
        totalGames: Number(r.total_games)
      }))
    });
  } catch (err) {
    console.error(err);
    json(res, err.code === 'DB_NOT_CONFIGURED' ? 503 : 500, { error: err.code === 'DB_NOT_CONFIGURED' ? 'cloud_unavailable' : 'server_error' });
  }
};
