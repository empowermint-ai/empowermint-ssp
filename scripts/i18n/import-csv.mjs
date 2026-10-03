// npm run i18n:import [file.csv]
// Applies the "Afrikaans" column of a reviewed CSV back into messages/af.json.
// Only existing keys are updated (new rows are ignored); run i18n:check after.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, MESSAGES_DIR, readMessages } from './lib.mjs';
import { parseCsv } from './csv.mjs';

const file = path.resolve(process.argv[2] ?? path.join(ROOT, 'translations-review.csv'));
const rows = parseCsv(fs.readFileSync(file, 'utf8'));
const [header, ...body] = rows;
const keyCol = header.indexOf('key');
const afCol = header.indexOf('Afrikaans');
if (keyCol < 0 || afCol < 0) {
  console.error('CSV must have "key" and "Afrikaans" columns.');
  process.exit(1);
}

const af = readMessages('af');
let changed = 0;
const missing = [];
for (const row of body) {
  const key = row[keyCol];
  const value = row[afCol];
  if (!key) continue;
  const parts = key.split('.');
  let node = af;
  for (const part of parts.slice(0, -1)) node = node?.[part];
  const leaf = parts[parts.length - 1];
  if (!node || typeof node[leaf] !== 'string') { missing.push(key); continue; }
  if (value !== '' && node[leaf] !== value) { node[leaf] = value; changed++; }
}
fs.writeFileSync(path.join(MESSAGES_DIR, 'af.json'), JSON.stringify(af, null, 2) + '\n');
console.log(`updated ${changed} string(s) in messages/af.json`);
if (missing.length) console.warn(`ignored ${missing.length} unknown key(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}`);
console.log('Now run: npm run i18n:check');
