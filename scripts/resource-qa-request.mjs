import { beginQaRequest } from './qa-request-diagnostics.mjs';

export const RESOURCE_QA_TIMEOUT_MS = 25_000;
export const RESOURCE_QA_DIAGNOSTICS_VERSION = 'haiedu-resource-request-diagnostics-v1';
const actorLabel = actor => typeof actor === 'string' && /^[AB]_(admin|teacher|student)$/.test(actor) ? actor : actor == null ? 'login' : 'unrecognized';
const endpointLabel = endpoint => typeof endpoint === 'string' && /^(\/functions\/v1\/[a-z0-9-]+|\/auth\/v1\/token\?grant_type=password|\/auth\/v1\/logout\?scope=local)$/.test(endpoint) ? endpoint : 'unrecognized';

// Preserve the resource runner's existing request/response contract and deadline.
// Only allowlisted metadata reaches record; never bodies, credentials or errors.
export function createResourceQaRequest({ url, key, getSession, record = () => {}, fetchImpl = fetch,
  makeSignal = timeoutMs => AbortSignal.timeout(timeoutMs), now } = {}) {
  return async function request(actor, endpoint, body) {
    const trace = beginQaRequest({ ...(now ? { now } : {}) });
    let signal, responseStatus, phase = 'fetch';
    const finish = result => {
      // The shared timing recorder defaults to isolation's 20-second deadline;
      // this caller owns and reports its unchanged 25-second resource deadline.
      const diagnostics = { ...trace.finish(), timeoutMs: RESOURCE_QA_TIMEOUT_MS,
        ...(responseStatus === undefined ? {} : { responseStatus }) };
      try { record({ actor: actorLabel(actor), endpoint: endpointLabel(endpoint), httpStatus: result.status, diagnostics }); }
      catch { /* Optional diagnostics must not change acceptance or cleanup. */ }
      return { ...result, diagnostics };
    };
    try {
      signal = makeSignal(RESOURCE_QA_TIMEOUT_MS);
      const multipart = body instanceof FormData;
      const response = await fetchImpl(url + endpoint, { method: 'POST', redirect: 'error',
        headers: { apikey: key, Authorization: 'Bearer ' + (getSession(actor)?.access_token ?? key),
          ...(multipart ? {} : { 'Content-Type': 'application/json' }), traceparent: trace.traceparent },
        body: multipart ? body : JSON.stringify(body ?? {}), signal });
      responseStatus = response.status;
      trace.received(response.headers);
      phase = 'body';
      let data;
      if (response.headers.get('content-type')?.startsWith('application/pdf')) data = new Uint8Array(await response.arrayBuffer());
      else {
        try { data = await response.json(); }
        catch (error) {
          trace.failed(error, 'body', signal, response.status === 204 || response.status === 205 || endpoint === '/auth/v1/logout?scope=local');
          data = null;
        }
      }
      return finish({ status: response.status, headers: response.headers, data });
    } catch (error) {
      trace.failed(error, phase, signal);
      return finish({ status: 0, data: null });
    }
  };
}
