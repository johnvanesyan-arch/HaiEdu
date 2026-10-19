import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { roles, sides, runIsolation } from './sprint-14-isolation.mjs';
import { chapterII, chapterIUnitId, chapterIIContract, validateActivation as validateChapterIIActivation, clientHeaders, anonymousDashboardDenied, allowedBrowserRequest, containsProtectedContent, browserErrorDiagnostic, blockedRequestDiagnostic, incompleteBaselinePreserved } from './chapter-ii-pilot-read-acceptance.mjs';
import { chapterIII, chapterIIIContract } from './chapter-iii-pilot-read-acceptance.mjs';
import { chapterIV, chapterIVContract } from './chapter-iv-pilot-read-acceptance.mjs';
import { waitForRelease } from './wait-for-production-release.mjs';

// Deliberately bounded production acceptance, not a reusable release mechanism.
// No answers, sessions, exposures, invitations, memberships or content are written.
export const activationPath = 'docs/evidence/chapter-v-pilot-activation-20261019.json';
export const chapterV = Object.freeze({ curriculumReleaseId: 'a2d0c2da-c04f-5900-a45d-dd325fe24324', unitId: '502f9a3e-6b4b-51a3-bf33-16d919299364' });
const site = 'https://www.haiedu.am';
const uuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const selection = c => ({ enrollmentId: c.enrollmentId, curriculumReleaseId: c.curriculumReleaseId, unitId: c.unitId });
const same = (a, b) => ['enrollmentId', 'curriculumReleaseId', 'unitId'].every(k => a?.[k] === b?.[k]);
const denied = r => r.status === 403 && r.data?.error === 'learning_context_unavailable' && Object.keys(r.data).length === 1;
const noRows = r => (r.status === 403 && r.data?.code === '42501') || (r.status === 200 && Array.isArray(r.data) && r.data.length === 0);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const recipe = JSON.parse(await readFile(new URL('../docs/evidence/chapter-v-assessment-v2-configuration-20261019.json', import.meta.url), 'utf8'));
const sameSet = (a, b) => Array.isArray(a) && a.length === b.length && new Set(a).size === b.length && b.every(x => a.includes(x));
const sameMap = (a, b) => a && Object.keys(a).length === Object.keys(b).length && Object.entries(b).every(([k, v]) => a[k] === v);

export function validateActivation(input) {
  const { activation } = input;
  const errors = validateChapterIIActivation({ ...input, activation: { ...activation, ...chapterII } });
  if (!same({ ...chapterV, enrollmentId: null }, { ...activation, enrollmentId: null })) errors.push('Exact Chapter V activation required');
  if (!same({ ...chapterII, enrollmentId: null }, { ...activation?.preservedChapterII, enrollmentId: null })) errors.push('Preserved Chapter II required');
  if (!same({ ...chapterIII, enrollmentId: null }, { ...activation?.preservedChapterIII, enrollmentId: null })) errors.push('Preserved Chapter III required');
  if (!same({ ...chapterIV, enrollmentId: null }, { ...activation?.preservedChapterIV, enrollmentId: null })) errors.push('Preserved Chapter IV required');
  if (activation?.practicalPerformance !== 'unassessed') errors.push('Knowledge-only activation required');
  if (activation?.preservedChapterI?.curriculumReleaseId !== '80bbe575-ad49-4a7f-881a-e55726b1eaeb') errors.push('Preserved Chapter I required');
  if (activation?.assessmentPolicyVersion !== 'haiedu-assessment-policy-v2' || activation?.ownerAuthorization?.action !== 'activate_provisional_pilot') errors.push('Verified v2 pilot decision required');
  return errors;
}

