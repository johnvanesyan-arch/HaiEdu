import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const requiredMirrors = ['grading.ts', 'mastery.ts', 'practice.ts', 'recommendation.ts', 'types.ts'];

// Normalize only relative module specifiers, never comments or ordinary strings.
export function normalizeImports(source) {
  const ast = ts.createSourceFile('core.ts', source, ts.ScriptTarget.Latest, true);
  const edits = [];
  function visit(node) {
    let specifier;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0];
    if (specifier && ts.isStringLiteral(specifier) && /^\.{1,2}\//.test(specifier.text) && specifier.text.endsWith('.js')) {
      edits.push({ start: specifier.getEnd() - 4, end: specifier.getEnd() - 1 });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const { start, end } of edits.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, start) + '.ts' + source.slice(end);
  }
  return source;
}

export function checkCoreParity(root = fileURLToPath(new URL('../', import.meta.url))) {
  const core = resolve(root, 'backend/core');
  const shared = resolve(root, 'supabase/functions/_shared');
  const names = new Set(requiredMirrors);
  // Automatically include new mirrored modules; core-only and Edge-only helpers are intentional.
  for (const name of readdirSync(core)) {
    if (name.endsWith('.ts') && existsSync(resolve(shared, name))) names.add(name);
  }
  const errors = [];
  for (const name of [...names].sort()) {
    const paths = [resolve(core, name), resolve(shared, name)];
    const missing = paths.filter(path => !existsSync(path));
    if (missing.length) {
      errors.push(`${name}: missing ${missing.join(', ')}`);
      continue;
    }
    const [left, right] = paths.map(path => normalizeImports(readFileSync(path, 'utf8')));
    if (left !== right) errors.push(`${name}: backend/core and supabase/functions/_shared differ beyond relative import extensions`);
  }
  return { checked: names.size, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { checked, errors } = checkCoreParity();
  if (errors.length) {
    console.error('Core parity failed:\n' + errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Core parity passed (${checked} mirrored modules).`);
  }
}
