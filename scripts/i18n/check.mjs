// npm run i18n:check
// Fails on: a key missing from any language, a key that exists only in a
// translation, ICU syntax errors, placeholder/plural/tag mismatches against
// English, the single character U+0149, empty values, and unused keys.
import fs from 'node:fs';
import ts from 'typescript';
import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
import { ROOT, flatten, listSourceFiles, readMessages, enabledLanguageCodes } from './lib.mjs';

const BASE = 'en';
const problems = [];
const fail = (msg) => problems.push(msg);

// Keys that are read through a translator passed as a function argument, which
// the static scan below cannot follow back to a namespace.
const EXTRA_USED = new Set(['examTimer.durationHours', 'examTimer.durationHoursMinutes']);

// ---- 1. structure ------------------------------------------------------
const languages = enabledLanguageCodes();
const flat = Object.fromEntries(languages.map((l) => [l, flatten(readMessages(l))]));
const baseKeys = Object.keys(flat[BASE]);

for (const lang of languages.filter((l) => l !== BASE)) {
  for (const key of baseKeys) if (!(key in flat[lang])) fail(`[${lang}] missing key: ${key}`);
  for (const key of Object.keys(flat[lang])) if (!(key in flat[BASE])) fail(`[${lang}] key not in ${BASE}: ${key}`);
}

// ---- 2. ICU shape ------------------------------------------------------
function shape(message, where) {
  const args = new Map();
  const tags = new Set();
  const walk = (nodes) => {
    for (const node of nodes) {
      switch (node.type) {
        case TYPE.argument: args.set(node.value, 'arg'); break;
        case TYPE.number: case TYPE.date: case TYPE.time: args.set(node.value, TYPE[node.type]); break;
        case TYPE.plural: args.set(node.value, 'plural'); Object.values(node.options).forEach((o) => walk(o.value)); break;
        case TYPE.select: args.set(node.value, 'select'); Object.values(node.options).forEach((o) => walk(o.value)); break;
        case TYPE.tag: tags.add(node.value); walk(node.children); break;
        default: break;
      }
    }
  };
  try {
    walk(parse(message));
  } catch (error) {
    fail(`${where}: invalid ICU message (${error.message.split('\n')[0]})`);
  }
  return { args, tags };
}

for (const lang of languages) {
  for (const [key, value] of Object.entries(flat[lang])) {
    if (typeof value !== 'string' || value.trim() === '') fail(`[${lang}] empty value: ${key}`);
    if (typeof value === 'string' && value.includes('ŉ')) fail(`[${lang}] uses U+0149 (use 'n): ${key}`);
  }
}
for (const lang of languages.filter((l) => l !== BASE)) {
  for (const key of baseKeys) {
    if (!(key in flat[lang])) continue;
    const a = shape(flat[BASE][key], `[${BASE}] ${key}`);
    const b = shape(flat[lang][key], `[${lang}] ${key}`);
    const same = (x, y) => x.size === y.size && [...x].every(([k, v]) => y.get(k) === v);
    if (!same(a.args, b.args)) fail(`[${lang}] placeholder mismatch in ${key}: en {${[...a.args].map(([k, v]) => `${k}:${v}`)}} vs {${[...b.args].map(([k, v]) => `${k}:${v}`)}}`);
    if ([...a.tags].sort().join() !== [...b.tags].sort().join()) fail(`[${lang}] tag mismatch in ${key}`);
  }
}

// ---- 3. unused keys ----------------------------------------------------
const used = new Set(EXTRA_USED);
const patterns = []; // regexes for template/dynamic usage
const dynamicNamespaces = new Set(); // namespace used with a non-literal key

function templateToRegex(node, ns) {
  let source = '';
  if (ts.isNoSubstitutionTemplateLiteral(node)) source = escape(node.text);
  else {
    source = escape(node.head.text);
    for (const span of node.templateSpans) source += '[^.]+' + escape(span.literal.text);
  }
  return new RegExp(`^${escape(ns ? ns + '.' : '')}${source}$`.replace(/\\\[\\\^\\\.\\\]\\\+/g, '[^.]+'));
}
function escape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

for (const file of listSourceFiles(['app', 'components', 'lib', 'config', 'i18n'])) {
  const text = fs.readFileSync(file, 'utf8');
  if (!/useTranslations|getTranslations/.test(text)) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const bindings = new Map(); // variable name -> namespace ('' = root)

  const unwrap = (n) => (n && (ts.isAwaitExpression(n) ? unwrap(n.expression) : n));
  (function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const call = unwrap(node.initializer);
      if (call && ts.isCallExpression(call) && ts.isIdentifier(call.expression) && /^(useTranslations|getTranslations)$/.test(call.expression.text)) {
        const arg = call.arguments[0];
        bindings.set(node.name.text, arg && ts.isStringLiteral(arg) ? arg.text : '');
      }
    }
    ts.forEachChild(node, collect);
  })(sf);

  (function visit(node) {
    if (ts.isCallExpression(node)) {
      let name;
      const callee = node.expression;
      if (ts.isIdentifier(callee)) name = callee.text;
      else if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && /^(rich|has|raw|markup)$/.test(callee.name.text)) name = callee.expression.text;
      if (name && bindings.has(name)) {
        const ns = bindings.get(name);
        const arg = node.arguments[0];
        const prefix = ns ? ns + '.' : '';
        if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) used.add(prefix + arg.text);
        else if (arg && ts.isTemplateExpression(arg)) patterns.push(templateToRegex(arg, ns));
        else if (arg) dynamicNamespaces.add(ns);
      }
    }
    ts.forEachChild(node, visit);
  })(sf);
}

for (const key of baseKeys) {
  if (used.has(key)) continue;
  if (patterns.some((re) => re.test(key))) continue;
  if ([...dynamicNamespaces].some((ns) => ns && key.startsWith(ns + '.'))) continue;
  fail(`unused key: ${key}`);
}

// ---- report ------------------------------------------------------------
if (problems.length) {
  console.error(`i18n:check FAILED (${problems.length})\n` + problems.map((p) => ' - ' + p).join('\n'));
  process.exit(1);
}
console.log(`i18n:check OK - ${baseKeys.length} keys, languages: ${languages.join(', ')}`);
if (dynamicNamespaces.size) console.log(`  (namespaces read with a non-literal key, treated as used: ${[...dynamicNamespaces].join(', ')})`);