export function chapterVContract(data, context) {
  const byMode = Object.fromEntries(recipe.contracts.map(p => [p.mode, p])), common = byMode.diagnostic, required = byMode.mastery_check.readinessSkillIds;
  if (data?.dashboardVersion !== 'authorized-learning-dashboard-v1' || data.readOnly !== true || !same(data.context, context)) return false;
  if (!sameSet(data.skills?.map(s => s.id), byMode.practice.deliveredSkillIds) || data.maximumAttempts !== 3 || containsProtectedContent(data)) return false;
  if (data.skills.some(s => s.requiredForReadiness !== required.includes(s.id))) return false;
  for (const [mode, expected] of Object.entries(byMode)) {
    const spec = data.modes?.[mode];
    if (spec?.status !== 'configured' || spec.schemaVersion !== common.schemaVersion || spec.questions !== expected.plannedQuestionCount || spec.hintsAllowed !== expected.hintsAllowed) return false;
    if (!sameSet(spec.deliveredSkillIds, expected.deliveredSkillIds) || spec.reportingGroups?.length !== expected.reportingGroups.length) return false;
    for (const group of expected.reportingGroups) {
      const got = spec.reportingGroups.find(g => g.key === group.key);
      if (got?.label !== group.label || !sameSet(got?.skillIds, group.skillIds)) return false;
    }
    if (expected.questionCountBySkill && !sameMap(spec.questionCountBySkill, expected.questionCountBySkill)) return false;
  }
  const spec = data.modes.mastery_check, expected = byMode.mastery_check;
  return spec.minimumPercent === 80 && sameMap(spec.minimumCorrectBySkill, expected.minimumCorrectBySkill) &&
    sameSet(spec.scoredSkillIds, expected.scoredSkillIds) && sameSet(spec.readinessSkillIds, required);
}

function preservedEvidence(data) {
  return { baseline: data.baseline, activeSession: data.activeSession, lifecycle: data.lifecycle, history: data.history,
    skills: data.skills, modes: data.modes, practiceAccess: data.practiceAccess, maximumAttempts: data.maximumAttempts };
}

export async function runReadChecks({ fixture, activation, request, check }) {
  const contexts = {}, snapshots = {}, chapterVActiveSessions = {};
  const hasForeignIdentity = (value, side) => {
    const other = fixture[side === 'A' ? 'B' : 'A'], text = JSON.stringify(value);
    return ['schoolId', 'classId', 'assignmentId', 'studentId', 'teacherId', 'adminId'].some(k => text.includes(other[k]));
  };
  const dashboard = async (side, context) => {
    const r = await request(`${side}_student`, '/functions/v1/get-student-dashboard', selection(context));
    check(`${side}: exact authorized chapter dashboard`, r.status === 200 && r.data?.readOnly === true && same(r.data?.context, context) && !containsProtectedContent(r.data) && !hasForeignIdentity(r.data, side), r.status);
    return r.data;
  };
  for (const side of sides) {
    const r = await request(`${side}_student`, '/functions/v1/get-student-classes', {});
    check(`${side}: navigation has only own-school contexts`, r.status === 200 && Array.isArray(r.data?.contexts) && r.data.contexts.length > 0 && !hasForeignIdentity(r.data, side) && r.data.contexts.every(c => c.schoolId === fixture[side].schoolId && c.classId === fixture[side].classId), r.status);
    contexts[side] = [activation.preservedChapterI, chapterII, chapterIII, chapterIV, chapterV].map(target => {
      const matches = r.data.contexts.filter(c => c.curriculumReleaseId === target.curriculumReleaseId && c.unitId === target.unitId);
      check(`${side}: chapter appears once in authorized navigation`, matches.length === 1 && uuid(matches[0]?.enrollmentId));
      return matches[0];
    });
    check(`${side}: chapters share the authorized enrollment and programme`, uuid(contexts[side][0].subjectProgramId) && contexts[side].every(c => c.enrollmentId === contexts[side][0].enrollmentId && c.subjectProgramId === contexts[side][0].subjectProgramId));
    snapshots[side] = [];
    for (const [index, context] of contexts[side].entries()) {
      const d = await dashboard(side, context);
      check(`${side}: ${['preserved Chapter I', 'preserved Chapter II', 'preserved Chapter III', 'preserved Chapter IV', 'Chapter V'][index]} history stays in its original release`, Array.isArray(d.history) && d.history.every(s => s.curriculumReleaseId === context.curriculumReleaseId) && (!d.baseline || d.baseline.curriculumReleaseId === context.curriculumReleaseId));
      if (index === 1) check(`${side}: preserved Chapter II retains its v1 scoring contract`, chapterIIContract(d, context));
      if (index === 2) check(`${side}: preserved Chapter III v2 contract`, chapterIIIContract(d, context));
      if (index === 3) check(`${side}: preserved Chapter IV v2 contract`, chapterIVContract(d, context));
      if (index === 4) {
        check(`${side}: Chapter V 12 Diagnostic, 12 scored Mastery and eight required knowledge skills`, chapterVContract(d, context));
        check(`${side}: incomplete Chapter V baseline retains the practice gate and any existing diagnostic`, incompleteBaselinePreserved(d));
        chapterVActiveSessions[side] = d.activeSession;
      }
      snapshots[side].push(digest(preservedEvidence(d)));
    }
  }
  for (const side of sides) {
    const own = contexts[side], other = contexts[side === 'A' ? 'B' : 'A'];
    for (const context of other) {
      const r = await request(`${side}_student`, '/functions/v1/get-student-dashboard', selection(context));
      check(`${side}: foreign enrollment dashboard denied without data`, denied(r), r.status);
    }
    for (const role of ['admin', 'teacher']) {
      const r = await request(`${side}_${role}`, '/functions/v1/get-student-dashboard', selection(own[4]));
      check(`${side}_${role}: learner context cannot be substituted`, denied(r), r.status);
    }
    for (const selected of own) for (const mismatched of own.filter(c => c.unitId !== selected.unitId)) {
      const mixed = await request(`${side}_student`, '/functions/v1/get-student-dashboard', { ...selection(selected), curriculumReleaseId: mismatched.curriculumReleaseId });
      check(`${side}: mixed chapter/release selection denied`, denied(mixed), mixed.status);
    }
  }
  for (const table of ['items', 'item_options', 'item_answer_keys']) for (const actor of [
    null, 'A_student', 'B_student', 'A_admin', 'B_admin',
    // Current items_staff_read and answer_keys_staff_only explicitly retain
    // teacher access. Options have no teacher SELECT policy; probe both sides.
    ...(table === 'item_options' ? ['A_teacher', 'B_teacher'] : []),
  ]) {
    // IDs alone establish visibility without fetching protected question text/keys.
    const column = table === 'items' ? 'id' : 'item_id';
    const r = await request(actor, `/rest/v1/${table}?select=${column}&limit=1`, null, 'GET');
    check(`${actor ?? 'anonymous'}: direct ${table} reads denied or empty`, noRows(r), r.status);
  }
  const anonymous = await request(null, '/functions/v1/get-student-dashboard', selection(contexts.A[4]));
  check('anonymous: learner dashboard requires authentication', anonymousDashboardDenied(anonymous), anonymous.status);
  return {
    contexts, chapterVActiveSessions,
    async verifyPreserved() {
      for (const side of sides) for (const [index, context] of contexts[side].entries()) {
        const current = await dashboard(side, context);
        check(`${side}: Chapter ${['I', 'II', 'III', 'IV', 'V'][index]} baseline, sessions, history and learning state unchanged`, digest(preservedEvidence(current)) === snapshots[side][index]);
      }
    },
  };
}

