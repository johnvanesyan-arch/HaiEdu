import {validateFixture} from './sprint-14-isolation.mjs';

export const mobileSite = 'https://www.haiedu.am';
export const reportPath = 'qa-results/mobile-acceptance.json';
export function mobilePreflight({fixture, credentials, ref, revision}) {
  return [...validateFixture(fixture, credentials),
    ...(ref === 'refs/heads/main' ? [] : ['Reviewed main required']),
    ...(/^[a-f0-9]{40}$/.test(revision ?? '') ? [] : ['Exact source revision required'])];
}
const empty = body => body && Object.keys(body).length === 0;
const exactSelection = (body, contexts) => body && Object.keys(body).length === 3 && contexts.some(c =>
  ['enrollmentId','curriculumReleaseId','unitId'].every(k => body[k] === c[k]));

// Authentication is injected in memory by the runner. Browser password login,
// learning starts, work opens (which may create drafts), uploads and all writes
// fail closed, including accidentally introduced calls from a changed UI.
export function mobileReadAllowed({pathname, method, search = '', body, role, contexts = []}) {
  if (method === 'OPTIONS') return true;
  if (pathname === '/auth/v1/user') return method === 'GET';
  if (pathname === '/auth/v1/token') return method === 'POST' && new URLSearchParams(search).get('grant_type') === 'refresh_token';
  if (pathname === '/rest/v1/profiles') return method === 'GET';
  if (method !== 'POST' || !body || Array.isArray(body)) return false;
  if (role === 'student') {
    if (pathname === '/functions/v1/get-student-classes') return empty(body);
    if (pathname === '/functions/v1/get-student-dashboard') return (
      body.navigation === true && Object.keys(body).length === 1 || exactSelection(body, contexts));
    if (pathname === '/functions/v1/get-unit-guides') return exactSelection(body, contexts);
    if (pathname === '/functions/v1/manage-written-work') return Object.keys(body).length === 3 &&
      body.action === 'tasks' && exactSelection(body.context, contexts) && empty(body.payload);
    return false;
  }
  if (role !== 'teacher') return false;
  if (['get-teacher-dashboard','get-teacher-workspace','get-teacher-student'].some(fn => pathname === '/functions/v1/' + fn)) return true;
  if (pathname === '/functions/v1/manage-student-invitation') return body.action === 'list';
  if (pathname === '/functions/v1/manage-written-work') return ['queue','inspect'].includes(body.action);
  if (pathname === '/functions/v1/manage-teacher-feedback') return ['open','snippets'].includes(body.action);
  return false;
}

// Construct an allowlisted receipt, never serialize browser errors, network
// payloads, auth state or arbitrary assertion messages (even on failure).
export function mobileReceipt(state) {
  const stages = ['preflight','release','isolation-before','login','student-navigation','student-course','teacher-home','teacher-class','teacher-review','layout','isolation-after','release-after','cleanup','complete'];
  return {schemaVersion: 'haiedu-mobile-read-acceptance-v1',
    revision: /^[a-f0-9]{40}$/.test(state.revision ?? '') ? state.revision : null,
    status: state.status === 'passed' ? 'passed' : 'failed',
    failedStage: stages.includes(state.failedStage) ? state.failedStage : null,
    checks: (state.checks ?? []).map(c => ({side: ['A','B'].includes(c.side) ? c.side : null,
      role: ['student','teacher'].includes(c.role) ? c.role : null,
      width: [390,430].includes(c.width) ? c.width : null,
      scenario: stages.includes(c.scenario) ? c.scenario : null, passed: c.passed === true})),
    isolation: ['before','after'].map(phase => ({phase, passed: state.isolation?.[phase]?.status === 'passed',
      checks: state.isolation?.[phase]?.checks?.length ?? 0})),
    cleanup: (state.cleanup ?? []).map(c => ({closed: c.closed === true, status: Number.isInteger(c.status) && c.status >= 100 && c.status <= 599 ? c.status : null})),
    browser: 'Chromium phone emulation; 390x844 and 430x932; ordinary and 200% text',
    recordings: 'none; no auth files, traces, video, screenshots, HTML reports or raw errors',
    limitation: 'Technical read-only acceptance; no personal sign-off, physical-device or assistive-technology acceptance; no learner submission or marking writes'};
}

export async function closeOwnedSessions(sessions, logout) {
  const result = [];
  for (const session of sessions) {
    let status = null;
    try { status = await logout(session); } catch { /* Continue cleanup after individual failure. */ }
    result.push({closed: status === 204, status});
  }
  return result;
}
