import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeImports, checkCoreParity } from '../scripts/check-core-parity.mjs';

test('parity normalizes relative module specifiers only', () => {
  const source = `import type { A } from './types.js';
export { A } from "../types.js";
import './side-effect.js';
type T = import('./types.js').A;
const lazy = import('./lazy.js');
const label = './types.js'; // import './comment.js'
import packageValue from 'package/file.js';`;
  const expected = source.replaceAll("'./types.js'", "'./types.ts'")
    .replace('../types.js', '../types.ts').replace('./side-effect.js', './side-effect.ts')
    .replace('./lazy.js', './lazy.ts').replace("const label = './types.ts'", "const label = './types.js'");
  assert.equal(normalizeImports(source), expected);
});

test('repository mirrored core stays in parity', () => {
  assert.deepEqual(checkCoreParity().errors, []);
});

test('parity catches logic, literal, missing-file and new mirrored-module drift', t => {
  const root = mkdtempSync(join(tmpdir(), 'haiedu-parity-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const core = join(root, 'backend/core');
  const shared = join(root, 'supabase/functions/_shared');
  mkdirSync(core, { recursive: true });
  mkdirSync(shared, { recursive: true });
  for (const name of ['grading', 'mastery', 'practice', 'recommendation', 'types']) {
    writeFileSync(join(core, `${name}.ts`), `import type { A } from './types.js';\nexport const value = 1;`);
    writeFileSync(join(shared, `${name}.ts`), `import type { A } from './types.ts';\nexport const value = 1;`);
  }
  assert.deepEqual(checkCoreParity(root), { checked: 5, errors: [] });
  writeFileSync(join(shared, 'grading.ts'), 'export const value = 2;');
  assert.match(checkCoreParity(root).errors.join('\n'), /grading.ts.*differ/);
  writeFileSync(join(core, 'extra.ts'), `export const label = './types.js';`);
  writeFileSync(join(shared, 'extra.ts'), `export const label = './types.ts';`);
  assert.match(checkCoreParity(root).errors.join('\n'), /extra.ts.*differ/);
  rmSync(join(shared, 'mastery.ts'));
  assert.match(checkCoreParity(root).errors.join('\n'), /mastery.ts: missing/);
  rmSync(join(core, 'types.ts'));
  assert.match(checkCoreParity(root).errors.join('\n'), /types.ts: missing/);
});
