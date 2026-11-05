import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

test('the real local SDK loads once and preserves browser sign-in, session and own sign-out', async t => {
  const context = await browser.newContext();
  t.after(() => context.close());
  const dependencies = [], authCalls = [], unexpected = [];
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === 'https://sdk.test') {
      if (url.pathname === '/probe.html') return route.fulfill({ contentType: 'text/html', body: '<main>SDK fixture</main>' });
      if (url.pathname === '/supabase-browser.bundle.mjs') {
        dependencies.push(url.pathname);
        return route.fulfill({ contentType: 'text/javascript', body: await readFile('web/supabase-browser.bundle.mjs') });
      }
    }
    if (url.origin === 'https://auth.sdk.test') {
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      authCalls.push({ path: url.pathname, query: url.search, method: request.method() });
      if (url.pathname === '/auth/v1/token') return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify({
        access_token: 'synthetic-browser-token', token_type: 'bearer', expires_in: 3600,
        refresh_token: 'synthetic-refresh', user: { id: 'synthetic-user', email: 'qa@example.invalid' },
      }) });
      if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers });
    }
    unexpected.push(url.origin + url.pathname);
    return route.abort();
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://sdk.test/probe.html');
  const result = await page.evaluate(async () => {
    const [first, second] = await Promise.all([import('/supabase-browser.bundle.mjs'), import('/supabase-browser.bundle.mjs')]);
    const client = first.createClient('https://auth.sdk.test', 'synthetic-public', {
      auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const signedIn = await client.auth.signInWithPassword({ email: 'qa@example.invalid', password: 'synthetic-fixture-only' });
    const session = await client.auth.getSession();
    const signedOut = await client.auth.signOut({ scope: 'local' });
    const empty = await client.auth.getSession();
    return { sameModule: first === second, signedIn: !signedIn.error, actor: session.data.session?.user.id,
      signedOut: !signedOut.error, cleared: empty.data.session === null };
  });
  assert.deepEqual(result, { sameModule: true, signedIn: true, actor: 'synthetic-user', signedOut: true, cleared: true });
  assert.deepEqual(dependencies, ['/supabase-browser.bundle.mjs']);
  assert.deepEqual(authCalls, [
    { path: '/auth/v1/token', query: '?grant_type=password', method: 'POST' },
    { path: '/auth/v1/logout', query: '?scope=local', method: 'POST' },
  ]);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(errors, []);
});
