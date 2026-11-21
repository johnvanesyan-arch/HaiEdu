// School teacher roster, student panel and Skills tab (plan revision 2, provisionally accepted 20–21 Nov 2026).
// Native Chromium on the real compiled teacher page with synthetic class and student responses (no backend).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { fixture } from '../fixtures/teacher-performance-browser.mjs';

let browser; before(async () => browser = await chromium.launch({ headless: true })); after(async () => browser?.close());

const contract = (mode, extra = {}) => ({ mode, releaseId: 'release-a', unitId: 'unit-1', blueprintId: 'bp-' + mode, policyBindingId: null, modelId: 'model-a',
  academicPolicyId: 'policy-a', runtimeBuildId: 'build-a', provenanceStatus: 'exact', modelProvenanceStatus: 'exact', runtimeProvenanceStatus: 'exact', ...extra });
const estimate = (band, mode, lastAttemptAt, percent, evidenceCount = 8) => ({ status: band, band, percent, evidenceCount, sessionCount: 1, lastAttemptAt, contract: contract(mode) });
const skill = (n, estimates) => ({ skillId: 's' + n, code: 'SYN-1-S' + String(n).padStart(2, '0'), nameHy: ['Երևույթներ', 'Մարմին և նյութ', 'Ֆիզիկոսներ', 'Դիտում և փորձ', 'Վարկածի շղթա', 'Մեծություններ', 'Միավորների փոխարկում', 'Սանդղակ', 'Չափման սխալ', 'Ծավալի որոշում'][n - 1],
  evidenceCount: estimates.reduce((s, e) => s + e.evidenceCount, 0), status: estimates.length > 1 ? 'mixed_contracts' : estimates[0]?.status ?? 'not_assessed',
  band: estimates.length === 1 ? estimates[0].band : 'not_assessed', percent: estimates.length === 1 ? estimates[0].percent : null, estimates });
const g = (label, correct, answered, determinesPass) => ({ key: label, label, correct, answered, percent: answered ? Math.round(100 * correct / answered) : null, determinesPass, skillIds: [] });
const i2 = { schemaVersion: 'haiedu-assessment-result-v2', scoringRuleVersion: 'phy7-u01-i2-v1', passed: true, score: { correct: 15, answered: 18, percent: 83 },
  overallScore: { correct: 15, answered: 20, percent: 75 }, groups: [g('Պարտադիր և օժանդակ հմտություններ', 15, 18, true), g('Լրացուցիչ վերջնարդյունք', 0, 2, false)] };
const multi = { schemaVersion: 'haiedu-assessment-result-v2', passed: true, score: { correct: 10, answered: 12, percent: 83 },
  groups: [g('Պարտադիր վերջնարդյունքներ', 8, 10, true), g('Օժանդակ հմտություններ', 2, 2, true), g('Լրացուցիչ վերջնարդյունքներ', 1, 4, false)] };
const session = (mode, completedAt, correct, answered, extra = {}) => ({ id: mode + completedAt, mode, status: 'completed', answered, planned: answered, correct, completedAt, startedAt: completedAt, contract: contract(mode), reporting: null, assessmentResult: null, scorePercent: null, ...extra });

// B: older check failed on 05.11 (16/20 · 80%), required review 08.11, I-2 pass 12.11, S07 practice 14.11.
const matrixB = Array.from({ length: 10 }, (_, i) => i + 1).map(n => skill(n, n === 7
  ? [estimate('needs_support', 'practice', '2026-11-14T09:30:00Z', 44, 16), estimate('needs_support', 'mastery_check', '2026-11-12T10:00:00Z', 20, 4)]
  : n === 5 ? [estimate('needs_support', 'practice', '2026-11-03T09:00:00Z', 41)] : [estimate('secure', 'practice', '2026-11-04T09:00:00Z', 86)]));
const studentB = { id: 'student-b', displayName: 'Դավիթ Հակոբյան', matrix: matrixB, weakSkills: [], latestActivityAt: '2026-11-14T09:30:00Z', recentAccuracy: 40,
  latestMasteryCheck: { result: 'passed', percent: 75, completedAt: '2026-11-12T10:00:00Z', assessmentResult: i2 }, intervention: { action: 'unit_complete', messageHy: 'Ստուգարքի պահանջները կատարված են։' },
  activeSession: null, chapterReview: { requiredReviewsCompleted: 1, optionalReviewsCompleted: 0, totalReviewsCompleted: 1, history: [{ qualifying: true, cycleNumber: 3, sessionNumber: 2, completedAt: '2026-11-08T10:00:00Z', targetQuestions: 12 }], skills: [] } };
