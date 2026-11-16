import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { API, REPOSITORY, TARGETS, SCOPE, checkSite, collectReport, currentCi, githubRequest, validateReport } from '../scripts/failure-observer.mjs';
import { incidentBody, publishIncidents } from '../scripts/failure-incidents.mjs';
import { eligibleEvent, main } from '../scripts/observe-production.mjs';

const commit = 'a'.repeat(40), nextCommit = 'b'.repeat(40);
const at = '2026-11-16T16:00:00.000Z';
const clock = () => new Date(at);
const canary = 'PRIVATE_LEARNER_TEXT_AND_TOKEN_MUST_NEVER_BE_PUBLISHED';
const ci = overrides => ({ id: 123, name: 'CI', event: 'push', head_branch: 'main', head_repository: { full_name: REPOSITORY }, path: '.github/workflows/ci.yml', head_sha: commit, status: 'completed', conclusion: 'success', ...overrides });
const site = (signal, overrides = {}) => ({ signal, state: 'healthy', kind: 'healthy', release: commit, ...overrides });
const sites = overrides => Object.keys(TARGETS).map(signal => site(signal, overrides));
const report = samples => ({ schemaVersion: 1, scope: SCOPE, observedAt: at, observerCommit: commit, runId: 456, samples });
const env = overrides => ({ GITHUB_REPOSITORY: REPOSITORY, GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'schedule', ...overrides });

// Native local HTTP fault control, not a production API or an in-memory-only
// state-machine proof. Every request is explicitly routed to this owned server.
async function fixture(t) {
  const actualPage = await readFile(new URL('../web/account-access.html', import.meta.url), 'utf8');
  const state = { head: commit, run: ci(), issues: [], calls: [], siteMode: 'healthy', failCreatesAfterCommit: false, nextIssue: 1 };
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    state.calls.push({ method: request.method, path: request.url, body, authorization: request.headers.authorization });
    const url = new URL(request.url, 'http://127.0.0.1');
    const send = (value, status = 200) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(value)); };
    if (url.pathname === '/github/git/ref/heads/main') return send({ object: { sha: state.head } });
    if (url.pathname === '/github/actions/workflows/ci.yml/runs') return send({ workflow_runs: state.run ? [state.run] : [] });
    if (url.pathname === '/github/issues' && request.method === 'GET') return send(state.issues.filter(i => i.state === 'open'));
    if (url.pathname === '/github/issues' && request.method === 'POST') {
      const issue = { ...JSON.parse(body), number: state.nextIssue++, state: 'open', user: { login: 'github-actions[bot]', type: 'Bot' } };
      state.issues.push(issue);
      return send(state.failCreatesAfterCommit ? { message: canary } : issue, state.failCreatesAfterCommit ? 503 : 201);
    }
    if (url.pathname.startsWith('/github/issues/') && request.method === 'PATCH') {
      const issue = state.issues.find(i => i.number === Number(url.pathname.split('/').at(-1)));
      Object.assign(issue, JSON.parse(body));
      return send(issue);
    }
    if (url.pathname.startsWith('/site/')) {
      if (state.siteMode === 'hang') { response.writeHead(200, { 'content-type': 'application/json' }); response.flushHeaders(); return; }
      if (state.siteMode === 'down') return send({ error: canary }, 503);
      if (state.siteMode === 'transient') { state.siteMode = 'healthy'; return send({ error: canary }, 503); }
      if (state.siteMode === 'redirect') { response.writeHead(302, { location: `https://unexpected.invalid/${canary}` }); return response.end(); }
      if (url.pathname.endsWith('/release.json')) return send({ schemaVersion: 1, commit });
      response.writeHead(200, { 'content-type': 'text/html' });
      return response.end(`${actualPage}<!-- ${canary} -->`);
    }
    return send({ message: canary }, 500);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const fetchImpl = (input, options) => {
    const url = new URL(input);
    let target;
    if (input.startsWith(API)) target = `/github${url.pathname.slice(new URL(API).pathname.length)}${url.search}`;
    else { assert(Object.values(TARGETS).includes(url.origin)); target = `/site/${url.hostname}${url.pathname}${url.search}`; }
    return fetch(`${origin}${target}`, options);
  };
  const options = { token: 'synthetic-local-only-token', fetchImpl, now: clock, pause: async () => {} };
  return { state, options, collect: extra => collectReport({ ...options, observerCommit: commit, runId: 456, includeSites: true, ...extra }) };
}

