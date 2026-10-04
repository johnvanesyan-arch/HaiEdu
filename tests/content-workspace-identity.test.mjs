import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { deferred, moduleSource, node } from './fixtures/content-session-harness.mjs';

const flush = () => new Promise(resolve => setImmediate(resolve));
const session = id => ({ user: { id } });
const first = session('QA-first-user');
const second = session('QA-second-user');
const cacheKey = id => `haiedu:content-dashboard:v1:${id}`;

function harness({ initialSession = first, sessionRead } = {}) {
  const authListeners = [], requests = [], storage = new Map(), nodes = new Map(), renders = [];
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  };
  const authEvent = (event, currentSession) => {
    for (const listener of authListeners) listener(event, currentSession);
  };
  const api = vm.runInNewContext(`(() => {
    ${moduleSource('web/content-workspace.js')}
    return { invokeContent, loadContentDashboard, readContentDashboardCache, mountContentWorkspace };
  })()`, {
    window: { __haieduSupabaseClient: {
      auth: {
        getSession: () => sessionRead ?? Promise.resolve({ data: { session: initialSession } }),
        onAuthStateChange: listener => { authListeners.push(listener); },
        signOut: async () => { authEvent('SIGNED_OUT', null); },
      },
      functions: { invoke(name, { body }) {
        const pending = deferred();
        requests.push({ name, body, ...pending });
        return pending.promise;
      } },
    } },
    document: { getElementById: get },
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    Response,
    location: { replace() {} },
  });
  return {
    api, get, requests, storage, renders, authEvent,
    mount: () => api.mountContentWorkspace((dashboard, acceptedSession) => {
      renders.push({ marker: dashboard.marker, userId: acceptedSession?.user?.id });
      get('protectedFixture').textContent = dashboard.marker;
    }),
  };
}

async function mounted() {
  const h = harness();
  const mounting = h.mount();
  await flush();
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ data: { marker: 'first dashboard' }, error: null });
  await mounting;
  return h;
}

test('a different signed-in identity closes the old workspace and renders only its own dashboard', async () => {
  const h = await mounted();
  h.get('authMessage').textContent = 'old account message';
  h.authEvent('SIGNED_IN', second);
  assert.equal(h.get('console').classList.contains('hidden'), true);
  assert.equal(h.get('authMessage').textContent, '');
  assert.equal(h.storage.has(cacheKey(first.user.id)), false);
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve({ data: { marker: 'second dashboard' }, error: null });
  await flush();
  assert.deepEqual(h.renders, [
    { marker: 'first dashboard', userId: first.user.id },
    { marker: 'second dashboard', userId: second.user.id },
  ]);
  assert.equal(h.get('console').classList.contains('hidden'), false);
  assert.equal(h.get('protectedFixture').textContent, 'second dashboard');
});

test('same-user sign-in and token refresh preserve a visible workspace and its cache', async () => {
  const h = await mounted();
  const cached = h.storage.get(cacheKey(first.user.id));
  h.get('protectedFixture').textContent = 'preserved local view';
  h.authEvent('SIGNED_IN', session(first.user.id));
  h.authEvent('TOKEN_REFRESHED', session(first.user.id));
  await flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.renders.length, 1);
  assert.equal(h.get('protectedFixture').textContent, 'preserved local view');
  assert.equal(h.get('console').classList.contains('hidden'), false);
  assert.equal(h.storage.get(cacheKey(first.user.id)), cached);
});

for (const outcome of ['success', 'failure']) {
  test(`a prior user's late dashboard ${outcome} cannot render, cache, or show an auth message`, async () => {
    const h = harness();
    const mounting = h.mount();
    await flush();
    h.authEvent('SIGNED_IN', second);
    assert.equal(h.requests.length, 2);
    if (outcome === 'success') h.requests[0].resolve({ data: { marker: 'old protected dashboard' }, error: null });
    else h.requests[0].resolve({ data: null, error: { message: 'old protected error' } });
    await mounting;
    assert.equal(h.renders.length, 0);
    assert.equal(h.storage.has(cacheKey(first.user.id)), false);
    assert.equal(h.get('authMessage').textContent, '');
    assert.equal(h.get('console').classList.contains('hidden'), true);
    h.requests[1].resolve({ data: { marker: 'second dashboard' }, error: null });
    await flush();
    assert.equal(h.renders.length, 1);
    assert.equal(h.renders[0].marker, 'second dashboard');
    assert.equal(h.get('console').classList.contains('hidden'), false);
  });
}