const detailsB = { ...studentB, student: studentB, unitCode: 'SYN-1', skills: matrixB, modeSummary: {}, academicContext: { subjectNameHy: 'Ֆիզիկա', gradeLabelHy: '7-րդ դասարան', unitTitleHy: 'Բաժին 1' },
  recentAttempts: Array.from({ length: 20 }, (_, i) => ({ id: 'a' + i, itemCode: 'SYN-Q' + i, correct: i % 5 < 2, hintUsed: false, createdAt: '2026-11-14T09:00:00Z', contract: contract('practice') })),
  sessions: [session('practice', '2026-11-14T09:30:00Z', 1, 8), session('mastery_check', '2026-11-12T10:00:00Z', 15, 20, { reporting: i2, assessmentResult: 'passed', scorePercent: 75 }),
    session('chapter_review', '2026-11-08T10:00:00Z', 9, 12), session('mastery_check', '2026-11-05T10:00:00Z', 16, 20, { assessmentResult: 'failed', scorePercent: 80 }), session('diagnostic', '2026-11-02T10:00:00Z', 12, 20)] };
// A: older pass, no saved record; counts only from the one matching session.
const studentA = { id: 'student-a', displayName: 'Անի Պետրոսյան', matrix: matrixB.map(r => skill(Number(r.skillId.slice(1)), [estimate('secure', 'practice', '2026-11-06T09:00:00Z', 88)])), weakSkills: [],
  latestActivityAt: '2026-11-09T10:00:00Z', recentAccuracy: null, latestMasteryCheck: { result: 'passed', percent: 90, completedAt: '2026-11-09T10:00:00Z', assessmentResult: null },
  intervention: { action: 'unit_complete', messageHy: 'Գլուխն ավարտված է․ յուրացման ստուգումն անցած է։' }, activeSession: null, chapterReview: null };
const detailsA = { ...studentA, student: studentA, unitCode: 'SYN-1', skills: studentA.matrix, modeSummary: {}, recentAttempts: [],
  sessions: [session('mastery_check', '2026-11-09T10:00:00Z', 18, 20, { assessmentResult: 'passed', scorePercent: 90 })] };
// C: several pass-determining groups. D: retry ready after the required review, practice in progress.
const studentC = { ...studentA, id: 'student-c', displayName: 'Մարիամ Սարգսյան', latestMasteryCheck: { result: 'passed', percent: 69, completedAt: '2026-11-13T10:00:00Z', assessmentResult: multi } };
const detailsC = { ...detailsA, ...studentC, student: studentC, sessions: [session('mastery_check', '2026-11-13T10:00:00Z', 11, 16, { reporting: multi, assessmentResult: 'passed', scorePercent: 69 })] };
const studentD = { ...studentA, id: 'student-d', displayName: 'Արամ Գրիգորյան', latestMasteryCheck: { result: 'failed', percent: 80, completedAt: '2026-11-05T10:00:00Z', assessmentResult: null },
  intervention: { action: 'mastery_check_retry', messageHy: 'Պահանջվող կրկնությունն ավարտված է. յուրացման ստուգման հաջորդ փորձը հասանելի է։' }, activeSession: { mode: 'practice', answered_count: 3, planned_item_count: 8 } };
// E: a saved record this page cannot read (unknown format claiming a pass) over a stored failure: neutral everywhere.
const unreadable = { schemaVersion: 'future-result-schema', passed: true };
const studentE = { ...studentA, id: 'student-e', displayName: 'Լիլիթ Կարապետյան', latestMasteryCheck: { result: 'failed', percent: 75, completedAt: '2026-11-20T10:05:00Z', assessmentResult: unreadable },
  intervention: { action: 'required_chapter_review', messageHy: 'Առաջնահերթ քայլ՝ ավարտել պահանջվող Գլխի կրկնությունը։' } };
