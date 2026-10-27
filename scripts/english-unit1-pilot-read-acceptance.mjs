import { ownNavigation } from './qa-programme-fixtures.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateFixture, roles, sides, runIsolation } from './sprint-14-isolation.mjs';
import { clientHeaders, anonymousDashboardDenied, allowedBrowserRequest, containsProtectedContent } from './chapter-ii-pilot-read-acceptance.mjs';
import { waitForRelease } from './wait-for-production-release.mjs';

// Subject-aware acceptance extension, not a shared runtime or an activation tool.
// Only read operations are allowed. Opening writing work can create a draft, so
// this runner lists tasks but never opens one. Audio fetch/play is also excluded.
export const activationPath = 'docs/evidence/english-7-unit-01-pilot-activation.json';
export const decisionPath = 'docs/content/english-7-unit-01-release-decision.json';
export const configurationPath = 'docs/content/english-7-unit-01-release-configuration.json';
const decisionBytes = await readFile(new URL(`../${decisionPath}`, import.meta.url));
const configurationBytes = await readFile(new URL(`../${configurationPath}`, import.meta.url));
export const decision = JSON.parse(decisionBytes);
export const configuration = JSON.parse(configurationBytes);
export const english = Object.freeze(configuration.scope);
export const writingTaskId = '86355072-adf3-52d3-a85d-df48e6af2b4e';
const materials = JSON.parse(await readFile(new URL('../docs/content/english-7-unit-01-materials.json', import.meta.url), 'utf8'));
const guides = materials.materials.filter(m => m.kind === 'guide');
const site = 'https://www.haiedu.am';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
const equal = (a, b) => canonical(a) === canonical(b);
const selection = c => ({ enrollmentId: c.enrollmentId, curriculumReleaseId: c.curriculumReleaseId, unitId: c.unitId });
const same = (a, b) => ['enrollmentId', 'curriculumReleaseId', 'unitId'].every(k => a?.[k] === b?.[k]);
const denied = (r, error = 'learning_context_unavailable') => r.status === 403 && r.data?.error === error && Object.keys(r.data).length === 1;
export const policyFields = ['schemaVersion', 'hintsAllowed', 'responseTypes', 'scoringStrategy', 'minimumPercent',
  'deliveredSkillIds', 'scoredSkillIds', 'readinessSkillIds', 'reportingGroups', 'questionCountBySkill',
  'minimumCorrectBySkill', 'learningModelConfigurationId', 'academicMasteryPolicyId'];

export function validateActivation({ activation, fixture, credentials, revision, ref }) {
  const errors = validateFixture(fixture, credentials);
  if (ref !== 'refs/heads/main' || !/^[a-f0-9]{40}$/i.test(revision ?? '')) errors.push('Exact reviewed main revision required');
  if (activation?.schemaVersion !== 'haiedu-english-unit1-activation-v1' || activation.status !== 'activated'
      || activation.releaseStatus !== 'pilot' || !Number.isFinite(Date.parse(activation.activatedAt))) errors.push('Verified provisional activation required');
  if (!equal(activation?.scope, english)) errors.push('Exact English scope required');
  if (activation?.configurationSha256 !== digest(configurationBytes) || decision.configuration.sha256 !== digest(configurationBytes)
      || activation?.decisionManifestSha256 !== digest(decisionBytes)) errors.push('Exact reviewed configuration and decision required');
  const owner = activation?.ownerAuthorization;
  if (owner?.action !== 'activate_provisional_pilot' || !equal(owner.scope, english)
      || owner.decisionManifestSha256 !== digest(decisionBytes) || !owner.ownerDirection?.trim()
      || !Number.isFinite(Date.parse(owner.recordedAt)) || owner.specialistReview !== 'deferred'
      || owner.learnerSourceUseConfirmed !== true || !owner.recordingProviderVoiceUseBasis?.trim()
      || !owner.textbookAdaptationUseBasis?.trim()) errors.push('Recorded bounded owner and intended-use decisions required');
  if (activation?.specialistGate !== 'pending' || activation?.independentSmeApproved !== false
      || activation?.unseenAssessmentClaim !== false || activation?.verifiedReadback !== true) errors.push('Honest verified provisional disposition required');
  return errors;
}