test('identity changes invalidate shared function results before consumers receive them', async () => {
  const h = await mounted();
  const pending = h.api.invokeContent('fixture-protected-read');
  const rejected = assert.rejects(pending, /content_session_ended/);
  h.authEvent('SIGNED_IN', second);
  h.requests[1].resolve({ data: { marker: 'old protected result' }, error: null });
  await rejected;
});

test('a rejected prior-user transport cannot leak its error after identity changes', async () => {
  const h = await mounted();
  const pending = h.api.invokeContent('fixture-protected-read');
  const rejected = assert.rejects(pending, /content_session_ended/);
  h.authEvent('SIGNED_IN', second);
  h.requests[1].reject(new Error('old protected transport details'));
  await rejected;
});

test('late initial-session and same-user refresh events keep an in-flight dashboard valid', async () => {
  const h = harness();
  const mounting = h.mount();
  await flush();
  h.authEvent('INITIAL_SESSION', first);
  h.authEvent('TOKEN_REFRESHED', session(first.user.id));
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ data: { marker: 'first dashboard' }, error: null });
  await mounting;
  assert.equal(h.renders.length, 1);
  assert.equal(h.get('console').classList.contains('hidden'), false);
  assert.equal(h.storage.has(cacheKey(first.user.id)), true);
});

test('same-user permission updates still force a dashboard refresh', async () => {
  const h = await mounted();
  h.authEvent('USER_UPDATED', first);
  assert.equal(h.requests.length, 2);
  assert.equal(h.get('console').classList.contains('hidden'), true);
  h.requests[1].resolve({ data: { marker: 'updated permissions dashboard' }, error: null });
  await flush();
  assert.equal(h.renders.length, 2);
  assert.equal(h.renders[1].marker, 'updated permissions dashboard');
  assert.equal(h.get('console').classList.contains('hidden'), false);
});

test('an error body finishing after an identity change cannot expose prior-user details', async () => {
  const h = await mounted(), body = deferred();
  const response = new Response('{}');
  response.clone = () => ({ json: () => body.promise });
  const pending = h.api.invokeContent('fixture-protected-read');
  const rejected = assert.rejects(pending, /content_session_ended/);
  h.requests[1].resolve({ data: null, error: { context: response, message: 'failed' } });
  await flush();
  h.authEvent('SIGNED_IN', second);
  body.resolve({ detail: 'old protected error details' });
  await rejected;
});

test('a stale dashboard caller cannot bind the shared cache back to a previous identity', async () => {
  const h = await mounted();
  h.authEvent('SIGNED_IN', second);
  const pending = h.api.loadContentDashboard(first);
  const rejected = assert.rejects(pending, /content_session_ended/);
  // Settle any erroneous request as well, so a regression fails instead of hanging.
  for (const request of h.requests.slice(1)) request.resolve({ data: { marker: 'stale caller' }, error: null });
  await rejected;
  assert.equal(h.storage.has(cacheKey(first.user.id)), false);
});

test('sign-out still closes the gate and invalidates a pending replacement dashboard', async () => {
  const h = await mounted();
  h.authEvent('SIGNED_IN', second);
  h.authEvent('SIGNED_OUT', null);
  assert.equal(h.get('console').classList.contains('hidden'), true);
  assert.equal(h.get('authPanel').classList.contains('hidden'), false);
  assert.equal(h.get('signOutBtn').classList.contains('hidden'), true);
  assert.equal(h.storage.size, 0);
  if (h.requests[1]) h.requests[1].resolve({ data: { marker: 'signed-out dashboard' }, error: null });
  await flush();
  assert.equal(h.renders.length, 1);
  assert.equal(h.storage.size, 0);
});

test('an auth identity change wins over an older initial getSession read', async () => {
  const read = deferred(), h = harness({ sessionRead: read.promise });
  const mounting = h.mount();
  h.authEvent('SIGNED_IN', second);
  read.resolve({ data: { session: first } });
  await flush();
  assert.equal(h.requests.length, 1);
  h.requests[0].resolve({ data: { marker: 'second dashboard' }, error: null });
  await mounting;
  await flush();
  assert.equal(h.renders.length, 1);
  assert.equal(h.renders[0].userId, second.user.id);
  assert.equal(h.storage.has(cacheKey(first.user.id)), false);
});
