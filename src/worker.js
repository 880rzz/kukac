import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const MAX_BODY_BYTES = 8 * 1024;

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders
    }
  });
}

function method(request, allowed) {
  if (allowed.includes(request.method)) return null;
  return json(405, { error: 'method_not_allowed' }, { Allow: allowed.join(', ') });
}

function requireSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  return origin === new URL(request.url).origin ? null : json(403, { error: 'origin_rejected' });
}

async function body(request) {
  const contentType = request.headers.get('Content-Type') || '';
  const length = Number(request.headers.get('Content-Length') || 0);
  if (!contentType.toLowerCase().startsWith('application/json')) throw apiError(415, 'unsupported_media_type');
  if (length > MAX_BODY_BYTES) throw apiError(413, 'payload_too_large');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw apiError(413, 'payload_too_large');
  try { return text ? JSON.parse(text) : {}; } catch { throw apiError(400, 'invalid_json'); }
}

function apiError(status, code) {
  const error = new Error(code);
  error.status = status;
  error.code = code;
  return error;
}

function cookies(request) {
  const values = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    try {
      values[decodeURIComponent(part.slice(0, index).trim())] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {}
  }
  return values;
}

function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `kukac_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function normalizeNickname(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function validateNickname(value) {
  return /^[\p{L}\p{N}_-]{3,20}$/u.test(String(value || '').normalize('NFKC').trim());
}

function validatePassword(value) {
  const password = String(value || '');
  return password.length >= 8 && password.length <= 128;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}

async function verifyPassword(password, stored) {
  try {
    const [kind, n, r, p, salt64, hash64] = String(stored).split('$');
    if (kind !== 'scrypt') return false;
    const params = { N: Number(n), r: Number(r), p: Number(p) };
    if (params.N !== 16384 || params.r !== 8 || params.p !== 1) return false;
    const salt = Buffer.from(salt64, 'base64url');
    const expected = Buffer.from(hash64, 'base64url');
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = Buffer.from(await scryptAsync(String(password), salt, expected.length, params));
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
const tokenHash = token => crypto.createHash('sha256').update(String(token)).digest('hex');

function createRecoveryCode() {
  const raw = crypto.randomBytes(12).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return `KUKAC-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

async function createSession(env, playerId) {
  const token = randomToken();
  await env.DB.prepare('INSERT INTO auth_sessions (token_hash, player_id, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash(token), playerId, Math.floor(Date.now() / 1000) + SESSION_SECONDS).run();
  return token;
}

async function currentPlayer(request, env) {
  const token = cookies(request).kukac_session;
  if (!token) return null;
  const hash = tokenHash(token);
  const row = await env.DB.prepare(`
    SELECT p.id, p.nickname, p.created_at,
      s.high_score, s.highest_level, s.total_games, s.total_stars,
      s.total_coins, s.total_play_ms, s.best_combo, s.stars_recovered,
      s.dragon_survivals, s.royal_stars
    FROM auth_sessions a
    JOIN players p ON p.id = a.player_id
    JOIN player_stats s ON s.player_id = p.id
    WHERE a.token_hash = ? AND a.expires_at > unixepoch()
    LIMIT 1`).bind(hash).first();
  if (!row) return null;
  await env.DB.batch([
    env.DB.prepare('UPDATE auth_sessions SET last_seen_at = unixepoch() WHERE token_hash = ?').bind(hash),
    env.DB.prepare('UPDATE players SET last_seen_at = unixepoch() WHERE id = ?').bind(row.id)
  ]);
  return row;
}

function publicPlayer(row) {
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    createdAt: new Date(Number(row.created_at) * 1000).toISOString(),
    highScore: Number(row.high_score || 0),
    highestLevel: Number(row.highest_level || 1),
    totalGames: Number(row.total_games || 0),
    totalStars: Number(row.total_stars || 0),
    totalCoins: Number(row.total_coins || 0),
    totalPlayMs: Number(row.total_play_ms || 0),
    bestCombo: Number(row.best_combo || 0),
    starsRecovered: Number(row.stars_recovered || 0),
    dragonSurvivals: Number(row.dragon_survivals || 0),
    royalStars: Number(row.royal_stars || 0)
  };
}

