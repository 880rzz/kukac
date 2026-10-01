const { json, method } = require('../_lib/http');
const { currentPlayer, publicPlayer } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  try {
    const player = await currentPlayer(req);
    json(res, 200, { player: publicPlayer(player) });
  } catch (err) {
    console.error(err);
    json(res, err.code === 'DB_NOT_CONFIGURED' ? 503 : 500, { error: err.code === 'DB_NOT_CONFIGURED' ? 'cloud_unavailable' : 'server_error' });
  }
};