const detailsE = { ...detailsA, ...studentE, student: studentE, sessions: [session('mastery_check', '2026-11-20T10:05:00Z', 15, 20, { reporting: unreadable, assessmentResult: 'failed', scorePercent: 75 })] };
const students = [studentB, studentA, studentC, studentD, studentE];
const analytics = { students, studentCount: students.length, skills: matrixB };
const byId = { 'student-b': detailsB, 'student-a': detailsA, 'student-c': detailsC, 'student-d': { ...detailsA, ...studentD, student: studentD }, 'student-e': detailsE };

async function school(t, options = {}) {
  const { page, errors } = await fixture(browser, t, { analytics, studentDetails: detailsB, timezoneId: 'UTC', ...options });
  await page.evaluate(map => { window.__teacherFixture.studentDetailsById = map; }, byId);
  await page.locator('.hm-role-nav a[href$="view=classes"]').click(); await page.locator('#classList .teacher-class-button').first().click();
  await expect(page.locator('#roster [data-testid="school-roster-row"]')).toHaveCount(students.length);
  return { page, errors, row: name => page.locator('#roster [data-testid="school-roster-row"]').filter({ hasText: name }) };
}
const doubleRootText = async page => {
  const before = await page.locator('#roster .roster-name').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const after = await page.locator('#roster .roster-name').first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
  assert.ok(after >= before * 1.95, `root text doubled (${before} → ${after})`);
};
const fits = (page, selector) => page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth + 1);

