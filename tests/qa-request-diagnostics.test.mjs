import test from 'node:test';
import assert from 'node:assert/strict';
import { beginQaRequest, QA_REQUEST_TIMEOUT_MS } from '../scripts/qa-request-diagnostics.mjs';

test('QA request timing and W3C correlation are bounded metadata only', () => {
  let time = 100;
  const trace = beginQaRequest({ now: () => time });
  const requestId = '019a3f00-1234-7000-8000-000000000001';
  assert.match(trace.traceparent, /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  time = 225;
  trace.received(new Headers({ 'sb-request-id': requestId, 'set-cookie': 'PRIVATE-COOKIE' }));
  time = 260;
  const result = trace.finish();
  assert.equal(result.timeoutMs, 20_000);
  assert.equal(QA_REQUEST_TIMEOUT_MS, 20_000);
  assert.equal(result.headersAfterMs, 125);
  assert.equal(result.elapsedMs, 160);
  assert.equal(result.providerRequestId, requestId);
  assert.equal(trace.traceparent.split('-')[1], result.traceId);
  assert.notEqual(beginQaRequest().finish().traceId, result.traceId);
  assert.match(result.startedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|cookie/);
});

test('the client deadline is distinguished from a transport connect timeout', () => {
  const trace = beginQaRequest();
  const timeout = new DOMException('PRIVATE URL and credentials', 'TimeoutError');
  trace.failed(timeout, 'fetch', AbortSignal.abort(timeout));
  assert.equal(trace.finish().failureKind, 'timeout');
  assert.equal(trace.finish().timeoutSource, 'client_deadline');
  const transport = beginQaRequest();
  transport.failed(new TypeError('PRIVATE', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }), 'fetch');
  assert.equal(transport.finish().timeoutSource, 'transport');
  assert.equal(transport.finish().failureCode, 'UND_ERR_CONNECT_TIMEOUT');
});

test('failure names and codes map only to fixed categories', () => {
  for (const [error, phase, expected] of [
    [new TypeError('PRIVATE', { cause: { code: 'ECONNRESET' } }), 'fetch', 'network'],
    [new TypeError('PRIVATE', { cause: { code: 'ENOTFOUND' } }), 'fetch', 'network'],
    [new TypeError('PRIVATE', { cause: { code: 'CERT_HAS_EXPIRED' } }), 'fetch', 'tls'],
    [Object.assign(new TypeError('PRIVATE'), { code: 'ERR_INVALID_URL' }), 'fetch', 'invalid_request'],
    [new DOMException('PRIVATE', 'AbortError'), 'fetch', 'aborted'],
    [new SyntaxError('PRIVATE body'), 'body', 'invalid_json'],
    [new TypeError('PRIVATE body'), 'body', 'body_read_failed'],
    [new TypeError('PRIVATE'), 'fetch', 'fetch_failed'],
    [new Error('PRIVATE'), 'fetch', 'unclassified'],
  ]) {
    const trace = beginQaRequest(); trace.failed(error, phase);
    assert.equal(trace.finish().failureKind, expected);
    assert.doesNotMatch(JSON.stringify(trace.finish()), /PRIVATE/);
  }
});

test('malicious headers, error properties and nested secrets never enter reports', () => {
  const trace = beginQaRequest();
  trace.received({ get(name) { assert.equal(name, 'sb-request-id'); return 'PRIVATE-ACCESS-TOKEN'; } });
  trace.failed({ name: 'PRIVATE-NAME', code: 'PRIVATE-CODE', cause: { code: 'PRIVATE-CAUSE' },
    get message() { throw Error('Message must never be read'); }, get stack() { throw Error('Stack must never be read'); } }, 'fetch');
  assert.equal(trace.finish().providerRequestId, undefined);
  assert.equal(trace.finish().failureCode, undefined);
  assert.equal(trace.finish().failureKind, 'unclassified');
  const hostile = Object.defineProperties({}, {
    name: { get() { throw Error('PRIVATE name getter'); } },
    cause: { get() { throw Error('PRIVATE cause getter'); } },
  });
  trace.received({ get() { throw Error('PRIVATE header getter'); } });
  assert.doesNotThrow(() => trace.failed(hostile, 'body'));
  assert.doesNotMatch(JSON.stringify(trace.finish()), /PRIVATE|message|stack|ACCESS|CAUSE/);
});

test('optional timing failures and expected empty logout bodies cannot change outcomes', () => {
  for (const now of [() => NaN, () => Infinity, () => { throw Error('PRIVATE'); }]) {
    const trace = beginQaRequest({ now });
    trace.received(); trace.failed(new SyntaxError('PRIVATE empty body'), 'body', undefined, true);
    assert.equal(trace.finish().elapsedMs, undefined);
    assert.equal(trace.finish().failureKind, undefined);
    assert.doesNotMatch(JSON.stringify(trace.finish()), /PRIVATE/);
  }
  let time = 100;
  const trace = beginQaRequest({ now: () => time }); time = -100;
  assert.equal(trace.finish().elapsedMs, 0);
  time = Number.MAX_SAFE_INTEGER;
  assert.equal(trace.finish().elapsedMs, 86_400_000);
});
