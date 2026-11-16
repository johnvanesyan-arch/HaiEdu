import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPOSITORY, ObserverError, collectReport } from './failure-observer.mjs';
import { publishIncidents } from './failure-incidents.mjs';

export function eligibleEvent(environment, event = {}) {
  if (environment.GITHUB_REPOSITORY !== REPOSITORY || environment.GITHUB_REF !== 'refs/heads/main') return false;
  if (['schedule', 'workflow_dispatch'].includes(environment.GITHUB_EVENT_NAME)) return true;
  const run = event.workflow_run;
  return environment.GITHUB_EVENT_NAME === 'workflow_run' && run?.name === 'CI' && run.event === 'push' && run.head_branch === 'main' && run.head_repository?.full_name === REPOSITORY && run.status === 'completed';
}

export async function main(command, environment = process.env) {
  const event = JSON.parse(await readFile(environment.GITHUB_EVENT_PATH, 'utf8'));
  if (!eligibleEvent(environment, event)) throw new ObserverError('ineligible_event');
  const enabled = environment.BF22_FAILURE_ALERTS === 'true';
  const mode = environment.BF22_MODE;
  if (!['inspect', 'notify'].includes(mode) || (!enabled && !(mode === 'inspect' && environment.GITHUB_EVENT_NAME === 'workflow_dispatch'))) throw new ObserverError('observer_disabled');
  const options = { token: environment.GITHUB_TOKEN };
  if (command === 'collect') {
    const report = await collectReport({ ...options, runId: Number(environment.GITHUB_RUN_ID), observerCommit: environment.GITHUB_SHA, includeSites: environment.GITHUB_EVENT_NAME !== 'workflow_run' });
    await mkdir('artifacts/failure-observer', { recursive: true });
    await writeFile('artifacts/failure-observer/report.json', `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    await appendFile(environment.GITHUB_OUTPUT, `report=${JSON.stringify(report)}\n`);
    console.log(`BF22_OBSERVATION ${JSON.stringify(report)}`);
  } else if (command === 'publish') {
    if (!enabled || mode !== 'notify') throw new ObserverError('notifications_disabled');
    const report = JSON.parse(environment.BF22_REPORT);
    if (report.runId !== Number(environment.GITHUB_RUN_ID) || report.observerCommit !== environment.GITHUB_SHA) throw new ObserverError('mismatched_observation');
    console.log(`BF22_INCIDENTS ${JSON.stringify(await publishIncidents(report, options))}`);
  } else throw new ObserverError('observer_configuration');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(process.argv[2]); }
  catch (error) {
    console.error(`BF22_OBSERVER_ERROR ${error instanceof ObserverError ? error.kind : 'observer_failed'}`);
    process.exitCode = 1;
  }
}
