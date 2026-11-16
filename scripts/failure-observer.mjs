// BF-22 observes public static files and the latest main CI run only.
// No sessions, provider keys, learner records, response bodies or raw errors
// are included in the returned report. Targets are deliberately not configurable.
export const REPOSITORY = 'johnvanesyan-arch/HaiEdu';
export const API = `https://api.github.com/repos/${REPOSITORY}`;
export const SCOPE = 'bf22-public-health-and-main-ci';
export const TARGETS = Object.freeze({
  site_apex: 'https://haiedu.am',
  site_www: 'https://www.haiedu.am',
  site_vercel: 'https://armenian-mastery-platform.vercel.app',
});
export const SIGNALS = Object.freeze([...Object.keys(TARGETS), 'main_ci']);
const kinds = new Set(['healthy', 'network', 'timeout', 'http_error', 'redirect_refused', 'response_too_large', 'invalid_release', 'invalid_page', 'ci_failure', 'ci_timeout', 'ci_startup_failure', 'ci_action_required']);
const sha = /^[a-f0-9]{40}$/;
const isSha = value => typeof value === 'string' && sha.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const exact = (object, allowed, required = allowed) => object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).every(key => allowed.includes(key)) && required.every(key => Object.hasOwn(object, key));

export class ObserverError extends Error {
  constructor(kind) { super(kind); this.kind = kind; }
}
const fail = kind => { throw new ObserverError(kind); };

export function validateReport(report) {
  if (!exact(report, ['schemaVersion', 'scope', 'observedAt', 'observerCommit', 'runId', 'samples']) || report.schemaVersion !== 1 || report.scope !== SCOPE || !isSha(report.observerCommit) || !positive(report.runId) || typeof report.observedAt !== 'string' || !Number.isFinite(Date.parse(report.observedAt)) || new Date(report.observedAt).toISOString() !== report.observedAt || !Array.isArray(report.samples) || report.samples.length > SIGNALS.length) fail('invalid_report');
  const seen = new Set();
  for (const sample of report.samples) {
    if (!exact(sample, ['signal', 'state', 'kind', 'httpStatus', 'release', 'ciRunId'], ['signal', 'state', 'kind']) || !SIGNALS.includes(sample.signal) || seen.has(sample.signal) || !['healthy', 'failed'].includes(sample.state) || !kinds.has(sample.kind) || (sample.state === 'healthy') !== (sample.kind === 'healthy')) fail('invalid_report');
    if (Object.hasOwn(sample, 'httpStatus') && (!Number.isInteger(sample.httpStatus) || sample.httpStatus < 100 || sample.httpStatus > 599)) fail('invalid_report');
    if (Object.hasOwn(sample, 'release') && !isSha(sample.release)) fail('invalid_report');
    if (sample.signal === 'main_ci') {
      if (!positive(sample.ciRunId) || !isSha(sample.release) || Object.hasOwn(sample, 'httpStatus') || (sample.state === 'failed' && !sample.kind.startsWith('ci_'))) fail('invalid_report');
    } else if (Object.hasOwn(sample, 'ciRunId') || sample.kind.startsWith('ci_') || (sample.state === 'healthy' && !isSha(sample.release))) fail('invalid_report');
    seen.add(sample.signal);
  }
  const sites = report.samples.filter(sample => sample.signal !== 'main_ci');
  if (sites.length !== 0 && sites.length !== Object.keys(TARGETS).length) fail('invalid_report');
  return report;
}

async function boundedText(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    fail('response_too_large');
  }
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) fail('response_too_large');
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { await reader.cancel().catch(() => {}); }
}

