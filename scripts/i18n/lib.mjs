// Shared helpers for the i18n scripts. Dev tooling only - nothing here ships.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
export const MESSAGES_DIR = path.join(ROOT, 'messages');

export function readMessages(lang) {
  return JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${lang}.json`), 'utf8'));
}

/** { a: { b: 'x' } } -> { 'a.b': 'x' } */
export function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, full, out);
    else out[full] = value;
  }
  return out;
}

export function listSourceFiles(dirs, exts = ['.ts', '.tsx']) {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        walk(full);
      } else if (exts.some((e) => entry.name.endsWith(e)) && !entry.name.endsWith('.d.ts')) {
        files.push(full);
      }
    }
  };
  dirs.forEach((d) => walk(path.join(ROOT, d)));
  return files;
}

export function enabledLanguageCodes() {
  return fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));
}
