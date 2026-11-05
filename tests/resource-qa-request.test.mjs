import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceQaRequest, RESOURCE_QA_TIMEOUT_MS } from '../scripts/resource-qa-request.mjs';

function setup(options = {}) {
  const records = [], calls = [], deadlines = [];
  const request = createResourceQaRequest({ url: 'https://fixture.invalid', key: 'PRIVATE-KEY',
    getSession: () => ({ access_token: 'PRIVATE-TOKEN' }), record: entry => records.push(entry),
    makeSignal: ms => { deadlines.push(ms); return new AbortController().signal; },
    fetchImpl: async (...args) => { calls.push(args); return new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }); },
    ...options });
  return { request, records, calls, deadlines };
}

test('resource QA preserves one POST, payload, headers and its 25-second deadline', async () => {
  const s = setup(), result = await s.request('A_student', '/functions/v1/manage-resource-assignments', { action: 'inbox' });
  assert.equal(s.calls.length, 1); assert.deepEqual(s.deadlines, [25_000]); assert.equal(RESOURCE_QA_TIMEOUT_MS, 25_000);
  const [url, init] = s.calls[0];
  assert.equal(url, 'https://fixture.invalid/functions/v1/manage-resource-assignments');
  assert.equal(init.method, 'POST'); assert.equal(init.redirect, 'error');
  assert.equal(init.headers.Authorization, 'Bearer PRIVATE-TOKEN'); assert.equal(init.headers.apikey, 'PRIVATE-KEY');
  assert.equal(init.headers['Content-Type'], 'application/json'); assert.equal(init.body, '{"action":"inbox"}');
  assert.match(init.headers.traceparent, /^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/);
  assert.equal(result.status, 200); assert.deepEqual(result.data, { ok: true }); assert.ok(result.headers instanceof Headers);
  assert.equal(s.records[0].diagnostics.timeoutMs, 25_000); assert.equal(s.records[0].diagnostics.responseStatus, 200);
  assert.doesNotMatch(JSON.stringify(s.records), /PRIVATE|Authorization|apikey|inbox/);
});

test('resource QA retains multipart PDF bytes without recording the request or response body', async () => {
  const form = new FormData(); form.set('request', 'PRIVATE-REQUEST');
  const s = setup({ fetchImpl: async (_url, init) => {
    assert.equal(init.body, form); assert.equal(init.headers['Content-Type'], undefined);
    return new Response('PRIVATE-PDF', { headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment' } });
  } });
  const r = await s.request('A_teacher', '/functions/v1/manage-teacher-task-sources', form);
  assert.equal(r.status, 200); assert.equal(new TextDecoder().decode(r.data), 'PRIVATE-PDF');
  assert.equal(r.headers.get('content-disposition'), 'attachment'); assert.doesNotMatch(JSON.stringify(s.records), /PRIVATE/);
});

test('resource QA captures a fetch failure safely without retrying or losing elapsed time', async () => {
  let count = 0, clock = 100;
  const s = setup({ now: () => clock, fetchImpl: async () => { count++; clock = 250;
    throw new TypeError('PRIVATE URL and body', { cause: { code: 'ECONNRESET', message: 'PRIVATE-TOKEN' } });
  } });
  const r = await s.request('A_student', '/functions/v1/manage-resource-assignments', { private: 'PRIVATE-BODY' });
  assert.equal(count, 1); assert.equal(r.status, 0); assert.equal(r.data, null);
  assert.equal(r.diagnostics.failureKind, 'network'); assert.equal(r.diagnostics.failureCode, 'ECONNRESET');
  assert.equal(r.diagnostics.failurePhase, 'fetch'); assert.equal(r.diagnostics.elapsedMs, 150);
  assert.doesNotMatch(JSON.stringify(s.records), /PRIVATE|message|stack/);
});

test('resource QA distinguishes its client deadline without increasing it', async () => {
  const error = new DOMException('PRIVATE deadline', 'TimeoutError');
  const s = setup({ makeSignal: ms => { assert.equal(ms, 25_000); return AbortSignal.abort(error); }, fetchImpl: async () => { throw error; } });
  const r = await s.request('B_student', '/functions/v1/manage-resource-assignments', {});
  assert.equal(r.status, 0); assert.equal(r.diagnostics.failureKind, 'timeout'); assert.equal(r.diagnostics.timeoutSource, 'client_deadline');
  assert.equal(r.diagnostics.timeoutMs, 25_000); assert.doesNotMatch(JSON.stringify(s.records), /PRIVATE/);
});

test('resource QA keeps JSON and empty logout response semantics while recording body failures', async () => {
  const bad = setup({ fetchImpl: async () => new Response('PRIVATE invalid body', { status: 200 }) });
  const r = await bad.request('A_admin', '/functions/v1/get-my-privacy', {});
  assert.equal(r.status, 200); assert.equal(r.data, null); assert.equal(r.diagnostics.failureKind, 'invalid_json');
  const empty = setup({ fetchImpl: async () => new Response(null, { status: 204 }) });
  const closed = await empty.request('A_admin', '/auth/v1/logout?scope=local', {});
  assert.equal(closed.status, 204); assert.equal(closed.data, null); assert.equal(closed.diagnostics.failureKind, undefined);
  assert.doesNotMatch(JSON.stringify(bad.records), /PRIVATE/);
});

test('resource QA distinguishes a failed PDF body from a request that never received headers', async () => {
  const id = '019a3f00-1234-7000-8000-000000000001';
  const s = setup({ fetchImpl: async () => ({ status: 200, headers: new Headers({ 'content-type': 'application/pdf', 'sb-request-id': id }),
    arrayBuffer: async () => { throw new TypeError('PRIVATE body'); } }) });
  const r = await s.request('B_teacher', '/functions/v1/manage-supplementary-resources', {});
  assert.equal(r.status, 0); assert.equal(r.diagnostics.responseStatus, 200); assert.equal(r.diagnostics.providerRequestId, id);
  assert.equal(r.diagnostics.failurePhase, 'body'); assert.equal(r.diagnostics.failureKind, 'body_read_failed');
  assert.doesNotMatch(JSON.stringify(s.records), /PRIVATE/);
});

test('resource QA metadata cannot leak arbitrary actor/endpoint values or alter outcomes', async () => {
  const s = setup(); await s.request('PRIVATE-ACTOR', '/PRIVATE?token=PRIVATE-TOKEN', {});
  assert.equal(s.records[0].actor, 'unrecognized'); assert.equal(s.records[0].endpoint, 'unrecognized');
  assert.doesNotMatch(JSON.stringify(s.records), /PRIVATE/);
  const brokenRecorder = setup({ record: () => { throw Error('PRIVATE recorder'); } });
  assert.equal((await brokenRecorder.request(null, '/auth/v1/token?grant_type=password', {})).status, 200);
});
