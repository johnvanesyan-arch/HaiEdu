// Kept from the 14–16 November 2026 session. Usage is in docs/agent-handover-20261116.md, §3.4.
// Verifies the teacher prototype: every screen × data state × teacher type × width, plus account interactions.
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const [repo, file, out] = process.argv.slice(2);
const {chromium} = createRequire(repo + '/package.json')('@playwright/test');
await mkdir(out, {recursive: true});
const browser = await chromium.launch();
const fails = [], log = m => console.log(m), check = (ok, m) => { if (!ok) fails.push(m); };
const ctx = await browser.newContext({viewport: {width: 1400, height: 900}});
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + file);
const screens = await page.$$eval('#ctlScreen option', o => o.map(x => x.value));
const press = (group, v) => page.click(`#${group} button[data-v="${v}"]`);
const state = () => page.evaluate(() => {
  const app = document.getElementById('app');
  const h1 = [...app.querySelectorAll('h1')].filter(h => h.offsetParent !== null);
  const over = [...app.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(), a = app.getBoundingClientRect(); return r.width > 0 && (r.right > a.right + 1 || r.left < a.left - 1) && !e.closest('.matrix-wrap,.tabs,.roster-wrap,.drawer-bg'); }).length;
  return {h1: h1.length, over, scroll: app.scrollWidth > app.clientWidth + 1};
});
let combos = 0;
for (const device of ['phone', 'desktop']) for (const teacher of ['school', 'personal']) for (const data of ['full', 'empty', 'loading', 'error', 'signedout']) for (const s of screens) {
  await press('ctlDevice', device); await press('ctlTeacher', teacher); await press('ctlState', data);
  await page.selectOption('#ctlScreen', s); await page.waitForTimeout(20);
  const st = await state(); combos++;
  check(st.h1 === 1, `${device}/${teacher}/${data}/${s}: ${st.h1} H1`);
  check(!st.scroll && st.over === 0, `${device}/${teacher}/${data}/${s}: overflow ${JSON.stringify(st)}`);
}
log(`matrix: ${combos} renders, ${screens.length} screens`);

