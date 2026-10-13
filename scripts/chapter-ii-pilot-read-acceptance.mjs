import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateFixture, roles, sides, runIsolation } from './sprint-14-isolation.mjs';
import { waitForRelease } from './wait-for-production-release.mjs';

// Deliberately bounded production acceptance, not a reusable release mechanism.
// No answers, sessions, exposures, invitations, memberships or content are written.
export const activationPath = 'docs/evidence/chapter-ii-pilot-activation-20261013.json';
export const chapterII = Object.freeze({ curriculumReleaseId: 'b83dc4a4-f5c2-486a-82a6-d7489e7e6407', unitId: 'beae3516-4317-4c8b-bd66-576c6f309308' });
export const chapterIUnitId = '0349ffcd-8fc9-47f2-82d1-3d5cfcb3a096';
const site = 'https://www.haiedu.am';
const uuid = x => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const selection = c => ({ enrollmentId: c.enrollmentId, curriculumReleaseId: c.curriculumReleaseId, unitId: c.unitId });
const same = (a, b) => ['enrollmentId', 'curriculumReleaseId', 'unitId'].every(k => a?.[k] === b?.[k]);
const denied = r => r.status === 403 && r.data?.error === 'learning_context_unavailable' && Object.keys(r.data).length === 1;
const noRows = r => (r.status === 403 && r.data?.code === '42501') || (r.status === 200 && Array.isArray(r.data) && r.data.length === 0);
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function validateActivation({ activation, fixture, credentials, revision, ref }) {
  const errors = validateFixture(fixture, credentials);
  if (ref !== 'refs/heads/main') errors.push('Reviewed main branch is required');
  if (!/^[a-f0-9]{40}$/i.test(revision ?? '')) errors.push('An exact reviewed Git commit is required');
  if (activation?.schemaVersion !== 1 || activation?.status !== 'activated' || !Number.isFinite(Date.parse(activation?.activatedAt))) errors.push('Verified activation evidence is required');
  if (!same({ ...chapterII, enrollmentId: null }, { ...activation, enrollmentId: null })) errors.push('Activation evidence must identify the bounded Chapter II release and unit');
  if (!uuid(activation?.preservedChapterI?.curriculumReleaseId) || activation?.preservedChapterI?.unitId !== chapterIUnitId || activation.preservedChapterI.curriculumReleaseId === chapterII.curriculumReleaseId) errors.push('Separate preserved Chapter I release is required');
  for (const side of sides) {
    if (fixture?.[side]?.curriculumReleaseId !== activation?.preservedChapterI?.curriculumReleaseId || fixture?.[side]?.unitId !== chapterIUnitId) errors.push(`${side}: designated fixture must retain the preserved Chapter I context`);
  }
  return errors;
}

// Fail closed even if an unexpected UI regression attempts to start learning.
// OPTIONS may be preflighted; application data requests have a strict allowlist.
export function allowedBrowserRequest({ pathname, method, body, search = '' }) {
  if (method === 'OPTIONS') return true;
  if (pathname === '/auth/v1/user') return method === 'GET';
  if (pathname === '/auth/v1/token') return method === 'POST' && new URLSearchParams(search).get('grant_type') === 'refresh_token';
  if (pathname === '/rest/v1/profiles') return method === 'GET';
  if (method !== 'POST') return false;
  if (pathname === '/functions/v1/get-student-classes') return body && Object.keys(body).length === 0;
  if (pathname === '/functions/v1/get-student-dashboard') {
    if (body?.navigation === true && Object.keys(body).length === 1) return true;
    return body && Object.keys(body).length === 3 && ['enrollmentId', 'curriculumReleaseId', 'unitId'].every(k => uuid(body[k]));
  }
  return false;
}

export function containsProtectedContent(value) {
  const forbidden = /^(?:prompt|answerkey|correctanswer|correctoption|optionkey|optionorder|solution|explanation|stimulus)|^(?:answer|answers|itemid|itemversionid|items|options)$/;
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsProtectedContent);
  return Object.entries(value).some(([k, v]) => forbidden.test(k.toLowerCase().replaceAll('_', '')) || containsProtectedContent(v));
}