for (const width of [390, 768, 1280]) for (const zoom of [1, 2]) test(`school roster row: three separate facts at ${width}px, ${zoom === 2 ? '200%' : '100%'} root text`, async t => {
  const { page, errors, row } = await school(t, { viewport: { width, height: 950 } });
  if (zoom === 2) await doubleRootText(page);
  const b = row('Դավիթ Հակոբյան');
  await expect(b.locator('[data-testid="school-check-cell"]')).toContainText('Անցած է');
  await expect(b.locator('[data-testid="school-check-cell"]')).toContainText('Ավարտի ամսաթիվը՝');
  const support = b.locator('[data-testid="school-support-cell"]');
  await expect(support).toContainText('Միավորների փոխարկում'); await expect(support).toContainText('Վարժություն · Հաշվարկում ներառված վերջին պատասխանը՝');
  await expect(support.getByRole('button', { name: 'Դիտել ևս 1 հմտություն' })).toBeVisible();
  assert.doesNotMatch(await support.innerText(), /ստուգման ավարտից առաջ/, 'the 14.11 practice answer is after the 12.11 check');
  await expect(b.locator('[data-testid="school-next-cell"]')).toContainText('Ստուգարքի պահանջները կատարված են։');
  assert.doesNotMatch(await b.innerText(), /15 ?\/ ?18|83%|75%/, 'no score in the row');
  const d = row('Արամ Գրիգորյան');
  await expect(d.locator('[data-testid="school-next-cell"]')).toContainText('Վարժությունն ընթացքի մեջ է · պատասխանել է 8 հարցից 3-ին');
  await expect(d.locator('[data-testid="school-next-cell"]')).toContainText('Այս դասարանում ավարտվել է գլխի պարտադիր կրկնություն։');
  await expect(d.locator('[data-testid="school-check-cell"]')).toContainText('Չի անցել');
  await expect(page.locator('#roster')).not.toContainText('Հեռացնել');
  await expect(page.locator('#matrixNeedsSupportTotal')).toHaveText('1', { useInnerText: true });
  assert.equal(await fits(page, 'main'), true, 'no page overflow');
  for (const cell of await page.locator('#roster .school-roster-row > div').all()) assert.equal(await cell.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
  assert.deepEqual(errors, []);
});

for (const width of [390, 768, 1280]) test(`school panel: saved results, separate evidence, recent history and closed details at ${width}px, 200% root text`, async t => {
  const { page, errors, row } = await school(t, { viewport: { width, height: 950 } });
  await doubleRootText(page);
  await row('Դավիթ Հակոբյան').getByRole('button', { name: 'Դիտել', exact: true }).click();
  const panel = page.locator('#studentDrawerContent [data-teacher-view="school"]'); await expect(panel).toBeVisible();
  const box1 = panel.locator('.school-fact').first();
  assert.equal((await box1.innerText()).match(/15 ?\/ ?18 · 83%/g)?.length, 1, 'saved pass score once');
  await expect(box1).toContainText('Պարտադիր և օժանդակ հմտություններ՝ 15/18 · 83% · հաշվի է առնվում ստուգարքը հանձնելիս');
  await expect(box1).toContainText('Լրացուցիչ վերջնարդյունք՝ 0/2 · 0%');
  assert.doesNotMatch(await box1.innerText(), /75%|15 ?\/ ?20/);
  const flagged = await panel.locator('#schoolSupportEvidence .school-flagged').allInnerTexts();
  assert.equal(flagged.length, 3);
  assert.match(flagged[0], /Միավորների փոխարկում[\s\S]*Վարժություն · 16 պատասխան/);
  assert.match(flagged[1], /Միավորների փոխարկում[\s\S]*Յուրացման ստուգում · 4 պատասխան/);
  assert.match(flagged[2], /Վարկածի շղթա[\s\S]*Վարժություն · 8 պատասխան[\s\S]*ստուգման ավարտից առաջ/);
  await expect(panel.locator('#schoolSupportTitle')).toHaveText('Աջակցության հիմքերը');
  await expect(panel.locator('[data-testid="school-recent-accuracy"]')).toContainText('Վարժություն · վերջին 20 պատասխաններից 40%-ը ճիշտ է');
  const history = panel.locator('.teacher-assessment-history');
  await expect(history.locator('[data-testid="history-recent-notice"]')).toHaveText('Ցուցադրվում են այս դասարանի վերջին աշխատանքները։');
  await expect(history).toContainText('Ստուգարքը չի անցել · 16 / 20 · 80%');
  await expect(history).toContainText('Ստուգարքն անցած է · 15 / 18 · 83%');
  assert.equal(await history.locator('.evidence-technical-details').count(), 5, 'each session keeps its own contract');
  const details = panel.locator('[data-testid="more-details"]');
  await expect(details).not.toHaveAttribute('open', ''); await expect(details.locator('summary')).toHaveText('Լրացուցիչ մանրամասներ');
  assert.equal(await panel.evaluate(el => { const h = el.querySelector('.teacher-assessment-history'), d = el.querySelector('[data-testid="more-details"]'); return Boolean(h.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING); }), true);
  await expect(panel.locator('[data-testid="review-thresholds-note"]')).toBeVisible();
  assert.doesNotMatch(await details.evaluate(el => el.textContent), /Փորձեր<|Անցած փորձ|Յուրացման ստուգման արդյունք/);
  const cards = panel.locator('[data-testid="school-skill-card"]');
  // Red first, then curriculum order: S05 before S07, both red.
  await expect(cards.nth(0).locator(':scope > summary')).toContainText('Վարկածի շղթա');
  await expect(cards.nth(1).locator(':scope > summary')).toContainText('Միավորների փոխարկում');
  await expect(cards.nth(1).locator(':scope > summary')).toContainText('Վարժություն՝ Աջակցություն է պետք · 44%');
  await expect(cards.nth(1).locator(':scope > summary')).not.toContainText('SYN-1-S07');
  await expect(cards.nth(1).getByTestId('school-skill-code')).toBeHidden();
  await cards.nth(1).locator(':scope > summary').click();
  await expect(cards.nth(1).getByTestId('school-skill-code')).toHaveText('SYN-1-S07');
  await expect(cards.nth(1).getByTestId('school-skill-code')).toBeVisible();
  await expect(details.getByTestId('school-review-history-details')).toBeHidden();
  await details.locator('summary').click(); await expect(details).toHaveAttribute('open', '');
  const reviewTable = details.getByTestId('school-review-history-details');
  await expect(reviewTable.locator('thead th')).toHaveText(['Տեսակ', 'Ցիկլ / սեսիա', 'Հարցեր', 'Ավարտ']);
  await expect(reviewTable.locator('tbody td')).toHaveText(['Պարտադիր', '3 / 2', '12', '08.11.2026 10:00']);
  await expect(panel.locator('#schoolReviewHistory')).toContainText('Ավարտված · 08.11.2026');
  await details.locator('summary').focus(); await page.keyboard.press('Tab');
  await expect(details.getByRole('region', { name: 'Կրկնությունների պատմություն' })).toBeFocused();
  assert.equal(await fits(page, '.student-drawer-panel'), true, 'panel fits');
  assert.deepEqual(errors, []);
});

test('school panel: older check counts from one matching session; several scored groups show the combined score once', async t => {
  const { page, errors, row } = await school(t);
  await row('Անի Պետրոսյան').getByRole('button', { name: 'Դիտել', exact: true }).click();
  await expect(page.locator('#studentDrawerContent .school-fact').first()).toContainText('18 / 20 · 90%');
  await page.locator('#closeDrawerBtn').click();
  await row('Մարիամ Սարգսյան').getByRole('button', { name: 'Դիտել', exact: true }).click();
  const box1 = page.locator('#studentDrawerContent .school-fact').first(); await expect(box1).toContainText('Օժանդակ հմտություններ՝ 2/2');
  const text = await box1.innerText();
  assert.equal(text.match(/10 \/ 12 · 83%/g)?.length, 1);
  for (const line of ['Պարտադիր վերջնարդյունքներ՝ 8/10 · 80% · հաշվի է առնվում ստուգարքը հանձնելիս', 'Օժանդակ հմտություններ՝ 2/2 · 100% · հաշվի է առնվում ստուգարքը հանձնելիս', 'Լրացուցիչ վերջնարդյունքներ՝ 1/4 · 25%']) assert.ok(text.includes(line), line);
  assert.doesNotMatch(text, /69%|11 \/ 16/);
  assert.deepEqual(errors, []);
});

test('school panel keyboard: containment after a text click, Escape and Close return focus, support and skill-cell focus', async t => {
  const { page, errors, row } = await school(t);
  const opener = row('Դավիթ Հակոբյան').getByRole('button', { name: 'Դիտել', exact: true });
  const inPanel = () => page.locator('.student-drawer-panel').evaluate(el => el.contains(document.activeElement));
  await opener.focus(); await page.keyboard.press('Enter'); await expect(page.locator('#studentDrawerContent [data-teacher-view="school"]')).toBeVisible();
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); assert.equal(await inPanel(), true, 'Tab ' + i); }
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Shift+Tab'); assert.equal(await inPanel(), true, 'Shift+Tab ' + i); }
  for (const key of ['Tab', 'Shift+Tab']) {
    await page.locator('#schoolCheckTitle').click(); await page.keyboard.press(key);
    assert.equal(await inPanel(), true, `text click then ${key}`);
  }
  await page.locator('#schoolCheckTitle').click(); await page.keyboard.press('Escape');
  await expect(page.locator('#studentDrawer')).toBeHidden(); await expect(opener).toBeFocused();
  await opener.click(); await page.locator('#closeDrawerBtn').click(); await expect(opener).toBeFocused();
  const more = row('Դավիթ Հակոբյան').getByRole('button', { name: 'Դիտել ևս 1 հմտություն' });
  await more.click(); await expect(page.locator('#schoolSupportEvidence')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(more).toBeFocused();
  await page.locator('#matrixWrap tbody tr').first().locator('button[data-skill="s7"]').click();
  const card = page.locator('[data-skill-evidence="s7"]'); await expect(card).toHaveAttribute('open', ''); await expect(card.locator(':scope > summary')).toBeFocused();
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
});

