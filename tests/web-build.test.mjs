import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { buildWebAssets, digest, projectRoot } from '../scripts/build-web-assets.mjs';
import { checkWebArchive } from '../scripts/check-web-archive.mjs';
import { verifyBuiltRelease } from '../scripts/verify-built-release.mjs';
import { expectedBrowserDigest } from '../scripts/expected-browser-digest.mjs';
import { serveWeb } from './fixtures/built-web-server.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'haiedu-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'web')); await mkdir(path.join(root, 'scripts'));
  await cp(path.join(projectRoot, 'scripts/build-web-assets.mjs'), path.join(root, 'scripts/build-web-assets.mjs'));
  for (const file of ['package.json', 'package-lock.json']) await writeFile(path.join(root, file), '{}');
  await writeFile(path.join(root, 'web/index.html'), '<!doctype html><html><head><link rel="stylesheet" href="./base.css"></head><body><script type="module" src="./app.js"></script></body></html>');
  await writeFile(path.join(root, 'web/base.css'), 'body { color: rgb(1, 2, 3); }');
  await writeFile(path.join(root, 'web/app.js'), 'window.lazy=()=>import("./lazy.mjs");');
  await writeFile(path.join(root, 'web/lazy.mjs'), 'export const version="A";');
  return root;
}

test('a later build retains the previous lazy chunks and rejects modified immutable bytes', async t => {
  const root = await fixture(t), first = await buildWebAssets({ root, update: true });
  await writeFile(path.join(root, 'web/lazy.mjs'), 'export const version="B";');
  const second = await buildWebAssets({ root, update: true });
  assert.notEqual(first.buildId, second.buildId);
  for (const [name, record] of Object.entries(first.assets)) assert.equal(digest(await readFile(path.join(root, 'dist-web', name))), record.sha256);
  assert.deepEqual(await checkWebArchive(root, { history: false }), { releases: 2, assets: new Set([...Object.keys(first.assets), ...Object.keys(second.assets)]).size });
  const target = Object.keys(first.assets)[0];
  await writeFile(path.join(root, 'web-build/assets', path.basename(target)), 'changed');
  await assert.rejects(checkWebArchive(root, { history: false }), /Archived bytes changed/);
});

test('current source changes cannot ship with a stale manifest, and build output cannot overwrite source', async t => {
  const root = await fixture(t);
  await buildWebAssets({ root, update: true });
  await writeFile(path.join(root, 'web/base.css'), 'body{color:red}');
  await assert.rejects(buildWebAssets({ root }), /archive is stale/);
  await assert.rejects(buildWebAssets({ root, outdir: path.join(root, 'web') }), /dedicated dist-web/);
  await assert.rejects(buildWebAssets({ root, outdir: path.dirname(root) }), /dedicated dist-web/);
});

test('builds are independent of output directory and dynamic CSS changes update the owning module', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'web/app.js'), 'window.style="./base.css?v=1";window.lazy=()=>import("./lazy.mjs");');
  const first = await buildWebAssets({ root, update: true });
  assert.deepEqual(await buildWebAssets({ root, outdir: path.join(root, 'dist-web-other') }), first);
  const original = await readFile(path.join(root, 'dist-web', first.entries['app.js'].slice(1)), 'utf8');
  assert.ok(original.includes(first.entries['base.css']));
  await writeFile(path.join(root, 'web/base.css'), 'body{color:blue}');
  const changed = await buildWebAssets({ root, update: true });
  assert.notEqual(changed.entries['app.js'], first.entries['app.js']);
});

test('deleting an entire older release and its assets cannot evade append-only history checks', async t => {
  const root = await fixture(t);
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  git('init'); git('config', 'user.name', 'Build fixture'); git('config', 'user.email', 'fixture@example.invalid');
  const first = await buildWebAssets({ root, update: true });
  git('add', 'web-build'); git('commit', '-m', 'first published archive');
  await writeFile(path.join(root, 'web/lazy.mjs'), 'export const version="B";');
  const second = await buildWebAssets({ root, update: true });
  await rm(path.join(root, 'web-build/releases', `${first.buildId}.json`));
  for (const name of Object.keys(first.assets).filter(name => !second.assets[name])) await rm(path.join(root, 'web-build/assets', path.basename(name)));
  git('add', 'web-build'); git('commit', '-m', 'incorrectly remove old archive');
  await checkWebArchive(root, { history: false });
  await assert.rejects(checkWebArchive(root), /must be append-only/);
});

