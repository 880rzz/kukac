import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.KUKAC_QA_ORIGIN || 'http://127.0.0.1:8787';
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 }
];
await mkdir('qa-artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(`${base}/?qa=1&seed=42`, { waitUntil: 'networkidle' });
    if (await page.locator('#startLangSelect').inputValue() !== 'de') throw new Error(`${viewport.name}: German default missing`);
    await page.selectOption('#startLangSelect', 'en');
    if ((await page.locator('#startBtn').innerText()).trim() !== 'START GAME') throw new Error(`${viewport.name}: i18n switch failed`);
    if ((await page.locator('.creator-credit').innerText()).trim() !== 'CREATED BY ILIÁN SIPOS, 2026') throw new Error(`${viewport.name}: creator credit missing`);
    await page.click('#startIdentity');
    if (await page.locator('#account').evaluate(element => getComputedStyle(element).display) === 'none') throw new Error(`${viewport.name}: account overlay failed`);
    await page.click('#closeAccount');
    await page.click('#startBtn');
    await page.waitForTimeout(500);
    await page.click('#leaderboardBtn');
    await page.waitForSelector('#leaderboardBody .leader-row');
    await page.click('#closeLeaderboard');
    const canvas = await page.locator('canvas').boundingBox();
    if (!canvas || canvas.width < 100 || canvas.height < 100) throw new Error(`${viewport.name}: WebGL canvas missing`);
    if (viewport.name !== 'desktop' && await page.locator('#boost').evaluate(element => getComputedStyle(element).display) === 'none') {
      throw new Error(`${viewport.name}: touch boost missing`);
    }
    if (viewport.name === 'desktop') {
      const state = await page.evaluate(() => {
        const api = window.__KUKAC_QA__;
        const initial = api.resetTest();
        const collisions = [api.collide(), api.collide(), api.collide(), api.collide(), api.collide()];
        return { initial, collisions, royal: api.triggerRoyal(), dragon: api.triggerDragon(), collectible: api.ensureCollectible() };
      });
      if (state.initial.lives !== 5 || state.initial.shield !== 3) throw new Error('desktop: initial survival state invalid');
      if (state.collisions[2].shield !== 0 || state.collisions[3].lives !== 4 || state.collisions[4].lives !== 3) throw new Error('desktop: collision progression failed');
      if (!state.royal.royal || !state.dragon || !state.collectible) throw new Error('desktop: event regression failed');
    }
    if (errors.length) throw new Error(`${viewport.name}: ${errors.join(' | ')}`);
    await page.screenshot({ path: `qa-artifacts/${viewport.name}.png`, fullPage: true });
    await page.close();
  }
  console.log('KUKAC desktop, tablet and mobile browser QA passed');
} finally {
  await browser.close();
}
