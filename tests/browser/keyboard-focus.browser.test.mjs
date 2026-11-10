import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { fixture as teacherFixture } from '../fixtures/teacher-performance-browser.mjs';

// Real UI/controller modules in Chromium; identities and API results are
// synthetic. No production credentials, assessments or learner writes.
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
const student = { id: 'student-a', displayName: 'Փորձնական աշակերտ', matrix: [], weakSkills: [], recentAccuracy: null };
const studentDetails = { student, skills: [], matrix: [], recentAttempts: [], sessions: [] };

async function teacher(t) {
  const f = await teacherFixture(browser, t, { analytics: { students: [student], studentCount: 1, skills: [] }, studentDetails });
  await f.page.locator('.hm-role-nav a[href$="view=classes"]').click();
  await f.page.locator('#classList .teacher-class-button').first().click();
  return { ...f, opener: f.page.locator('#roster [data-open-student]').first() };
}

test('teacher drawer contains Tab/Shift+Tab, inerts only its background and restores its opener', async t => {
  const { page, opener, errors } = await teacher(t);
  await page.evaluate(() => { const node = document.createElement('button'); node.id = 'alreadyInert'; node.inert = true; document.body.prepend(node); });
  await opener.focus(); await page.keyboard.press('Enter');
  const close = page.locator('#closeDrawerBtn');
  await expect(close).toBeFocused();
  await expect(page.locator('#studentDrawerContent')).toContainText('Վերջին փորձերը');
  assert.equal(await page.locator('#studentDrawer').evaluate(node => Boolean(node.closest('[inert]'))), false);
  assert.equal(await page.locator('#teacherPageTitle').evaluate(node => Boolean(node.closest('[inert]'))), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.locator('.student-drawer-panel').evaluate(node => node.contains(document.activeElement)), true);
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  assert.equal(await page.locator('#teacherPageTitle').evaluate(node => Boolean(node.closest('[inert]'))), false);
  await expect(page.locator('#alreadyInert')).toHaveAttribute('inert', '');
  // Reopening does not multiply handlers or retain a stale opener.
  const second = page.locator('#roster [data-open-student]').last();
  await second.focus(); await page.keyboard.press('Enter'); await close.click();
  await expect(second).toBeFocused(); assert.deepEqual(errors, []);
});

for (const error of [false, true]) test(`teacher drawer focus works while ${error ? 'failed' : 'loading'}`, async t => {
  const { page, opener, errors } = await teacher(t);
  await page.evaluate(error => { window.__teacherFixture[error ? 'denied' : 'holds'].push('get-teacher-student'); }, error);
  await opener.focus(); await page.keyboard.press('Enter');
  const close = page.locator('#closeDrawerBtn'); await expect(close).toBeFocused();
  if (error) await expect(page.locator('#studentDrawerContent .message.bad')).toBeVisible();
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(close).toBeFocused();
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  await page.evaluate(() => window.__teacherFixture.release('get-teacher-student'));
  await expect(page.locator('#studentDrawerContent')).toBeEmpty(); assert.deepEqual(errors, []);
});

test('removed drawer opener falls back safely; navigation and account changes release the background', async t => {
  const { page, opener, errors } = await teacher(t);
  await opener.click(); await expect(page.locator('#studentDrawerContent')).toContainText('Վերջին փորձերը');
  await opener.evaluate(node => node.remove()); await page.keyboard.press('Escape');
  await expect(page.locator('#teacherPageTitle')).toBeFocused();
  for (const action of ['navigate', 'signout']) {
    await page.evaluate(() => window.__teacherFixture.holds.push('get-teacher-student'));
    await page.locator('#roster [data-open-student]').first().click();
    await expect(page.locator('#closeDrawerBtn')).toBeFocused();
    await page.evaluate(action => {
      if (action === 'navigate') { history.pushState({}, '', '?view=classes'); dispatchEvent(new PopStateEvent('popstate')); }
      else window.__teacherFixture.listeners.forEach(fn => fn('SIGNED_OUT', null));
      window.__teacherFixture.release('get-teacher-student');
    }, action);
    await expect(page.locator('#studentDrawer')).toBeHidden();
    await expect(page.locator('#studentDrawerContent')).toBeEmpty();
    assert.equal(await page.locator('main').evaluate(node => Boolean(node.closest('[inert]'))), false);
    assert.equal(await page.locator('#teacherPageTitle').evaluate(node => Boolean(node.closest('[inert]'))), false);
    assert.equal(await page.locator('#closeDrawerBtn').evaluate(node => node === document.activeElement), false);
    if (action === 'navigate') await page.locator('#classList .teacher-class-button').first().click();
  }
  assert.deepEqual(errors, []);
});