// Account interactions (desktop frame, filled, school)
await press('ctlDevice', 'desktop'); await press('ctlTeacher', 'school'); await press('ctlState', 'full'); await page.selectOption('#ctlScreen', 'account');
const name = page.locator('#dispName');
check(await name.getAttribute('maxlength') === '80', 'maxlength 80');
check(await page.locator('#acc-priv details').evaluate(d => !d.open), 'data list folded by default');
await name.fill(''); await page.click('[data-acc-name]');
check(await page.locator('#dispErr').textContent() === 'Մուտքագրեք ձեր անունն ու ազգանունը։', 'empty name error');
check(await page.locator('#dispName').getAttribute('aria-invalid') === 'true', 'aria-invalid on empty');
check(await page.evaluate(() => document.activeElement?.id) === 'dispName', 'focus returns to name');
check(await page.locator('#acc-main .inline-ok').count() === 0, 'empty name not saved');
await page.locator('#dispName').fill('   '); await page.click('[data-acc-name]');
check((await page.locator('#dispErr').textContent()).startsWith('Մուտքագրեք'), 'spaces-only treated as empty');
await page.locator('#dispName').fill('Ա'); await page.click('[data-acc-name]');
check(await page.locator('#dispErr').textContent() === 'Անունը պետք է պարունակի առնվազն 2 նիշ։', 'one-letter error');
await page.locator('#dispName').fill('  Աննա    Մարտիրոսյան '); await page.click('[data-acc-name]');
check(await page.locator('#acc-main .inline-ok').textContent() === 'Անունը պահպանվեց։', 'valid name saved');
check(await page.locator('#dispName').inputValue() === 'Աննա Մարտիրոսյան', 'spaces collapsed in saved name');
check(await page.locator('#dispErr').count() === 0, 'error cleared after valid save');
await page.locator('#dispName').fill('x'.repeat(95)); check((await page.locator('#dispName').inputValue()).length === 80, 'typing stops at 80');
// network failure
await page.selectOption('#ctlFail', 'network'); await page.locator('#dispName').fill('Աննա Մ.'); await page.click('[data-acc-name]');
check(await page.locator('#acc-main .inline-error').count() === 1, 'network failure shown inline');
check(await page.locator('#dispName').inputValue() === 'Աննա Մ.', 'typed name kept after failure');
await page.selectOption('#ctlFail', 'ok');
// unsaved guard: email, privacy, name
for (const [what, act] of [['email', () => page.locator('#newEmail').fill('new@example.com')], ['privacy', () => page.locator('#privA').check()], ['name', () => page.locator('#dispName').fill('Ուրիշ անուն')]]) {
  await page.selectOption('#ctlScreen', 'account'); await act();
  await page.click('.side nav a[data-go="home"]');
  check(await page.locator('[role="alertdialog"] #gT').count() === 1, `guard after ${what}`);
  await page.click('[data-guard="stay"]');
  check(await page.evaluate(() => document.querySelector('h1').textContent) === 'Իմ հաշիվը', `stay keeps account (${what})`);
  if (what === 'privacy') check(await page.locator('#privA').isChecked(), 'checkbox state kept across re-render');
  await page.click('.side nav a[data-go="home"]'); await page.click('[data-guard="leave"]');
  check(await page.evaluate(() => document.querySelector('h1').textContent) === 'Գլխավոր', `leave goes home (${what})`);
}
await page.selectOption('#ctlScreen', 'account');
check(!(await page.locator('#privA').isChecked()) && await page.locator('#newEmail').inputValue() === '', 'unsaved values discarded after leaving');
// privacy saved persists, no guard after save
await page.locator('#privR').check(); await page.click('[data-acc="privacy"]'); await page.click('.side nav a[data-go="home"]');
check(await page.locator('#gT').count() === 0, 'no guard after saving privacy');
await page.selectOption('#ctlScreen', 'account'); check(await page.locator('#privR').isChecked(), 'saved privacy choice kept');
// deletion request
await page.click('[data-confirm="delete-account"]'); check(await page.locator('#daT').count() === 1, 'delete confirm on page');
await page.click('[data-acc-del="send"]');
check((await page.locator('#delState').textContent()).startsWith('Հարցումն ուղարկված է'), 'pending state');
check(await page.locator('[data-confirm="cancel-delete"]').count() === 1, 'cancel offered');
await page.click('[data-confirm="cancel-delete"]'); await page.click('[data-acc-del="cancel"]');
check((await page.locator('#delState').textContent()) === 'Վերջին ջնջման հարցումը չեղարկվել է։', 'cancelled state');

// ---- review fixes (14 November)
const fresh = async () => { await page.selectOption('#ctlScreen', 'home'); if (await page.locator('#gT').count()) await page.click('[data-guard="leave"]'); await page.selectOption('#ctlScreen', 'account'); };
const leaveAsks = async () => { await page.click('.side nav a[data-go="home"]'); const g = await page.locator('#gT').count(); if (g) await page.click('[data-guard="stay"]'); else await page.selectOption('#ctlScreen', 'account'); return !!g; };
await fresh();
check(await page.locator('#delState').textContent() === 'Վերջին ջնջման հարցումը չեղարկվել է։' && await page.locator('[data-confirm="delete-account"]').count() === 1, 'after cancel a new request can be sent');
// empty / invalid / unchanged email
for (const v of ['', 'abc', 'A***@example.com']) { await page.locator('#newEmail').fill(v); await page.click('[data-acc="email"]');
  check(await page.locator('#emailErr').textContent() === 'Մուտքագրեք նոր էլ. հասցե։' && await page.locator('#acc-login .inline-ok').count() === 0, `email "${v}" refused`);
  check(await page.evaluate(() => document.activeElement?.id) === 'newEmail', `focus on email after "${v}"`); }
