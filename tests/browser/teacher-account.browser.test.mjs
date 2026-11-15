// Teacher account (T1–T7) and the master admin rejection step, 15 November 2026.
// Native Chromium on the real pages with mocked services and synthetic records: an isolated check, not a signed-in
// production check. Each test fails on the source before this change.
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import ts from 'typescript';
import {chromium, expect} from '@playwright/test';
import {fixture} from '../fixtures/teacher-account-browser.mjs';

let browser; before(async () => { browser = await chromium.launch({headless: true}); }); after(async () => browser?.close());
const id = name => `[data-testid="${name}"]`;
const account = page => page.evaluate(() => { const a = window.__teacherAccount; return {calls: a.calls, confirms: a.confirms, emails: a.emails, resets: a.resets, challenge: a.challenge}; });
const writes = async (page, action) => (await account(page)).calls.filter(call => call.fn === 'manage-my-privacy' && (!action || call.action === action));
const ready = page => page.locator(id('account-name-input')).waitFor();
const shot = async (page, name) => { const dir = process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR; if (dir) { await mkdir(dir, {recursive: true}); await page.screenshot({path: `${dir}/${name}.png`, fullPage: true}); } };
const noOverflow = async (page, label) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': no sideways page scrolling');

test('T1: one «Իմ հաշիվը» entry; the profile item is gone and its old address opens the account', async t => {
  const {page, errors} = await fixture(browser, t, {view: 'home'});
  await expect(page.locator('.hm-role-nav a', {hasText: 'Իմ պրոֆիլը'})).toHaveCount(0);
  await expect(page.locator('#teacherHomeView a[href*="view=profile"]')).toHaveCount(0);
  assert.equal(await page.getByText('Իմ պրոֆիլը', {exact: true}).count(), 0, 'no «Իմ պրոֆիլը» anywhere on the teacher page');
  await expect(page.locator('#teacherProfileView, #teacherDisplayNameInput, #saveProfileBtn')).toHaveCount(0);
  const entry = page.locator('.hm-role-foot a[data-role-account]');
  await expect(entry).toHaveText('Իմ հաշիվը'); assert.equal(await entry.getAttribute('href'), './teacher.html?view=account');
  await expect(page.locator('.hm-role-foot a[href="./privacy.html"]')).toHaveCount(0);
  assert.equal(await page.evaluate(() => window.__teacherAccount.calls.length), 0, 'Home does not read the account');
  await entry.click(); await ready(page);
  assert.equal(new URL(page.url()).search, '?view=account');
  await expect(page.locator('#teacherPageTitle')).toHaveText('Իմ հաշիվը');
  assert.equal(await entry.getAttribute('aria-current'), 'page');
  await expect(page.locator('.hm-role-nav a[aria-current="page"]')).toHaveCount(0);
  await expect(page.locator('.hm-role-breadcrumb [aria-current="page"]')).toHaveText('Իմ հաշիվը');
  await expect(page.locator('.hm-role-sidebar')).toBeVisible();
  // Back returns Home; the footer entry stops being current.
  await page.goBack(); await expect(page.locator('#teacherPageTitle')).toHaveText('Ուսուցչի գլխավոր');
  assert.equal(await entry.getAttribute('aria-current'), null);
  assert.deepEqual(errors, []);

  const old = await fixture(browser, t, {view: 'profile'}); await ready(old.page);
  assert.equal(new URL(old.page.url()).search, '?view=account', 'the old profile address is rewritten to the account address');
  await expect(old.page.locator('#teacherPageTitle')).toHaveText('Իմ հաշիվը');
  await old.page.reload(); await ready(old.page); assert.equal(new URL(old.page.url()).search, '?view=account');
  assert.deepEqual(old.errors, []);
});