test('local HTTP outage creates one issue across three addresses, repetitions are silent, recovery closes it', async t => {
  const { state, options, collect } = await fixture(t);
  state.siteMode = 'down';
  const failure = await collect();
  assert.equal(failure.samples.filter(s => s.state === 'failed').length, 3);
  assert.equal(state.calls.filter(c => c.path.startsWith('/site/')).length, 6, 'one confirmation per failed address');
  assert.deepEqual(await publishIncidents(failure, options), [{ signal: 'public_site', action: 'opened' }, { signal: 'main_ci', action: 'unchanged' }]);
  await publishIncidents(await collect(), options);
  assert.equal(state.issues.length, 1);
  assert.equal(state.calls.filter(c => c.method !== 'GET').length, 1, 'no duplicate posts, comments or edits during repeated failure');
  assert.match(state.issues[0].body, /HTTP status: 503/);
  state.siteMode = 'healthy';
  await publishIncidents(await collect(), options);
  assert.equal(state.issues[0].state, 'closed');
  assert.match(state.issues[0].body, /Recovered/);
  await publishIncidents(await collect(), options);
  assert.equal(state.calls.filter(c => c.method !== 'GET').length, 2, 'one create, one recovery');
  const publicPayload = JSON.stringify({ failure, issues: state.issues });
  assert(!publicPayload.includes(canary));
  assert(!publicPayload.includes(options.token));
  assert(state.calls.filter(c => c.path.startsWith('/site/')).every(c => c.authorization === undefined), 'GitHub token is never sent to a site');
});

test('transient public failure confirms healthy and never creates an incident', async t => {
  const { state, options, collect } = await fixture(t);
  state.siteMode = 'transient';
  const result = await collect();
  assert(result.samples.every(s => s.state === 'healthy'));
  await publishIncidents(result, options);
  assert.equal(state.issues.length, 0);
  assert.equal(state.calls.filter(c => c.path.startsWith('/site/')).length, 7);
});

test('main CI failure and healthy rerun produce one incident and one recovery without static polling', async t => {
  const { state, options, collect } = await fixture(t);
  state.run = ci({ conclusion: 'failure' });
  const failed = await collect({ includeSites: false });
  await publishIncidents(failed, options);
  await publishIncidents(failed, options);
  assert.equal(state.issues.length, 1);
  assert.match(state.issues[0].body, /actions\/runs\/123/);
  state.run.conclusion = 'success';
  await publishIncidents(await collect({ includeSites: false }), options);
  assert.equal(state.issues[0].state, 'closed');
  assert(!state.calls.some(c => c.path.startsWith('/site/')));
});

test('PR, fork, superseded, skipped, cancelled and pending CI cannot open or resolve an incident', async t => {
  const { state, options } = await fixture(t);
  for (const overrides of [
    { event: 'pull_request' }, { head_branch: 'feature' }, { head_repository: { full_name: 'other/fork' } },
    { head_sha: nextCommit }, { status: 'in_progress' }, { conclusion: 'cancelled' }, { conclusion: 'skipped' },
    { conclusion: 'neutral' }, { path: '.github/workflows/production-qa.yml' },
  ]) {
    state.run = ci({ conclusion: 'failure', ...overrides });
    assert.equal(await currentCi(options), null);
  }
  assert.equal(state.calls.filter(c => c.method !== 'GET').length, 0);
});

test('publication rechecks CI: newer main, changed conclusion and pending rerun cannot receive stale transitions', async t => {
  const { state, options, collect } = await fixture(t);
  state.run.conclusion = 'failure';
  const oldFailure = await collect({ includeSites: false });
  state.head = nextCommit;
  assert.deepEqual(await publishIncidents(oldFailure, options), []);
  state.head = commit;
  state.run.conclusion = 'success';
  assert.deepEqual(await publishIncidents(oldFailure, options), []);
  const oldSuccess = await collect({ includeSites: false });
  state.run.status = 'in_progress';
  assert.deepEqual(await publishIncidents(oldSuccess, options), []);
  assert.equal(state.calls.filter(c => c.method !== 'GET').length, 0);
});

test('uncertain create response is not retried; next observation finds committed issue', async t => {
  const { state, options } = await fixture(t);
  const failed = report(sites({ state: 'failed', kind: 'network' }));
  state.failCreatesAfterCommit = true;
  await assert.rejects(publishIncidents(failed, options), { message: 'github_request_failed' });
  assert.equal(state.issues.length, 1);
  assert.deepEqual(await publishIncidents(failed, options), [{ signal: 'public_site', action: 'unchanged' }]);
  assert.equal(state.calls.filter(c => c.method === 'POST').length, 1);
});

test('partial site recovery leaves the single public incident open; healthy recurrence creates a new episode', async t => {
  const { state, options } = await fixture(t);
  const outage = report(sites({ state: 'failed', kind: 'network' }));
  await publishIncidents(outage, options);
  const partial = sites(); partial[2] = site('site_vercel', { state: 'failed', kind: 'network' });
  await publishIncidents(report(partial), options);
  assert.equal(state.issues[0].state, 'open');
  await publishIncidents(report(sites()), options);
  await publishIncidents(outage, options);
  assert.equal(state.issues.length, 2);
  assert.deepEqual(state.issues.map(i => i.state), ['closed', 'open']);
});

