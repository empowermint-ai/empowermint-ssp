import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = process.argv[2] || './welcome-out';
const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
];
const THEMES = ['light', 'dark'];

async function main() {
  const browser = await chromium.launch();
  await mkdir(OUT_DIR, { recursive: true });
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const dir = path.join(OUT_DIR, viewport.name, theme);
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, '01-welcome.png'), fullPage: true });
      console.log(`OK ${viewport.name}/${theme}/01-welcome`);
      await ctx.close();
    }
  }
  await browser.close();
}

main();