test('school panel: a late response for an earlier student never fills the newer panel; class change and sign-out discard it', async t => {
  const { page, errors, row } = await school(t);
  await page.evaluate(() => window.__teacherFixture.holds.push('get-teacher-student'));
  await row('Անի Պետրոսյան').getByRole('button', { name: 'Դիտել', exact: true }).click(); await expect(page.locator('#studentDrawerName')).toHaveText('Բեռնվում է…');
  await page.locator('#closeDrawerBtn').click();
  await row('Դավիթ Հակոբյան').getByRole('button', { name: 'Դիտել', exact: true }).click();
  await page.evaluate(() => window.__teacherFixture.release('get-teacher-student'));
  await expect(page.locator('#studentDrawerName')).toHaveText('Դավիթ Հակոբյան');
  await expect(page.locator('#studentDrawerContent')).toContainText('15/18 · 83%'); await expect(page.locator('#studentDrawerContent')).not.toContainText('18 / 20 · 90%');
  assert.equal(await page.evaluate(() => window.__teacherFixture.calls.filter(c => c.fn === 'get-teacher-student').length), 2, 'one request per opening');
  await page.locator('#closeDrawerBtn').click();
  // Class change while loading.
  await page.evaluate(() => window.__teacherFixture.holds.push('get-teacher-student'));
  await row('Դավիթ Հակոբյան').getByRole('button', { name: 'Դիտել', exact: true }).click(); await page.locator('#closeDrawerBtn').click();
  await page.locator('.hm-role-nav a[href$="view=classes"]').click(); await page.locator('#classList .teacher-class-button').nth(1).click();
  await page.evaluate(() => window.__teacherFixture.release('get-teacher-student'));
  await expect(page.locator('#studentDrawer')).toBeHidden(); await expect(page.locator('#studentDrawerContent')).toBeEmpty();
  // Sign-out while a response is held.
  await row('Դավիթ Հակոբյան').getByRole('button', { name: 'Դիտել', exact: true }).click(); await page.locator('#closeDrawerBtn').click();
  await page.evaluate(() => window.__teacherFixture.holds.push('get-teacher-student'));
  await row('Դավիթ Հակոբյան').getByRole('button', { name: 'Դիտել', exact: true }).click();
  await page.evaluate(() => { const s = window.__teacherFixture; s.listeners.forEach(fn => fn('SIGNED_OUT', null)); s.release('get-teacher-student'); });
  await expect(page.locator('#studentDrawer')).toBeHidden(); await expect(page.locator('#studentDrawerContent')).toBeEmpty();
  assert.deepEqual(errors, []);
});