test('T2/T3: the account sits in the teacher layout with one title, ordered sections and readable phone and desktop layouts', async t => {
  for (const [width, height, mobile] of [[1280, 900, false], [390, 844, true]]) {
    const {page, errors} = await fixture(browser, t, {viewport: {width, height}, mobile}); await ready(page);
    const outline = await page.evaluate(() => [...document.querySelectorAll('#mainContent :is(h1,h2,h3)')].filter(h => h.offsetParent).map(h => h.tagName + ':' + h.textContent.trim()));
    assert.deepEqual(outline, ['H1:Իմ հաշիվը', 'H2:Հաշիվ', 'H2:Մուտքի տվյալներ', 'H3:Փոխել մուտքի էլ. հասցեն', 'H3:Փոխել գաղտնաբառը', 'H2:Գաղտնիություն', 'H2:Ջնջման հարցում'], width + ': one title and an ordered outline');
    assert.deepEqual(await page.locator('#teacherAccountRoot > section').evaluateAll(list => list.map(s => s.dataset.testid)), ['account-identity', 'account-login', 'account-privacy', 'account-deletion']);
    // The email is text, not an editable-looking field; the data list is folded.
    await expect(page.locator(id('account-email'))).toHaveText('teacher@example.invalid');
    await expect(page.locator('#teacherAccountRoot input[readonly]')).toHaveCount(0);
    assert.equal(await page.locator(id('account-inventory')).evaluate(d => d.open), false);
    await expect(page.locator(id('account-role'))).toHaveText('Ուսուցիչ'); await expect(page.locator(id('account-status'))).toHaveText('Ակտիվ');
    assert.equal(await page.locator(id('account-name-input')).getAttribute('maxlength'), '80');
    await expect(page.locator('.teacher-account-jump')).toBeVisible({visible: width > 760});
    assert.doesNotMatch(await page.locator('#teacherAccountRoot').innerText(), /Supabase|Աշակերտի հաշվի ջնջումը/);
    for (const scale of [100, 200]) {
      await page.evaluate(s => { document.documentElement.style.fontSize = s + '%'; }, scale);
      await noOverflow(page, `${width}/${scale}`);
      const small = await page.evaluate(() => [...document.querySelectorAll('#teacherAccountRoot :is(a,button,input:not([type=checkbox]),summary,label.teacher-account-check)')].filter(e => e.offsetParent)
        .map(e => [e, e.getBoundingClientRect()]).filter(([, r]) => r.height < 43.5).map(([e, r]) => (e.dataset.testid || e.textContent.trim().slice(0, 24)) + ':' + Math.round(r.height)));
      assert.deepEqual(small, [], `${width}/${scale}: 44 px targets`);
      const clipped = await page.evaluate(() => [...document.querySelectorAll('#teacherAccountRoot :is(p,dt,dd,label,button,h2,h3,a,summary,strong,small)')].filter(e => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 30)));
      assert.deepEqual(clipped, [], `${width}/${scale}: no clipped text`);
      await shot(page, `teacher-account-${width}-${scale}`);
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
    await page.locator(id('account-inventory')).locator('summary').click();
    await expect(page.locator(id('account-inventory')).locator('dt')).toHaveText(['Դպրոցի անդամակցության գրառումներ', 'Դասավանդման նշանակումներ', 'Ուղարկված նյութային առաջադրանքներ', 'Ուղարկված գրավոր առաջադրանքներ',
      'Գրավոր աշխատանքների գնահատումներ ու նշումներ', 'Գնահատման անձնական սևագրեր', 'Պատրաստի անձնական գրառումներ՝ ներառյալ արխիվը', 'Գնահատման ուղարկման հաստատումներ', 'Ստեղծված հրավերներ և կոդեր', 'Աուդիտային գործողություններ',
      'Իմ կազմած առաջադրանքների սևագրեր', 'Իմ կազմած և ուղարկած առաջադրանքներ']);
    await expect(page.locator(id('account-inventory'))).toContainText('մուտքի համակարգում');
    await noOverflow(page, width + ' with the data list open');
    if (width > 760) { await page.locator('.teacher-account-jump a', {hasText: 'Մուտքի տվյալներ'}).click(); assert.equal(await page.evaluate(() => document.activeElement?.id), 'teacherAccountLogin', 'a section link moves focus to its section'); }
    assert.deepEqual(errors, []);
  }
});

test('T7: the name hint says who sees the name, for school and personal-account teachers', async t => {
  const school = await fixture(browser, t); await ready(school.page);
  await expect(school.page.locator('#teacherAccountNameHint')).toHaveText('2–80 նիշ։ Անունը տեսնում են ձեր աշակերտները՝ ձեր ուղարկած առաջադրանքներում և նյութերում, ինչպես նաև դպրոցի ադմինը և հարթակի ադմինը։');
  const personal = await fixture(browser, t, {institutionalTeacher: false}); await ready(personal.page);
  await expect(personal.page.locator('#teacherAccountNameHint')).toHaveText('2–80 նիշ։ Անունը տեսնում են ձեր աշակերտները՝ ձեր ուղարկած առաջադրանքներում և նյութերում, ինչպես նաև հարթակի ադմինը։');
  assert.deepEqual([...school.errors, ...personal.errors], []);
});

test('T5: an empty or one-letter name is refused on the page; a valid name is saved once, normalized, through the shared account service', async t => {
  const {page, errors} = await fixture(browser, t); await ready(page);
  const input = page.locator(id('account-name-input')), save = page.locator(id('account-name-save')), error = page.locator(id('account-name-error')), saved = page.locator(id('account-name-message'));
  for (const [value, text] of [['', 'Մուտքագրեք ձեր անունն ու ազգանունը։'], ['    ', 'Մուտքագրեք ձեր անունն ու ազգանունը։'], ['Ա', 'Անունը պետք է պարունակի առնվազն 2 նիշ։'], [' Ա  ', 'Անունը պետք է պարունակի առնվազն 2 նիշ։']]) {
    await input.fill(value); await save.click();
    await expect(error).toHaveText(text); assert.equal(await input.getAttribute('aria-invalid'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'account-name-input', 'focus returns to the field');
    await expect(saved).toBeHidden();
  }
  assert.deepEqual(await writes(page), [], 'a refused name sends nothing');
  await input.fill('x'.repeat(95)); assert.equal((await input.inputValue()).length, 80, 'typing stops at 80 characters');
  await input.fill('  Գոհար    Սահակյան ');
  await expect(error).toBeHidden(); assert.equal(await input.getAttribute('aria-invalid'), null, 'editing clears the error');
  // Two quick presses while the request is pending send one request.
  await page.evaluate(() => window.__teacherAccount.hold('update_display_name'));
  await save.click(); await expect(save).toBeDisabled(); await save.dispatchEvent('click');
  await page.evaluate(() => window.__teacherAccount.release('update_display_name'));
  await expect(saved).toHaveText('Անունը պահպանվեց։'); await expect(save).toBeEnabled();
  assert.deepEqual(await writes(page), [{fn: 'manage-my-privacy', action: 'update_display_name', displayName: 'Գոհար Սահակյան'}]);
  assert.equal(await input.inputValue(), 'Գոհար Սահակյան');
  assert.equal((await account(page)).calls.some(call => call.fn === 'manage-teacher-profile'), false);
  // A "saved" message does not stay beside a changed value.
  await input.pressSequentially('ա'); await expect(saved).toBeHidden();
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'account-name-input');
  await input.fill('Գոհար Սահակյան');
  // The saved name is the teacher's greeting on Home.
  await page.locator('.hm-role-nav a', {hasText: 'Գլխավոր'}).click();
  await expect(page.locator('#teacherName')).toHaveText('Գոհար Սահակյան');
  assert.deepEqual((await account(page)).confirms, [], 'nothing unsaved, so no question on leaving');
  assert.deepEqual(errors, []);
});

