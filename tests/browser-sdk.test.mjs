import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { assertLocalBrowserImports, buildBrowserSdk } from '../scripts/build-browser-sdk.mjs';
import { collectDependencies } from '../scripts/check-browser-qa-triggers.mjs';
import { fileURLToPath } from 'node:url';

test('browser dependency guard parses static and lazy imports, not comments or API URLs', async () => {
  for (const source of [
    'import {x} from "https://esm.sh/pkg"; console.log(x);',
    'import("https://cdn.example.invalid/pkg.js");',
    'export {x} from "//cdn.example.invalid/pkg.js";',
    'import("data:text/javascript,export default 1");',
    'import {x} from "unpinned-package"; console.log(x);',
  ]) {
    const result = await build({ stdin: { contents: source, sourcefile: 'web/page.js' },
      bundle: false, format: 'esm', write: false, metafile: true });
    assert.throws(() => assertLocalBrowserImports(result.metafile.outputs), /External browser dependency/);
  }
  const result = await build({ stdin: { sourcefile: 'web/page.js', contents:
    '// import("https://cdn.example.invalid/comment.js")\nfetch("https://api.example.invalid/data"); import("./local.mjs");' },
    bundle: false, format: 'esm', write: false, metafile: true });
  assert.doesNotThrow(() => assertLocalBrowserImports(result.metafile.outputs));
});

test('committed browser SDK matches the exact installed pin and has no app or role modules', async () => {
  const result = await buildBrowserSdk({ check: true });
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url)));
  assert.match(pkg.devDependencies['@supabase/supabase-js'], /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.devDependencies['@supabase/supabase-js'], lock.packages['node_modules/@supabase/supabase-js'].version);
  assert.deepEqual(result.inputs.filter(file => !/(^|\/)node_modules\//.test(file)), ['web/supabase-browser.mjs']);
});

test('learner, resource, school and teacher entry graphs retain the same local SDK and build inputs', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  for (const page of ['index', 'practice', 'materials', 'resource-library', 'school-admin', 'school-teacher', 'teacher']) {
    const graph = await collectDependencies(root, [`web/${page}.html`]);
    for (const input of ['web/supabase-browser.bundle.mjs', 'web/supabase-browser.mjs', 'scripts/build-browser-sdk.mjs', 'package-lock.json']) {
      assert.ok(graph.has(input), `${page}: ${input}`);
    }
    if (['index', 'practice', 'materials'].includes(page)) {
      assert.ok(!graph.has('web/teacher-dependencies.bundle.mjs'), `${page} must not load teacher rendering`);
    }
  }
});