test('public redirects are bounded and cannot send a request to an unreviewed host', async t => {
  const { state, options } = await fixture(t);
  state.siteMode = 'redirect';
  assert.equal((await checkSite('site_apex', options)).kind, 'redirect_refused');
  assert.equal(state.calls.length, 1);
  let calls = 0;
  const loop = () => { calls++; return Promise.resolve(new Response(null, { status: 302, headers: { location: '/release.json' } })); };
  assert.equal((await checkSite('site_apex', { fetchImpl: loop })).kind, 'redirect_refused');
  assert.equal(calls, 3);
});

test('expected www to apex redirect is followed without credentials', async () => {
  const actualPage = await readFile(new URL('../web/account-access.html', import.meta.url), 'utf8');
  const calls = [];
  const sample = await checkSite('site_www', { fetchImpl: async (url, options) => {
    calls.push({ url, options });
    if (url.startsWith(TARGETS.site_www)) return new Response(null, { status: 308, headers: { location: url.replace(TARGETS.site_www, TARGETS.site_apex) } });
    return url.endsWith('.json') ? Response.json({ schemaVersion: 1, commit }) : new Response(actualPage, { headers: { 'content-type': 'text/html' } });
  } });
  assert.equal(sample.state, 'healthy');
  assert.equal(calls.length, 4);
  assert(calls.every(c => c.options.headers.authorization === undefined));
});

test('timeout, network, invalid page, malformed release and oversized streamed response give fixed categories only', async () => {
  for (const [name, expected] of [['TimeoutError', 'timeout'], ['TypeError', 'network']]) {
    const error = Object.assign(new Error(canary), { name });
    const result = await checkSite('site_apex', { fetchImpl: async () => { throw error; } });
    assert.equal(result.kind, expected);
    assert(!JSON.stringify(result).includes(canary));
  }
  const cases = [
    [async () => new Response(canary), 'invalid_release'],
    [async () => Response.json({ schemaVersion: 1, commit, extra: canary }), 'invalid_release'],
    [async url => url.endsWith('.json') ? Response.json({ schemaVersion: 1, commit }) : new Response(canary, { headers: { 'content-type': 'text/html' } }), 'invalid_page'],
    [async () => new Response(new Uint8Array(4097)), 'response_too_large'],
  ];
  for (const [fetchImpl, expected] of cases) assert.equal((await checkSite('site_apex', { fetchImpl })).kind, expected);
});

test('real HTTP body that never finishes is aborted within the bounded request deadline', async t => {
  const { state, options } = await fixture(t);
  state.siteMode = 'hang';
  const started = performance.now();
  const result = await checkSite('site_apex', { ...options, timeoutMs: 50 });
  assert.equal(result.kind, 'timeout');
  assert(performance.now() - started < 5000);
});

test('report validator rejects arbitrary fields, raw data, duplicate/partial targets, malformed identifiers and forged healthy samples', () => {
  const good = report(sites());
  assert.equal(validateReport(good), good);
  const copies = [
    { ...good, body: canary }, { ...good, observerCommit: [commit] }, { ...good, runId: '456' },
    { ...good, observedAt: canary }, { ...good, samples: good.samples.slice(0, 1) },
    { ...good, samples: [good.samples[0], good.samples[0], good.samples[2]] },
    ...[{ message: canary }, { release: [commit] }, { httpStatus: canary }, { kind: canary }, { signal: canary }, { kind: 'network' }, { ciRunId: 1 }].map(extra => ({ ...good, samples: [{ ...good.samples[0], ...extra }, ...good.samples.slice(1)] })),
  ];
  for (const candidate of copies) assert.throws(() => validateReport(candidate), { message: 'invalid_report' });
});

test('stale observations and ambiguous or edited bot issues stop before any mutation', async t => {
  const { state, options } = await fixture(t);
  const failed = report(sites({ state: 'failed', kind: 'network' }));
  await assert.rejects(publishIncidents({ ...failed, observedAt: '2026-11-16T15:00:00.000Z' }, options), { message: 'stale_observation' });
  await publishIncidents(failed, options);
  const mutationCount = state.calls.filter(c => c.method !== 'GET').length;
  state.issues.push({ ...state.issues[0], number: 999 });
  await assert.rejects(publishIncidents(failed, options), { message: 'ambiguous_incident' });
  state.issues.pop(); state.issues[0].title = canary;
  await assert.rejects(publishIncidents(failed, options), { message: 'ambiguous_incident' });
  state.issues[0].title = 'HaiEdu public website check failed'; state.issues[0].body = canary;
  await assert.rejects(publishIncidents(failed, options), { message: 'ambiguous_incident' });
  assert.equal(state.calls.filter(c => c.method !== 'GET').length, mutationCount);
});