export async function verifyChapterIVVisibleState({ page, expect, activeSession, context }) {
  const cards = page.locator('.course-mode-card');
  if (activeSession) {
    // The course intentionally hides launch cards while a session is active.
    // Inspect the existing resume link without following it or serving an item.
    await expect(cards).toHaveCount(0);
    const resume = page.locator('.course-active-session');
    await expect(resume).toContainText(`Պատասխանված է ${activeSession.answered}/${activeSession.planned} հարցի`);
    const link = resume.locator('a.course-resume');
    await expect(link).toHaveCount(1);
    await expect(link).toContainText('Շարունակել · Ախտորոշիչ');
    const destination = new URL(await link.getAttribute('href'), page.url());
    for (const [key, value] of Object.entries({ enrollment: context.enrollmentId, release: context.curriculumReleaseId, unit: context.unitId, action: 'diagnostic' })) {
      expect(destination.searchParams.get(key)).toBe(value);
    }
    expect(destination.searchParams.has('skill')).toBe(false);
  } else {
    await expect(page.locator('.course-active-session')).toHaveCount(0);
    await expect(cards).toHaveCount(4);
    for (const [index, count] of [12, 8, 12, 12].entries()) await expect(cards.nth(index)).toContainText(`${count} հարց`);
    await expect(cards.nth(2)).toContainText('գնահատվող 12 հարցից առնվազն 10-ին');
    for (const [label, count] of [['Գիտելիքներ․ լաբորատոր աշխատանքների կատարումը չի գնահատվում', 12]]) await expect(cards.nth(2)).toContainText(`${label}՝ ${count} հարց`);
    await expect(cards.nth(2)).toContainText('Բոլոր հարցերին պատասխանելը պարտադիր է');
    await expect(cards.nth(1)).toContainText('Նախ ավարտեք այս գլխի ախտորոշիչը');
    await expect(cards.nth(1).locator('a')).toHaveCount(0);
  }
}

