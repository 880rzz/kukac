const { sql, ensureSchema } = require('../_lib/db');
const { json, method, requireSameOrigin } = require('../_lib/http');
const { tokenHash } = require('../_lib/security');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  try {
    await ensureSchema();
    const code = String(req.body?.recoveryCode || '').trim().toUpperCase();
    if (code.length < 10) return json(res, 400, { error: 'invalid_recovery_code' });
    const rows = await sql()`
      SELECT nickname FROM players WHERE recovery_hash = ${tokenHash(code)} LIMIT 1
    `;
    if (!rows[0]) return json(res, 404, { error: 'recovery_not_found' });
    json(res, 200, { nickname: rows[0].nickname });
  } catch (err) {
    console.error(err);
    json(res, err.code === 'DB_NOT_CONFIGURED' ? 503 : 500, { error: err.code === 'DB_NOT_CONFIGURED' ? 'cloud_unavailable' : 'server_error' });
  }
};