export async function githubRequest(path, { token, fetchImpl = fetch, method = 'GET', body } = {}) {
  // All callers construct paths from fixed names and validated integer IDs.
  if (!path.startsWith('/') || path.includes('://') || !token) fail('observer_configuration');
  try {
    const response = await fetchImpl(`${API}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) { await response.body?.cancel(); fail('github_request_failed'); }
    return JSON.parse(await boundedText(response, 2_000_000));
  } catch { fail('github_request_failed'); }
}

// Ignore PRs, forks, older commits, pending runs, skips and cancellations.
// This samples current state, not the possibly stale workflow_run payload.
export async function currentCi(options) {
  const ref = await githubRequest('/git/ref/heads/main', options);
  const head = ref?.object?.sha;
  if (!isSha(head)) fail('invalid_github_response');
  const data = await githubRequest('/actions/workflows/ci.yml/runs?branch=main&event=push&per_page=1', options);
  if (!Array.isArray(data?.workflow_runs)) fail('invalid_github_response');
  const run = data.workflow_runs[0];
  if (!run) return null;
  if (run.event !== 'push' || run.head_branch !== 'main' || run.head_repository?.full_name !== REPOSITORY || run.path !== '.github/workflows/ci.yml' || run.head_sha !== head || run.status !== 'completed') return null;
  const conclusion = { success: 'healthy', failure: 'ci_failure', timed_out: 'ci_timeout', startup_failure: 'ci_startup_failure', action_required: 'ci_action_required' }[run.conclusion];
  if (!conclusion) return null;
  if (!positive(run.id)) fail('invalid_github_response');
  return { signal: 'main_ci', state: conclusion === 'healthy' ? 'healthy' : 'failed', kind: conclusion, release: head, ciRunId: run.id };
}

async function publicFile(origin, path, fetchImpl, timeoutMs, limit) {
  let url = new URL(path, origin);
  for (let hop = 0; hop < 3; hop++) {
    const response = await fetchImpl(url.href, { redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs), headers: { accept: path.endsWith('.json') ? 'application/json' : 'text/html' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) fail('redirect_refused');
      let next;
      try { next = new URL(location, url); } catch { fail('redirect_refused'); }
      if (!Object.values(TARGETS).includes(next.origin) || next.pathname !== path || next.search || next.hash || next.username || next.password) fail('redirect_refused');
      url = next;
      continue;
    }
    if (response.status !== 200) { await response.body?.cancel(); return { status: response.status }; }
    const text = await boundedText(response, limit);
    return { status: response.status, type: response.headers.get('content-type') ?? '', text };
  }
  fail('redirect_refused');
}

export async function checkSite(signal, { fetchImpl = fetch, timeoutMs = 8_000 } = {}) {
  if (!Object.hasOwn(TARGETS, signal)) fail('observer_configuration');
  let release;
  const failed = (kind, extras = {}) => ({ signal, state: 'failed', kind, ...(release ? { release } : {}), ...extras });
  try {
    const metadata = await publicFile(TARGETS[signal], '/release.json', fetchImpl, timeoutMs, 4096);
    if (metadata.status !== 200) return failed('http_error', { httpStatus: metadata.status });
    let parsed;
    try { parsed = JSON.parse(metadata.text); } catch { return failed('invalid_release'); }
    if (!/application\/json/i.test(metadata.type) || !exact(parsed, ['schemaVersion', 'commit']) || parsed.schemaVersion !== 1 || !isSha(parsed.commit)) return failed('invalid_release');
    release = parsed.commit;
    const page = await publicFile(TARGETS[signal], '/account-access', fetchImpl, timeoutMs, 262144);
    if (page.status !== 200) return failed('http_error', { httpStatus: page.status });
    if (!/text\/html/i.test(page.type) || !/\bid=["']loginForm["']/.test(page.text) || !/\bid=["']loginEmail["']/.test(page.text)) return failed('invalid_page');
    return { signal, state: 'healthy', kind: 'healthy', release };
  } catch (error) {
    const kind = error instanceof ObserverError ? error.kind : ['TimeoutError', 'AbortError'].includes(error?.name) ? 'timeout' : 'network';
    return failed(kind);
  }
}

export async function collectReport({ observerCommit, runId, includeSites = false, now = () => new Date(), pause = ms => new Promise(resolve => setTimeout(resolve, ms)), ...options }) {
  const samples = [];
  const ci = await currentCi(options);
  if (ci) samples.push(ci);
  if (includeSites) {
    // At most one confirmation per failed address, never an unbounded retry.
    // Sequential requests avoid a burst; healthy runs read six small static files.
    for (const signal of Object.keys(TARGETS)) {
      let sample = await checkSite(signal, options);
      if (sample.state === 'failed') { await pause(3000); sample = await checkSite(signal, options); }
      samples.push(sample);
    }
  }
  return validateReport({ schemaVersion: 1, scope: SCOPE, observedAt: now().toISOString(), observerCommit, runId, samples });
}