export function englishContract(data, context) {
  if (data?.dashboardVersion !== 'authorized-learning-dashboard-v1' || data.readOnly !== true || !same(data.context, context)
      || data.context.subjectProgramId !== english.subjectProgramId || data.maximumAttempts !== 3 || containsProtectedContent(data)) return false;
  const required = configuration.policies.find(p => p.mode === 'mastery_check').readinessSkillIds;
  if (!Array.isArray(data.skills) || data.skills.length !== required.length || new Set(data.skills.map(s => s.id)).size !== required.length
      || data.skills.some(s => !required.includes(s.id) || s.requiredForReadiness !== true)) return false;
  for (const expected of configuration.policies) {
    const got = data.modes?.[expected.mode];
    if (got?.status !== 'configured' || got.questions !== expected.plannedQuestionCount || got.policyVersion !== expected.version
        || policyFields.some(key => !Object.hasOwn(got, key) || !equal(got[key], expected[key] ?? null))) return false;
  }
  return true;
}

export function guideContract(data, dashboard) {
  if (data?.guidesVersion !== 'unit-guides-v1' || data.readOnly !== true || !Array.isArray(data.guides)) return false;
  const availability = ['diagnostic', 'mastery_check'].includes(dashboard.activeSession?.mode) ? 'assessment_active'
    : !dashboard.baseline ? 'diagnostic_required' : 'available';
  if (data.availability !== availability) return false;
  if (availability !== 'available') return data.guides.length === 0;
  const projection = guides.map(m => ({ id: m.id, version: m.versionNo, sequenceOrder: m.sequenceOrder,
    schemaVersion: m.definition.schemaVersion, title: m.definition.title, text: m.definition.text,
    workedExample: m.definition.workedExample, locale: m.definition.locale }));
  return equal(data.guides, projection);
}

export function englishReadAllowed(input) {
  if (allowedBrowserRequest(input)) return true;
  const { pathname, method, body } = input;
  if (method !== 'POST') return false;
  if (pathname === '/functions/v1/get-unit-guides') return body && Object.keys(body).length === 3
    && ['enrollmentId', 'curriculumReleaseId', 'unitId'].every(k => uuid(body[k]));
  return pathname === '/functions/v1/manage-written-work' && body?.action === 'tasks'
    && Object.keys(body).sort().join(',') === 'action,context,payload' && equal(body.payload, {})
    && body.context && Object.keys(body.context).length === 3
    && ['enrollmentId', 'curriculumReleaseId', 'unitId'].every(k => uuid(body.context[k]));
}

