import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const sides = ['A', 'B'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateInputs(fixture, credentials, webOrigin) {
  const problems = [];
  if (fixture?.dedicatedQa !== true) problems.push('dedicatedQa must be true');
  for (const side of sides) {
    if (!uuid.test(fixture?.[side]?.schoolId ?? '')) problems.push(`${side}.schoolId must be a UUID`);
    if (!uuid.test(fixture?.[side]?.adminId ?? '')) problems.push(`${side}.adminId must be a UUID`);
    if (!credentials?.[side]?.email || !credentials?.[side]?.password) {
      problems.push(`Missing QA_SCHOOL_${side}_ADMIN_EMAIL/PASSWORD`);
    }
  }
  if (fixture?.A?.schoolId && fixture.A.schoolId === fixture?.B?.schoolId) {
    problems.push('A and B need distinct schoolId values');
  }
  const origin = new URL(webOrigin);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    problems.push('QA_WEB_ORIGIN must be a plain HTTPS origin');
  }
  return problems;
}

function containsLearnerIdentity(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsLearnerIdentity);
  const forbidden = new Set(['student_id', 'studentId', 'email', 'display_name', 'displayName']);
  return Object.entries(value).some(([key, nested]) => forbidden.has(key) || containsLearnerIdentity(nested));
}