test('T5: service refusals show Armenian text, never a service code, and keep what was typed', async t => {
  const {page, errors} = await fixture(browser, t); await ready(page);
  const input = page.locator(id('account-name-input')), save = page.locator(id('account-name-save'));
  for (const [failure, where, text] of [['display_name_required', 'account-name-error', 'Մուտքագրեք ձեր անունն ու ազգանունը։'], ['display_name_too_short', 'account-name-error', 'Անունը պետք է պարունակի առնվազն 2 նիշ։'],
    ['display_name_too_long', 'account-name-error', 'Անունը չափազանց երկար է։'], ['display_name_update_failed', 'account-name-message', 'Չհաջողվեց պահպանել անունը։'], ['rate', 'account-name-message', 'Խնդրում ենք սպասել 45 վայրկյան և կրկին փորձել։']]) {
    await page.evaluate(f => { window.__teacherAccount.fail.update_display_name = f; }, failure);
    await input.fill('Նոր անուն'); await save.click();
    await expect(page.locator(id(where))).toHaveText(text);
    assert.equal(await input.inputValue(), 'Նոր անուն'); await expect(save).toBeEnabled();
    assert.doesNotMatch(await page.locator('#teacherAccountRoot').innerText(), /display_name|rate_limit/);
  }
  assert.deepEqual(errors, []);
});

test('login details: the new address is checked on the page, and the password link asks for the security check first', async t => {
  const {page, errors} = await fixture(browser, t); await ready(page);
  const email = page.locator(id('account-email-input')), send = page.locator(id('account-email-save')), error = page.locator(id('account-email-error')), message = page.locator(id('account-email-message'));
  for (const value of ['', '   ', 'abc', 'TEACHER@example.invalid']) {
    await email.fill(value); await send.click();
    await expect(error).toHaveText('Մուտքագրեք նոր էլ. հասցե։'); await expect(message).toBeHidden();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'account-email-input');
  }
  assert.deepEqual((await account(page)).emails, []);
  await email.fill('new@example.invalid'); await expect(error).toBeHidden(); await email.press('Enter');
  await expect(message).toHaveText('Ստուգեք նոր և ներկայիս էլ. հասցեների փոստարկղերը և հաստատեք փոփոխությունը։ Մինչ այդ մուտք գործեք ներկայիս հասցեով։');
  assert.deepEqual((await account(page)).emails, [{email: 'new@example.invalid', emailRedirectTo: 'https://teacher.test/account-access'}]);
  assert.equal(await email.inputValue(), '');
  // Password: the first press shows the bot-protection bar and sends nothing; after the check, one link is sent.
  const password = page.locator(id('account-password-send')), note = page.locator(id('account-password-message'));
  await expect(page.locator('#teacherAccountLogin [data-auth-challenge]')).toHaveCount(0);
  await password.click();
  await expect(page.locator('#teacherAccountLogin [data-auth-challenge]')).toBeVisible(); await expect(note).not.toBeHidden();
  assert.deepEqual((await account(page)).resets, []);
  await expect(page.locator('#teacherAccountLogin .auth-challenge__status')).toHaveText('Անվտանգության ստուգումն ավարտված է։');
  await password.click(); await expect(note).toHaveText('Հղումն ուղարկվեց ձեր ընթացիկ էլ. հասցեին։ Ստուգեք վերջին նամակը։');
  assert.deepEqual((await account(page)).resets, [{email: 'fixture@example.invalid', redirectTo: 'https://teacher.test/account-access', captchaToken: 'synthetic-token'}]);
  await noOverflow(page, 'with the security check shown');
  assert.deepEqual(errors, []);
});

