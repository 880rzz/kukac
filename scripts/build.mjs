import { cp, mkdir, rm } from 'node:fs/promises';

const assets = [
  'index.html', 'styles.css', 'i18n.js', 'world.js',
  'actors.js', 'audio.js', 'account.js', 'game.js'
];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await Promise.all(assets.map(file => cp(file, `dist/${file}`)));
console.log(`Built ${assets.length} public assets in dist/`);