async function runAcceptance({ fixture, credentials, supabaseUrl, publishableKey, webOrigin, revision }) {
  const report = {
    scope: 'Sprint 14D authenticated production analytics acceptance',
    revision,
    target: webOrigin,
    startedAt: new Date().toISOString(),
    status: 'running',
    sprint14DGateClosed: false,
    checks: [],
  };
  const sessions = new Map();
  const record = (label, passed, httpStatus = null) => {
    report.checks.push({ label, status: passed ? 'passed' : 'failed', ...(httpStatus === null ? {} : { httpStatus }) });
    return passed;
  };
  const request = async (endpoint, token, body) => {
    try {
      const response = await fetch(`${supabaseUrl}${endpoint}`, {
        method: 'POST',
        redirect: 'error',
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${token ?? publishableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(30000),
      });
      let data = null;
      try { data = await response.json(); } catch { /* malformed responses fail their predicate */ }
      return { status: response.status, data };
    } catch {
      return { status: 0, data: null };
    }
  };

  let browser;
  try {
    for (const side of sides) {
      const login = await request('/auth/v1/token?grant_type=password', null, credentials[side]);
      const authenticated = login.status === 200
        && Boolean(login.data?.access_token)
        && login.data?.user?.id === fixture[side].adminId;
      record(`${side}: authenticate dedicated school administrator`, authenticated, login.status);
      if (authenticated) sessions.set(side, login.data.access_token);
    }
    if (report.checks.some((check) => check.status === 'failed')) return report;

    for (const side of sides) {
      const own = await request('/functions/v1/get-school-performance-analytics', sessions.get(side), {
        schoolId: fixture[side].schoolId,
      });
      record(`${side}: own-school aggregate is available`, own.status === 200
        && own.data?.scope?.schoolId === fixture[side].schoolId
        && Array.isArray(own.data?.options?.academicYears)
        && Array.isArray(own.data?.options?.programmes)
        && Array.isArray(own.data?.options?.classes)
        && Boolean(own.data?.analytics)
        && !containsLearnerIdentity(own.data), own.status);

      const otherSide = side === 'A' ? 'B' : 'A';
      const foreign = await request('/functions/v1/get-school-performance-analytics', sessions.get(side), {
        schoolId: fixture[otherSide].schoolId,
      });
      record(`${side}: other-school aggregate is denied`, foreign.status === 403
        && foreign.data?.error === 'analytics_scope_unavailable'
        && Object.keys(foreign.data).length === 1, foreign.status);
    }
    if (report.checks.some((check) => check.status === 'failed')) return report;

    browser = await chromium.launch({ headless: true });
    for (const side of sides) {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      try {
        await page.goto(`${webOrigin}/account-access?qa=${encodeURIComponent(revision)}`, { waitUntil: 'domcontentloaded' });
        await page.locator('#loginEmail').fill(credentials[side].email);
        await page.locator('#loginPassword').fill(credentials[side].password);
        await Promise.all([
          page.waitForURL(/\/school-admin(?:\?|$)/),
          page.locator('#loginForm button[type="submit"]').click(),
        ]);

        const analyticsResponse = page.waitForResponse((response) =>
          response.url().includes('/functions/v1/get-school-performance-analytics')
          && response.request().method() === 'POST');
        await page.goto(`${webOrigin}/school-admin?qa=${encodeURIComponent(revision)}&side=${side}`, { waitUntil: 'domcontentloaded' });
        const response = await analyticsResponse;
        let payload = null;
        try { payload = await response.json(); } catch { /* malformed response fails acceptance */ }
        await page.locator('#overviewPanel').waitFor({ state: 'visible' });
        await page.locator('#refreshAnalyticsBtn').waitFor({ state: 'visible' });

        const schoolValue = await page.locator('#overviewSchool').inputValue();
        const oldPlaceholderCount = await page.getByText('Իրական վերլուծությունը դեռ ակտիվացված չէ։', { exact: true }).count();
        const uiPassed = response.status() === 200
          && payload?.scope?.schoolId === fixture[side].schoolId
          && !containsLearnerIdentity(payload)
          && schoolValue === fixture[side].schoolId
          && await page.locator('#analyticsTitle').isVisible()
          && await page.locator('#analyticsYearFilter').isVisible()
          && await page.locator('#analyticsProgrammeFilter').isVisible()
          && await page.locator('#analyticsClassFilter').isVisible()
          && oldPlaceholderCount === 0;
        record(`${side}: authenticated production board loads real scoped analytics`, uiPassed, response.status());
      } catch {
        record(`${side}: authenticated production board loads real scoped analytics`, false, 0);
      } finally {
        await context.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    for (const [side, token] of sessions) {
      const logout = await request('/auth/v1/logout?scope=local', token, {});
      record(`${side}: close only this QA session`, logout.status === 204 || logout.status === 200, logout.status);
    }
    report.status = report.checks.some((check) => check.status === 'failed') ? 'failed' : 'passed';
    report.sprint14DGateClosed = report.status === 'passed';
    report.finishedAt = new Date().toISOString();
  }
  return report;
}

async function main() {
  const reportPath = path.resolve(process.env.QA_14D_REPORT ?? 'qa-results/sprint-14d-analytics.json');
  const webOrigin = new URL(process.env.QA_WEB_ORIGIN ?? 'https://www.haiedu.am').origin;
  let fixture;
  try { fixture = JSON.parse(process.env.QA_TENANT_FIXTURES_JSON ?? '{}'); }
  catch { throw new Error('QA_TENANT_FIXTURES_JSON must be valid JSON'); }
  const credentials = Object.fromEntries(sides.map((side) => [side, {
    email: process.env[`QA_SCHOOL_${side}_ADMIN_EMAIL`],
    password: process.env[`QA_SCHOOL_${side}_ADMIN_PASSWORD`],
  }]));
  const problems = validateInputs(fixture, credentials, webOrigin);
  if (problems.length) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, JSON.stringify({ status: 'blocked', sprint14DGateClosed: false, problems }, null, 2), { mode: 0o600 });
    console.error('Sprint 14D acceptance blocked:\n' + problems.join('\n'));
    process.exitCode = 2;
    return;
  }

  const config = await readFile(new URL('../web/config.js', import.meta.url), 'utf8');
  const supabaseUrl = config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1];
  const publishableKey = config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
  if (!supabaseUrl || !publishableKey) throw new Error('Committed public Supabase configuration missing');

  const report = await runAcceptance({
    fixture,
    credentials,
    supabaseUrl,
    publishableKey,
    webOrigin,
    revision: process.env.GITHUB_SHA ?? 'local',
  });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  const passed = report.checks.filter((check) => check.status === 'passed').length;
  console.log(`Sprint 14D authenticated analytics acceptance: ${report.status}; ${passed}/${report.checks.length} passed.`);
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Sprint 14D acceptance failed before complete redacted evidence was produced.');
    process.exitCode = 1;
  });
}

