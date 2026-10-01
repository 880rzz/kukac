import assert from 'node:assert/strict';

const base = process.env.KUKAC_QA_ORIGIN || 'http://127.0.0.1:8787';
const nickname = `QA_${Date.now().toString(36)}`;
const password = 'QA-password-2026';
let cookie = '';

async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: { Origin: base, 'Content-Type': 'application/json', Cookie: cookie, ...(options.headers || {}) }
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return { response, body: await response.json() };
}

let result = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ nickname, password }) });
assert.equal(result.response.status, 201);
assert.equal(result.body.player.nickname, nickname);
assert.match(result.body.recoveryCode, /^KUKAC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
const recoveryCode = result.body.recoveryCode;

result = await request('/api/auth/me');
assert.equal(result.body.player.nickname, nickname);
result = await request('/api/auth/logout', { method: 'POST', body: '{}' });
assert.equal(result.response.status, 200);
result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ nickname, password }) });
assert.equal(result.response.status, 200);
result = await request('/api/auth/recover-nickname', { method: 'POST', body: JSON.stringify({ recoveryCode }) });
assert.equal(result.body.nickname, nickname);

result = await request('/api/game/start', { method: 'POST', body: '{}' });
assert.equal(result.response.status, 201);
const runId = result.body.runId;
await new Promise(resolve => setTimeout(resolve, 900));
result = await request('/api/game/submit', { method: 'POST', body: JSON.stringify({
  runId, score: 10, level: 1, stars: 1, coins: 0, playMs: 900,
  bestCombo: 1, starsRecovered: 0, dragonSurvivals: 0, royalStars: 0
}) });
assert.equal(result.response.status, 200);
assert.equal(result.body.accepted, true);

result = await request('/api/game/submit', { method: 'POST', body: JSON.stringify({ runId, score: 10 }) });
assert.equal(result.response.status, 409);
assert.equal(result.body.error, 'run_already_submitted');
result = await request('/api/leaderboard?limit=50');
assert.ok(result.body.leaderboard.some(row => row.nickname === nickname));
result = await request(`/api/player?nickname=${encodeURIComponent(nickname)}`);
assert.equal(result.body.player.highScore, 10);

result = await fetch(base + '/api/game/start', {
  method: 'POST', headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json', Cookie: cookie }, body: '{}'
}).then(async response => ({ response, body: await response.json() }));
assert.equal(result.response.status, 403);
assert.equal(result.body.error, 'origin_rejected');
console.log('KUKAC D1 auth, recovery, leaderboard, profile, score and anti-cheat API QA passed');