for (const institutionalTeacher of [true, false]) for (const [timezoneId, date, time] of [
  ['Asia/Yerevan', '13.11.2026', '02:05'], ['America/Los_Angeles', '12.11.2026', '14:05'],
]) test(`${institutionalTeacher ? 'school' : 'personal'} teacher dates retain local time with fixed numeric order in ${timezoneId}`, async t => {
  const stamp = '2026-11-12T22:05:00Z', dateTime = `${date} ${time}`;
  const valid = { ...studentB, latestActivityAt: stamp, latestMasteryCheck: { ...studentB.latestMasteryCheck, completedAt: stamp } };
  const invalid = { ...valid, id: 'invalid-dates', displayName: 'Ամսաթիվն անհասանելի է', latestActivityAt: 'not-a-date', latestMasteryCheck: { ...valid.latestMasteryCheck, completedAt: 'not-a-date' } };
  const details = student => ({ ...detailsB, student, latestMasteryCheck: student.latestMasteryCheck,
    recentAttempts: [{ ...detailsB.recentAttempts[0], createdAt: student.latestActivityAt }],
    chapterReview: { ...studentB.chapterReview, history: [{ ...studentB.chapterReview.history[0], completedAt: student.latestActivityAt }] },
    sessions: [session('mastery_check', student.latestActivityAt, 15, 20, { reporting: i2, assessmentResult: 'passed', scorePercent: 75 })] });
  const { page, errors } = await fixture(browser, t, { analytics: { ...analytics, students: [valid, invalid], studentCount: 2 },
    studentDetails: details(valid), institutionalTeacher, timezoneId, locale: 'en-US' });
  await page.evaluate(map => { window.__teacherFixture.studentDetailsById = map; }, { [valid.id]: details(valid), [invalid.id]: details(invalid) });
  await page.locator('.hm-role-nav a[href$="view=classes"]').click(); await page.locator('#classList .teacher-class-button').first().click();
  const rows = page.locator('#roster .roster-row');
  await expect(rows.first()).toContainText(`Վերջին ակտիվություն՝ ${dateTime}`);
  await expect(rows.nth(1)).toContainText('Վերջին ակտիվություն՝ —');
  await rows.first().getByRole('button', { name: 'Դիտել', exact: true }).click();
  const content = page.locator('#studentDrawerContent');
  if (institutionalTeacher) {
    await expect(content.locator('.school-fact').first()).toContainText(`Ավարտի ամսաթիվը՝ ${date}`);
    await expect(content.locator('#schoolReviewHistory')).toContainText(`Ավարտված · ${date}`);
    await content.getByTestId('more-details').locator('summary').click();
    await expect(content.getByTestId('school-review-history-details').locator('tbody td').last()).toHaveText(dateTime);
  } else {
    await expect(content.locator('.teacher-assessment-history .assessment-record-heading > span')).toHaveText(dateTime);
    await expect(content.locator('.attempt-table').filter({ hasText: 'Ցիկլ / սեսիա' }).locator('tbody td').last()).toHaveText(dateTime);
  }
  const recentTable = content.locator('.attempt-table').filter({ hasText: 'ՕգնությունԺամանակ' });
  await expect(recentTable.locator('tbody td').last()).toHaveText(dateTime);
  await page.locator('#closeDrawerBtn').click();
  await rows.nth(1).getByRole('button', { name: 'Դիտել', exact: true }).click();
  if (institutionalTeacher) await content.getByTestId('more-details').locator('summary').click();
  await expect(recentTable.locator('tbody td').last()).toHaveText('—');
  assert.doesNotMatch(await content.innerText(), /Invalid Date|not-a-date/);
  assert.deepEqual(errors, []);
});

