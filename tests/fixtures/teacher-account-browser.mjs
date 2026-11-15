// Synthetic teacher account fixture: the real teacher page and account view with mocked services.
// No production request, credential or personal data. Every name, address and count is invented.
import {fixture as teacherFixture} from './teacher-performance-browser.mjs';

// Runs in the page before any page script, after the teacher fixture has installed its client.
export const installTeacherAccountFixture = (options) => {
  const client = window.__haieduSupabaseClient, base = client.functions.invoke.bind(client.functions);
  const account = window.__teacherAccount = {
    calls: [], holds: {}, fail: {}, confirms: [], confirmAnswer: true, emails: [], resets: [], challenge: 0,
    data: {
      account: {id: 'teacher-a', role: 'teacher', status: 'active', displayName: options.displayName ?? 'Աննա Մարտիրոսյան', email: 'teacher@example.invalid'},
      preferences: {product_analytics_opt_in: false, research_use_opt_in: false},
      latestDeletionRequest: options.request ?? null,
      dataInventory: {institutionalMemberships: 1, teachingAssignments: 4, materialAssignmentsSent: 6, writingAssignmentsSent: 9, writtenReviews: 23,
        feedbackDrafts: 2, feedbackSnippets: 5, feedbackReceipts: 21, invitationRecords: 31, auditEvents: 140, teacherTasks: {drafts: 1, deliveries: 2}},
    },
    release(key) { for (const fn of this.holds[key] ?? []) fn(); this.holds[key] = null; },
    hold(key) { this.holds[key] = []; },
  };
  const wait = async key => { if (account.holds[key]) await new Promise(resolve => account.holds[key].push(resolve)); };
  const normalize = value => String(value ?? '').trim().replace(/\s+/gu, ' ');
  window.confirm = text => { account.confirms.push(text); return account.confirmAnswer; };
  client.functions.invoke = async (fn, request = {}) => {
    const body = request.body ?? {};
    if (fn === 'get-my-privacy') {
      const asked = window.__teacherFixture.actor; account.calls.push({fn}); await wait('read');
      if (account.fail.read) return {data: null, error: new Error('Synthetic account read unavailable')};
      // The reply belongs to the account that asked: a second synthetic account has its own address and name.
      const reply = structuredClone(account.data);
      if (asked === 'teacher-b') Object.assign(reply.account, {id: 'teacher-b', email: 'second@example.invalid', displayName: 'Երկրորդ ուսուցիչ'});
      return {data: reply, error: null};
    }
    if (fn === 'manage-my-privacy') {
      account.calls.push({fn, ...body}); await wait(body.action);
      const failure = account.fail[body.action];
      if (failure === 'rate') return {data: {error: 'rate_limit_exceeded', retryAfterSeconds: 45}, error: null};
      if (failure) return {data: {error: failure}, error: null};
      if (body.action === 'update_display_name') {
        // The same rule as supabase/functions/_shared/display-name.mjs.
        const name = normalize(body.displayName), length = [...name].length;
        if (!length) return {data: {error: 'display_name_required'}, error: null};
        if (length < 2) return {data: {error: 'display_name_too_short'}, error: null};
        if (length > 80) return {data: {error: 'display_name_too_long'}, error: null};
        account.data.account.displayName = name;
        return {data: {profile: {display_name: name}}, error: null};
      }
      if (body.action === 'save_preferences') {
        account.data.preferences = {product_analytics_opt_in: body.productAnalytics === true, research_use_opt_in: body.researchUse === true};
        return {data: {preferences: account.data.preferences}, error: null};
      }
      if (body.action === 'request_deletion') {
        account.data.latestDeletionRequest = {id: 'request-a', status: 'pending', requested_at: '2026-11-15T08:00:00Z', resolution_code: null, resolution_note: null, execution_started_at: null};
        return {data: {request: account.data.latestDeletionRequest}, error: null};
      }
      if (body.action === 'cancel_deletion') {
        account.data.latestDeletionRequest = {...account.data.latestDeletionRequest, status: 'cancelled', resolution_code: 'cancelled_by_user'};
        return {data: {request: account.data.latestDeletionRequest, accountStatus: 'active'}, error: null};
      }
      return {data: {error: 'invalid_action'}, error: null};
    }
    return base(fn, request);
  };
  client.auth.updateUser = async (attributes, extra) => { account.emails.push({...attributes, ...extra}); await wait('email');
    return account.fail.email ? {error: {message: 'Synthetic email change refused'}} : {error: null}; };
  client.auth.resetPasswordForEmail = async (email, extra) => { account.resets.push({email, ...extra}); await wait('password');
    return account.fail.password ? {error: {message: 'Synthetic reset refused'}} : {error: null}; };
  // The bot-protection provider is replaced by a local stand-in that issues a synthetic token at once.
  window.turnstile = {render(container, config) { account.challenge++; const bar = document.createElement('div'); bar.dataset.syntheticChallenge = ''; bar.style.cssText = 'width:300px;max-width:100%;height:65px';
    container.append(bar); queueMicrotask(() => config.callback?.('synthetic-token')); return 'widget-' + account.challenge; }, remove() {}, reset() {}};
};

export async function fixture(browser, t, {view = 'account', viewport = {width: 1280, height: 900}, mobile = false, institutionalTeacher = true, displayName, request, hold = []} = {}) {
  const context = await browser.newContext({viewport, isMobile: mobile, hasTouch: mobile});
  t.after(() => context.close());
  // The account fixture wraps the client that the teacher fixture creates, so it is installed second.
  const {installTeacherPerformanceFixture} = await import('./teacher-performance-browser.mjs');
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(installTeacherPerformanceFixture, {archives: 3, initialFailure: false, analytics: null, studentDetails: null, institutionalTeacher});
  await page.addInitScript(installTeacherAccountFixture, {displayName, request});
  if (hold.length) await page.addInitScript(keys => { for (const key of keys) window.__teacherAccount.hold(key); }, hold);
  const {readFile} = await import('node:fs/promises');
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://teacher.test') return route.abort();
    const name = url.pathname === '/teacher' ? '/teacher.html' : url.pathname;
    try {
      const body = await readFile(new URL('../../web' + name, import.meta.url));
      return route.fulfill({body, contentType: name.endsWith('.html') ? 'text/html' : /\.m?js$/.test(name) ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : name.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream'});
    } catch { return route.fulfill({status: 404, body: ''}); }
  });
  await page.goto('https://teacher.test/teacher.html?view=' + view);
  await page.locator('#dashboardPanel:not(.hidden)').waitFor();
  return {page, errors, context};
}
export {teacherFixture};
