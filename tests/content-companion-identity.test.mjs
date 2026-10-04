import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { deferred, moduleSource, node } from './fixtures/content-session-harness.mjs';

const session = id => ({ user: { id } });
const flush = () => new Promise(resolve => setImmediate(resolve));

async function harness(path) {
  const nodes = new Map();
  const calls = [];
  let listener;
  let render;
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  };
  const evidence = path.includes('evidence');
  const api = await vm.runInNewContext(`(async () => {
    ${moduleSource(path)}
    return ${evidence
      ? '{loadEvidence, snapshot:()=>({dashboard,currentAnalytics})}'
      : '{renderRows, snapshot:()=>({dashboard})}'};
  })()`, {
    $: get,
    esc: value => String(value ?? ''),
    curriculumContext: () => 'isolated curriculum',
    qaLabel: () => ({ key: 'pass', text: 'QA passed' }),
    reviewLabel: value => value,
    contentSupabase: { auth: { onAuthStateChange: callback => { listener = callback; } } },
    invokeContent(name, body) {
      const request = deferred();
      calls.push({ name, body, ...request });
      return request.promise;
    },
    mountContentWorkspace: async callback => { render = callback; },
    document: { querySelectorAll: () => [] },
    location: { search: '', href: 'https://isolated.invalid/content-review' },
    history: { replaceState() {} },
    URL, URLSearchParams,
  });
  return { api, get, calls, render: (...args) => render(...args), auth: (event, user) => listener(event, user) };
}

const reviewDashboard = {
  items: [{ id: 'private-A', code: 'Private A item', reviewStatus: 'needs_review', promptHy: 'Private A prompt' }],
};
const evidenceDashboard = { catalog: { programs: [], units: [{ code: 'unit-A', titleHy: 'Private unit A' }] } };

for (const event of ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED']) {
  test(`review ${event} for a different identity clears the previous queue`, async () => {
    const h = await harness('web/content-review.js');
    h.render(reviewDashboard, session('A'));
    assert.match(h.get('queueList').innerHTML, /Private A item/);
    h.auth(event, session('B'));
    assert.equal(h.api.snapshot().dashboard, null);
    assert.equal(h.get('queueList').innerHTML, '');
    h.api.renderRows();
    assert.doesNotMatch(h.get('queueList').innerHTML, /Private A item/);
  });
}

test('review late initial/same-user events preserve the current queue; sign-out clears it', async () => {
  const h = await harness('web/content-review.js');
  h.render(reviewDashboard, session('A'));
  h.auth('INITIAL_SESSION', session('A'));
  h.auth('TOKEN_REFRESHED', session('A'));
  assert.equal(h.api.snapshot().dashboard, reviewDashboard);
  assert.match(h.get('queueList').innerHTML, /Private A item/);
  h.auth('SIGNED_OUT', null);
  assert.equal(h.api.snapshot().dashboard, null);
  assert.equal(h.get('queueList').innerHTML, '');
});

for (const event of ['SIGNED_IN', 'SIGNED_OUT']) {
  test(`evidence ${event} invalidates a pending read and clears the previous identity`, async () => {
    const h = await harness('web/content-evidence-page.js');
    await h.render(evidenceDashboard, session('A'));
    h.get('evidenceUnit').value = 'unit-A';
    const pending = h.api.loadEvidence();
    h.auth(event, event === 'SIGNED_OUT' ? null : session('B'));
    assert.equal(h.api.snapshot().dashboard, null);
    h.calls[0].resolve({ analytics: { integrity: { exposureCount: 99 }, items: [] } });
    await pending;
    assert.equal(h.api.snapshot().currentAnalytics, null);
    assert.equal(h.get('evidenceMetrics').innerHTML, '');
    assert.equal(h.get('evidenceMessage').textContent, '');
  });
}

test('evidence initial/same-user events keep the selected analytics intact', async () => {
  const h = await harness('web/content-evidence-page.js');
  await h.render(evidenceDashboard, session('A'));
  h.get('evidenceUnit').value = 'unit-A';
  const pending = h.api.loadEvidence();
  const analytics = { integrity: { exposureCount: 99 }, items: [] };
  h.calls[0].resolve({ analytics });
  await pending;
  h.auth('INITIAL_SESSION', session('A'));
  h.auth('TOKEN_REFRESHED', session('A'));
  assert.equal(h.api.snapshot().currentAnalytics, analytics);
  assert.match(h.get('evidenceMetrics').innerHTML, /99/);
});

test('a new evidence dashboard clears analytics when it repopulates the unit selector', async () => {
  const h = await harness('web/content-evidence-page.js');
  await h.render(evidenceDashboard, session('A'));
  h.get('evidenceUnit').value = 'unit-A';
  const pending = h.api.loadEvidence();
  h.calls[0].resolve({ analytics: { integrity: { exposureCount: 99 }, items: [] } });
  await pending;
  await h.render(evidenceDashboard, session('A'));
  assert.equal(h.api.snapshot().currentAnalytics, null);
  assert.equal(h.get('evidenceMetrics').innerHTML, '');
});

test('a new evidence dashboard invalidates an earlier request even for the same unit', async () => {
  const h = await harness('web/content-evidence-page.js');
  await h.render(evidenceDashboard, session('A'));
  h.get('evidenceUnit').value = 'unit-A';
  const pending = h.api.loadEvidence();
  await h.render(evidenceDashboard, session('B'));
  h.get('evidenceUnit').value = 'unit-A';
  h.calls[0].resolve({ analytics: { integrity: { exposureCount: 99 }, items: [] } });
  await pending;
  await flush();
  assert.equal(h.api.snapshot().currentAnalytics, null);
  assert.equal(h.get('evidenceMetrics').innerHTML, '');
});