export async function browserChecks({ contexts, chapterVActiveSessions, sessions, url, check, diagnostics }) {
  const { chromium, expect: baseExpect } = await import('@playwright/test');
  const expect = baseExpect.configure({ timeout: 30000 });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const side of sides) {
      const session = sessions.get(`${side}_student`);
      const context = await browser.newContext({ viewport: { width: 1365, height: 950 }, serviceWorkers: 'block', storageState: {
        cookies: [], origins: [{ origin: site, localStorage: [{ name: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(session) }] }],
      } });
      let blocked = 0, pageErrors = 0;
      const diagnostic = { side, blockedRequestCount: 0, pageErrorCount: 0, blockedRequests: [], pageErrors: [] };
      diagnostics.push(diagnostic);
      try {
        await context.route(`${url}/**`, async route => {
          const req = route.request(), target = new URL(req.url());
          let body; try { body = req.postDataJSON(); } catch { body = null; }
          if (!allowedBrowserRequest({ pathname: target.pathname, search: target.search, method: req.method(), body })) {
            blocked++; diagnostic.blockedRequestCount = blocked;
            if (diagnostic.blockedRequests.length < 20) diagnostic.blockedRequests.push(blockedRequestDiagnostic({ pathname: target.pathname, method: req.method() }));
            await route.abort(); return;
          }
          await route.continue();
        });
        const page = await context.newPage();
        page.on('pageerror', error => {
          pageErrors++; diagnostic.pageErrorCount = pageErrors;
          if (diagnostic.pageErrors.length < 20) diagnostic.pageErrors.push(browserErrorDiagnostic(error));
        });
        page.setDefaultTimeout(30000);
        await page.goto(`${site}/index.html`, { waitUntil: 'domcontentloaded' });
        // All five releases belong in the same course card after programme grouping.
        const card = page.locator('#mySubjects .amp-subject-card').filter({ has: page.locator(`a[href*="unit=${chapterV.unitId}"]`) });
        await expect(card).toHaveCount(1);
        await expect(card.locator(`a[href*="unit=${chapterIUnitId}"]`)).toHaveCount(1);
        await expect(card.locator(`a[href*="unit=${chapterII.unitId}"]`)).toHaveCount(1);
        await expect(card.locator(`a[href*="unit=${chapterIII.unitId}"]`)).toHaveCount(1);
        await expect(card.locator(`a[href*="unit=${chapterV.unitId}"]`)).toHaveCount(1);
        await expect(card.locator(`a[href*="unit=${chapterIV.unitId}"]`)).toHaveCount(1);
        for (const [index, target] of [contexts[side][0], contexts[side][1], contexts[side][2], contexts[side][3], contexts[side][4], contexts[side][0]].entries()) {
          if (index === 1) await page.setViewportSize({ width: 390, height: 844 });
          const links = page.locator(`${index === 0 ? '#mySubjects' : '.course-chapters'} a[href*="unit=${target.unitId}"]`);
          await expect(links).toHaveCount(1);
          const href = await links.getAttribute('href');
          const destination = new URL(href, site);
          check(`${side}: visible chapter link preserves exact release and enrollment`, destination.searchParams.get('enrollment') === target.enrollmentId && destination.searchParams.get('release') === target.curriculumReleaseId && destination.searchParams.get('unit') === target.unitId && !destination.searchParams.has('action'));
          await links.click();
          await expect(page.locator('#courseTitle')).toContainText(target.unitTitleHy);
          await expect(page.locator('#courseLoading')).toBeHidden();
          await expect(page.locator('#courseHistoryTitle')).toBeVisible();
          await expect(page.locator(`.course-chapters a[aria-current="page"][href*="unit=${target.unitId}"]`)).toHaveCount(1);
          check(`${side}: browser selected chapter matches navigation`, new URL(page.url()).searchParams.get('release') === target.curriculumReleaseId && new URL(page.url()).searchParams.get('unit') === target.unitId);
          if (target.unitId === chapterV.unitId) {
            await verifyChapterIVVisibleState({ page, expect, activeSession: chapterVActiveSessions[side], context: target });
            check(`${side}: Chapter V shows the preserved diagnostic or configured cards with the baseline gate`, true);
          }
          if (index > 0) check(`${side}: selected chapter has no mobile horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        }
        check(`${side}: native chapter switching has no page errors or attempted mutations`, pageErrors === 0 && blocked === 0);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}

async function main() {
  const report = { scope: 'Chapter V pilot authenticated read-only production acceptance', schemaVersion: 1,
    revision: process.env.GITHUB_SHA, startedAt: new Date().toISOString(), status: 'running', checks: [], browserDiagnostics: [],
    limitations: ['No learning sessions, answers or exposures are created.', 'Read-only switching is not a completed learner attempt or specialist approval.', 'Chapters I, II, III and IV are preserved; no student answers are submitted.', 'Existing teacher staff access to items and answer keys is retained; teacher direct-option denial is tested. This run does not certify teacher question-bank isolation.'] };
  const sessions = new Map();
  const check = (label, passed, httpStatus) => {
    report.checks.push({ label, status: passed ? 'passed' : 'failed', ...(httpStatus === undefined ? {} : { httpStatus }) });
    if (!passed) throw new Error('Acceptance check failed');
  };
  let request;
  try {
    const fixture = JSON.parse(process.env.QA_TENANT_FIXTURES_JSON ?? '{}');
    const credentials = Object.fromEntries(sides.flatMap(side => roles.map(role => [`${side}_${role}`, {
      email: process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_EMAIL`], password: process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_PASSWORD`],
    }])));
    const activation = JSON.parse(await readFile(new URL(`../${activationPath}`, import.meta.url), 'utf8'));
    check('reviewed-main, verified activation and six dedicated fixture guards', validateActivation({ fixture, credentials, activation, revision: report.revision, ref: process.env.GITHUB_REF }).length === 0);
    const frontend = await waitForRelease({ expectedCommit: report.revision, timeoutMs: 60000 });
    report.frontendCommit = frontend.commit;
    check('production frontend equals exact reviewed main revision before login', frontend.commit === report.revision);
    const config = await readFile(new URL('../web/config.js', import.meta.url), 'utf8');
    const url = config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1];
    const key = config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
    check('committed public client configuration is present', Boolean(url && key) && new URL(url).protocol === 'https:');
    request = async (actor, endpoint, body = {}, method = 'POST') => {
      try {
        const response = await fetch(`${url}${endpoint}`, { method, redirect: 'error', headers: clientHeaders(key, sessions.get(actor)?.access_token),
          ...(method === 'GET' ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000) });
        return { status: response.status, data: await response.json().catch(() => null) };
      } catch { return { status: 0, data: null }; }
    };
    report.readIsolation = await runIsolation({ fixture, credentials, url, key, revision: report.revision });
    check('existing two-school authenticated positive and negative controls pass', report.readIsolation.status === 'passed');
    for (const side of sides) for (const role of roles) {
      const actor = `${side}_${role}`, r = await request(null, '/auth/v1/token?grant_type=password', credentials[actor]);
      if (r.data?.access_token) sessions.set(actor, { ...r.data, expires_at: r.data.expires_at ?? Math.floor(Date.now() / 1000) + Number(r.data.expires_in) });
      check(`${actor}: authenticated expected designated QA identity`, r.status === 200 && Boolean(r.data?.access_token) && r.data?.user?.id === fixture[side][`${role}Id`], r.status);
    }
    const acceptance = await runReadChecks({ fixture, activation, request, check });
    await browserChecks({ contexts: acceptance.contexts, chapterVActiveSessions: acceptance.chapterVActiveSessions, sessions, url, check, diagnostics: report.browserDiagnostics });
    await acceptance.verifyPreserved();
    // A redeploy during acceptance must not inherit evidence for a different build.
    await waitForRelease({ expectedCommit: report.revision, timeoutMs: 15000 });
    check('production frontend still matches after acceptance', true);
  } catch {
    if (!report.checks.some(c => c.status === 'failed')) report.checks.push({ label: 'acceptance could not finish; raw errors withheld', status: 'failed' });
  } finally {
    for (const [actor] of sessions) {
      const r = await request(actor, '/auth/v1/logout?scope=local');
      report.checks.push({ label: `${actor}: close only the session created by this run`, status: [200, 204].includes(r.status) ? 'passed' : 'failed', httpStatus: r.status });
    }
    report.finishedAt = new Date().toISOString();
    report.status = report.checks.some(c => c.status === 'failed') ? 'failed' : 'passed';
    const reportPath = path.resolve('qa-results/chapter-v-pilot-read-acceptance.json');
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(`Chapter V production read acceptance: ${report.status}; ${report.checks.filter(c => c.status === 'passed').length}/${report.checks.length} checks passed.`);
    process.exitCode = report.status === 'passed' ? 0 : 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Acceptance evidence could not be saved. No acceptance is established.'); process.exitCode = 1; });
}
