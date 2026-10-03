import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { itemHarness, guideHarness, cacheHarness, deferred, moduleSource, node } from './fixtures/content-session-harness.mjs';

const flush = () => new Promise(resolve => setImmediate(resolve));

for (const [name, dirty, call, result] of [
  ['save', true, api => api.saveRevision(), { revision: { versionNo: 5 } }],
  ['QA', false, api => api.runQaCurrent(), { qa: { passed: true } }],
  ['approval', false, api => api.approveCurrent(), { approved: true }],
  ['administrative action', false, api => api.action('retire'), { retired: true }],
]) {
  test(`late question ${name} completion after logout cannot refresh or restore messages`, async () => {
    const h = await itemHarness();
    h.api.prepare({ dirty });
    const pending = call(h.api);
    assert.equal(h.calls.length, 1);
    h.logout();
    h.calls[0].resolve({ data: result, error: null });
    await flush();
    // Settle any forbidden refresh so a regression fails instead of hanging.
    for (const load of h.loads) load.resolve({ items: [], stats: {} });
    await pending;
    assert.equal(h.loads.length, 0);
    assert.equal(h.api.snapshot().selectedDetail, null);
    assert.equal(h.get('consoleMessage').textContent, '');
    assert.equal(h.api.snapshot().workflowBusy, false);
  });
}

test('old save completion cannot clear a new session workflow lock', async () => {
  const h = await itemHarness();
  const old = h.api.saveRevision();
  h.logout();
  assert.equal(h.api.snapshot().workflowBusy, false);
  h.api.prepare({ userId: 'QA-other-user' });
  const current = h.api.saveRevision();
  assert.equal(h.calls.length, 2);
  h.calls[0].resolve({ data: { revision: { versionNo: 5 } }, error: null });
  await old;
  assert.equal(h.api.snapshot().workflowBusy, true);
  assert.equal(h.loads.length, 0);
  h.calls[1].resolve({ data: null, error: { message: 'isolated current failure' } });
  await current;
  assert.equal(h.api.snapshot().workflowBusy, false);
  assert.equal(h.api.snapshot().editorDirty, true);
});

function bootstrap(path) {
  const session = deferred(), nodes = new Map(), reads = [];
  let authListener;
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const client = {
    auth: { getSession: () => session.promise, onAuthStateChange: f => { authListener = f; } },
    functions: { invoke(name) { reads.push(name); return Promise.resolve({ data: { guides: [], actor: {} }, error: null }); } },
  };
  const location = { search: '', href: 'https://isolated.invalid/content-guides' };
  const loading = vm.runInNewContext(`(async () => { ${moduleSource(path)} })()`, {
    document: { body: { dataset: { contentMode: 'bank' } }, getElementById: get, querySelectorAll: () => [], querySelector: () => null },
    window: { __haieduSupabaseClient: client, location, history: { replaceState() {}, pushState() {} }, addEventListener() {}, dispatchEvent() {}, scrollTo() {} },
    location, URL, URLSearchParams, setTimeout, confirm: () => true,
    CustomEvent: class {},
    clearContentDashboardCache() {},
    loadContentDashboard() { reads.push('cached-dashboard'); return Promise.resolve({ items: [], stats: {} }); },
  });
  return { loading, reads, get, logout() { authListener('SIGNED_OUT', null); }, complete() { session.resolve({ data: { session: { user: { id: 'QA-old-user' } } } }); } };
}

for (const [path, gate] of [['web/content.js', 'console'], ['web/content-guides.js', 'guideConsole']]) {
  test(`${path} cannot bootstrap a stale initial session after logout`, async () => {
    const h = bootstrap(path);
    h.logout(); h.complete(); await h.loading;
    assert.equal(h.reads.length, 0);
    assert.equal(h.get(gate).classList.contains('hidden'), true);
  });
}

test('late guide catalogue failure is discarded after logout', async () => {
  const h = await guideHarness(); let errors = 0;
  const pending = h.api.refreshCatalog().catch(() => { errors += 1; });
  h.authEvent('SIGNED_OUT', null);
  h.calls[0].reject(new Error('QA protected error details'));
  await pending;
  assert.equal(errors, 0);
  assert.equal(h.get('guideMessage').textContent, '');
});

test('error body completing after logout cannot expose old session details', async () => {
  const h = cacheHarness(), body = deferred();
  const response = new Response('{}');
  response.clone = () => ({ json: () => body.promise });
  const pending = h.api.invokeContent('fixture-read');
  h.requests[0].resolve({ data: null, error: { context: response, message: 'request failed' } });
  await flush(); h.logout(); body.resolve({ detail: 'QA protected error details' });
  await assert.rejects(pending, /content_session_ended/);
});

for (const [name, dirty, call] of [
  ['save', true, api => api.saveRevision()],
  ['QA', false, api => api.runQaCurrent()],
  ['approval', false, api => api.approveCurrent()],
  ['administrative action', false, api => api.action('retire')],
]) {
  test(`late question ${name} failure after logout cannot restore error details`, async () => {
    const h = await itemHarness(); h.api.prepare({ dirty });
    const pending = call(h.api); h.logout();
    h.calls[0].resolve({ data: null, error: { message: 'QA protected error details' } });
    await pending; assert.equal(h.loads.length, 0); assert.equal(h.get('consoleMessage').textContent, '');
  });
}

test('logout during a post-save dashboard refresh suppresses its completion message', async () => {
  const h = await itemHarness(), pending = h.api.saveRevision();
  h.calls[0].resolve({ data: { revision: { versionNo: 5 } }, error: null });
  await flush(); assert.equal(h.loads.length, 1); h.logout();
  h.loads[0].resolve({ items: [], stats: {} }); await pending;
  assert.equal(h.get('consoleMessage').textContent, ''); assert.equal(h.api.snapshot().selectedDetail, null);
});

test('a scheduled guide sign-in cannot restore the session after logout', async () => {
  const h = await guideHarness({ deferTimers: true });
  h.authEvent('SIGNED_IN', { user: { id: 'QA-old-user' } });
  assert.equal(h.timers.length, 1); h.authEvent('SIGNED_OUT', null);
  h.timers[0](); await flush();
  assert.equal(h.calls.length, 0); assert.equal(h.get('guideConsole').classList.contains('hidden'), true);
});

test('current-session save still clears dirty state, refreshes, and reports success', async () => {
  const h = await itemHarness(), pending = h.api.saveRevision();
  h.calls[0].resolve({ data: { revision: { versionNo: 5 } }, error: null });
  await flush(); assert.equal(h.loads.length, 1);
  h.loads[0].resolve({ items: [], stats: {} }); await pending;
  assert.equal(h.api.snapshot().editorDirty, false); assert.equal(h.api.snapshot().workflowBusy, false);
  assert.match(h.get('consoleMessage').textContent, /QA-P3/);
});
