const crypto = require('node:crypto');
const { sql, ensureSchema } = require('./db');
const { parseCookies, sessionCookie } = require('./http');
const { randomToken, tokenHash } = require('./security');

const SESSION_DAYS = 30;

async function createSession(playerId, res) {
  await ensureSchema();
  const q = sql();
  const token = randomToken(32);
  const hash = tokenHash(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await q`
    INSERT INTO auth_sessions (token_hash, player_id, expires_at)
    VALUES (${hash}, ${playerId}, ${expires.toISOString()})
  `;
  res.setHeader('Set-Cookie', sessionCookie(token));
  return token;
}

async function currentPlayer(req) {
  await ensureSchema();
  const token = parseCookies(req).kukac_session;
  if (!token) return null;
  const hash = tokenHash(token);
  const q = sql();
  const rows = await q`
    SELECT p.id, p.nickname, p.created_at,
           s.high_score, s.highest_level, s.total_games, s.total_stars,
           s.total_coins, s.total_play_ms, s.best_combo, s.stars_recovered,
           s.dragon_survivals, s.royal_stars
    FROM auth_sessions a
    JOIN players p ON p.id = a.player_id
    JOIN player_stats s ON s.player_id = p.id
    WHERE a.token_hash = ${hash} AND a.expires_at > NOW()
    LIMIT 1
  `;
  if (!rows[0]) return null;
  await q`UPDATE auth_sessions SET last_seen_at = NOW() WHERE token_hash = ${hash}`;
  await q`UPDATE players SET last_seen_at = NOW() WHERE id = ${rows[0].id}`;
  return rows[0];
}

async function destroySession(req) {
  await ensureSchema();
  const token = parseCookies(req).kukac_session;
  if (!token) return;
  await sql()`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash(token)}`;
}

function publicPlayer(row) {
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    createdAt: row.created_at,
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

module.exports = { createSession, currentPlayer, destroySession, publicPlayer };