for (const width of [390, 768, 1280]) test(`personal-account teacher keeps today's roster row and panel at ${width}px, 200% root text`, async t => {
  const { page, errors } = await fixture(browser, t, { analytics, studentDetails: detailsB, institutionalTeacher: false, viewport: { width, height: 950 } });
  await page.locator('.hm-role-nav a[href$="view=classes"]').click(); await page.locator('#classList .teacher-class-button').first().click();
  const rows = page.locator('#roster .roster-row'); await expect(rows).toHaveCount(students.length);
  await expect(page.locator('#roster .school-roster-row, #roster [data-testid^="school-"]')).toHaveCount(0);
  await expect(rows.first()).toContainText('Ուշադրության հմտություններ'); await expect(rows.first()).toContainText('Հաջորդ առաջարկություն');
  await expect(rows.first().getByRole('button', { name: 'Հեռացնել' })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.equal(await fits(page, 'main'), true);
  const opener = rows.first().getByRole('button', { name: 'Դիտել', exact: true }); await opener.focus(); await page.keyboard.press('Enter');
  const content = page.locator('#studentDrawerContent'); await expect(content).toContainText('Վերջին փորձերը');
  await expect(content.locator('[data-teacher-view="school"], [data-testid="more-details"], .school-fact')).toHaveCount(0);
  await expect(content.locator('h3', { hasText: 'Յուրացման ստուգում և կրկնություն' })).toHaveCount(1);
  assert.equal(await fits(page, '.student-drawer-panel'), true);
  await page.keyboard.press('Shift+Tab'); assert.equal(await page.locator('.student-drawer-panel').evaluate(el => el.contains(document.activeElement)), true);
  // Same keyboard rule as the school panel: after a click on text, Tab and Shift+Tab stay in the panel.
  for (const key of ['Tab', 'Shift+Tab']) { await page.locator('#studentDrawerName').click(); await page.keyboard.press(key);
    assert.equal(await page.locator('.student-drawer-panel').evaluate(el => el.contains(document.activeElement) && document.activeElement !== el), true, `personal: text click then ${key}`); }
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  assert.deepEqual(errors, []);
});

test('an unreadable saved record stays neutral in the roster, check box and history; no fallback to the stored status or raw score', async t => {
  const { page, errors, row } = await school(t);
  const e = row('Լիլիթ Կարապետյան').locator('[data-testid="school-check-cell"]');
  await expect(e).toContainText('Տվյալը հասանելի չէ');
  assert.doesNotMatch(await e.innerHTML(), /school-pill (?:passed|not-passed)/);
  await row('Լիլիթ Կարապետյան').getByRole('button', { name: 'Դիտել', exact: true }).click();
  const panel = page.locator('#studentDrawerContent [data-teacher-view="school"]'); await expect(panel).toBeVisible();
  const box1 = panel.locator('.school-fact').first();
  await expect(box1.locator('[data-assessment-state="unavailable"]')).toHaveText('Տվյալը հասանելի չէ');
  await expect(box1.locator('[data-testid="school-check-status"]')).toHaveCount(0);
  assert.doesNotMatch(await box1.innerText(), /75%|15 ?\/ ?20/);
  await expect(panel).not.toContainText('Գլխի կրկնությունը պարտադիր չէ։');
  await expect(panel).toContainText('Առաջնահերթ քայլ՝ ավարտել պահանջվող Գլխի կրկնությունը։');
  const history = panel.locator('.teacher-assessment-history');
  await expect(history.locator('[data-assessment-state="unavailable"]')).toHaveText('Տվյալը հասանելի չէ');
  assert.doesNotMatch(await history.innerText(), /Ստուգարքն անցած է|Ստուգարքը չի անցել|75%|15 \/ 20/);
  assert.deepEqual(errors, []);
});