test('T6: unsaved account changes ask before leaving; saving one section does not hide another’s change', async t => {
  const {page, errors} = await fixture(browser, t); await ready(page);
  const home = page.locator('.hm-role-nav a', {hasText: 'Գլխավոր'}), question = 'Հաշվի չպահպանված փոփոխությունները կկորչեն։ Դուրս գա՞լ։';
  const confirms = async () => (await account(page)).confirms;
  const unload = () => page.evaluate(() => { const event = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(event); return event.defaultPrevented; });
  assert.equal(await unload(), false, 'nothing unsaved: closing the tab is not interrupted');
  // An unsaved privacy choice survives saving the name.
  await page.locator(id('account-privacy-analytics')).check();
  await page.locator(id('account-name-input')).fill('Աննա Մ'); await page.locator(id('account-name-save')).click();
  await expect(page.locator(id('account-name-message'))).toHaveText('Անունը պահպանվեց։');
  assert.equal(await unload(), true, 'an unsaved choice interrupts closing the tab');
  await page.evaluate(() => { window.__teacherAccount.confirmAnswer = false; });
  await home.click();
  assert.deepEqual(await confirms(), [question]); assert.equal(new URL(page.url()).search, '?view=account');
  await expect(page.locator('#teacherPageTitle')).toHaveText('Իմ հաշիվը');
  assert.equal(await page.locator(id('account-privacy-analytics')).isChecked(), true, 'staying keeps the unsaved choice');
  // Sign-out asks the same question.
  await page.locator('.hm-role-foot .hm-sidebar-signout').click(); assert.deepEqual(await confirms(), [question, question]);
  await expect(page.locator('#teacherPageTitle')).toHaveText('Իմ հաշիվը');
  // A box ticked and unticked again is not a change; nor is a name typed and restored.
  await page.locator(id('account-privacy-analytics')).uncheck();
  await page.locator(id('account-name-input')).fill('Ուրիշ'); await page.locator(id('account-name-input')).fill('Աննա Մ');
  assert.equal(await unload(), false);
  await home.click(); await expect(page.locator('#teacherPageTitle')).toHaveText('Ուսուցչի գլխավոր'); assert.equal((await confirms()).length, 2);
  // Each field counts on its own; agreeing to leave discards the change.
  for (const change of [p => p.locator(id('account-name-input')).fill('Չպահված անուն'), p => p.locator(id('account-email-input')).fill('x@example.invalid'), p => p.locator(id('account-privacy-research')).check()]) {
    await page.locator('.hm-role-foot a[data-role-account]').click(); await ready(page);
    await change(page); assert.equal(await unload(), true);
    const beforeCount = (await confirms()).length;
    await page.evaluate(() => { window.__teacherAccount.confirmAnswer = true; });
    await home.click(); await expect(page.locator('#teacherPageTitle')).toHaveText('Ուսուցչի գլխավոր');
    assert.equal((await confirms()).length, beforeCount + 1); assert.equal(await unload(), false, 'after leaving, nothing is pending');
  }
  await page.locator('.hm-role-foot a[data-role-account]').click(); await ready(page);
  assert.equal(await page.locator(id('account-name-input')).inputValue(), 'Աննա Մ', 'discarded changes are not shown again');
  assert.equal(await page.locator(id('account-privacy-research')).isChecked(), false);
  // A saved choice is kept and is no longer "unsaved".
  await page.locator(id('account-privacy-research')).check(); await page.locator(id('account-privacy-save')).click();
  await expect(page.locator(id('account-privacy-message'))).toHaveText('Ընտրությունները պահպանվեցին։');
  assert.deepEqual(await writes(page, 'save_preferences'), [{fn: 'manage-my-privacy', action: 'save_preferences', productAnalytics: false, researchUse: true}]);
  assert.equal(await unload(), false);
  await page.locator(id('account-privacy-research')).uncheck(); await expect(page.locator(id('account-privacy-message'))).toBeHidden();
  assert.deepEqual(errors, []);
});

test('T4: the deletion request is confirmed on the page with teacher wording and correct keyboard focus', async t => {
  const {page, errors} = await fixture(browser, t); await ready(page);
  const section = page.locator(id('account-deletion')), state = page.locator(id('account-deletion-state'));
  await expect(section.locator('p').first()).toHaveText('Ուսուցչի հաշիվը ջնջելուց առաջ անհրաժեշտ է առանձին ստուգում և դասարանների ու գործերի փոխանցում։ Մինչ այդ հաշիվը մնում է ակտիվ։');
  await expect(state).toHaveText('Ակտիվ ջնջման հարցում չկա։'); await expect(page.locator(id('account-deletion-reason'))).toHaveCount(0);
  await page.locator(id('account-deletion-request')).click();
  const confirm = page.locator(id('account-deletion-confirm'));
  await expect(confirm).toContainText('Ուղարկե՞լ հաշվի ջնջման հարցում։');
  await expect(confirm).toContainText('Այն նախ կստուգվի ադմինի կողմից, և մինչև վերջնական ջնջումը դուք կարող եք չեղարկել հարցումը։');
  assert.equal(await confirm.getAttribute('role'), 'alertdialog');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'account-deletion-confirm', 'focus moves into the confirmation');
  await page.keyboard.press('Escape'); await expect(confirm).toHaveCount(0);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'account-deletion-request', 'Escape returns focus to the opener');
  await page.locator(id('account-deletion-request')).click(); await page.locator(id('account-deletion-confirm-back')).click();
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'account-deletion-request');
  assert.deepEqual(await writes(page), [], 'opening and closing the confirmation sends nothing');
  // What the teacher has typed elsewhere survives the request.
  await page.locator(id('account-email-input')).fill('typed@example.invalid');
  await page.locator(id('account-deletion-request')).click();
  await page.evaluate(() => window.__teacherAccount.hold('request_deletion'));
  const sendButton = page.locator(id('account-deletion-confirm-send'));
  await sendButton.click(); await expect(sendButton).toBeDisabled(); await sendButton.dispatchEvent('click');
  await page.evaluate(() => window.__teacherAccount.release('request_deletion'));
  await expect(state).toHaveText('Հարցումն ուղարկված է և սպասում է ադմինի ստուգմանը։ Մինչև վերջնական ջնջումը կարող եք չեղարկել այն։');
  await expect(page.locator(id('account-deletion-message'))).toHaveText('Ջնջման հարցումն ուղարկվեց։');
  assert.deepEqual(await writes(page), [{fn: 'manage-my-privacy', action: 'request_deletion'}], 'one request for two presses');
  await expect(page.locator(id('account-status'))).toHaveText('Ակտիվ');
  assert.equal(await page.locator(id('account-email-input')).inputValue(), 'typed@example.invalid');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'account-deletion-cancel', 'focus lands on the next action');
  await expect(page.locator(id('account-deletion-request'))).toHaveCount(0);
  await page.locator(id('account-deletion-cancel')).click();
  await expect(confirm).toContainText('Չեղարկե՞լ հաշվի ջնջման հարցումը։'); await page.locator(id('account-deletion-confirm-send')).click();
  await expect(state).toHaveText('Վերջին ջնջման հարցումը չեղարկվել է։'); await expect(page.locator(id('account-deletion-request'))).toBeVisible();
  assert.deepEqual((await writes(page)).map(call => call.action), ['request_deletion', 'cancel_deletion']);
  // A refused action shows Armenian text in place and keeps the confirmation open.
  await page.evaluate(() => { window.__teacherAccount.fail.request_deletion = 'deletion_request_failed'; });
  await page.locator(id('account-deletion-request')).click(); await page.locator(id('account-deletion-confirm-send')).click();
  await expect(page.locator(id('account-deletion-message'))).toHaveText('Գործողությունը չհաջողվեց։'); await expect(confirm).toBeVisible();
  assert.deepEqual((await account(page)).confirms, [], 'no browser pop-up is used for the deletion request');
  assert.deepEqual(errors, []);
});

