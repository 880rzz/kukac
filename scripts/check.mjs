import { readFile, access } from 'node:fs/promises';
import vm from 'node:vm';

const publicFiles = ['index.html', 'styles.css', 'i18n.js', 'world.js', 'actors.js', 'audio.js', 'account.js', 'game.js'];
const cloudflareFiles = ['src/worker.js', 'wrangler.jsonc', 'migrations/0001_initial.sql', 'scripts/build.mjs'];
await Promise.all([...publicFiles, ...cloudflareFiles].map(file => access(file)));

for (const file of ['i18n.js', 'world.js', 'actors.js', 'audio.js', 'account.js', 'game.js']) {
  new vm.Script(await readFile(file, 'utf8'), { filename: file });
}
await import(new URL('../src/worker.js', import.meta.url));

const html = await readFile('index.html', 'utf8');
const game = await readFile('game.js', 'utf8');
const worker = await readFile('src/worker.js', 'utf8');
const schema = await readFile('migrations/0001_initial.sql', 'utf8');
const config = JSON.parse((await readFile('wrangler.jsonc', 'utf8')).replace(/^\s*\/\/.*$/gm, ''));

if (!html.includes('<html lang="de">')) throw new Error('German default language missing');
for (const file of publicFiles.filter(file => file.endsWith('.js') || file.endsWith('.css'))) {
  if (!html.includes(file)) throw new Error(`Missing asset reference ${file}`);
}
for (const id of ['accountBtn', 'leaderboardBtn', 'account', 'leaderboard', 'playerProfile']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing #${id}`);
}
for (const token of ['gameState', '__KUKAC_QA__', 'triggerRoyalEvent', 'triggerDragonEvent']) {
  if (!game.includes(token)) throw new Error(`Missing gameplay feature ${token}`);
}
for (const token of ['scrypt', 'timingSafeEqual', 'HttpOnly', 'Secure', 'SameSite=Lax', 'requireSameOrigin',
  'finished_at IS NULL', 'claim.meta.changes', 'prepare(', '.bind(']) {
  if (!worker.includes(token)) throw new Error(`Missing Worker security contract ${token}`);
}
for (const table of ['players', 'player_stats', 'auth_sessions', 'game_runs']) {
  if (!schema.includes(`CREATE TABLE ${table}`)) throw new Error(`Missing D1 table ${table}`);
}
if (config.d1_databases?.[0]?.binding !== 'DB') throw new Error('D1 DB binding missing');
if (config.assets?.binding !== 'ASSETS') throw new Error('static ASSETS binding missing');
if (!Array.isArray(config.assets?.run_worker_first) || !config.assets.run_worker_first.includes('/api/*')) {
  throw new Error('API Worker-first route missing');
}
console.log('KUKAC Cloudflare syntax, security, schema and feature contracts passed');
