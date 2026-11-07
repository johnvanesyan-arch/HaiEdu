import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect as baseExpect} from '@playwright/test';
import {roles, sides, runIsolation} from './sprint-14-isolation.mjs';
import {waitForRelease} from './wait-for-production-release.mjs';
import {mobileSite as site, reportPath, mobilePreflight, mobileReadAllowed, mobileReceipt, closeOwnedSessions} from './mobile-qa-policy.mjs';
import {mobileUnitLink} from './mobile-qa-navigation.mjs';
import {mobileNavigationLayout} from './mobile-navigation-layout.mjs';

const expect = baseExpect.configure({timeout: 45000});
const state = {revision: process.env.GITHUB_SHA, status: 'failed', checks: [], isolation: {}, cleanup: []};
const sessions = [];
let browser, stage = 'preflight', url, key;
function check(scenario, passed, dimensions = {}) {
  state.checks.push({...dimensions, scenario, passed});
  if (!passed) throw Error('acceptance_failed');
}
async function request(endpoint, token, body) {
  const res = await fetch(url + endpoint, {method: 'POST', redirect: 'error',
    headers: {apikey: key, 'Content-Type': 'application/json', ...(token ? {Authorization: 'Bearer ' + token} : {})},
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000)});
  return {status: res.status, data: await res.json()};
}
async function layout(page, dimensions) {
  stage = 'layout';
  check(stage, await page.evaluate(() => {
    const root = document.documentElement, main = document.getElementById('mainContent')?.getBoundingClientRect();
    return root.scrollWidth <= root.clientWidth + 1 && main && main.x >= -1 && main.right <= innerWidth + 1;
  }), dimensions);
}
try {
  const fixture = JSON.parse(process.env.QA_TENANT_FIXTURES_JSON ?? '{}');
  const credentials = Object.fromEntries(sides.flatMap(side => roles.map(role => [`${side}_${role}`, {
    email: process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_EMAIL`], password: process.env[`QA_SCHOOL_${side}_${role.toUpperCase()}_PASSWORD`],
  }])));
  check(stage, mobilePreflight({fixture, credentials, ref: process.env.GITHUB_REF, revision: state.revision}).length === 0);
  const config = await readFile(new URL('../web/config.js', import.meta.url), 'utf8');
  url = config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1];
  key = config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
  check(stage, new URL(url).protocol === 'https:' && Boolean(key));
  stage = 'release';
  await waitForRelease({expectedCommit: state.revision});
  check(stage, true);
  stage = 'isolation-before';
  state.isolation.before = await runIsolation({fixture, credentials, url, key, revision: state.revision});
  check(stage, state.isolation.before.status === 'passed');
  browser = await chromium.launch({headless: true});
  for (const side of sides) for (const role of ['student','teacher']) {
    stage = 'login';
    const auth = await request('/auth/v1/token?grant_type=password', null, credentials[`${side}_${role}`]);
    const session = auth.data;
    // Register an issued token before the identity assertion so even an
    // unexpected successful login is closed by finally, using local scope.
    if (typeof session?.access_token === 'string') sessions.push(session);
    check(stage, auth.status === 200 && session.user?.id === fixture[side][`${role}Id`], {side, role});
    session.expires_at ??= Math.floor(Date.now()/1000) + Number(session.expires_in);
    let contexts = [], selected, className;
    if (role === 'student') {
      const r = await request('/functions/v1/get-student-classes', session.access_token, {});
      check(stage, r.status === 200 && Array.isArray(r.data?.contexts), {side, role});
      contexts = r.data.contexts;
      selected = contexts.find(c => c.curriculumReleaseId === fixture[side].curriculumReleaseId && c.unitId === fixture[side].unitId);
      check(stage, Boolean(selected?.enrollmentId), {side, role});
    } else {
      const r = await request('/functions/v1/get-teacher-dashboard', session.access_token, {readMode: 'directory'});
      className = r.data?.classes?.find(c => c.id === fixture[side].classId)?.name;
      check(stage, r.status === 200 && Boolean(className), {side, role});
    }
    for (const width of [390,430]) {
      const dimensions = {side, role, width};
      const context = await browser.newContext({viewport: {width, height: width === 390 ? 844 : 932}, isMobile: true, hasTouch: true,
        serviceWorkers: 'block', storageState: {cookies: [], origins: [{origin: site, localStorage: [{
          name: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(session),
        }]}]}});
      let blocked = 0, pageErrors = 0, httpErrors = 0;
      try {
        await context.route('**/*', route => {
          const req = route.request(), target = new URL(req.url());
          let body = null;
          try { body = req.postDataJSON(); } catch { /* An unparseable data request fails closed. */ }
          const allowed = target.origin === url
            ? mobileReadAllowed({pathname: target.pathname, search: target.search, method: req.method(), body, role, contexts})
            : ['GET','HEAD'].includes(req.method()) && target.origin === site;
          if (allowed) return route.continue();
          blocked++; return route.abort();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(45000);
        page.on('pageerror', () => pageErrors++);
        page.on('response', response => {if (new URL(response.url()).origin === url && response.status() >= 400) httpErrors++;});
        if (role === 'student') {
          stage = 'student-navigation';
          await page.goto(site + '/index.html?view=courses', {waitUntil: 'domcontentloaded'});
          const {card, link} = mobileUnitLink(page, selected.unitId);
          await expect(card).toHaveCount(1);
          await card.locator('summary').focus();
          await page.keyboard.press('Enter');
          await expect(link).toHaveCount(1);
          await expect(link).toBeVisible();
          if (width === 390) {
            for (const navWidth of [320,360,375,390,430,449]) for (const textScale of [100,200]) {
              await page.setViewportSize({width: navWidth, height: 844});
              await page.evaluate(scale => { document.documentElement.style.fontSize = scale + '%'; }, textScale);
              const navigation = await page.evaluate(mobileNavigationLayout);
              check('student-navigation', navigation.errors.length === 0, {side,role,width:navWidth,textScale});
            }
            await page.setViewportSize({width, height:844});
            await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; });
            check('student-navigation', (await page.evaluate(mobileNavigationLayout)).errors.length === 0, dimensions);
          }
          const destination = new URL(await link.getAttribute('href'), site);
          check(stage, destination.searchParams.get('enrollment') === selected.enrollmentId && destination.searchParams.get('release') === selected.curriculumReleaseId && !destination.searchParams.has('action'), dimensions);
          await layout(page, dimensions);
          stage = 'student-course';
          await link.focus(); await page.keyboard.press('Enter');
          await expect(page.locator('#courseTitle')).toContainText(selected.unitTitleHy);
          for (const tab of ['assessment','progress','guides','writing']) {
            stage = 'student-course';
            await page.locator(`.course-tabs a[href*="tab=${tab}"]`).click();
            await expect(page.locator('#courseLoading')).toBeHidden();
            await expect(page.locator('.course-tabs').first()).toBeVisible(); // primary and secondary section navs (PR417)
            if (tab === 'guides') await expect(page.locator('[data-guides-body]')).not.toContainText('բեռնվում են');
            if (tab === 'writing') await expect(page.locator('.written-list')).toBeVisible();
            await layout(page, dimensions);
          }
          check('student-course', true, dimensions);
        } else {
          stage = 'teacher-home';
          await page.goto(site + '/teacher.html?view=home', {waitUntil: 'domcontentloaded'});
          await expect(page.locator('#dashboardPanel')).toBeVisible();
          await expect(page.locator('[data-today-refresh]')).toBeEnabled();
          await expect(page.locator('[data-today-time]')).toContainText('Ստուգված է՝');
          check(stage, true, dimensions); await layout(page, dimensions);
          stage = 'teacher-class';
          await page.locator('.hm-role-nav a[href$="view=classes"]').click();
          await page.locator('#classList .teacher-class-button').filter({hasText: className}).click();
          await expect(page.locator('#rosterAnalyticsCard')).toBeVisible();
          check(stage, true, dimensions); await layout(page, dimensions);
          stage = 'teacher-review';
          await page.locator('#teacherOpenWrittenWork').click();
          await expect(page.locator('[data-writing-filter]')).toBeVisible();
          check(stage, true, dimensions); await layout(page, dimensions);
        }
        await page.evaluate(() => {document.documentElement.style.fontSize = '200%';});
        await layout(page, dimensions);
        check('layout', blocked === 0 && pageErrors === 0 && httpErrors === 0, dimensions);
        console.log(`Mobile ${side} ${role} ${width}: passed`);
      } finally {
        state.lastBrowser = {...dimensions, blockedRequests: blocked, pageErrors, httpErrors};
        await context.close();
      }
    }
  }
  stage = 'isolation-after';
  state.isolation.after = await runIsolation({fixture, credentials, url, key, revision: state.revision});
  check(stage, state.isolation.after.status === 'passed');
  stage = 'release-after';
  await waitForRelease({expectedCommit: state.revision});
  check(stage, true);
  state.status = 'passed'; stage = 'complete';
} catch (error) {
  state.failedStage = stage; process.exitCode = 1;
  state.failureKind = /strict mode violation/i.test(error?.message ?? '') ? 'ambiguous-locator'
    : /timeout|timed out/i.test(error?.message ?? '') ? 'timeout' : 'assertion-or-runtime';
  console.error('Mobile acceptance failed at ' + stage + '; authenticated details are intentionally omitted.');
} finally {
  state.cleanup = await closeOwnedSessions(sessions, async session => (await fetch(url + '/auth/v1/logout?scope=local', {
    method: 'POST', redirect: 'error', headers: {apikey: key, Authorization: 'Bearer ' + session.access_token}, signal: AbortSignal.timeout(30000),
  })).status);
  if (state.cleanup.some(c => !c.closed)) {state.status = 'failed'; state.failedStage = 'cleanup'; process.exitCode = 1;}
  await browser?.close();
  await mkdir('qa-results', {recursive: true});
  await writeFile(reportPath, JSON.stringify(mobileReceipt(state), null, 2));
}
