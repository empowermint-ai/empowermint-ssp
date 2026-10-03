// node scripts/i18n/compare.mjs <dirA> <dirB>  - pixel-compares two sweep output folders.
import fs from 'node:fs';
import path from 'node:path';
import { diffImages, launch } from './qa-lib.mjs';

const [a, b] = process.argv.slice(2);
const browser = await launch();
let total = 0, same = 0;
const different = [];
for (const vp of fs.readdirSync(a).filter((f) => fs.statSync(path.join(a, f)).isDirectory())) {
  for (const scheme of fs.readdirSync(path.join(a, vp))) {
    for (const file of fs.readdirSync(path.join(a, vp, scheme)).filter((f) => f.endsWith('.png'))) {
      const fa = path.join(a, vp, scheme, file), fb = path.join(b, vp, scheme, file);
      total++;
      if (!fs.existsSync(fb)) { different.push(`${vp}/${scheme}/${file}: missing in B`); continue; }
      const r = await diffImages(browser, fa, fb);
      if (r.sizeMismatch) different.push(`${vp}/${scheme}/${file}: size ${r.a} vs ${r.b}`);
      else if (r.diff > 0) different.push(`${vp}/${scheme}/${file}: ${r.diff}px differ, box ${r.box}`);
      else same++;
    }
  }
}
await browser.close();
console.log(`${same}/${total} screenshots pixel-identical`);
different.forEach((d) => console.log('  DIFF', d));
