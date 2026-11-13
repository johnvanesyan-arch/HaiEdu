import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { fixture } from '../fixtures/teacher-performance-browser.mjs';
import { todayFixture } from '../fixtures/teacher-today-browser.mjs';
import { reviewSurface } from '../fixtures/teacher-task-review-browser.mjs';

// Real teacher HTML/controllers/styles with synthetic identities and reads.
// No production credential, learner record or write path is involved.
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

const widths = [390, 768, 1280];
const open = (t, view, width = 1280) => fixture(browser, t, { archives: 3, startUrl: 'https://teacher.test/teacher.html?view=' + view, viewport: { width, height: 900 } });
const activeView = page => page.locator('[data-teacher-view]:not(.hidden)');

test('C1: the assign-writing picker has the same inner padding as the review picker', async t => {
  for (const width of widths) {
    const padding = {};
    for (const view of ['assign-writing', 'review']) {
      const { page, errors } = await open(t, view, width);
      const picker = activeView(page).locator('.teacher-review-picker');
      await expect(picker).toBeVisible();
      padding[view] = await picker.evaluate(e => {
        const s = getComputedStyle(e), box = e.getBoundingClientRect(), select = [...e.querySelectorAll('select')].find(x => x.getClientRects().length).getBoundingClientRect();
        return { inline: parseFloat(s.paddingInlineStart), block: parseFloat(s.paddingBlockStart), selectGap: Math.round(select.left - box.left) };
      });
      assert.deepEqual(errors, []);
    }
    assert.ok(padding['assign-writing'].inline >= 16, `${width}px assign-writing padding ${JSON.stringify(padding)}`);
    assert.ok(padding['assign-writing'].selectGap >= 16, `${width}px controls must not touch the card edge`);
    assert.equal(padding['assign-writing'].inline, padding.review.inline, `${width}px both pickers share one spacing rule`);
  }
});

test('C2: writing mode buttons stay hidden until a class and unit exist, then show the selected mode', async t => {
  for (const view of ['assign-writing', 'review']) {
    const { page, errors } = await open(t, view);
    const kinds = activeView(page).locator('[data-review-kind]');
    // The container is marked hidden before a context exists; it must not render inert buttons.
    await expect(kinds).toHaveAttribute('hidden', '');
    await expect(kinds).toBeHidden();
    assert.deepEqual(errors, []);
  }
  // Real teacher entry with SQL-backed synthetic custom-task review: class, unit and mode are chosen.
  const f = await reviewSurface(browser, t);
  const page = f.teacher;
  const kinds = page.locator('[data-review-kind]');
  await expect(kinds).toBeVisible();
  const course = kinds.locator('[data-review-course]'), custom = kinds.locator('[data-review-custom]');
  await expect(custom).toHaveAttribute('aria-pressed', 'true');
  await expect(course).toHaveAttribute('aria-pressed', 'false');
  const look = l => l.evaluate(e => { const s = getComputedStyle(e); return s.backgroundColor + '|' + s.color; });
  assert.notEqual(await look(custom), await look(course), 'the selected mode must be visually distinct, not only announced');
  await course.click();
  await expect(course).toHaveAttribute('aria-pressed', 'true');
  assert.notEqual(await look(course), await look(custom), 'the selection follows the mode change');
  assert.deepEqual(f.errors, []);
});

test('C3: profile, create and archive have one page title and an ordered heading outline', async t => {
  for (const view of ['profile', 'create', 'archive']) {
    const { page, errors } = await open(t, view);
    const title = (await page.locator('#teacherPageTitle').innerText()).trim();
    const headings = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3,h4')]
      .filter(h => h.getClientRects().length && !h.closest('.hidden,[hidden]'))
      .map(h => ({ level: Number(h.tagName[1]), text: h.textContent.trim() })));
    assert.equal(headings.filter(h => h.text === title).length, 1, `${view}: "${title}" must appear once, got ${JSON.stringify(headings)}`);
    for (let i = 1; i < headings.length; i++) assert.ok(headings[i].level <= headings[i - 1].level + 1, `${view}: heading level skip ${JSON.stringify(headings)}`);
    const label = await activeView(page).evaluate(v => document.getElementById(v.getAttribute('aria-labelledby'))?.textContent.trim() ?? v.getAttribute('aria-label'));
    assert.equal(label, title, `${view}: the view region is named by the page title`);
    assert.deepEqual(errors, []);
  }
});

test('C3: teacher text links and skill-matrix cells meet a 44px target at 390px', async t => {
  const { page, errors } = await todayFixture(browser, t, { initialURL: '?view=home' });
  await page.setViewportSize({ width: 390, height: 844 });
  const all = page.locator('#teacherToday .today-heading > a');
  await expect(all.first()).toBeVisible();
  for (const box of await all.evaluateAll(a => a.map(e => e.getBoundingClientRect().height))) assert.ok(box >= 44, 'Home "all classes" link height ' + box);
  for (const view of ['review', 'assign-writing']) {
    await page.goto('https://today.test/teacher.html?view=' + view);
    const guide = activeView(page).locator('.teacher-review-picker a[href*="teacher-workflows.html"]');
    await expect(guide).toBeVisible();
    const h = await guide.evaluate(e => e.getBoundingClientRect().height);
    assert.ok(h >= 44, view + ' guide link height ' + h);
  }
  assert.deepEqual(errors, []);
  const skills = [{ skillId: 's1', code: 'SYN-1-S01', nameHy: 'Առաջին հմտություն', status: 'secure', band: 'secure', percent: 9, evidenceCount: 4 }];
  const student = { id: 'student-a', displayName: 'Փորձնական աշակերտ', matrix: skills, weakSkills: [], latestActivityAt: '2026-11-01', recentAccuracy: null };
  const f = await fixture(browser, t, { archives: 0, viewport: { width: 1280, height: 900 }, analytics: { students: [student], studentCount: 1, skills }, studentDetails: { student, matrix: skills, skills, recentAttempts: [], sessions: [] } });
  await f.page.locator('.hm-role-nav a[href$="view=classes"]').click();
  await f.page.locator('#classList .teacher-class-button').first().click();
  const cell = f.page.locator('#matrixWrap .skill-evidence-link').first();
  await expect(cell).toBeVisible();
  const size = await cell.evaluate(e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
  assert.ok(size[0] >= 44 && size[1] >= 44, 'matrix cell target ' + size);
  assert.deepEqual(f.errors, []);
});