test('a rejected request shows its reason: three fixed lines, the administrator’s words for «other», otherwise none', async t => {
  const rejected = (resolution_code, resolution_note = null) => ({id: 'request-r', status: 'rejected', requested_at: '2026-11-10T08:00:00Z', resolved_at: '2026-11-11T08:00:00Z', resolution_code, resolution_note, execution_started_at: null});
  for (const [request, reason] of [
    [rejected('staff_offboarding_required'), 'Պատճառը՝ նախ պետք է փոխանցվեն ձեր դասարաններն ու գործերը։'], [rejected('not_verified'), 'Պատճառը՝ հարցումը չհաջողվեց հաստատել։'],
    [rejected('duplicate_request'), 'Պատճառը՝ նույն հարցումն արդեն ուղարկված է։'], [rejected('other', 'Հարցումը կքննարկվի <b>տարվա</b> ավարտից հետո։'), 'Պատճառը՝ Հարցումը կքննարկվի <b>տարվա</b> ավարտից հետո։'],
    [rejected('other', null), null], [rejected('other', '   '), null], [rejected('legal_hold'), null], [rejected('unknown_code', 'not shown'), null]]) {
    const {page, errors} = await fixture(browser, t, {request}); await ready(page);
    await expect(page.locator(id('account-deletion-state'))).toHaveText('Վերջին ջնջման հարցումը մերժվել է։');
    if (reason) await expect(page.locator(id('account-deletion-reason'))).toHaveText(reason); else await expect(page.locator(id('account-deletion-reason'))).toHaveCount(0);
    await expect(page.locator(id('account-deletion') + ' b')).toHaveCount(0); // written text is shown as text, never as markup
    await expect(page.locator(id('account-deletion-request'))).toBeVisible();
    assert.deepEqual(errors, []);
  }
});

test('a failed account read keeps the teacher menu and offers retry; an old reply never fills a newer view', async t => {
  const {page, errors} = await fixture(browser, t, {view: 'home'});
  await page.evaluate(() => { window.__teacherAccount.fail.read = true; });
  await page.locator('.hm-role-foot a[data-role-account]').click();
  await expect(page.locator('#teacherAccountRoot [role="alert"]')).toContainText('Հաշվի տվյալները չբեռնվեցին։');
  await expect(page.locator('.hm-role-sidebar')).toBeVisible(); await expect(page.locator('#authPanel')).toBeHidden();
  await page.evaluate(() => { window.__teacherAccount.fail.read = false; });
  await page.locator(id('account-retry')).click(); await ready(page);
  // Leave while a read is pending: the late reply is ignored and the account root stays empty.
  await page.locator('.hm-role-nav a', {hasText: 'Գլխավոր'}).click();
  await page.evaluate(() => window.__teacherAccount.hold('read'));
  await page.locator('.hm-role-foot a[data-role-account]').click();
  await expect(page.locator('#teacherAccountRoot [role="status"]')).toHaveText('Տվյալները բեռնվում են…');
  await page.locator('.hm-role-nav a[href$="view=classes"]').click();
  await page.evaluate(() => window.__teacherAccount.release('read'));
  await expect(page.locator('#teacherPageTitle')).toHaveText('Իմ դասարանները');
  await page.waitForTimeout(100); assert.equal(await page.locator('#teacherAccountRoot').evaluate(root => root.childElementCount), 0);
  // Opening the account twice in a row mounts one view and one set of handlers.
  await page.locator('.hm-role-foot a[data-role-account]').click(); await ready(page);
  await page.locator('.hm-role-foot a[data-role-account]').click(); await ready(page);
  await expect(page.locator(id('account-name-input'))).toHaveCount(1);
  await page.locator(id('account-name-save')).click(); await expect(page.locator(id('account-name-message'))).toHaveText('Անունը պահպանվեց։');
  assert.equal((await writes(page, 'update_display_name')).length, 1, 'repeated opening does not multiply handlers');
  assert.deepEqual(errors, []);
});