export async function runReadChecks({ fixture, request, check }) {
  const contexts = {}, snapshots = {}, dashboards = {};
  const foreign = (data, side) => {
    const other = fixture[side === 'A' ? 'B' : 'A'], text = JSON.stringify(data);
    return ['schoolId', 'classId', 'studentId', 'teacherId', 'adminId'].some(k => text?.includes(other[k]));
  };
  const read = async (side, c) => {
    const r = await request(`${side}_student`, '/functions/v1/get-student-dashboard', selection(c));
    check(`${side}: own programme dashboard with exact context`, r.status === 200 && r.data?.readOnly === true
      && same(r.data.context, c) && !containsProtectedContent(r.data) && !foreign(r.data, side), r.status);
    return r.data;
  };
  for (const side of sides) {
    const navigation = await request(`${side}_student`, '/functions/v1/get-student-classes', {});
    check(`${side}: navigation restricted to designated school and programme classes`, navigation.status === 200
      && Array.isArray(navigation.data?.contexts) && navigation.data.contexts.length > 0 && !foreign(navigation.data, side)
      && ownNavigation(navigation.data.contexts, fixture[side]), navigation.status);
    const all = navigation.data.contexts;
    const own = all.filter(c => c.curriculumReleaseId === english.curriculumReleaseId && c.unitId === english.unitId);
    const preserved = all.filter(c => c.curriculumReleaseId === fixture[side].curriculumReleaseId && c.unitId === fixture[side].unitId);
    check(`${side}: exactly one designated English and preserved programme context`, own.length === 1 && preserved.length === 1
      && own[0].subjectProgramId === english.subjectProgramId && preserved[0].subjectProgramId !== english.subjectProgramId
      && uuid(own[0].enrollmentId) && uuid(own[0].teacherAssignmentId) && own[0].enrollmentId !== preserved[0].enrollmentId);
    contexts[side] = { english: own[0], preserved: preserved[0], all };
    snapshots[side] = [];
    for (const c of all) snapshots[side].push(digest(canonical(await read(side, c))));
    const d = await read(side, own[0]); dashboards[side] = d;
    check(`${side}: exact four approved English policy projections`, englishContract(d, own[0]));
    const guide = await request(`${side}_student`, '/functions/v1/get-unit-guides', selection(own[0]));
    check(`${side}: nine exact guides or truthful diagnostic/assessment gate`, guide.status === 200 && guideContract(guide.data, d), guide.status);
    const written = await request(`${side}_student`, '/functions/v1/manage-written-work', { action: 'tasks', context: selection(own[0]), payload: {} });
    check(`${side}: accepted separate W01 task is available`, written.status === 200 && written.data?.version === 'written-work-v1'
      && written.data.tasks?.length === 1 && written.data.tasks[0].id === writingTaskId && written.data.tasks[0].version === 1
      && written.data.tasks[0].available === true && written.data.tasks[0].baselineRequired === false, written.status);
    const staff = { assignmentId: own[0].teacherAssignmentId, curriculumReleaseId: english.curriculumReleaseId, unitId: english.unitId };
    const queue = await request(`${side}_teacher`, '/functions/v1/manage-written-work', { action: 'queue', context: staff, payload: {} });
    check(`${side}: matching teacher can read the English writing queue`, queue.status === 200 && queue.data?.version === 'written-work-v1'
      && Array.isArray(queue.data.queue) && !foreign(queue.data, side), queue.status);
  }
  for (const side of sides) {
    const own = contexts[side].english, other = contexts[side === 'A' ? 'B' : 'A'].english;
    const probes = [selection(other), ...contexts[side].all.filter(c => c.subjectProgramId !== english.subjectProgramId)
      .flatMap(c => [{ ...selection(own), curriculumReleaseId: c.curriculumReleaseId }, { ...selection(c), ...english, enrollmentId: c.enrollmentId }])];
    for (const probe of probes) {
      // Keep request shape valid; a schema error must not pass as authorization denial.
      const r = await request(`${side}_student`, '/functions/v1/get-student-dashboard', selection(probe));
      check(`${side}: foreign enrollment or mixed programme scope denied`, denied(r), r.status);
    }
    for (const role of ['teacher', 'admin']) {
      const r = await request(`${side}_${role}`, '/functions/v1/get-student-dashboard', selection(own));
      check(`${side}_${role}: cannot substitute learner identity`, denied(r), r.status);
    }
    const source = await request(`${side}_student`, '/functions/v1/get-unit-guides', selection(other));
    check(`${side}: foreign guide context denied`, denied(source), source.status);
    const written = await request(`${side}_student`, '/functions/v1/manage-written-work', { action: 'tasks', context: selection(other), payload: {} });
    check(`${side}: foreign writing context denied`, denied(written, 'written_context_unavailable'), written.status);
    const staff = await request(`${side}_teacher`, '/functions/v1/manage-written-work', { action: 'queue', context: {
      assignmentId: other.teacherAssignmentId, curriculumReleaseId: english.curriculumReleaseId, unitId: english.unitId }, payload: {} });
    check(`${side}: foreign teacher assignment denied`, denied(staff, 'written_context_unavailable'), staff.status);
  }
  const anonymous = await request(null, '/functions/v1/get-student-dashboard', selection(contexts.A.english));
  check('anonymous English dashboard denied', anonymousDashboardDenied(anonymous), anonymous.status);
  return { contexts, dashboards, async verifyPreserved() {
    for (const side of sides) for (const [index, c] of contexts[side].all.entries()) {
      check(`${side}: all existing programme learning state preserved`, digest(canonical(await read(side, c))) === snapshots[side][index]);
    }
  } };
}

