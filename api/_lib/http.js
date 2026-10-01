function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function method(req, res, allowed) {
  if (!allowed.includes(req.method)) {
    res.setHeader('Allow', allowed.join(', '));
    json(res, 405, { error: 'method_not_allowed' });
    return false;
  }
  return true;
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[decodeURIComponent(part.slice(0, i).trim())] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function sessionCookie(token, maxAge = 60 * 60 * 24 * 30) {
  return [
    'kukac_session=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    process.env.VERCEL ? 'Secure' : '',
    'Max-Age=' + maxAge
  ].filter(Boolean).join('; ');
}

function clearSessionCookie() {
  return 'kukac_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + (process.env.VERCEL ? '; Secure' : '');
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (process.env.VERCEL ? 'https' : 'http');
  return origin === proto + '://' + host;
}

function requireSameOrigin(req, res) {
  if (!sameOrigin(req)) {
    json(res, 403, { error: 'origin_rejected' });
    return false;
  }
  return true;
}

module.exports = { json, method, parseCookies, sessionCookie, clearSessionCookie, requireSameOrigin };