export function chapterIIContract(data, context) {
  if (data?.dashboardVersion !== 'authorized-learning-dashboard-v1' || data.readOnly !== true || !same(data.context, context)) return false;
  if (data.skills?.length !== 8 || new Set(data.skills.map(s => s.id)).size !== 8 || data.skills.some(s => !uuid(s.id))) return false;
  if (data.maximumAttempts !== 3 || containsProtectedContent(data)) return false;
  for (const [mode, count] of [['diagnostic', 16], ['mastery_check', 16], ['practice', 8], ['chapter_review', 12]]) {
    const spec = data.modes?.[mode];
    if (spec?.status !== 'configured' || spec.questions !== count || spec.hintsAllowed !== ['practice', 'chapter_review'].includes(mode)) return false;
  }
  const minima = data.modes.mastery_check.minimumCorrectBySkill;
  return data.modes.mastery_check.minimumPercent === 80 && minima && Object.keys(minima).length === 8 && data.skills.every(s => minima[s.id] === 1);
}

function preservedEvidence(data) {
  return { baseline: data.baseline, activeSession: data.activeSession, lifecycle: data.lifecycle, history: data.history,
    skills: data.skills, modes: data.modes, practiceAccess: data.practiceAccess, maximumAttempts: data.maximumAttempts };
}

export async function runReadChecks({ fixture, activation, request, check }) {
  const contexts = {}, snapshots = {};
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
    contexts[side] = [activation.preservedChapterI, chapterII].map(target => {
      const matches = r.data.contexts.filter(c => c.curriculumReleaseId === target.curriculumReleaseId && c.unitId === target.unitId);
      check(`${side}: chapter appears once in authorized navigation`, matches.length === 1 && uuid(matches[0]?.enrollmentId));
      return matches[0];
    });
    check(`${side}: chapters share the authorized enrollment and programme`, contexts[side][0].enrollmentId === contexts[side][1].enrollmentId && uuid(contexts[side][0].subjectProgramId) && contexts[side][0].subjectProgramId === contexts[side][1].subjectProgramId);
    snapshots[side] = [];
    for (const [index, context] of contexts[side].entries()) {
      const d = await dashboard(side, context);
      check(`${side}: ${index === 0 ? 'preserved Chapter I' : 'Chapter II'} history stays in its original release`, Array.isArray(d.history) && d.history.every(s => s.curriculumReleaseId === context.curriculumReleaseId) && (!d.baseline || d.baseline.curriculumReleaseId === context.curriculumReleaseId));
      if (index === 1) {
        check(`${side}: Chapter II 16/16, 80%, eight minima, practice 8 and review 12`, chapterIIContract(d, context));
        check(`${side}: new Chapter II baseline is untouched and practice remains locked`, d.baseline === null && d.activeSession === null && d.history.length === 0 && d.practiceAccess?.unlocked === false && d.practiceAccess.reason === 'chapter_diagnostic_required');
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
      const r = await request(`${side}_${role}`, '/functions/v1/get-student-dashboard', selection(own[1]));
      check(`${side}_${role}: learner context cannot be substituted`, denied(r), r.status);
    }
    const mixed = await request(`${side}_student`, '/functions/v1/get-student-dashboard', { ...selection(own[0]), curriculumReleaseId: chapterII.curriculumReleaseId });
    check(`${side}: Chapter I cannot be selected through the Chapter II-only release`, denied(mixed), mixed.status);
  }
  for (const actor of [null, 'A_student', 'B_student', 'A_admin', 'B_admin']) for (const table of ['items', 'item_options', 'item_answer_keys']) {
    // IDs alone establish visibility without fetching protected question text/keys.
    const column = table === 'items' ? 'id' : 'item_id';
    const r = await request(actor, `/rest/v1/${table}?select=${column}&limit=1`, null, 'GET');
    check(`${actor ?? 'anonymous'}: direct ${table} reads denied or empty`, noRows(r), r.status);
  }
  const anonymous = await request(null, '/functions/v1/get-student-dashboard', selection(contexts.A[1]));
  check('anonymous: learner dashboard requires authentication', anonymous.status === 401 && anonymous.data?.error === 'unauthorized' && Object.keys(anonymous.data).length === 1, anonymous.status);
  return {
    contexts,
    async verifyPreserved() {
      for (const side of sides) for (const [index, context] of contexts[side].entries()) {
        const current = await dashboard(side, context);
        check(`${side}: Chapter ${index === 0 ? 'I' : 'II'} baseline, sessions, history and learning state unchanged`, digest(preservedEvidence(current)) === snapshots[side][index]);
      }
    },
  };
}