test('an account switch discards the first account’s view, typed values and late replies', async t => {
  const {page, errors} = await fixture(browser, t); await ready(page);
  const switchAccount = () => page.evaluate(() => { const s = window.__teacherFixture; s.actor = 'teacher-b'; s.listeners.forEach(fn => fn('SIGNED_IN', {user: {id: s.actor, email: 'second@example.invalid'}})); });
  await expect(page.locator(id('account-email'))).toHaveText('teacher@example.invalid');
  // The first account types a name and its save is still pending when the second account signs in.
  await page.locator(id('account-name-input')).fill('Առաջին հաշվի անուն');
  await page.evaluate(() => window.__teacherAccount.hold('update_display_name'));
  await page.locator(id('account-name-save')).click();
  await switchAccount();
  await expect(page.locator('#teacherName')).toHaveText('Երկրորդ ուսուցիչ');
  await page.evaluate(() => window.__teacherAccount.release('update_display_name'));
  await page.waitForTimeout(100);
  await expect(page.locator('#teacherName')).toHaveText('Երկրորդ ուսուցիչ'); // the late reply does not rename the new account's greeting
  assert.deepEqual((await account(page)).confirms, [], 'the switch itself asks nothing');
  assert.equal(await page.evaluate(() => { const event = new Event('beforeunload', {cancelable: true}); window.dispatchEvent(event); return event.defaultPrevented; }), false, 'the first account’s unsaved text is gone');
  // The second account's view shows only its own data.
  await page.locator('.hm-role-foot a[data-role-account]').click(); await ready(page);
  await expect(page.locator(id('account-email'))).toHaveText('second@example.invalid');
  assert.equal(await page.locator(id('account-name-input')).inputValue(), 'Երկրորդ ուսուցիչ');
  assert.doesNotMatch(await page.locator('#teacherAccountRoot').innerText(), /teacher@example\.invalid|Առաջին հաշվի անուն/);
  // A held read from the first account never paints after the switch.
  const second = await fixture(browser, t, {view: 'home'});
  await second.page.evaluate(() => window.__teacherAccount.hold('read'));
  await second.page.locator('.hm-role-foot a[data-role-account]').click();
  await second.page.evaluate(() => { const s = window.__teacherFixture; s.actor = 'teacher-b'; s.listeners.forEach(fn => fn('SIGNED_IN', {user: {id: s.actor, email: 'second@example.invalid'}})); });
  await expect(second.page.locator('#teacherName')).toHaveText('Երկրորդ ուսուցիչ');
  await second.page.evaluate(() => window.__teacherAccount.release('read')); await second.page.waitForTimeout(100);
  assert.doesNotMatch(await second.page.locator('#mainContent').innerText(), /teacher@example\.invalid/);
  assert.deepEqual([...errors, ...second.errors], []);
});

// ---- master admin: rejecting a deletion request (real admin functions, markup and styles; mocked services) ----
async function adminPage(t, {requests, viewport = {width: 1280, height: 900}} = {}) {
  const source = await readFile('web/admin.js', 'utf8'), ast = ts.createSourceFile('admin.js', source, ts.ScriptTarget.Latest, true);
  const fn = name => { const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name); assert.ok(node, name); return node.getText(ast); };
  const variable = name => { const node = ast.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === name)); assert.ok(node, name); return node.getText(ast); };
  const module = `import{erasurePresentation}from'/task-privacy-view.mjs';import{escapeHtml as esc}from'/text-safety.mjs';import{invokeRateAware,rateLimitMessage}from'/rate-budget-feedback.mjs';
    const supabase=window.__client,$=id=>document.getElementById(id),accountCache=new Map();let actor=null;
    ${['pendingDeletionIds', 'REJECTION_REASONS', 'REJECTION_NOTE_MAX', 'rejectingId'].map(variable).join('\n')}
    const approveDeletion=()=>{throw Error('Not in this fixture');},executeDeletion=approveDeletion;
    ${['fmtDate', 'displayUser', 'statusLabel', 'setMessage', 'friendlyError', 'invoke', 'cacheUsers', 'renderDeletionRequests', 'rejectionForm', 'openRejection', 'bindRejectionForm', 'rejectDeletion', 'loadDeletions'].map(fn).join('\n')}
    document.querySelector('#console').classList.remove('hidden');for(const e of document.querySelectorAll('.admin-view'))e.hidden=e.id!=='deletionsSection';
    await loadDeletions();window.__ready=true;`;
  const context = await browser.newContext({viewport}); t.after(() => context.close());
  const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(5000);
  await page.addInitScript(requests => {
    const state = window.__admin = {requests, calls: [], prompts: 0, refuse: null, held: null, release() { this.held?.(); this.held = null; }};
    window.prompt = () => { state.prompts++; return 'not_verified'; };
    window.__client = {functions: {invoke: async (name, {body}) => {
      if (name === 'get-admin-dashboard') return {data: {actor: {id: 'admin-a', role: 'admin'}, deletionRequests: structuredClone(state.requests), users: [{id: 'teacher-a', displayName: 'Synthetic teacher', email: 'teacher@example.invalid', role: 'teacher'}]}, error: null};
      state.calls.push({name, ...body});
      if (state.hold) await new Promise(resolve => { state.held = resolve; });
      if (state.refuse) return {data: {error: state.refuse}, error: null};
      const request = state.requests.find(r => r.id === body.requestId); Object.assign(request, {status: 'rejected', resolution_code: body.resolutionCode});
      return {data: {request}, error: null};
    }}};
  }, requests ?? [{id: 'request-aaaaaaaa', user_id: 'teacher-a', status: 'pending', requested_at: '2026-11-14T08:00:00Z', resolution_code: null, execution_started_at: null},
    {id: 'request-bbbbbbbb', user_id: 'teacher-a', status: 'pending', requested_at: '2026-11-13T08:00:00Z', resolution_code: null, execution_started_at: null}]);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://admin.test') return route.abort();
    if (url.pathname === '/fixture') { const html = (await readFile('web/admin.html', 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace('</body>', '<script type="module" src="/fixture.mjs"></script></body>'); return route.fulfill({contentType: 'text/html', body: html}); }
    if (url.pathname === '/fixture.mjs') return route.fulfill({contentType: 'text/javascript', body: module});
    try { return route.fulfill({body: await readFile('web' + url.pathname), contentType: /\.m?js$/.test(url.pathname) ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'application/octet-stream'}); } catch { return route.fulfill({status: 404, body: ''}); }
  });
  await page.goto('https://admin.test/fixture'); await page.waitForFunction(() => window.__ready);
  return {page, errors};
}