async function learning(t, mode = 'practice') {
  const context = await browser.newContext(); t.after(() => context.close());
  const page = await context.newPage(), errors = []; page.setDefaultTimeout(3000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(mode => {
    const state = window.__focusFixture = { mode, answered: 0, calls: [], hold: null, pending: [], valid: true,
      release() { this.hold = null; this.pending.splice(0).forEach(resolve => resolve()); } };
    window.__focusClient = { functions: { async invoke(name, { body }) {
      state.calls.push({ name, body });
      if (state.hold === name) await new Promise(resolve => state.pending.push(resolve));
      if (name === 'start-learning-session') return { data: { session: { id: 'session', mode } } };
      if (name === 'get-mastery-check-status') return { data: { assessmentPolicy: { plannedQuestionCount: 2, hintsAllowed: false } } };
      if (name === 'get-session-item') return { data: state.answered === 2
        ? { complete: true, summary: { correct: 2, answered: 2, percent: 100 } }
        : { session: { id: 'session', mode, position: state.answered + 1, total: 2 }, sessionItemId: 'item-' + state.answered,
          item: { id: 'question-' + state.answered, type: 'true_false', promptHy: 'Ընտրեք պատասխանը։' }, remediation: { available: false } } };
      if (name === 'submit-answer' || name === 'submit-mastery-answer') { state.answered++; return { data: { grading: { correct: true }, session: { status: state.answered === 2 ? 'completed' : 'active' } } }; }
      throw Error('Unexpected synthetic API ' + name);
    } } };
  }, mode);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://keyboard.test') return route.abort();
    if (url.pathname === '/player.html') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="hy"><body><button id="outside">Այլ գործողություն</button><div id="player"></div><script type="module">
      import {mountLearningPlayer} from './learning-player.mjs';
      document.getElementById('outside').focus();
      window.__dispose = mountLearningPlayer({root:document.getElementById('player'),supabase:window.__focusClient,context:{enrollmentId:'enrollment',curriculumReleaseId:'release',unitId:'unit'},mode:window.__focusFixture.mode,isCurrent:()=>window.__focusFixture.valid,onComplete:()=>{}});
      </script></body></html>` });
    try { return route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL('../../web' + url.pathname, import.meta.url)) }); }
    catch { return route.fulfill({ status: 404, body: '' }); }
  });
  await page.goto('https://keyboard.test/player.html'); await page.locator('#player form').waitFor();
  return { page, errors };
}

for (const mode of ['practice', 'chapter_review', 'diagnostic', 'mastery_check']) test(`${mode}: keyboard-only two-question loop focuses next, new question and completion`, async t => {
  const { page, errors } = await learning(t, mode);
  await expect(page.locator('#outside')).toBeFocused(); // Initial async load leaves focus alone.
  for (let question = 1; question <= 2; question++) {
    const radio = page.locator('#player input').first();
    if (question === 1) await radio.focus();
    else { await expect(page.locator('#player h2')).toBeFocused(); await page.keyboard.press('Tab'); await expect(radio).toBeFocused(); }
    await page.keyboard.press('Space'); await page.keyboard.press('Tab');
    await expect(page.locator('#player button[type=submit]')).toBeFocused();
    await page.keyboard.press('Enter');
    const next = page.locator('#player [data-next] button'); await expect(next).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#player h2')).toBeFocused();
  }
  await expect(page.locator('#player h2')).toHaveText('Աշխատանքն ավարտված է');
  assert.equal(await page.evaluate(() => window.__focusFixture.answered), 2); assert.deepEqual(errors, []);
});

for (const stage of ['submit-answer', 'get-session-item']) test(`pending ${stage} does not take focus back from another control`, async t => {
  const { page, errors } = await learning(t);
  await page.locator('#player input').first().check();
  if (stage === 'get-session-item') await page.locator('#player button[type=submit]').click();
  await page.evaluate(stage => { window.__focusFixture.hold = stage; }, stage);
  await page.locator(stage === 'submit-answer' ? '#player button[type=submit]' : '#player [data-next] button').click();
  await expect.poll(() => page.evaluate(() => window.__focusFixture.pending.length)).toBe(1);
  await page.locator('#outside').focus(); await page.evaluate(() => window.__focusFixture.release());
  await expect(page.locator(stage === 'submit-answer' ? '#player [data-next] button' : '#player h2')).toBeVisible();
  await expect(page.locator('#outside')).toBeFocused();
  await page.evaluate(() => { window.__focusFixture.valid = false; window.__dispose(); });
  await expect(page.locator('#player')).toBeEmpty(); await expect(page.locator('#outside')).toBeFocused(); assert.deepEqual(errors, []);
});

for (const stage of ['submit-answer', 'get-session-item']) test(`disposing the player during ${stage} discards its pending focus handoff`, async t => {
  const { page, errors } = await learning(t);
  await page.locator('#player input').first().check();
  if (stage === 'get-session-item') await page.locator('#player button[type=submit]').click();
  await page.evaluate(stage => { window.__focusFixture.hold = stage; }, stage);
  await page.locator(stage === 'submit-answer' ? '#player button[type=submit]' : '#player [data-next] button').click();
  await expect.poll(() => page.evaluate(() => window.__focusFixture.pending.length)).toBe(1);
  await page.evaluate(() => { window.__focusFixture.valid = false; window.__dispose(); });
  await page.locator('#outside').focus(); await page.evaluate(() => window.__focusFixture.release());
  await expect(page.locator('#player')).toBeEmpty(); await expect(page.locator('#outside')).toBeFocused(); assert.deepEqual(errors, []);
});

test('clicking a non-focusable area during grading cancels the delayed focus move', async t => {
  const { page, errors } = await learning(t);
  await page.evaluate(() => {
    const note = document.createElement('p'); note.id = 'outsideNote'; note.textContent = 'Այլ տեղեկություն'; document.body.append(note);
    window.__focusFixture.hold = 'submit-answer';
  });
  await page.locator('#player input').first().check(); await page.locator('#player button[type=submit]').click();
  await expect.poll(() => page.evaluate(() => window.__focusFixture.pending.length)).toBe(1);
  await page.locator('#outsideNote').click(); await page.evaluate(() => window.__focusFixture.release());
  await expect(page.locator('#player [data-next] button')).toBeVisible();
  assert.equal(await page.evaluate(() => document.activeElement === document.body), true); assert.deepEqual(errors, []);
});

async function legacyLearning(t, file, review = false) {
  const context = await browser.newContext(); t.after(() => context.close());
  const page = await context.newPage(), errors = []; page.setDefaultTimeout(4000);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ file, review }) => {
    const mode = file === 'diagnostic' ? 'diagnostic' : file === 'mastery' ? 'mastery_check' : review ? 'chapter_review' : 'practice';
    const state = window.__legacyFocus = { mode, answered: 0, calls: [], hold: null, pending: [], failNext: false,
      release() { this.hold = null; this.pending.splice(0).forEach(resolve => resolve()); } };
    const session = { id: 'legacy-session', mode, answered: 0, planned: 2 };
    const skill = { id: 'skill', code: 'S01', nameHy: 'Հմտություն' };
    const summary = { correct: 2, answered: 2, planned: 2, percent: 100 };
    const client = window.__haieduSupabaseClient = {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'synthetic' }, access_token: 'synthetic' } } }),
        getUser: async () => ({ data: { user: { id: 'synthetic' } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
      from() { const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { role: 'student', account_status: 'active' } }) }; return query; },
      functions: { async invoke(name, { body }) {
        state.calls.push({ name, body });
        if (state.hold === name) await new Promise(resolve => state.pending.push(resolve));
        if (name === 'get-student-dashboard') return { data: { latestDiagnostic: mode === 'diagnostic' && state.answered < 2 ? null : summary,
          activeSession: state.answered < 2 ? session : null, skills: [skill], recommendation: { action: 'resume_session', skill },
          progress: { completedSkills: 0, totalSkills: 1, percent: 0 } } };
        if (name === 'get-student-classes') return { data: { contexts: [] } };
        if (name === 'get-mastery-check-status') return { data: { activeSession: state.answered < 2 ? session : null, eligible: true,
          unitComplete: state.answered === 2, latestCheck: state.answered === 2 ? summary : null, requiredSkills: [] } };
        if (name === 'get-chapter-mastery-lifecycle') return { data: { lifecycleState: 'not_started' } };
        if (name === 'start-learning-session') return { data: { session } };
        if (name === 'get-session-item') {
          if (state.failNext) { state.failNext = false; return { error: { message: 'Synthetic unavailable read' } }; }
          return { data: state.answered === 2 ? { complete: true, summary, session: { ...session, status: 'completed' } }
            : { session: { ...session, position: state.answered + 1, total: 2 }, sessionItemId: 'item-' + state.answered, skill,
              item: { id: 'question-' + state.answered, code: 'SYN-' + state.answered, type: 'single_choice', difficulty: 1,
                promptHy: 'Ընտրեք պատասխանը։', options: [{ option_key: 'A', content_hy: 'Առաջին' }, { option_key: 'B', content_hy: 'Երկրորդ' }] }, remediation: { available: false } } };
        }
        if (name === 'submit-answer' || name === 'submit-mastery-answer') {
          state.answered++; return { data: { grading: { correct: true }, session: { status: state.answered === 2 ? 'completed' : 'active' } } };
        }
        throw Error('Unexpected synthetic legacy API ' + name);
      } },
    };
    window.__legacyClient = client;
  }, { file, review });
  const filename = file === 'app' ? 'index' : file;
  // Omit independent navigation-shell startup, retain the actual role router,
  // and supply its shell's resolved layout class for the legacy Home surface.
  const html = (await readFile(new URL('../../web/' + filename + '.html', import.meta.url), 'utf8'))
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace('</body>', `<button id="outside">Այլ գործողություն</button><script>document.body.classList.add('amp-student-shell-active');document.getElementById('outside').focus()</script><script type="module" src="./role-router.js"></script><script type="module" src="./${file}.js"></script><script type="module" src="./ux.js"></script></body>`);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://legacy-focus.test') return route.abort();
    if (url.pathname === '/supabase-browser.bundle.mjs') return route.fulfill({ contentType: 'text/javascript', body: 'export const createClient=()=>window.__legacyClient;' });
    if (url.pathname === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: 'export const SUPABASE_URL="https://synthetic.invalid",SUPABASE_PUBLISHABLE_KEY="synthetic";' });
    if (url.pathname.endsWith('.html')) return route.fulfill({ contentType: 'text/html', body: html });
    try { return route.fulfill({ body: await readFile(new URL('../../web' + url.pathname, import.meta.url)), contentType: /\.m?js$/.test(url.pathname) ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); }
    catch { return route.fulfill({ status: 404, body: '' }); }
  });
  await page.goto('https://legacy-focus.test/' + filename + '.html' + (review ? '?mode=chapter_review' : ''));
  if (file === 'app') await page.locator('#startPracticeBtn').click();
  else if (file === 'diagnostic') await page.locator('#startBtn').click();
  await page.locator('#answerForm input').first().waitFor();
  return { page, errors };
}

for (const [file, review] of [['app', false], ['practice', false], ['practice', true], ['diagnostic', false], ['mastery', false]]) {
  test(`legacy ${file}${review ? ' review' : ''}: real page keyboard-only loop preserves feedback and completion`, async t => {
    const { page, errors } = await legacyLearning(t, file, review);
    await expect(page.locator('#prompt')).not.toHaveAttribute('aria-live', 'polite');
    for (let question = 1; question <= 2; question++) {
      const radio = page.locator('#answerForm input').first();
      if (question === 1) await radio.focus();
      else { await expect(page.locator('#prompt')).toBeFocused(); await page.keyboard.press('Tab'); await expect(radio).toBeFocused(); }
      await page.keyboard.press('Space'); await page.keyboard.press('Tab'); await expect(page.locator('#submitBtn')).toBeFocused();
      await page.keyboard.press('Enter'); await expect(page.locator('#nextBtn')).toBeFocused();
      await expect(page.locator('#feedback')).toHaveAttribute('role', 'status');
      await page.keyboard.press('Enter');
    }
    const title = file === 'practice' ? '#completionTitle' : ['diagnostic', 'mastery'].includes(file) ? '#resultTitle' : '#prompt';
    await expect(page.locator(title)).toBeFocused();
    assert.equal(await page.evaluate(() => window.__legacyFocus.answered), 2); assert.deepEqual(errors, []);
  });
}

test('legacy practice retries a failed next-question read with keyboard focus retained on Retry', async t => {
  const { page, errors } = await legacyLearning(t, 'practice');
  await page.locator('#answerForm input').first().check(); await page.locator('#submitBtn').click();
  await page.evaluate(() => { window.__legacyFocus.failNext = true; });
  await page.keyboard.press('Enter');
  await expect(page.locator('#nextBtn')).toHaveText('Կրկին փորձել'); await expect(page.locator('#nextBtn')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#prompt')).toBeFocused();
  assert.deepEqual(errors, []);
});

for (const file of ['app', 'practice', 'diagnostic', 'mastery']) test(`legacy ${file}: pending grading respects a later focus choice`, async t => {
  const { page, errors } = await legacyLearning(t, file);
  const endpoint = file === 'mastery' ? 'submit-mastery-answer' : 'submit-answer';
  await page.locator('#answerForm input').first().check();
  await page.evaluate(endpoint => { window.__legacyFocus.hold = endpoint; }, endpoint);
  await page.locator('#submitBtn').click();
  await expect.poll(() => page.evaluate(() => window.__legacyFocus.pending.length)).toBe(1);
  await page.locator('#outside').focus(); await page.evaluate(() => window.__legacyFocus.release());
  await expect(page.locator('#nextBtn')).toBeEnabled(); await expect(page.locator('#outside')).toBeFocused();
  assert.deepEqual(errors, []);
});
