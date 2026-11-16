// Test infrastructure only. A local target is constructed by an owned runner,
// never selected from production defaults or an arbitrary environment URL.
export const STAGING_VERSION = 'haiedu-owned-local-staging-v1';

export function loopbackOrigin(value) {
  if (typeof value !== 'string' || !/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(value)) throw Error('staging_loopback_required');
  const url = new URL(value);
  if (Number(url.port) > 65535 || url.origin !== value) throw Error('staging_loopback_required');
  return value;
}

export function validateStagingTarget(target, owned) {
  if (!target || !owned || target.schemaVersion !== STAGING_VERSION || target.kind !== 'owned-local'
      || !/^[a-f0-9]{24}$/.test(target.runId ?? '') || !/^[a-f0-9]{40}$/.test(target.sourceCommit ?? '')
      || !['two-school-dashboards-v2','two-school-assessment-files-v3','two-school-mastery-v4','two-school-pilot-v5','two-school-resources-v6'].includes(target.fixtureVersion)
      || !/^[a-f0-9]{64}$/.test(target.buildId ?? '')) throw Error('staging_manifest_invalid');
  for (const key of ['backendOrigin', 'frontendOrigin']) loopbackOrigin(target[key]);
  if (target.backendOrigin === target.frontendOrigin) throw Error('staging_origins_must_differ');
  for (const key of ['runId','sourceCommit','fixtureVersion','backendOrigin','frontendOrigin','buildId']) {
    if (target[key] !== owned[key]) throw Error('staging_ownership_mismatch');
  }
  return Object.freeze({...target});
}

export function stagingUrl(target, value) {
  if (typeof value !== 'string' || value.startsWith('//')) throw Error('staging_destination_refused');
  const url = new URL(value, target.backendOrigin);
  if (url.username || url.password || ![target.backendOrigin,target.frontendOrigin].includes(url.origin)) throw Error('staging_destination_refused');
  return url;
}

export function guardedStagingFetch(target, owned, fetchImpl = fetch) {
  const verified = validateStagingTarget(target, owned);
  return (input, options = {}) => {
    const url = stagingUrl(verified, input);
    return fetchImpl(url.href, {...options, redirect:'error'});
  };
}