test('unrelated human issues are never changed', async t => {
  const { state, options } = await fixture(t);
  const good = report(sites());
  state.issues.push({ number: 100, state: 'open', title: 'HaiEdu public website check failed', body: incidentBody(good, 'public_site'), user: { login: 'human', type: 'User' } });
  await publishIncidents(good, options);
  assert.equal(state.issues[0].state, 'open');
  assert.equal(state.calls.filter(c => c.method !== 'GET').length, 0);
});

test('GitHub errors and redirects cannot expose response text or credentials', async () => {
  for (const response of [new Response(canary, { status: 403 }), new Response(canary, { status: 302 }), new Response(canary, { status: 200 })]) {
    await assert.rejects(githubRequest('/issues', { token: canary, fetchImpl: async (_url, options) => { assert.equal(options.redirect, 'error'); return response; } }), { message: 'github_request_failed' });
  }
});

test('only trusted main schedule, dispatch and main push CI completion are eligible', () => {
  assert(eligibleEvent(env()));
  assert(eligibleEvent(env({ GITHUB_EVENT_NAME: 'workflow_dispatch' })));
  assert(eligibleEvent(env({ GITHUB_EVENT_NAME: 'workflow_run' }), { workflow_run: ci() }));
  for (const extra of [{ GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REF: 'refs/heads/feature' }, { GITHUB_REPOSITORY: 'other/fork' }]) assert(!eligibleEvent(env(extra)));
  for (const overrides of [{ event: 'pull_request' }, { head_repository: { full_name: 'other/fork' } }, { head_branch: 'feature' }, { status: 'in_progress' }, { name: 'Production QA' }]) assert(!eligibleEvent(env({ GITHUB_EVENT_NAME: 'workflow_run' }), { workflow_run: ci(overrides) }));
});

test('CLI refuses notifications while disabled or inspecting and refuses foreign-run reports before networking', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'bf22-gates-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const eventPath = join(dir, 'event.json');
  await writeFile(eventPath, '{}');
  const base = env({ GITHUB_EVENT_PATH: eventPath, GITHUB_RUN_ID: '456', GITHUB_SHA: commit, GITHUB_TOKEN: canary, BF22_MODE: 'notify', BF22_FAILURE_ALERTS: 'false' });
  await assert.rejects(main('collect', base), { message: 'observer_disabled' });
  await assert.rejects(main('publish', base), { message: 'observer_disabled' });
  await assert.rejects(main('publish', { ...base, BF22_FAILURE_ALERTS: 'true', BF22_MODE: 'inspect' }), { message: 'notifications_disabled' });
  await assert.rejects(main('publish', { ...base, BF22_FAILURE_ALERTS: 'true', BF22_REPORT: JSON.stringify({ ...report(sites()), runId: 999 }) }), { message: 'mismatched_observation' });
});

test('workflow keeps notification permissions isolated, defaults off, and never executes triggering code', async () => {
  const workflow = await readFile(new URL('../.github/workflows/failure-observer.yml', import.meta.url), 'utf8');
  const [observe, notify] = workflow.split('\n  observe:')[1].split('\n  notify:');
  assert(!observe.includes('issues: write'));
  assert(notify.includes('issues: write'));
  assert.match(workflow, /vars\.BF22_FAILURE_ALERTS == 'true'/);
  assert.match(workflow, /default: inspect/);
  assert.match(workflow, /retention-days: 7/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert(!/ref:.*(?:head_sha|head_branch)/.test(workflow));
  assert(!/download-artifact|npm (?:ci|install)/.test(workflow));
  assert(!/secrets\./.test(observe+notify));
  const clientCollect=workflow.split('\n  observe_client:')[1].split('\n  notify_client:')[0];
  const clientNotify=workflow.split('\n  notify_client:')[1].split('\n  observe:')[0];
  assert(!clientCollect.includes('issues: write'));
  assert.match(clientCollect,/vars\.BF22_CLIENT_FAILURE_ALERTS == 'true'/);
  assert.deepEqual([...clientCollect.matchAll(/secrets\.(\w+)/g)].map(m=>m[1]),['BF22_CLIENT_FAILURE_SUMMARY_KEY']);
  assert(!clientNotify.includes('secrets.'));
  assert.match(clientNotify,/issues: write/);
  assert.equal([...workflow.matchAll(/uses: ([^\s]+)/g)].filter(m => !/@[a-f0-9]{40}$/.test(m[1])).length, 0);
});