export async function browserChecks({ contexts, dashboards, sessions, url, check }) {
  const { chromium, expect: baseExpect } = await import('@playwright/test');
  const expect = baseExpect.configure({ timeout: 30000 }), browser = await chromium.launch({ headless: true });
  try { for (const side of sides) {
    const c = contexts[side].english;
    const context = await browser.newContext({ viewport: { width: 1365, height: 950 }, serviceWorkers: 'block', storageState: {
      cookies: [], origins: [{ origin: site, localStorage: [{ name: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(sessions.get(`${side}_student`)) }] }],
    } });
    let blocked = 0, pageErrors = 0;
    try {
      await context.route(`${url}/**`, async route => {
        const req = route.request(), target = new URL(req.url()); let body;
        try { body = req.postDataJSON(); } catch { body = null; }
        if (!englishReadAllowed({ pathname: target.pathname, search: target.search, method: req.method(), body })) { blocked++; return route.abort(); }
        return route.continue();
      });
      const page = await context.newPage(); page.on('pageerror', () => pageErrors++);
      await page.goto(`${site}/index.html`, { waitUntil: 'domcontentloaded' });
      const card = page.locator('#mySubjects .amp-subject-card').filter({ has: page.locator(`.amp-subject-class-list a[href*="unit=${english.unitId}"]`) });
      await expect(card).toHaveCount(1);
      await card.locator('summary').click();
      const link = card.locator(`.amp-subject-class-list a[href*="unit=${english.unitId}"]`);
      await expect(link).toHaveCount(1);
      const destination = new URL(await link.getAttribute('href'), site);
      check(`${side}: English home link retains exact enrollment and release`, destination.searchParams.get('enrollment') === c.enrollmentId
        && destination.searchParams.get('release') === english.curriculumReleaseId && !destination.searchParams.has('action'));
      await link.click();
      await expect(page.locator('#courseTitle')).toContainText(c.unitTitleHy);
      await page.locator('.course-tabs a[href*="tab=assessment"]').click();
      if (!dashboards[side].activeSession) {
        const cards = page.locator('.course-mode-card'); await expect(cards).toHaveCount(4);
        for (const [index, n] of [28, 8, 28, 12].entries()) await expect(cards.nth(index)).toContainText(`${n} հարց`);
        await expect(cards.nth(2).locator('[data-assessment-scope]')).toBeVisible();
      } else await expect(page.locator('.course-active-session')).toBeVisible();
      check(`${side}: desktop course has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('.course-tabs a[href*="tab=guides"]').click();
      await expect(page.locator('[data-guides-body]')).not.toContainText('բեռնվում են');
      const available = dashboards[side].baseline && !['diagnostic', 'mastery_check'].includes(dashboards[side].activeSession?.mode);
      if (available) await expect(page.locator('[data-guide-id]')).toHaveCount(9);
      else await expect(page.locator('[data-guides-body]')).toContainText(dashboards[side].activeSession && ['diagnostic','mastery_check'].includes(dashboards[side].activeSession.mode) ? 'ընթացիկ ստուգման' : 'ախտորոշիչն ավարտելուց');
      await page.locator('.course-tabs a[href*="tab=writing"]').click();
      await expect(page.locator('.written-list')).toContainText('A note to a new classmate');
      check(`${side}: mobile writing list has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      check(`${side}: native read-only course path has no errors or attempted mutations`, blocked === 0 && pageErrors === 0);
    } finally { await context.close(); }
  } } finally { await browser.close(); }
}

async function main() {
  const report = { schemaVersion: 1, scope: 'English Unit 1 provisional pilot authenticated read acceptance', revision: process.env.GITHUB_SHA,
    status: 'running', startedAt: new Date().toISOString(), checks: [], limitations: [
      'Read-only acceptance does not complete learner attempts, play audio or create writing work.',
      'Existing owner content/audio acceptance and isolated C23 writing verification are reused.',
      'Independent specialist qualification, four-subject pilot closure and source licences are not established by this runner.' ] };
  const sessions = new Map(); let request;
  const check = (label, passed, httpStatus) => { report.checks.push({ label, status: passed ? 'passed' : 'failed', ...(httpStatus === undefined ? {} : { httpStatus }) }); if (!passed) throw Error('Acceptance failed'); };
  try {
    const fixture = JSON.parse(process.env.QA_TENANT_FIXTURES_JSON ?? '{}');
    const credentials = Object.fromEntries(sides.flatMap(side => roles.map(role => [`${side}_${role}`, {
      email: process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_EMAIL`], password: process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_PASSWORD`],
    }])));
    const activation = JSON.parse(await readFile(new URL(`../${activationPath}`, import.meta.url), 'utf8'));
    check('exact activation, recorded owner decisions, reviewed main and six designated fixture guards', validateActivation({ activation, fixture, credentials, revision: report.revision, ref: process.env.GITHUB_REF }).length === 0);
    const frontend = await waitForRelease({ expectedCommit: report.revision, timeoutMs: 60000 }); report.frontendCommit = frontend.commit;
    check('exact production revision before authentication', frontend.commit === report.revision);
    const config = await readFile(new URL('../web/config.js', import.meta.url), 'utf8');
    const url = config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1], key = config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
    check('committed public client configuration present', Boolean(url && key) && new URL(url).protocol === 'https:');
    request = async (actor, endpoint, body = {}) => {
      try { const response = await fetch(`${url}${endpoint}`, { method: 'POST', redirect: 'error', headers: clientHeaders(key, sessions.get(actor)?.access_token),
        body: JSON.stringify(body), signal: AbortSignal.timeout(25000) }); return { status: response.status, data: await response.json().catch(() => null) }; }
      catch { return { status: 0, data: null }; }
    };
    report.readIsolation = await runIsolation({ fixture, credentials, url, key, revision: report.revision });
    check('existing two-school positive and negative read controls pass', report.readIsolation.status === 'passed');
    for (const side of sides) for (const role of roles) {
      const actor = `${side}_${role}`, r = await request(null, '/auth/v1/token?grant_type=password', credentials[actor]);
      if (r.data?.access_token) sessions.set(actor, { ...r.data, expires_at: r.data.expires_at ?? Math.floor(Date.now() / 1000) + Number(r.data.expires_in) });
      check(`${actor}: expected designated identity authenticated`, r.status === 200 && Boolean(r.data?.access_token) && r.data?.user?.id === fixture[side][`${role}Id`], r.status);
    }
    const accepted = await runReadChecks({ fixture, request, check });
    await browserChecks({ ...accepted, sessions, url, check });
    await accepted.verifyPreserved();
    await waitForRelease({ expectedCommit: report.revision, timeoutMs: 15000 }); check('production revision still exact after acceptance', true);
  } catch { if (!report.checks.some(c => c.status === 'failed')) report.checks.push({ label: 'acceptance unfinished; raw errors withheld', status: 'failed' }); }
  finally {
    for (const [actor] of sessions) { const r = await request(actor, '/auth/v1/logout?scope=local'); report.checks.push({ label: `${actor}: close only this run authentication session`, status: [200,204].includes(r.status) ? 'passed' : 'failed', httpStatus: r.status }); }
    report.status = report.checks.some(c => c.status === 'failed') ? 'failed' : 'passed'; report.finishedAt = new Date().toISOString();
    await mkdir('qa-results', { recursive: true }); await writeFile('qa-results/english-unit1-pilot-read-acceptance.json', JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(`English Unit 1 read acceptance: ${report.status}; ${report.checks.filter(c => c.status === 'passed').length}/${report.checks.length} checks.`); process.exitCode = report.status === 'passed' ? 0 : 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Acceptance evidence unavailable.'); process.exitCode = 1; });