async function browserChecks({ contexts, sessions, url, check }) {
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
      try {
        await context.route(`${url}/**`, async route => {
          const req = route.request(), target = new URL(req.url());
          let body; try { body = req.postDataJSON(); } catch { body = null; }
          if (!allowedBrowserRequest({ pathname: target.pathname, search: target.search, method: req.method(), body })) {
            blocked++; await route.abort(); return;
          }
          await route.continue();
        });
        const page = await context.newPage();
        page.on('pageerror', () => { pageErrors++; });
        page.setDefaultTimeout(30000);
        await page.goto(`${site}/index.html`, { waitUntil: 'domcontentloaded' });
        // Both releases belong in the same course card after programme grouping.
        const card = page.locator('#mySubjects .amp-subject-card').filter({ has: page.locator(`a[href*="unit=${chapterII.unitId}"]`) });
        await expect(card).toHaveCount(1);
        await expect(card.locator(`a[href*="unit=${chapterIUnitId}"]`)).toHaveCount(1);
        await expect(card.locator(`a[href*="unit=${chapterII.unitId}"]`)).toHaveCount(1);
        for (const [index, target] of [contexts[side][0], contexts[side][1], contexts[side][0]].entries()) {
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
          if (target.unitId === chapterII.unitId) {
            const cards = page.locator('.course-mode-card');
            await expect(cards).toHaveCount(4);
            for (const [index, count] of [16, 8, 16, 12].entries()) await expect(cards.nth(index)).toContainText(`${count} հարց`);
            await expect(cards.nth(2)).toContainText('80%');
            await expect(cards.nth(1)).toContainText('Նախ ավարտեք այս գլխի ախտորոշիչը');
            await expect(cards.nth(1).locator('a')).toHaveCount(0);
            check(`${side}: Chapter II learner cards show configured counts and baseline gate`, true);
          }
          if (index > 0) check(`${side}: selected chapter has no mobile horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        }
        check(`${side}: native chapter switching has no page errors or attempted mutations`, pageErrors === 0 && blocked === 0);
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
}

async function main() {
  const report = { scope: 'Chapter II pilot authenticated read-only production acceptance', schemaVersion: 1,
    revision: process.env.GITHUB_SHA, startedAt: new Date().toISOString(), status: 'running', checks: [],
    limitations: ['No learning sessions, answers or exposures are created.', 'Read-only switching is not a completed learner attempt or specialist approval.'] };
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
        const response = await fetch(`${url}${endpoint}`, { method, redirect: 'error', headers: {
          apikey: key, Authorization: `Bearer ${sessions.get(actor)?.access_token ?? key}`, 'Content-Type': 'application/json',
        }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000) });
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
    await browserChecks({ contexts: acceptance.contexts, sessions, url, check });
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
    const reportPath = path.resolve('qa-results/chapter-ii-pilot-read-acceptance.json');
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(`Chapter II production read acceptance: ${report.status}; ${report.checks.filter(c => c.status === 'passed').length}/${report.checks.length} checks passed.`);
    process.exitCode = report.status === 'passed' ? 0 : 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { console.error('Acceptance evidence could not be saved. No acceptance is established.'); process.exitCode = 1; });
}