await page.locator('#newEmail').fill('new@example.com'); await page.click('[data-acc="email"]');
check(await page.locator('#acc-login .inline-ok').count() === 1 && await page.locator('#emailErr').count() === 0, 'valid email accepted');
// unsaved privacy survives saving the name
await fresh(); await page.locator('#privA').check(); await page.click('[data-acc-name]');
check(await page.locator('#acc-main .inline-ok').count() === 1, 'name saved while privacy unsaved');
check(await leaveAsks(), 'guard still asks: privacy unsaved after saving name');
check(await page.locator('#privA').isChecked(), 'unsaved privacy choice still shown');
await page.locator('#privA').uncheck(); check(!(await leaveAsks()), 'no guard after tick then untick');
await fresh(); await page.locator('#dispName').fill('Ուրիշ անուն'); await page.locator('#dispName').fill(await page.evaluate(() => document.querySelector('#dispName').defaultValue));
check(!(await leaveAsks()), 'no guard after restoring the name');
// stale success removed on edit
await fresh(); await page.click('[data-acc-name]'); check(await page.locator('#acc-main .inline-ok').count() === 1, 'saved message shown');
await page.locator('#dispName').pressSequentially('ա'); check(await page.locator('#acc-main .inline-ok').count() === 0, 'saved message removed when the name changes');
check(await page.evaluate(() => document.activeElement?.id) === 'dispName', 'typing keeps focus');
await fresh(); await page.locator('#privR').uncheck(); await page.click('[data-acc="privacy"]'); await page.locator('#privR').check();
check(await page.locator('#acc-priv .inline-ok').count() === 0, 'privacy saved message removed on change'); await page.locator('#privR').uncheck();
// bot-protection bar on password
await fresh(); check(await page.locator('#acc-login .turnstile').count() === 0, 'no challenge bar before pressing');
await page.click('[data-acc="password"]'); check(await page.locator('#acc-login .turnstile').count() === 1 && await page.locator('#acc-login .inline-ok').count() === 1, 'challenge bar and result after pressing');
// focus: confirmation, return, section links
await fresh(); await page.click('[data-confirm="delete-account"]');
check(await page.evaluate(() => document.activeElement?.classList.contains('inline-confirm')), 'focus moves into the confirmation');
await page.keyboard.press('Escape'); check(await page.evaluate(() => document.activeElement?.dataset.confirm) === 'delete-account', 'Escape returns focus to the opener');
await page.click('[data-confirm="delete-account"]'); await page.click('[data-confirm-cancel]'); check(await page.evaluate(() => document.activeElement?.dataset.confirm) === 'delete-account', 'cancel returns focus to the opener');
await page.click('[data-confirm="delete-account"]'); await page.click('[data-acc-del="send"]'); check(await page.evaluate(() => document.activeElement?.dataset.confirm) === 'cancel-delete', 'focus lands on the next action after sending');
check(await page.locator('#acc-main .summary dd').nth(2).textContent() === 'Ակտիվ', 'status stays active while a request is pending');
for (const [code, start] of [['staff_offboarding_required', 'Պատճառը՝ նախ պետք է փոխանցվեն'], ['not_verified', 'Պատճառը՝ հարցումը չհաջողվեց'], ['duplicate_request', 'Պատճառը՝ նույն հարցումն'], ['other_written', 'Պատճառը՝ Հարցումը կքննարկվի']]) {
  await page.click(`[data-del-reason="${code}"]`);
  check(await page.locator('#delState').textContent() === 'Վերջին ջնջման հարցումը մերժվել է։' && (await page.locator('#delReason').textContent()).startsWith(start) && await page.locator('[data-confirm="delete-account"]').count() === 1, 'rejected: ' + code); }
