// npm run i18n:scan
// Fails if a component still contains user-visible English that does not go
// through the translator. Uses the TypeScript AST, not regexes.
//
// FLAGGED: JSX text; string values of text-bearing attributes (placeholder,
//   aria-label, alt, title, label); string literals inside JSX expression
//   children (e.g. {cond ? 'A' : 'B'}); string literals passed to setError /
//   setMessage / setStatus style setters.
// IGNORED (by design): className/style/href/src/key/id/name/type/value and
//   other non-text attributes; brand names (empowermint, em/power, empower,
//   Smart Study Planner, SSP); icon-only glyphs and punctuation; anything under
//   app/api; strings with no letters; code identifiers/URLs/CSS values; the
//   few lines listed in ALLOW below (with a reason).
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ROOT, listSourceFiles } from './lib.mjs';

const TEXT_ATTRS = new Set(['placeholder', 'aria-label', 'alt', 'title', 'label', 'aria-description']);
const BRAND = /^(empowermint|em\/power|empower|SSP|Smart Study Planner|empowermint SSP)$/i;
const SETTERS = /^set(Error|Message|Success|Status|Notice|Toast)\w*$/;

// file (relative) -> substrings that are allowed to stay literal, with a reason.
const ALLOW = {
  'app/layout.tsx': ['empower'], // PWA home-screen title: brand name
  'components/PhoneNumberInput.tsx': [], // placeholder comes from messages
};

function hasLetters(s) {
  return /[A-Za-zÀ-ɏ]{2,}/.test(s);
}
function isIgnorable(text) {
  const t = text.replace(/&[a-z]+;|&#\d+;/gi, ' ').trim();
  if (!t) return true;
  if (!hasLetters(t)) return true;
  if (BRAND.test(t)) return true;
  if (/^(https?:|mailto:|\/|#|[a-z]+-[a-z0-9-]+$)/i.test(t)) return true; // urls, class-like
  return false;
}

const findings = [];
for (const file of listSourceFiles(['app', 'components'], ['.tsx'])) {
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('app/api')) continue;
  const allow = ALLOW[rel] ?? [];
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const report = (node, what, value) => {
    const v = value.trim();
    if (isIgnorable(v) || allow.some((a) => v.includes(a))) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
    findings.push(`${rel}:${line + 1}  ${what}  "${v.replace(/\s+/g, ' ').slice(0, 70)}"`);
  };

  const isComparisonOperand = (node) =>
    ts.isBinaryExpression(node.parent) &&
    [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken].includes(node.parent.operatorToken.kind);
  // True only for text that is rendered directly: {cond ? 'A' : 'B'} / {'A'}.
  // Literals nested inside a call or object (t('key', { status: 'done' })) are data.
  const insideJsxExpressionChild = (node) => {
    if (isComparisonOperand(node)) return false;
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isJsxAttribute(p)) return false; // attribute values are handled separately
      if (ts.isCallExpression(p) || ts.isObjectLiteralExpression(p) || ts.isArrayLiteralExpression(p) || ts.isBinaryExpression(p) && isComparisonOperand(p.left) ) return false;
      if (ts.isJsxExpression(p) && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent))) return true;
    }
    return false;
  };

  (function visit(node) {
    if (ts.isJsxText(node)) report(node, 'jsx-text', node.getText());
    else if (ts.isJsxAttribute(node) && TEXT_ATTRS.has(node.name.getText()) && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) report(node, `attr ${node.name.getText()}`, node.initializer.text);
      else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        const lits = [];
        (function find(n) { if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) lits.push(n); ts.forEachChild(n, find); })(node.initializer.expression);
        // string literals that are call arguments (t('key')) are keys, not text
        lits.filter((n) => !ts.isCallExpression(n.parent)).forEach((n) => report(n, `attr ${node.name.getText()}`, n.text));
      }
    } else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && insideJsxExpressionChild(node)) {
      if (!ts.isCallExpression(node.parent) && !ts.isPropertyAssignment(node.parent)) report(node, 'jsx-expr string', node.text);
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && SETTERS.test(node.expression.text)) {
      const arg = node.arguments[0];
      if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) report(arg, `${node.expression.text}()`, arg.text);
    }
    ts.forEachChild(node, visit);
  })(sf);
}

if (findings.length) {
  console.error(`i18n:scan FAILED - ${findings.length} possible hard-coded string(s):\n` + findings.map((f) => ' - ' + f).join('\n'));
  process.exit(1);
}
console.log('i18n:scan OK - no hard-coded user-visible strings found in app/ and components/');