async function register(request, env) {
  const input = await body(request);
  const nickname = String(input.nickname || '').normalize('NFKC').trim();
  const password = String(input.password || '');
  if (!validateNickname(nickname)) return json(400, { error: 'invalid_nickname' });
  if (!validatePassword(password)) return json(400, { error: 'invalid_password' });
  const id = crypto.randomUUID();
  const recoveryCode = createRecoveryCode();
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO players
        (id, nickname, nickname_normalized, password_hash, recovery_hash)
        VALUES (?, ?, ?, ?, ?)`)
        .bind(id, nickname, normalizeNickname(nickname), await hashPassword(password), tokenHash(recoveryCode)),
      env.DB.prepare('INSERT INTO player_stats (player_id) VALUES (?)').bind(id)
    ]);
  } catch (error) {
    if (String(error?.message || '').includes('UNIQUE constraint failed')) return json(409, { error: 'nickname_taken' });
    throw error;
  }
  const token = await createSession(env, id);
  const row = await playerById(env, id);
  return json(201, { player: publicPlayer(row), recoveryCode }, { 'Set-Cookie': sessionCookie(token) });
}

async function login(request, env) {
  const input = await body(request);
  const row = await env.DB.prepare(`SELECT p.id, p.nickname, p.password_hash, p.created_at, s.*
    FROM players p JOIN player_stats s ON s.player_id = p.id
    WHERE p.nickname_normalized = ? LIMIT 1`).bind(normalizeNickname(input.nickname)).first();
  if (!row || !(await verifyPassword(String(input.password || ''), row.password_hash))) {
    return json(401, { error: 'invalid_credentials' });
  }
  const token = await createSession(env, row.id);
  return json(200, { player: publicPlayer(row) }, { 'Set-Cookie': sessionCookie(token) });
}

async function logout(request, env) {
  const token = cookies(request).kukac_session;
  if (token) await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash(token)).run();
  return json(200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
}

async function recoverNickname(request, env) {
  const input = await body(request);
  const code = String(input.recoveryCode || '').trim().toUpperCase();
  if (!/^KUKAC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return json(400, { error: 'invalid_recovery_code' });
  const row = await env.DB.prepare('SELECT nickname FROM players WHERE recovery_hash = ? LIMIT 1').bind(tokenHash(code)).first();
  return row ? json(200, { nickname: row.nickname }) : json(404, { error: 'recovery_not_found' });
}

async function playerById(env, id) {
  return env.DB.prepare(`SELECT p.id, p.nickname, p.created_at, s.*
    FROM players p JOIN player_stats s ON s.player_id = p.id WHERE p.id = ?`).bind(id).first();
}

async function leaderboard(url, env) {
  const requested = Number(url.searchParams.get('limit') || 50);
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(100, Math.floor(requested))) : 50;
  const { results } = await env.DB.prepare(`SELECT p.nickname, s.high_score, s.highest_level, s.total_games,
    ROW_NUMBER() OVER (ORDER BY s.high_score DESC, s.updated_at ASC, p.created_at ASC) AS rank
    FROM players p JOIN player_stats s ON s.player_id = p.id
    WHERE s.total_games > 0 ORDER BY s.high_score DESC, s.updated_at ASC, p.created_at ASC LIMIT ?`).bind(limit).all();
  return json(200, { leaderboard: results.map(row => ({
    rank: Number(row.rank), nickname: row.nickname, highScore: Number(row.high_score),
    highestLevel: Number(row.highest_level), totalGames: Number(row.total_games)
  })) });
}

async function playerProfile(url, env) {
  const nickname = normalizeNickname(url.searchParams.get('nickname'));
  const row = await env.DB.prepare(`SELECT p.id, p.nickname, p.created_at, s.*,
    (SELECT COUNT(*) + 1 FROM player_stats s2 WHERE s2.high_score > s.high_score AND s2.total_games > 0) AS rank
    FROM players p JOIN player_stats s ON s.player_id = p.id
    WHERE p.nickname_normalized = ? LIMIT 1`).bind(nickname).first();
  return row ? json(200, { player: { ...publicPlayer(row), rank: Number(row.rank) } }) : json(404, { error: 'player_not_found' });
}

async function startRun(request, env) {
  const player = await currentPlayer(request, env);
  if (!player) return json(401, { error: 'auth_required' });
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO game_runs (id, player_id, verified) VALUES (?, ?, NULL)').bind(id, player.id).run();
  return json(201, { runId: id });
}

function integer(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

async function submitRun(request, env) {
  const player = await currentPlayer(request, env);
  if (!player) return json(401, { error: 'auth_required' });
  const input = await body(request);
  const runId = String(input.runId || '');
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return json(404, { error: 'run_not_found' });
  const values = {
    score: integer(input.score, 0, 10_000_000), level: integer(input.level, 1, 10_000),
    stars: integer(input.stars, 0, 1_000_000), coins: integer(input.coins, 0, 1_000_000),
    playMs: integer(input.playMs, 0, 21_600_000), bestCombo: integer(input.bestCombo, 0, 1_000_000),
    starsRecovered: integer(input.starsRecovered, 0, 1_000_000),
    dragonSurvivals: integer(input.dragonSurvivals, 0, 1_000_000), royalStars: integer(input.royalStars, 0, 1_000_000)
  };
  const run = await env.DB.prepare('SELECT id, started_at, finished_at FROM game_runs WHERE id = ? AND player_id = ? LIMIT 1')
    .bind(runId, player.id).first();
  if (!run) return json(404, { error: 'run_not_found' });
  if (run.finished_at) return json(409, { error: 'run_already_submitted' });
  const serverMs = Date.now() - Number(run.started_at) * 1000;
  const maxScore = values.stars * 75 + values.coins * 30 + values.starsRecovered * 25 + values.royalStars * 80 + 250;
  const plausible = serverMs >= 800 && serverMs <= 21_600_000 && values.playMs <= serverMs + 15_000 &&
    values.playMs >= Math.max(0, serverMs - 120_000) && values.score <= maxScore &&
    values.level <= Math.floor(values.score / 80) + 3 && values.starsRecovered <= values.stars + 50 &&
    values.royalStars <= values.stars + 10;
  const claim = await env.DB.prepare(`UPDATE game_runs SET finished_at = unixepoch(), score = ?, level = ?, stars = ?,
    coins = ?, play_ms = ?, best_combo = ?, stars_recovered = ?, dragon_survivals = ?, royal_stars = ?,
    verified = ?, reject_reason = ? WHERE id = ? AND player_id = ? AND finished_at IS NULL`)
    .bind(values.score, values.level, values.stars, values.coins, values.playMs, values.bestCombo,
      values.starsRecovered, values.dragonSurvivals, values.royalStars, plausible ? 1 : 0,
      plausible ? null : 'plausibility_check', runId, player.id).run();
  if (claim.meta.changes !== 1) return json(409, { error: 'run_already_submitted' });
  if (!plausible) return json(422, { error: 'score_rejected' });
  await env.DB.prepare(`UPDATE player_stats SET high_score = MAX(high_score, ?), highest_level = MAX(highest_level, ?),
    total_games = total_games + 1, total_stars = total_stars + ?, total_coins = total_coins + ?,
    total_play_ms = total_play_ms + ?, best_combo = MAX(best_combo, ?), stars_recovered = stars_recovered + ?,
    dragon_survivals = dragon_survivals + ?, royal_stars = royal_stars + ?, updated_at = unixepoch()
    WHERE player_id = ?`).bind(values.score, values.level, values.stars, values.coins, values.playMs,
      values.bestCombo, values.starsRecovered, values.dragonSurvivals, values.royalStars, player.id).run();
  return json(200, { accepted: true, player: publicPlayer(await playerById(env, player.id)) });
}

const routes = new Map([
  ['POST /api/auth/register', register], ['POST /api/auth/login', login],
  ['POST /api/auth/logout', logout], ['POST /api/auth/recover-nickname', recoverNickname],
  ['POST /api/game/start', startRun], ['POST /api/game/submit', submitRun]
]);

async function api(request, env) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/auth/me') {
    return json(200, { player: publicPlayer(await currentPlayer(request, env)) });
  }
  if (request.method === 'GET' && url.pathname === '/api/leaderboard') return leaderboard(url, env);
  if (request.method === 'GET' && url.pathname === '/api/player') return playerProfile(url, env);
  const samePath = [...routes.keys()].filter(key => key.endsWith(` ${url.pathname}`));
  if (!samePath.length) return json(404, { error: 'not_found' });
  const handler = routes.get(`${request.method} ${url.pathname}`);
  if (!handler) return method(request, samePath.map(key => key.split(' ')[0]));
  const originError = requireSameOrigin(request);
  return originError || handler(request, env);
}

export default {
  async fetch(request, env) {
    try {
      if (new URL(request.url).pathname.startsWith('/api/')) return await api(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      if (error?.status) return json(error.status, { error: error.code });
      console.error(JSON.stringify({ event: 'request_error', message: String(error?.message || error) }));
      return json(500, { error: 'server_error' });
    }
  }
};
