import { randomUUID } from 'node:crypto';

export const QA_REQUEST_TIMEOUT_MS = 20_000;
export const QA_DIAGNOSTICS_VERSION = 'haiedu-qa-read-diagnostics-v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timeoutCodes = new Set(['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);
const networkCodes = new Set(['ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE', 'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_SOCKET']);
const tlsCodes = new Set(['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID']);
const requestCodes = new Set(['ERR_INVALID_ARG_TYPE', 'ERR_INVALID_CHAR', 'ERR_INVALID_URL']);
const allowedCodes = new Set([...timeoutCodes, ...networkCodes, ...tlsCodes, ...requestCodes]);

function property(value, key) {
  try { return value?.[key]; } catch { return undefined; }
}
function clock(now) {
  try { const value = now(); return Number.isFinite(value) ? value : null; } catch { return null; }
}

// This recorder never receives a URL, payload, credentials or response body.
// Error messages/stacks and arbitrary header/name/code values are never copied.
export function beginQaRequest({ now = () => performance.now() } = {}) {
  const started = clock(now);
  const traceId = randomUUID().replaceAll('-', '');
  const spanId = randomUUID().replaceAll('-', '').slice(0, 16);
  const result = { startedAt: new Date().toISOString(), timeoutMs: QA_REQUEST_TIMEOUT_MS, traceId };
  const elapsed = () => {
    const end = clock(now);
    return started === null || end === null ? undefined : Math.min(86_400_000, Math.max(0, Math.round(end - started)));
  };
  return {
    // W3C context only; no baggage, telemetry exporter or user identifier.
    traceparent: `00-${traceId}-${spanId}-01`,
    received(headers) {
      const duration = elapsed();
      if (duration !== undefined) result.headersAfterMs = duration;
      try {
        const id = headers?.get?.('sb-request-id');
        if (typeof id === 'string' && uuid.test(id)) result.providerRequestId = id;
      } catch { /* Missing/broken diagnostics must not change request results. */ }
    },
    failed(error, phase, signal, emptyAllowed = false) {
      const name = property(error, 'name');
      if (phase === 'body' && emptyAllowed && name === 'SyntaxError') return;
      const cause = property(error, 'cause');
      const rawCode = property(cause, 'code') ?? property(error, 'code');
      const code = typeof rawCode === 'string' && allowedCodes.has(rawCode) ? rawCode : undefined;
      const deadline = property(signal, 'aborted') === true && property(property(signal, 'reason'), 'name') === 'TimeoutError';
      result.failurePhase = phase === 'body' ? 'body' : 'fetch';
      if (deadline || name === 'TimeoutError' || timeoutCodes.has(code)) {
        result.failureKind = 'timeout';
        result.timeoutSource = deadline ? 'client_deadline' : timeoutCodes.has(code) ? 'transport' : 'unclassified';
      } else if (name === 'AbortError') result.failureKind = 'aborted';
      else if (tlsCodes.has(code)) result.failureKind = 'tls';
      else if (networkCodes.has(code)) result.failureKind = 'network';
      else if (requestCodes.has(code)) result.failureKind = 'invalid_request';
      else if (phase === 'body' && name === 'SyntaxError') result.failureKind = 'invalid_json';
      else if (phase === 'body') result.failureKind = 'body_read_failed';
      else if (name === 'TypeError') result.failureKind = 'fetch_failed';
      else result.failureKind = 'unclassified';
      if (code) result.failureCode = code;
    },
    finish() {
      const duration = elapsed();
      return { ...result, ...(duration === undefined ? {} : { elapsedMs: duration }) };
    },
  };
}
