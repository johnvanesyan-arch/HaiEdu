import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const root = process.env.BF15_BROWSER_SOURCE_ROOT || fileURLToPath(new URL('../../web/', import.meta.url));
const origin = 'https://account-onboarding.test';
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

async function fixture(t, { view = 'login', code = 'weak_password', thrown = false, held = false,
  challenge = false, role = 'student', badConfig = false, providerLoad = 'ready', configMode = 'fixture', heldSession = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce' });
  t.after(() => context.close());
  const unexpected = [];
  await context.addInitScript(({ view, code, thrown, held, challenge, role, providerLoad, heldSession }) => {
    const actor = '00000000-0000-4000-8000-000000000001';
    const initial = ['recovery', 'invitation', 'privacy'].includes(view);
    const listeners = [];
    const state = window.__authFixture = { calls: [], role, session: initial ? { user: { id: actor }, access_token: 'synthetic-session' } : null,
      release: null, switchAccount() {
        this.session = { user: { id: '00000000-0000-4000-8000-000000000002' }, access_token: 'synthetic-next' };
        for (const cb of listeners) cb('SIGNED_IN', this.session);
      } };
    const error = code ? { code, status: /rate_limit/.test(code) ? 429 : 422, message: 'Synthetic provider response' } : null;
    async function reply(method, args) {
      state.calls.push({ method, args });
      if (held) await new Promise(resolve => { state.release = resolve; });
      if (thrown) throw new TypeError('Failed to fetch');
      return { data: { session: null }, error };
    }
    const query = { select() { return this; }, eq() { return this; }, async maybeSingle() {
      return { data: { role: state.role, account_status: 'active', display_name: 'Synthetic learner' }, error: null };
    } };
    window.__haieduSupabaseClient = { auth: {
      getSession: async () => {
        if (heldSession) await new Promise(resolve => { state.releaseInitial = resolve; });
        return { data: { session: state.session }, error: null };
      },
      getUser: async () => ({ data: { user: state.session ? { id: state.session.user.id, email: 'synthetic@example.invalid' } : null }, error: null }),
      onAuthStateChange(cb) { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: args => reply('login', args),
      signUp: args => reply('register', args),
      updateUser: args => reply('password', args),
      resetPasswordForEmail: (email, options) => reply('reset', { email, options }),
    }, from: () => query, functions: { async invoke(name, args) {
      if (name === 'get-my-privacy') return { data: { account: { role: state.role, status: 'active', displayName: 'Synthetic account', email: 'synthetic@example.invalid' }, preferences: {}, dataInventory: {} }, error: null };
      state.calls.push({ method: name, args });
      return { data: { completed: true }, error: null };
    } } };
    window.__installSyntheticChallenge = () => {
      const c = window.__challengeFixture = { renders: [], removed: [] };
      window.turnstile = {
        render(target, options) {
          const id = String(c.renders.length + 1);
          const frame = document.createElement('iframe');
          frame.title = 'Synthetic security check'; frame.width = '150'; frame.height = '140';
          target.append(frame); c.renders.push({ id, options, target, pageUrl: location.href }); return id;
        },
        remove(id) { c.removed.push(id); c.renders.find(x => x.id === id)?.target.replaceChildren(); },
      };
    };
    if (challenge && providerLoad === 'ready') window.__installSyntheticChallenge();
  }, { view, code, thrown, held, challenge, role, providerLoad, heldSession });
  let providerRequests = 0, releaseProvider;
  const csp = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url))).headers
    .find(h => h.source === '/(.*)').headers.find(h => h.key === 'Content-Security-Policy').value;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'https://challenges.cloudflare.com' && url.pathname === '/turnstile/v0/api.js') {
      providerRequests++;
      if (providerLoad === 'fail-once' && providerRequests === 1) return route.abort('failed');
      if (providerLoad === 'hold') await new Promise(resolve => { releaseProvider = resolve; });
      return route.fulfill({ contentType: 'text/javascript', body: 'window.__installSyntheticChallenge();' });
    }
    if (url.origin !== origin) { unexpected.push(url.hostname); return route.abort(); }
    let name = url.pathname.slice(1);
    if (name === 'account-access') name += '.html';
    if (name === 'config.js') return route.fulfill({ contentType: 'text/javascript', body: 'export const SUPABASE_URL="https://synthetic.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic-key";' });
    if (name === 'auth-challenge-config.mjs' && configMode !== 'actual') return route.fulfill({ contentType: 'text/javascript', body: `export const AUTH_CHALLENGE={enabled:${challenge},provider:"turnstile",siteKey:${JSON.stringify(badConfig ? '' : 'synthetic-key')}};` });
    if (['index.html', 'join.html', 'teacher.html', 'school-admin', 'content.html', 'admin.html'].includes(name)) return route.fulfill({ contentType: 'text/html', body: '<p>Authorized destination</p>' });
    try {
      const path = resolve(root, name);
      if (!path.startsWith(resolve(root) + '/')) throw Error('Unexpected local path');
      const body = await readFile(path);
      const type = ({ '.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[extname(name)] || 'application/octet-stream';
      return route.fulfill({ contentType: type, body, ...(type === 'text/html' ? { headers: { 'Content-Security-Policy': csp } } : {}) });
    } catch { return route.fulfill({ status: 404, body: 'Not found' }); }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const query = ({ login: '', register: '?view=register', reset: '?view=reset', recovery: '?type=recovery', invitation: '?type=invite&student_invitation=synthetic-invitation', 'pending-invitation': '?student_invitation=synthetic-private-invitation&view=register', 'pending-auth': '?code=synthetic-auth-code&student_invitation=synthetic-private-invitation#access_token=synthetic-access&refresh_token=synthetic-refresh&type=recovery', 'join-login': '?next=join&code=%20abcd1234%20' })[view] || '';
  await page.goto(origin + (view === 'privacy' ? '/privacy.html' : '/account-access') + query, { waitUntil: heldSession ? 'commit' : providerLoad === 'hold' ? 'domcontentloaded' : 'networkidle' });
  page.__providerFixture = { requests: () => providerRequests, release: () => releaseProvider?.() };
  if (view === 'privacy') await expect(page.locator('#content')).toBeVisible();
  t.after(() => { assert.deepEqual(unexpected, [], 'all services are synthetic and requests stay intercepted'); assert.deepEqual(errors, []); });
  return page;
}

async function fill(page, view, password = 'abcdef', confirmation = password) {
  if (view === 'login' || view === 'register') await page.locator(view === 'login' ? '#loginEmail' : '#registerEmail').fill('synthetic@example.invalid');
  if (view === 'reset') await page.locator('#resetEmail').fill('synthetic@example.invalid');
  const ids = { login: ['loginPassword'], register: ['registerPassword', 'registerConfirm'], recovery: ['newPassword', 'confirmPassword'], invitation: ['studentPassword', 'studentPasswordConfirm'] }[view];
  if (ids) { await page.locator('#' + ids[0]).fill(password); if (ids[1]) await page.locator('#' + ids[1]).fill(confirmation); }
  if (view === 'invitation') await page.locator('#studentConsent').check();
}
const form = view => ({ login: '#loginForm', register: '#registerForm', reset: '#resetForm', recovery: '#passwordForm', invitation: '#studentInviteForm' })[view];
const message = view => ({ login: '#loginMessage', register: '#registerMessage', reset: '#resetMessage', recovery: '#passwordMessage', invitation: '#studentInviteMessage' })[view];

test('live public configuration requires a challenge before credential submission', async t => {
  const p = await fixture(t, { challenge: true, configMode: 'actual' });
  await expect(p.locator('[data-auth-challenge]')).toBeVisible();
  await fill(p, 'login');
  await p.locator('#loginForm button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  await expect(p.locator('#loginMessage')).toContainText('անվտանգության ստուգումը');
  await p.evaluate(() => window.__challengeFixture.renders[0].options.callback('synthetic-live-config-token'));
  await p.locator('#loginForm button[type=submit]').click();
  await expect.poll(() => p.evaluate(() => window.__authFixture.calls.length)).toBe(1);
  assert.equal(await p.evaluate(() => window.__authFixture.calls[0].args.options.captchaToken), 'synthetic-live-config-token');
  assert.match(await p.evaluate(() => window.__challengeFixture.renders[0].options.sitekey), /^0x/);
});

test('initial Auth link processing finishes before a challenge can observe its credentials', async t => {
  const p = await fixture(t, { view: 'pending-auth', challenge: true, heldSession: true });
  await expect.poll(() => p.evaluate(() => typeof window.__authFixture?.releaseInitial)).toBe('function');
  await p.locator('#showResetBtn').click();
  await expect(p.locator('#loginPanel')).toBeVisible();
  assert.equal(await p.evaluate(() => window.__challengeFixture.renders.length), 0);
  assert.ok(new URL(p.url()).hash.includes('synthetic-access'), 'SDK link data remains until its initial read completes');
  await fill(p, 'login'); await p.locator('#loginForm button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  await p.evaluate(() => window.__authFixture.releaseInitial());
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(1);
  assert.equal(new URL(p.url()).hash, '');
  assert.equal(new URL(p.url()).searchParams.has('code'), false);
  assert.equal(await p.evaluate(() => /synthetic-access|synthetic-refresh|synthetic-auth-code|synthetic-private-invitation/.test(window.__challengeFixture.renders[0].pageUrl)), false);
});

test('challenge startup preserves the valid class-join return route', async t => {
  const p = await fixture(t, { view: 'join-login', challenge: true, code: null, configMode: 'actual' });
  await expect(p.locator('[data-auth-challenge]')).toBeVisible();
  assert.equal(new URL(p.url()).searchParams.get('code'), ' abcd1234 ');
  await fill(p, 'login');
  await p.evaluate(() => {
    window.__authFixture.session = { user: { id: '00000000-0000-4000-8000-000000000001' } };
    window.__challengeFixture.renders[0].options.callback('synthetic-join-token');
  });
  await p.locator('#loginForm button[type=submit]').click();
  await p.waitForURL('**/join.html?code=ABCD1234');
});

test('persisted page lifecycle restores one account-entry challenge without multiplying submissions', async t => {
  const p = await fixture(t, { challenge: true }); await fill(p, 'login');
  for (let i = 0; i < 2; i++) {
    await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await expect(p.locator('[data-auth-challenge]')).toHaveCount(0);
    await p.evaluate(() => window.__challengeFixture.renders.at(-1).options.callback('late-cached-token'));
    await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await expect(p.locator('[data-auth-challenge]')).toHaveCount(1);
    await expect(p.locator('#loginEmail')).toHaveValue('synthetic@example.invalid');
    await p.locator('#loginForm button[type=submit]').click();
    assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  }
  await p.evaluate(() => window.__challengeFixture.renders.at(-1).options.callback('fresh-restored-token'));
  await p.locator('#loginForm button[type=submit]').click();
  await expect.poll(() => p.evaluate(() => window.__authFixture.calls.length)).toBe(1);
});

test('shared-account challenges are cleared on every persisted pagehide cycle', async t => {
  for (const role of ['student', 'teacher', 'admin']) {
    const p = await fixture(t, { view: 'privacy', role, challenge: true });
    for (let i = 0; i < 2; i++) {
      await p.locator('#changePasswordBtn').click();
      await expect(p.locator('[data-auth-challenge]')).toHaveCount(1);
      await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
      await expect(p.locator('[data-auth-challenge]')).toHaveCount(0);
      await p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    }
    assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  }
});

test('new password controls advertise six characters without a twelve-character cap', async t => {
  for (const view of ['register', 'recovery', 'invitation']) {
    const p = await fixture(t, { view });
    for (const input of await p.locator(form(view) + ' input[type=password]').all()) {
      await expect(input).toHaveAttribute('minlength', '6');
      assert.equal(await input.getAttribute('maxlength'), null);
      const hint = await input.getAttribute('aria-describedby');
      assert.ok(hint); await expect(p.locator('#' + hint)).toContainText('6 նիշ');
    }
  }
});
for (const view of ['register', 'recovery', 'invitation']) for (const [passwordCase, password] of ['abcdef', 'Աբգդեզ', '🔒'.repeat(6), 'a'.repeat(36)].entries()) {
  test(`${view}: accepts six Unicode characters and longer passwords without truncating (case ${passwordCase})`, async t => {
    const p = await fixture(t, { view }); await fill(p, view, password);
    await p.locator(form(view) + ' button[type=submit]').click();
    await expect.poll(() => p.evaluate(() => window.__authFixture.calls.length)).toBeGreaterThan(0);
    const calls = await p.evaluate(() => window.__authFixture.calls);
    assert.equal(calls[0].args.password, password);
    await expect(p.locator(message(view))).toContainText('6 նիշ');
  });
}
for (const view of ['register', 'recovery', 'invitation']) test(`${view}: short Unicode passwords and mismatch send no request`, async t => {
  const p = await fixture(t, { view }); await fill(p, view, '🔒'.repeat(5));
  await p.locator(form(view) + ' button[type=submit]').click();
  await expect(p.locator(message(view))).toContainText('6 նիշ');
  await fill(p, view, 'abcdef', 'abcdeg'); await p.locator(form(view) + ' button[type=submit]').click();
  await expect(p.locator(message(view))).toContainText('չեն համընկնում');
  assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
});
for (const [view, code, expected] of [
  ['login', 'over_request_rate_limit', 'չափազանց շատ'], ['login', 'captcha_failed', 'անվտանգության ստուգումը'],
  ['reset', 'over_email_send_rate_limit', 'սահմանաչափ'], ['register', 'over_email_send_rate_limit', 'սահմանաչափ'],
]) test(`${view}: ${code} gives useful Armenian feedback`, async t => {
  const p = await fixture(t, { view, code }); await fill(p, view); await p.locator(form(view) + ' button[type=submit]').click();
  await expect(p.locator(message(view))).toContainText(expected);
  await expect(p.locator(form(view) + ' button[type=submit]')).toBeEnabled();
});
test('existing longer sign-in passwords are sent unchanged', async t => {
  const p = await fixture(t, { code: 'invalid_credentials' }); const password = '  ' + 'a'.repeat(40) + '  ';
  await fill(p, 'login', password); await p.locator('#loginForm button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls[0].args.password), password);
});
for (const view of ['login', 'register', 'reset', 'recovery', 'invitation']) test(`${view}: thrown transport failure restores explicit retry`, async t => {
  const p = await fixture(t, { view, thrown: true }); await fill(p, view); await p.locator(form(view) + ' button[type=submit]').click();
  await expect(p.locator(message(view))).toContainText('ինտերնետային կապը');
  await expect(p.locator(form(view) + ' button[type=submit]')).toBeEnabled();
});
test('pending authentication is submitted once even when submit is dispatched twice', async t => {
  const p = await fixture(t, { held: true }); await fill(p, 'login');
  await p.evaluate(() => { const f = document.getElementById('loginForm'); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 1);
  await p.evaluate(() => window.__authFixture.release()); await expect(p.locator('#loginForm button[type=submit]')).toBeEnabled();
});
for (const view of ['login', 'register', 'reset']) test(`${view}: configured challenge blocks missing token and forwards exactly one valid token`, async t => {
  const p = await fixture(t, { view, challenge: true }); await fill(p, view);
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(1);
  await p.locator(form(view) + ' button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  await p.evaluate(() => window.__challengeFixture.renders.at(-1).options.callback('synthetic-token'));
  await p.locator(form(view) + ' button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls[0].args.options.captchaToken), 'synthetic-token');
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(2);
  await p.locator(form(view) + ' button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 1, 'a spent challenge is not reused');
});
test('challenge expiry, errors and old callbacks require a fresh check', async t => {
  const p = await fixture(t, { challenge: true }); await fill(p, 'login');
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(1);
  await p.evaluate(() => { const c = window.__challengeFixture.renders[0].options; c.callback('old-token'); c['expired-callback'](); });
  await p.locator('#loginForm button[type=submit]').click(); assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  await p.getByRole('button', { name: 'Կրկնել ստուգումը', exact: true }).click();
  await p.evaluate(() => window.__challengeFixture.renders[0].options.callback('late-old-token'));
  await p.locator('#loginForm button[type=submit]').click(); assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  await p.evaluate(() => window.__challengeFixture.renders.at(-1).options['error-callback']());
  await expect(p.locator('[data-auth-challenge] [role=status]')).toContainText('չհաջողվեց');
  await p.getByRole('button', { name: 'Կրկնել ստուգումը', exact: true }).click();
  await p.evaluate(() => window.__challengeFixture.renders.at(-1).options.callback('fresh-token'));
  await p.locator('#loginForm button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls[0].args.options.captchaToken), 'fresh-token');
});
test('switching panels removes the previous widget and rejects its late token', async t => {
  const p = await fixture(t, { challenge: true });
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(1);
  await p.locator('#showResetBtn').click(); await fill(p, 'reset');
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(2);
  await p.evaluate(() => window.__challengeFixture.renders[0].options.callback('late-login-token'));
  await p.locator('#resetForm button[type=submit]').click(); assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  assert.equal(await p.locator('[data-auth-challenge]').count(), 1);
  assert.equal(await p.evaluate(() => window.__challengeFixture.removed.length), 1);
});
test('a pending invitation is kept out of the URL before a provider can observe the page', async t => {
  const p = await fixture(t, { view: 'pending-invitation', challenge: true });
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(1);
  assert.equal(new URL(p.url()).searchParams.has('student_invitation'), false);
  assert.equal(await p.evaluate(() => sessionStorage.getItem('haiedu:student-invitation')), 'synthetic-private-invitation');
  assert.equal(await p.evaluate(() => window.__challengeFixture.renders[0].pageUrl.includes('synthetic-private-invitation')), false);
  await p.locator('#registerBackBtn').click();
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(2);
  assert.equal(new URL(p.url()).searchParams.has('student_invitation'), false);
  assert.equal(await p.evaluate(() => window.__challengeFixture.renders.some(r => r.pageUrl.includes('synthetic-private-invitation'))), false);
});
test('enabled challenge with missing public configuration fails closed', async t => {
  const p = await fixture(t, { challenge: true, badConfig: true }); await fill(p, 'login');
  await expect(p.locator('[data-auth-challenge] [role=status]')).toContainText('չբեռնվեց');
  await p.locator('#loginForm button[type=submit]').click(); assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
});
test('reviewed CSP permits the fixed provider loader and failed loading can be retried', async t => {
  const p = await fixture(t, { challenge: true, providerLoad: 'fail-once' }); await fill(p, 'login');
  await expect(p.locator('[data-auth-challenge] [role=status]')).toContainText('չբեռնվեց');
  await p.locator('#loginForm button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls.length), 0);
  await p.getByRole('button', { name: 'Կրկնել ստուգումը', exact: true }).click();
  await expect.poll(() => p.evaluate(() => window.__challengeFixture?.renders.length || 0)).toBe(1);
  assert.equal(p.__providerFixture.requests(), 2);
  await p.evaluate(() => window.__challengeFixture.renders[0].options.callback('loaded-token'));
  await p.locator('#loginForm button[type=submit]').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls[0].args.options.captchaToken), 'loaded-token');
});
test('a late provider load creates only the current panel widget', async t => {
  const p = await fixture(t, { challenge: true, providerLoad: 'hold' });
  await expect(p.locator('[data-auth-challenge]')).toHaveCount(1);
  await p.locator('#showResetBtn').click();
  p.__providerFixture.release();
  await expect.poll(() => p.evaluate(() => window.__challengeFixture?.renders.length || 0)).toBe(1);
  assert.equal(p.__providerFixture.requests(), 1);
  await expect(p.locator('#resetPanel [data-auth-challenge]')).toHaveCount(1);
  await expect(p.locator('#loginPanel [data-auth-challenge]')).toHaveCount(0);
});
for (const role of ['student', 'teacher', 'school_admin', 'content_admin', 'admin']) test(`shared account (${role}): recovery uses the challenge and retains localized quota errors`, async t => {
  const p = await fixture(t, { view: 'privacy', role, challenge: true, code: 'over_email_send_rate_limit' });
  await p.evaluate(() => history.replaceState(null, '', location.pathname + '?code=synthetic-callback-code#access_token=synthetic-access&refresh_token=synthetic-refresh'));
  await p.locator('#changePasswordBtn').click();
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(1);
  assert.equal(await p.evaluate(() => /synthetic-callback-code|synthetic-access|synthetic-refresh/.test(window.__challengeFixture.renders[0].pageUrl)), false);
  assert.equal(await p.evaluate(() => window.__authFixture.calls.filter(x => x.method === 'reset').length), 0);
  await p.evaluate(() => window.__challengeFixture.renders.at(-1).options.callback('account-token'));
  await p.locator('#changePasswordBtn').click();
  await expect(p.locator('#passwordChangeMessage')).toContainText('սահմանաչափ');
  assert.equal(await p.evaluate(() => window.__authFixture.calls.find(x => x.method === 'reset').args.options.captchaToken), 'account-token');
  await expect(p.locator('#changePasswordBtn')).toBeEnabled();
});
test('new account invalidates an earlier recovery challenge and its callback', async t => {
  const p = await fixture(t, { view: 'privacy', challenge: true }); await p.locator('#changePasswordBtn').click();
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(1);
  await p.evaluate(() => window.__authFixture.switchAccount()); await expect(p.locator('#content')).toBeVisible();
  await p.evaluate(() => window.__challengeFixture.renders[0].options.callback('other-account-token'));
  await p.locator('#changePasswordBtn').click();
  assert.equal(await p.evaluate(() => window.__authFixture.calls.filter(x => x.method === 'reset').length), 0);
});
test('an old account recovery reply cannot replace new-account feedback or reset its challenge', async t => {
  const p = await fixture(t, { view: 'privacy', challenge: true, held: true, code: 'over_email_send_rate_limit' });
  await p.locator('#changePasswordBtn').click();
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(1);
  await p.evaluate(() => window.__challengeFixture.renders[0].options.callback('first-account-token'));
  await p.locator('#changePasswordBtn').click();
  await expect.poll(() => p.evaluate(() => Boolean(window.__authFixture.release))).toBe(true);
  await p.evaluate(() => window.__authFixture.switchAccount());
  await expect(p.locator('#changePasswordBtn')).toBeEnabled();
  await p.locator('#changePasswordBtn').click();
  await expect.poll(() => p.evaluate(() => window.__challengeFixture.renders.length)).toBe(2);
  const currentMessage = await p.locator('#passwordChangeMessage').textContent();
  await p.evaluate(() => { window.__challengeFixture.renders[1].options.callback('new-account-token'); window.__authFixture.release(); });
  await expect(p.locator('#passwordChangeMessage')).toHaveText(currentMessage);
  assert.equal(await p.evaluate(() => window.__challengeFixture.renders.length), 2);
  await p.locator('#changePasswordBtn').click();
  await expect.poll(() => p.evaluate(() => window.__authFixture.calls.filter(x => x.method === 'reset').length)).toBe(2);
  assert.equal(await p.evaluate(() => window.__authFixture.calls.filter(x => x.method === 'reset')[1].args.options.captchaToken), 'new-account-token');
  await p.evaluate(() => window.__authFixture.release());
  await expect(p.locator('#passwordChangeMessage')).toContainText('սահմանաչափ');
});
test('password hints and compact challenges reflow on phones and desktops at doubled text', async t => {
  for (const view of ['login', 'register', 'reset', 'recovery', 'invitation']) for (const width of [375, 1280]) {
    const p = await fixture(t, { view, challenge: true }); await p.setViewportSize({ width, height: 900 });
    for (const scale of [1, 2]) {
      if (scale === 2) await p.evaluate(() => {
        const original = [...document.querySelectorAll('body, body *')].filter(n => n instanceof HTMLElement)
          .map(n => ({ n, font: parseFloat(getComputedStyle(n).fontSize), line: parseFloat(getComputedStyle(n).lineHeight) }));
        for (const { n, font, line } of original) {
          n.style.setProperty('font-size', `${font * 2}px`, 'important');
          if (Number.isFinite(line)) n.style.setProperty('line-height', `${line * 2}px`, 'important');
        }
      });
      await p.evaluate(() => document.fonts.ready);
      const geometry = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.ok(geometry.scroll <= geometry.width + 1, `${view} at ${width}/${scale}: ${JSON.stringify(geometry)}`);
    }
  }
});
