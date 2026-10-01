const { json, method, clearSessionCookie, requireSameOrigin } = require('../_lib/http');
const { destroySession } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST']) || !requireSameOrigin(req, res)) return;
  try {
    await destroySession(req);
    res.setHeader('Set-Cookie', clearSessionCookie());
    json(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'server_error' });
  }
};