test('production preflight verifies executed HTML and chunks even when compatibility source copies still match', async t => {
  const root = await fixture(t), manifest = await buildWebAssets({ root, update: true }), commit = 'a'.repeat(40);
  const output = path.join(root, 'dist-web');
  await writeFile(path.join(output, 'release.json'), JSON.stringify({ schemaVersion: 1, commit }));
  const server = await serveWeb(output); t.after(server.close);
  const args = { expectedCommit: commit, baseUrl: server.origin, manifestPath: path.join(root, 'web-build/current.json') };
  assert.equal((await verifyBuiltRelease(args)).buildId, manifest.buildId);
  const compiled = manifest.entries['app.js'].slice(1);
  await writeFile(path.join(output, compiled), 'throw Error("wrong build");');
  assert.equal(await readFile(path.join(output, 'app.js'), 'utf8'), await readFile(path.join(root, 'web/app.js'), 'utf8'));
  await assert.rejects(verifyBuiltRelease(args), /Executed browser artifact differs/);
});

test('supplemental production parity uses compiled HTML, retains stable-file checks and fails closed', async t => {
  const root = await fixture(t), manifest = await buildWebAssets({ root, update: true });
  const source = await readFile(path.join(root, 'web/index.html'));
  const compiled = await readFile(path.join(root, 'dist-web/index.html'));
  const expected = await expectedBrowserDigest('index.html', { root });
  assert.equal(expected, manifest.pages['index.html'].sha256);
  assert.equal(expected, digest(compiled));
  assert.notEqual(expected, digest(source), 'Reproduces the old raw-template comparison failure');
  assert.equal(await expectedBrowserDigest('app.js', { root }), digest(await readFile(path.join(root, 'web/app.js'))));
  await assert.rejects(expectedBrowserDigest('missing.html', { root }), /Missing compiled HTML digest/);
  await assert.rejects(expectedBrowserDigest('../package.json', { root }), /Unsafe browser source path/);
  await writeFile(path.join(root, 'web-build/current.json'), JSON.stringify({ schemaVersion: 2, pages: manifest.pages }));
  await assert.rejects(expectedBrowserDigest('index.html', { root }), /Missing compiled HTML digest/);
});

test('all page dependencies are local hashed files; teacher startup and student startup exclude heavy teacher modules', async () => {
  const manifest = await buildWebAssets({ emit: false });
  assert.equal(Object.keys(manifest.pages).length, 29);
  for (const page of Object.values(manifest.pages)) for (const asset of page.assets) assert.ok(manifest.assets[asset.slice(1)], asset);
  function reachable(entries) {
    const files = new Set(), inputs = new Set();
    function visit(file) { if (files.has(file)) return; files.add(file); const node = manifest.graph[file]; if (!node) return;
      node.inputs.forEach(input => inputs.add(input)); node.imports.filter(item => item.kind === 'import-statement').forEach(item => visit(item.path)); }
    entries.forEach(visit); return inputs;
  }
  const early = reachable([manifest.entries['teacher-startup.bundle.mjs'].slice(1)]);
  assert.ok(!early.has('web/supabase-browser.mjs'));
  assert.ok(![...early].some(name => name.startsWith('node_modules/@supabase/')));
  const heavy = ['web/teacher-review.mjs', 'web/teacher-today.mjs', 'web/writing-assignments.mjs', 'web/teacher-task-review.mjs'];
  for (const page of ['index.html', 'course.html', 'materials.html']) {
    const inputs = reachable(manifest.pages[page].assets.map(name => name.slice(1)));
    for (const module of heavy) assert.ok(!inputs.has(module), `${page} unexpectedly loads ${module}`);
  }
});
