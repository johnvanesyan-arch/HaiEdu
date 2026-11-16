import { REPOSITORY, TARGETS, ObserverError, validateReport, githubRequest, currentCi } from './failure-observer.mjs';

const titles = Object.freeze({ public_site: 'HaiEdu public website check failed', main_ci: 'HaiEdu main release checks failed' });
const descriptions = Object.freeze({ network: 'The public file could not be reached.', timeout: 'The public file did not respond within eight seconds.', http_error: 'The public file returned an unsuccessful HTTP status.', redirect_refused: 'The address redirected outside the permitted public pages or too many times.', response_too_large: 'The public file exceeded the small-file limit.', invalid_release: 'The public release record is missing or invalid.', invalid_page: 'The public sign-in page is missing its expected HTML controls.', ci_failure: 'The main release checks failed.', ci_timeout: 'The main release checks timed out.', ci_startup_failure: 'The main release checks could not start.', ci_action_required: 'The main release checks require action.', healthy: 'The observed check is healthy again.' });
const marker = signal => `<!-- haiedu-bf22:v1:${signal} -->`;

export function incidentBody(report, signal) {
  validateReport(report);
  if (!Object.hasOwn(titles, signal)) throw new ObserverError('invalid_report');
  const samples = report.samples.filter(s => signal === 'main_ci' ? s.signal === signal : s.signal !== 'main_ci');
  if (!samples.length) throw new ObserverError('invalid_report');
  const healthy = samples.every(s => s.state === 'healthy');
  return [marker(signal),
    healthy ? '**Recovered.**' : '**Investigation needed.**',
    `Observed: ${report.observedAt}`,
    ...samples.flatMap(sample => [
      `${TARGETS[sample.signal] ?? 'Main CI'}: ${descriptions[sample.kind]}`,
      ...(sample.httpStatus ? [`HTTP status: ${sample.httpStatus}`] : []),
      ...(sample.release ? [`Release: \`${sample.release}\``] : []),
      ...(sample.ciRunId ? [`[Inspect release checks](https://github.com/${REPOSITORY}/actions/runs/${sample.ciRunId})`] : []),
    ]),
    `[Inspect observer](https://github.com/${REPOSITORY}/actions/runs/${report.runId})`,
    'Scope: public static availability and main CI only. This does not verify signed-in lessons, database operations or classroom capacity.',
    'Repeated failures keep this issue open without additional comments. A healthy observation closes it. Do not put learner data or credentials in this public issue.',
  ].join('\n\n');
}

async function openIncidents(options) {
  const owned = new Map();
  for (let page = 1; page <= 10; page++) {
    const issues = await githubRequest(`/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100&page=${page}`, options);
    if (!Array.isArray(issues)) throw new ObserverError('invalid_github_response');
    for (const issue of issues) {
      if (issue.pull_request || issue.state !== 'open' || issue.user?.login !== 'github-actions[bot]' || issue.user?.type !== 'Bot') continue;
      const signal = Object.keys(titles).find(key => typeof issue.body === 'string' && issue.body.startsWith(`${marker(key)}\n\n`));
      if (!signal) {
        if (Object.values(titles).includes(issue.title)) throw new ObserverError('ambiguous_incident');
        continue;
      }
      if (owned.has(signal) || issue.title !== titles[signal] || !Number.isSafeInteger(issue.number) || issue.number <= 0) throw new ObserverError('ambiguous_incident');
      owned.set(signal, issue.number);
    }
    if (issues.length < 100) return owned;
  }
  throw new ObserverError('incident_scan_limit');
}

export async function publishIncidents(report, { now = () => new Date(), ...options } = {}) {
  validateReport(report);
  const age = now().getTime() - Date.parse(report.observedAt);
  if (age < -5000 || age > 600_000) throw new ObserverError('stale_observation');
  // Recheck main immediately before any mutations: old failures and recoveries
  // must not overwrite a newer release or a rerun still in progress.
  const current = report.samples.some(s => s.signal === 'main_ci') ? await currentCi(options) : null;
  const samples = report.samples.filter(s => s.signal !== 'main_ci' || (current && current.ciRunId === s.ciRunId && current.release === s.release && current.state === s.state && current.kind === s.kind));
  if (!samples.length) return [];
  const owned = await openIncidents(options);
  const results = [];
  // All public addresses share one incident: an outage of the same hosting
  // service must not produce three notifications. Close only when all pass.
  for (const signal of Object.keys(titles)) {
    const group = samples.filter(s => signal === 'main_ci' ? s.signal === signal : s.signal !== 'main_ci');
    if (!group.length) continue;
    const healthy = group.every(s => s.state === 'healthy');
    const number = owned.get(signal);
    if (!healthy && !number) {
      // Never retry a mutation here. A later run rereads issues after an
      // uncertain network response, avoiding duplicate notifications.
      await githubRequest('/issues', { ...options, method: 'POST', body: { title: titles[signal], body: incidentBody(report, signal) } });
      results.push({ signal, action: 'opened' });
    } else if (healthy && number) {
      await githubRequest(`/issues/${number}`, { ...options, method: 'PATCH', body: { state: 'closed', state_reason: 'completed', body: incidentBody(report, signal) } });
      results.push({ signal, action: 'resolved' });
    } else results.push({ signal, action: 'unchanged' });
  }
  return results;
}
