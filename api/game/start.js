const crypto = require('node:crypto');
const { sql, ensureSchema } = require('../_lib/db');
const { json, method, requireSameOrigin } = require('../_lib/http');
const { currentPlayer } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  try {
    await ensureSchema();
    const player = await currentPlayer(req);
    if (!player) return json(res, 401, { error: 'auth_required' });
    const id = crypto.randomUUID();
    await sql()`
      INSERT INTO game_runs (id, player_id, verified)
      VALUES (${id}, ${player.id}, NULL)
    `;
    json(res, 201, { runId: id });
  } catch (err) {
    console.error(err);
    json(res, err.code === 'DB_NOT_CONFIGURED' ? 503 : 500, { error: err.code === 'DB_NOT_CONFIGURED' ? 'cloud_unavailable' : 'server_error' });
  }
};
