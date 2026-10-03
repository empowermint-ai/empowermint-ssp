// npm run i18n:export  ->  translations-review.csv
// One row per message: key, English, Afrikaans, screen, notes. A native speaker
// edits the "Afrikaans" column in a spreadsheet; npm run i18n:import applies it.
import fs from 'node:fs';
import path from 'node:path';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
import { ROOT, flatten, readMessages } from './lib.mjs';
import { toCsv } from './csv.mjs';

// Strings that most need a careful human look, with the reason shown in "notes".
const REVIEW_NOTES = {
  'ranking.scale': 'Literal translation of "weakest/strongest" - check tone. Same text in manage.scale.',
  'manage.scale': 'Literal translation of "weakest/strongest" - check tone.',
  'ranking.title': 'Original: "How confident are you in each?"',
  'install.iosStep2': 'Kept the English iOS menu name inside <b>: it must match the learner\'s phone language - confirm.',
  'install.androidStep': 'Kept English menu names inside <b>: they follow the phone language - confirm.',
  'install.addButton': 'Wording for the iOS/Android "Add to Home Screen" action - confirm.',
  'timer.status.green': 'Status caption under the timer dial (uppercase).',
  'timer.status.amber': 'Status caption under the timer dial (uppercase).',
  'timer.status.red': 'Status caption under the timer dial (uppercase).',
  'examTimer.status.green': 'Status caption under the exam timer dial.',
  'examTimer.status.amber': 'Status caption under the exam timer dial.',
  'examTimer.status.red': 'Status caption under the exam timer dial.',
  'examTimer.session.timesUp': 'Headline when the exam countdown ends.',
  'examTimer.entry.title': 'Card title - "exam timing".',
  'welcome.tagline': 'Brand tagline - supplied by the team: "Glo jy kan, beplan hoe jy sal".',
  'sessionComplete.quoteSource': 'Kept in English on purpose: a title (Mastering Your Studies).',
  'plan.examDone': 'Dash style - check punctuation.',
  'share.pdf.headline': 'Printed on the shared PDF; keep Latin-1 characters only.',
  'pastPapers.cardSubtitle': 'Must fit one/two lines on a 360px phone.',
  'language.changed': 'Shown as a toast after switching language.',
};
// Notes derived from the English text.
function autoNotes(en) {
  const notes = [];
  try {
    const args = new Set();
    const walk = (nodes) => nodes.forEach((n) => {
      if ([TYPE.argument, TYPE.number].includes(n.type)) args.add(`{${n.value}}`);
      if (n.type === TYPE.plural) { args.add(`{${n.value}} plural`); Object.values(n.options).forEach((o) => walk(o.value)); }
      if (n.type === TYPE.select) { args.add(`{${n.value}} select`); Object.values(n.options).forEach((o) => walk(o.value)); }
      if (n.type === TYPE.tag) { args.add(`<${n.value}>`); walk(n.children); }
    });
    walk(parse(en));
    if (args.size) notes.push('Keep: ' + [...args].join(' '));
  } catch { /* shown by i18n:check */ }
  if (en.includes('\n')) notes.push('Contains a line break (\\n).');
  return notes;
}

const en = flatten(readMessages('en'));
const af = flatten(readMessages('af'));
const rows = [['key', 'English', 'Afrikaans', 'screen', 'notes']];
for (const key of Object.keys(en)) {
  const notes = [REVIEW_NOTES[key], ...autoNotes(en[key])].filter(Boolean).join(' | ');
  rows.push([key, en[key], af[key] ?? '', key.split('.')[0], notes]);
}
const out = path.join(ROOT, 'translations-review.csv');
fs.writeFileSync(out, '﻿' + toCsv(rows)); // BOM so Excel reads UTF-8 (ê ë ï) correctly
console.log(`wrote ${rows.length - 1} rows -> ${path.relative(ROOT, out)}`);
