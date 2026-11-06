import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';
import { buildWebAssets, projectRoot } from '../../scripts/build-web-assets.mjs';
import { serveWeb, installSignedOutClient } from '../fixtures/built-web-server.mjs';
import { installStudentHomeFixture } from '../fixtures/student-home-fixture.mjs';
import { installTeacherPerformanceFixture } from '../fixtures/teacher-performance-browser.mjs';

let browser, server, manifest;
before(async () => {
  manifest = await buildWebAssets();
  server = await serveWeb(path.join(projectRoot, 'dist-web'));
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await server?.close(); });

async function pageFor(t, install = installSignedOutClient, argument) {
  const context = await browser.newContext(); t.after(() => context.close());
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).origin !== server.origin) external.push(request.url()); });
  await page.addInitScript(install, argument);
  return { page, errors, external };
}

for (const name of Object.keys(JSON.parse(await readFile(new URL('../../web-build/current.json', import.meta.url))).pages)) {
  test(`compiled ${name} initializes signed out without module errors`, { timeout: 15000 }, async t => {
    const { page, errors, external } = await pageFor(t);
    const start = server.requests.length;
    await page.goto(server.origin + '/' + name);
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('meta[name="haiedu-build"]').getAttribute('content'), manifest.buildId);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    assert.deepEqual(server.requests.slice(start).filter(request => request.status >= 400), []);
  });
}

test('compiled signed-in Home and lazy teacher class tools use the shared fixture client', { timeout: 30000 }, async t => {
  const home = await pageFor(t, `window.__haieduSupabaseClient=window.__client=(${installStudentHomeFixture.toString()})({});`);
  await home.page.goto(server.origin + '/index.html');
  await expect(home.page.locator('.amp-subject-card').first()).toBeVisible();
  assert.equal(await home.page.evaluate(() => window.__homeFixture.calls.filter(call => call.name === 'get-student-classes').length),0);
  assert.equal(await home.page.evaluate(() => window.__homeFixture.calls.filter(call => call.name === 'get-student-dashboard' && call.body.navigation).length),1);
  assert.deepEqual(home.errors, []); assert.deepEqual(home.external, []);

  const teacher = await pageFor(t, installTeacherPerformanceFixture, { archives: 0, initialFailure: false, analytics: null, studentDetails: null });
  await teacher.page.goto(server.origin + '/teacher.html?view=home');
  await expect(teacher.page.locator('#dashboardPanel')).toBeVisible();
  await teacher.page.locator('.hm-role-nav a[href$="view=classes"]').click();
  await teacher.page.locator('#classList .teacher-class-button').first().click();
  await expect(teacher.page.locator('#rosterAnalyticsCard')).toBeVisible();
  assert.deepEqual(teacher.errors, []); assert.deepEqual(teacher.external, []);
});

test('compiled SDK constructs an isolated client without contacting Auth', { timeout: 15000 }, async t => {
  const { page, errors, external } = await pageFor(t);
  await page.goto(server.origin + '/privacy.html');
  const result = await page.evaluate(async sdk => {
    const { createClient } = await import(sdk);
    const client = createClient('https://fixture.invalid', 'synthetic', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await client.auth.getSession();
    return { session: data.session, error };
  }, manifest.entries['supabase-browser.mjs']);
  assert.deepEqual(result, { session: null, error: null });
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
});

test('real HTTP cache avoids warm hashed asset requests and records cold/warm comparisons', { timeout: 45000 }, async t => {
  const measures = {};
  // No route interception: Playwright routing disables the HTTP cache.
  for (const [variant, directory] of [['source', 'web'], ['compiled', 'dist-web']]) {
    server.setRoot(path.join(projectRoot, directory));
    const { page, errors, external } = await pageFor(t);
    for (const temperature of ['cold', 'warm']) {
      const start = server.requests.length;
      if (temperature === 'cold') await page.goto(server.origin + '/index.html'); else await page.reload();
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      const requests = server.requests.slice(start), browserResources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => ({ path: new URL(entry.name).pathname, transferBytes: entry.transferSize, encodedBytes: entry.encodedBodySize, durationMs: entry.duration })));
      measures[`${variant}_${temperature}`] = { requests: requests.length, responseBodyBytes: requests.reduce((sum, request) => sum + request.bytes, 0), requestsByPath: requests, browserResources };
      assert.deepEqual(errors, []); assert.deepEqual(external, []);
      if (variant === 'compiled' && temperature === 'warm') assert.equal(requests.filter(request => request.path.startsWith('/_assets/')).length, 0, 'Immutable assets must be served from browser cache');
    }
    await page.close();
  }
  server.setRoot(path.join(projectRoot, 'dist-web'));
  const output = process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR || 'artifacts/student-workspace';
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'bf06-build-cache.json'), JSON.stringify({ scope: 'Isolated signed-out Home, local gzip HTTP server; browser cache, not WAN/CDN latency', buildId: manifest.buildId, measures }, null, 2) + '\n');
  console.log('BF06_CACHE ' + JSON.stringify(Object.fromEntries(Object.entries(measures).map(([key, value]) => [key, { requests: value.requests, responseBodyBytes: value.responseBodyBytes }]))));
});

test('open tabs retain lazy imports and unsaved input across deployment and redeployed rollback', { timeout: 30000 }, async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'haiedu-browser-build-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'web')); await mkdir(path.join(root, 'scripts'));
  await cp(path.join(projectRoot, 'scripts/build-web-assets.mjs'), path.join(root, 'scripts/build-web-assets.mjs'));
  for (const name of ['package.json', 'package-lock.json']) await writeFile(path.join(root, name), '{}');
  await writeFile(path.join(root, 'web/base.css'), 'body{color:green}');
  await writeFile(path.join(root, 'web/index.html'), '<!doctype html><html><head><link rel="stylesheet" href="./base.css"></head><body><input id="draft"><button id="load">Load</button><output></output><script type="module" src="./app.js"></script></body></html>');
  await writeFile(path.join(root, 'web/app.js'), 'document.querySelector("#load").onclick=async()=>{document.querySelector("output").textContent=(await import("./lazy.mjs")).version};');
  const version = async value => { await writeFile(path.join(root, 'web/lazy.mjs'), `export const version=${JSON.stringify(value)};`); return buildWebAssets({ root, update: true }); };
  const first = await version('A'), isolated = await serveWeb(path.join(root, 'dist-web')); t.after(isolated.close);
  const context = await browser.newContext(); t.after(() => context.close());
  const old = await context.newPage(), errors = [];
  old.on('pageerror', error => errors.push(error.message));
  await old.goto(isolated.origin); await old.locator('#draft').fill('unfinished answer');
  assert.ok(!isolated.requests.some(request => request.path === first.entries['lazy.mjs']));
  await version('B');
  const current = await context.newPage(); current.on('pageerror', error => errors.push(error.message));
  await current.goto(isolated.origin); await current.locator('#draft').fill('new unfinished answer');
  await old.locator('#load').click(); await expect(old.locator('output')).toHaveText('A');
  await expect(old.locator('#draft')).toHaveValue('unfinished answer');
  // Rollback is a new build of A with B's archive retained, not Instant Rollback.
  await version('A');
  await current.locator('#load').click(); await expect(current.locator('output')).toHaveText('B');
  await expect(current.locator('#draft')).toHaveValue('new unfinished answer');
  const fresh = await context.newPage(); await fresh.goto(isolated.origin); await fresh.locator('#load').click(); await expect(fresh.locator('output')).toHaveText('A');
  assert.deepEqual(errors, []); assert.deepEqual(isolated.requests.filter(request => request.status >= 400), []);
});