for (const code of ['other_empty', 'unknown']) { await page.click(`[data-del-reason="${code}"]`); check(await page.locator('#delReason').count() === 0 && await page.locator('#delState').textContent() === 'Վերջին ջնջման հարցումը մերժվել է։', code + ': no reason line'); }
check(await page.evaluate(() => !document.getElementById('app').textContent.includes('օրենքի պահանջով')), 'no fixed legal-hold sentence');
await page.click('[data-del-state="none"]'); check(await page.locator('#delState').textContent() === 'Ակտիվ ջնջման հարցում չկա։', 'no-request state');
await page.click('.acc-jump a[data-jump="acc-login"]'); check(await page.evaluate(() => document.activeElement?.id) === 'acc-login', 'section link moves focus');
// archive confirmation elsewhere keeps working with the shared focus handling
await page.selectOption('#ctlScreen', 'class'); await page.click('#moreBtn'); await page.click('[data-confirm^="archive-"]');
check(await page.evaluate(() => document.activeElement?.classList.contains('inline-confirm')), 'archive confirmation takes focus');
await page.click('[data-confirm-cancel]'); check(await page.evaluate(() => document.activeElement?.id) === 'moreBtn', 'archive cancel returns focus to «Ավելին»');
// the saved name appears elsewhere
await page.selectOption('#ctlScreen', 'account'); await page.locator('#dispName').fill('Գոհար Սահակյան'); await page.click('[data-acc-name]'); await page.selectOption('#ctlScreen', 'home');
check((await page.locator('#app .lede').first().textContent()) === 'Բարի գալուստ, Գոհար', 'Home greets with the saved name');
// phone header link height
await press('ctlDevice', 'phone'); check(await page.locator('.topbar .brand').evaluate(e => e.getBoundingClientRect().height >= 44), 'phone header link is at least 44 px'); await press('ctlDevice', 'desktop');
// entries: sidebar, phone header button, «Ավելին»; no «Իմ պրոֆիլը»
check(await page.evaluate(() => [...document.querySelectorAll('#app *')].filter(e => !e.closest('.note') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.includes('Իմ պրոֆիլը'))).length) === 0, 'no «Իմ պրոֆիլը» outside design notes');
await press('ctlDevice', 'phone'); await page.selectOption('#ctlScreen', 'home');
await page.click('.topbar [data-go="account"]'); check(await page.evaluate(() => document.querySelector('#app h1').textContent) === 'Իմ հաշիվը', 'phone header opens account');
await page.selectOption('#ctlScreen', 'more'); await page.click('#app .queue [data-go="account"]'); check(await page.evaluate(() => document.querySelector('#app h1').textContent) === 'Իմ հաշիվը', '«Ավելին» opens account');

// Metrics and screenshots: account at real phone width and desktop, 100/200% text
const metrics = [];
for (const [w, h] of [[390, 844], [1280, 900]]) for (const scale of [100, 200]) {
  const c2 = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1}); await c2.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await c2.newPage(); p.on('pageerror', e => errors.push(e.message)); await p.goto('file://' + file + '#account');
  if (w > 760) await p.click('#ctlDevice button[data-v="desktop"]');
  await p.evaluate(s => document.documentElement.style.fontSize = s + '%', scale); await p.waitForTimeout(50);
  const m = await p.evaluate(() => { const app = document.getElementById('app'), top = app.getBoundingClientRect().top; const y = el => Math.round(el.getBoundingClientRect().top - top);
    return {appHeight: app.scrollHeight, h1: y(app.querySelector('h1')), name: y(app.querySelector('#dispName')), login: y(app.querySelector('#acc-login')), overflow: document.documentElement.scrollWidth > innerWidth + 1,
      small: [...app.querySelectorAll('a,button,input,select,summary')].filter(e => e.offsetParent && !e.closest('.note')).map(e => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.height < 44 && !(e.type === 'checkbox')).map(([e, r]) => (e.id || e.textContent.trim().slice(0, 20)) + ' ' + Math.round(r.height)) }; });
  metrics.push({w, scale, ...m}); check(!m.overflow, `account ${w}/${scale}: page overflow`);
  await p.locator('#app').screenshot({path: `${out}/proto-account-${w}-${scale}.png`});
  await p.evaluate(() => document.getElementById('ctlNotes').click()); await p.locator('#app').screenshot({path: `${out}/proto-account-${w}-${scale}-nonotes.png`});
  await c2.close();
}
console.log(JSON.stringify(metrics, null, 1));
check(errors.length === 0, 'page errors: ' + errors.join(' | '));
console.log(fails.length ? 'FAILURES:\n' + fails.join('\n') : 'ALL CHECKS PASSED');
await browser.close();