test('master admin: rejecting a request offers four reasons on the page and a text box only for «Այլ»', async t => {
  const {page, errors} = await adminPage(t);
  const calls = () => page.evaluate(() => window.__admin.calls);
  await page.locator('[data-delete-reject="request-aaaaaaaa"]').click();
  const form = page.locator(id('deletion-reject-form')), reason = page.locator(id('deletion-reject-reason')), note = page.locator(id('deletion-reject-note'));
  await expect(form).toHaveCount(1);
  assert.equal(await page.evaluate(() => window.__admin.prompts), 0, 'no browser prompt asks for a typed code');
  assert.deepEqual(await reason.locator('option').evaluateAll(list => list.map(o => [o.value, o.textContent])), [['not_verified', 'Հարցումը չհաջողվեց հաստատել'],
    ['staff_offboarding_required', 'Նախ պետք է փոխանցվեն դասարաններն ու գործերը'], ['duplicate_request', 'Նույն հարցումն արդեն ուղարկված է'], ['other', 'Այլ']]);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'deletion-reject-reason', 'focus moves to the reason');
  await expect(note).toBeHidden();
  await reason.selectOption('other'); await expect(note).toBeVisible(); assert.equal(await note.getAttribute('maxlength'), '300');
  await expect(form).toContainText('Այս տեքստը կտեսնի հաշվի տերը։');
  await reason.selectOption('duplicate_request'); await expect(note).toBeHidden();
  // Escape and «Վերադառնալ» close the form without sending and return focus to the row's button.
  await page.keyboard.press('Escape'); await expect(form).toHaveCount(0);
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.deleteReject), 'request-aaaaaaaa');
  await page.locator('[data-delete-reject="request-aaaaaaaa"]').click(); await page.locator(id('deletion-reject-back')).click(); await expect(form).toHaveCount(0);
  assert.deepEqual(await calls(), []);
  // A fixed reason sends no text, even if text was typed under «Այլ» first.
  await page.locator('[data-delete-reject="request-aaaaaaaa"]').click();
  await reason.selectOption('other'); await note.fill('typed then abandoned'); await reason.selectOption('staff_offboarding_required');
  await page.locator(id('deletion-reject-submit')).click();
  await expect(page.locator('#consoleMessage')).toHaveText('Հարցումը մերժվել է։');
  assert.deepEqual(await calls(), [{name: 'manage-admin-account', action: 'reject_deletion', requestId: 'request-aaaaaaaa', resolutionCode: 'staff_offboarding_required', resolutionNote: ''}]);
  await expect(form).toHaveCount(0); await expect(page.locator('[data-delete-reject="request-aaaaaaaa"]')).toHaveCount(0);
  // «Այլ» sends the written reason; two presses while pending send one request.
  await page.locator('[data-delete-reject="request-bbbbbbbb"]').click(); await reason.selectOption('other'); await note.fill('Կքննարկվի տարվա ավարտից հետո։');
  await page.evaluate(() => { window.__admin.hold = true; });
  const submit = page.locator(id('deletion-reject-submit')); await submit.click(); await expect(submit).toBeDisabled(); await form.dispatchEvent('submit');
  await page.evaluate(() => { window.__admin.hold = false; window.__admin.release(); });
  await expect(page.locator('[data-delete-reject="request-bbbbbbbb"]')).toHaveCount(0);
  assert.deepEqual((await calls()).slice(1), [{name: 'manage-admin-account', action: 'reject_deletion', requestId: 'request-bbbbbbbb', resolutionCode: 'other', resolutionNote: 'Կքննարկվի տարվա ավարտից հետո։'}]);
  assert.deepEqual(errors, []);
});

test('master admin: a refused rejection keeps the form and what was written, with Armenian text; the form fits a phone', async t => {
  const {page, errors} = await adminPage(t, {viewport: {width: 390, height: 844}});
  await page.locator('[data-delete-reject="request-aaaaaaaa"]').click();
  await page.locator(id('deletion-reject-reason')).selectOption('other'); await page.locator(id('deletion-reject-note')).fill('Գրված պատճառ');
  for (const [refusal, text] of [['invalid_rejection', 'Այս պատճառը դեռ հասանելի չէ։ Ընտրեք այլ պատճառ կամ փորձեք ավելի ուշ։'], ['resolution_note_too_long', 'Պատճառը պետք է լինի մինչև 300 նիշ։']]) {
    await page.evaluate(code => { window.__admin.refuse = code; }, refusal);
    await page.locator(id('deletion-reject-submit')).click();
    await expect(page.locator('#consoleMessage')).toHaveText(text);
    await expect(page.locator(id('deletion-reject-form'))).toHaveCount(1); await expect(page.locator(id('deletion-reject-submit'))).toBeEnabled();
    assert.equal(await page.locator(id('deletion-reject-note')).inputValue(), 'Գրված պատճառ');
  }
  for (const scale of [100, 200]) {
    await page.evaluate(s => { document.documentElement.style.fontSize = s + '%'; }, scale);
    const fits = await page.locator(id('deletion-reject-form')).evaluate(form => { const wrap = form.closest('.table-wrap').getBoundingClientRect(), r = form.getBoundingClientRect(); return r.width <= wrap.width + 1 && [...form.querySelectorAll('select,textarea,button')].every(e => e.getBoundingClientRect().height >= 43.5); });
    assert.ok(fits, scale + ': the form fits its table area with 44 px controls');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), scale + ': no sideways page scrolling');
  }
  assert.deepEqual(errors, []);
});

// ---- shared account page: the name rule applies to every role (real privacy.html and privacy.js; mocked services) ----
for (const role of ['student', 'teacher', 'school_admin', 'content_admin', 'admin']) test(`shared account page (${role}): a name is required, 2–80 characters, and is saved normalized`, async t => {
  const context = await browser.newContext({viewport: {width: 390, height: 844}}); t.after(() => context.close());
  const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(5000);
  await page.addInitScript(role => {
    const session = {user: {id: 'actor-a', email: 'synthetic@example.invalid'}, access_token: 'synthetic'};
    window.__names = [];
    window.__haieduSupabaseClient = {auth: {getSession: async () => ({data: {session}, error: null}), getUser: async () => ({data: {user: session.user}}), onAuthStateChange: () => ({data: {subscription: {unsubscribe() {}}}})},
      functions: {invoke: async (name, {body} = {}) => {
        if (name === 'get-my-privacy') return {data: {account: {role, status: 'active', displayName: null, email: 'synthetic@example.invalid'}, preferences: {}, dataInventory: {}, latestDeletionRequest: null}, error: null};
        if (body?.action === 'update_display_name') { window.__names.push(body.displayName); return {data: {profile: {display_name: body.displayName}}, error: null}; }
        return {data: {}, error: null};
      }}};
  }, role);
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://account.test') return route.abort();
    if (url.pathname === '/config.js') return route.fulfill({contentType: 'text/javascript', body: 'export const SUPABASE_URL="https://synthetic.invalid";export const SUPABASE_PUBLISHABLE_KEY="synthetic-public";'});
    if (url.pathname === '/supabase-browser.bundle.mjs') return route.fulfill({contentType: 'text/javascript', body: 'export const createClient=()=>window.__haieduSupabaseClient;'});
    try { return route.fulfill({body: await readFile('web' + url.pathname), contentType: url.pathname.endsWith('.html') ? 'text/html' : /\.m?js$/.test(url.pathname) ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'application/octet-stream'}); } catch { return route.fulfill({status: 404, body: ''}); }
  });
  await page.goto('https://account.test/privacy.html'); await page.locator('#content:not(.hidden)').waitFor();
  const input = page.locator('#displayNameInput'), save = page.locator('#saveNameBtn'), message = page.locator('#nameMessage');
  // An account without a name is not forced to add one: the page opens and every other control works.
  assert.equal(await input.inputValue(), ''); assert.equal(await input.getAttribute('placeholder'), null, 'the field is no longer marked optional');
  assert.equal(await input.getAttribute('required'), ''); assert.equal(await input.getAttribute('maxlength'), '80');
  for (const [value, text] of [['', 'Մուտքագրեք ձեր անունն ու ազգանունը։'], ['   ', 'Մուտքագրեք ձեր անունն ու ազգանունը։'], ['Ա', 'Անունը պետք է պարունակի առնվազն 2 նիշ։']]) {
    await input.fill(value); await save.click(); await expect(message).toHaveText(text);
    assert.equal(await input.getAttribute('aria-invalid'), 'true'); assert.equal(await page.evaluate(() => document.activeElement?.id), 'displayNameInput');
  }
  assert.deepEqual(await page.evaluate(() => window.__names), [], 'an empty or one-letter name sends nothing');
  await input.fill('  Նոր   Անուն '); await save.click(); await expect(message).toHaveText('Անունը պահպանվեց։');
  assert.deepEqual(await page.evaluate(() => window.__names), ['Նոր Անուն']); assert.equal(await input.inputValue(), 'Նոր Անուն'); assert.equal(await input.getAttribute('aria-invalid'), null);
  // Other roles keep the shared page's own layout: no teacher menu and the same section order as before.
  await expect(page.locator('.hm-role-sidebar')).toHaveCount(0);
  assert.deepEqual(await page.locator('#content h2').evaluateAll(list => list.map(h => h.id)), ['accountTitle', 'inventoryTitle', 'accountSecurityTitle', 'studentPrivacy', 'studentDeletion']);
  assert.deepEqual(errors, []);
});
