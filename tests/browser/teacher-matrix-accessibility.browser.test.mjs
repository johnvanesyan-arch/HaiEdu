import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { fixture } from '../fixtures/teacher-performance-browser.mjs';
import { wordBreaks } from '../fixtures/word-boundaries.mjs';

// Real teacher HTML/controller/styles; synthetic identities and service data.
// These cases never acquire production credentials or submit learner work.
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

const skills = [
  { skillId: 's1', code: 'SYN-1-S01', nameHy: 'Առաջին հմտություն', status: 'secure', band: 'secure', percent: 90, evidenceCount: 4 },
  { skillId: 's2', code: 'SYN-1-S02', nameHy: 'Երկրորդ հմտություն', status: 'needs_support', band: 'needs_support', percent: 30, evidenceCount: 4 },
  { skillId: 's3', code: 'SYN-1-S03', nameHy: 'Երրորդ հմտություն', status: 'developing', band: 'developing', percent: 60, evidenceCount: 4 },
  { skillId: 's4', code: 'SYN-1-S04', nameHy: 'Երկար անվանում ունեցող հմտություն՝ սովորողի կատարած աշխատանքը համեմատելու համար', status: 'not_assessed', band: 'not_assessed', percent: null, evidenceCount: 0 },
];
const student = {
  id: 'student-a', displayName: 'Փորձնական աշակերտ', matrix: skills,
  weakSkills: skills.slice(1, 3), latestActivityAt: '2026-11-01', recentAccuracy: null,
};

async function classroom(t, { mobile = true, width = 375, institutionalTeacher = true } = {}) {
  const f = await fixture(browser, t, {
    archives: 0, mobile, viewport: { width, height: 1000 }, institutionalTeacher,
    analytics: { students: [student], studentCount: 1, skills },
    studentDetails: { student, matrix: skills, skills, recentAttempts: [], sessions: [] },
  });
  await f.page.locator('.hm-role-nav a[href$="view=classes"]').click();
  await f.page.locator('#classList .teacher-class-button').first().click();
  await expect(f.page.locator('#matrixAnalyticsCard')).toBeVisible();
  await f.page.evaluate(async () => {
    document.documentElement.style.fontSize = '200%';
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  return f;
}

async function counterContrast(page) {
  return page.locator('#institutionalStudentEmailCount').evaluate(node => {
    const rgb = value => {
      const values = value.match(/[\d.]+/g).map(Number);
      return [...values.slice(0, 3), values[3] ?? 1];
    };
    const composite = (front, back) => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      if (alpha === 0) return [0, 0, 0, 0];
      return [...front.slice(0, 3).map((v, i) => (v * front[3] + back[i] * back[3] * (1 - front[3])) / alpha), alpha];
    };
    let background = [0, 0, 0, 0];
    for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.backgroundImage !== 'none') throw Error('Contrast requires explicit gradient sampling');
      background = composite(background, rgb(style.backgroundColor));
      if (background[3] === 1) break;
    }
    background = composite(background, [255, 255, 255, 1]);
    const foreground = composite(rgb(getComputedStyle(node).color), background);
    const luminance = color => color.slice(0, 3).map(v => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(foreground), b = luminance(background);
    return { foreground, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
  });
}

test('skill names are available by touch at 375px and 200% text', async t => {
  const { page, errors } = await classroom(t);
  const summary = page.getByText('Հմտությունների անվանումները', { exact: true });
  await expect(summary).toBeVisible();
  await summary.tap();
  for (const skill of skills) await expect(page.getByText(skill.nameHy, { exact: true })).toBeVisible();
  assert.deepEqual(await wordBreaks(page, '#matrixSkillNames>summary,#matrixSkillNameList dd'), []);
  assert.deepEqual(errors, []);
});

test('invite counter meets ordinary-text contrast at 375px and 200% text', async t => {
  const { page, errors } = await classroom(t);
  const metrics = await counterContrast(page);
  t.diagnostic(JSON.stringify(metrics));
  assert.ok(metrics.ratio >= 4.5, 'Invite counter contrast: ' + metrics.ratio.toFixed(3) + ':1');
  assert.deepEqual(errors, []);
});

for (const institutionalTeacher of [true, false]) test((institutionalTeacher ? 'school' : 'retained personal') + ' teacher opens and closes the legend with a keyboard', async t => {
  const { page, errors } = await classroom(t, { mobile: false, width: 1280, institutionalTeacher });
  const summary = page.getByText('Հմտությունների անվանումները', { exact: true });
  await summary.focus();
  await page.keyboard.press('Enter');
  for (const skill of skills) await expect(page.getByText(skill.nameHy, { exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('#matrixWrap')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(summary).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByText(skills[0].nameHy, { exact: true })).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(page.getByText(skills[0].nameHy, { exact: true })).toBeVisible();
  const narrow = await page.locator('#matrixSkillNames').evaluate(node => ({
    ownWidth: node.scrollWidth <= node.clientWidth + 1,
    namesFit: [...node.querySelectorAll('dt,dd')].every(el => el.scrollWidth <= el.clientWidth + 1),
  }));
  assert.deepEqual(narrow, { ownWidth: true, namesFit: true });
  assert.deepEqual(errors, []);
});

test('counter contrast and error cue survive empty, full, over-limit and recovered input', async t => {
  const { page, errors } = await classroom(t);
  const colors = [];
  for (const count of [0, 20, 21, 1, 0]) {
    await page.locator('#institutionalStudentEmail').fill(Array.from({ length: count }, (_, i) => 'learner' + i + '@example.invalid').join('\n'));
    await expect(page.locator('#institutionalStudentEmailCount')).toHaveText(count + ' / 20');
    const metrics = await counterContrast(page);
    t.diagnostic(JSON.stringify({ count, ...metrics }));
    assert.ok(metrics.ratio >= 4.5);
    colors.push(metrics.foreground);
  }
  assert.deepEqual(colors[0], colors[1]);
  assert.notDeepEqual(colors[1], colors[2]);
  assert.deepEqual(colors[0], colors[3]);
  assert.deepEqual(colors[0], colors[4]);
  assert.deepEqual(errors, []);
});

test('legend opening and filtering preserve matrix classifications, support counts and reads', async t => {
  const { page, errors } = await classroom(t);
  const snapshot = () => page.locator('#matrixWrap td').evaluateAll(nodes => nodes.map(n => ({
    text: n.textContent, classes: n.className, color: getComputedStyle(n).color, background: getComputedStyle(n).backgroundColor,
  })));
  const before = await snapshot();
  const counts = await page.locator('.matrix-summary-card strong').allTextContents();
  const calls = await page.evaluate(() => window.__teacherFixture.calls);
  await page.getByText('Հմտությունների անվանումները', { exact: true }).tap();
  await page.locator('#matrixStudentFilter').selectOption('needs_support');
  for (const skill of skills) await expect(page.getByText(skill.nameHy, { exact: true })).toBeVisible();
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(await page.locator('.matrix-summary-card strong').allTextContents(), counts);
  await page.locator('#matrixStudentFilter').selectOption('required_review');
  await expect(page.locator('.matrix-empty-filter')).toBeVisible();
  for (const skill of skills) await expect(page.getByText(skill.nameHy, { exact: true })).toBeVisible();
  assert.deepEqual(await page.evaluate(() => window.__teacherFixture.calls), calls);
  assert.deepEqual(errors, []);
});

test('a new unit replaces the legend, escapes names and keeps long labels inside a phone', async t => {
  const { page, errors } = await classroom(t);
  await page.getByText('Հմտությունների անվանումները', { exact: true }).tap();
  const unusual = 'Նոր հմտություն <img src=x onerror="window.__unsafeName=true">';
  await page.evaluate(({ skills, student, unusual }) => {
    const next = skills.map((s, i) => ({ ...s, skillId: s.skillId + '-u2', code: 'SYN-2-S0' + (i + 1), nameHy: i ? 'Նոր բաժնի ' + s.nameHy : unusual }));
    window.__teacherFixture.analytics = { skills: next, studentCount: 1, students: [{ ...student, matrix: next }] };
  }, { skills, student, unusual });
  await page.locator('#teacherUnitFilter').selectOption({ index: 1 });
  await expect(page.locator('#matrixSkillNameList')).toContainText(unusual);
  const summary = page.getByText('Հմտությունների անվանումները', { exact: true });
  if (!(await page.locator('#matrixSkillNames').evaluate(el => el.open))) await summary.tap();
  await expect(page.getByText(unusual, { exact: true })).toBeVisible();
  await expect(page.locator('#matrixSkillNameList dt')).toHaveText(['S01', 'S02', 'S03', 'S04']);
  await expect(page.getByText(skills[0].nameHy, { exact: true })).toHaveCount(0);
  assert.equal(await page.evaluate(() => Boolean(window.__unsafeName)), false);
  await expect(page.locator('#matrixSkillNameList img')).toHaveCount(0);
  assert.equal(await page.locator('#matrixSkillNameList').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
  await expect(page.getByRole('columnheader', { name: 'S01 — ' + unusual, exact: true })).toBeVisible();
  assert.deepEqual(errors, []);
});

test('an empty replacement unit removes the old skill names', async t => {
  const { page, errors } = await classroom(t);
  await page.getByText('Հմտությունների անվանումները', { exact: true }).tap();
  await page.evaluate(() => { window.__teacherFixture.analytics = { skills: [], students: [], studentCount: 0 }; });
  await page.locator('#teacherUnitFilter').selectOption({ index: 1 });
  await expect(page.locator('#matrixSkillNames')).toBeHidden();
  await expect(page.locator('#matrixSkillNameList')).toBeEmpty();
  assert.deepEqual(errors, []);
});

test('sign-out clears the legend and a pending old unit cannot restore it', async t => {
  const { page, errors } = await classroom(t);
  await page.getByText('Հմտությունների անվանումները', { exact: true }).tap();
  await page.evaluate(() => { window.__teacherFixture.holds.push('class:a'); });
  await page.locator('#teacherUnitFilter').selectOption({ index: 1 });
  await page.evaluate(() => {
    window.__teacherFixture.listeners.forEach(fn => fn('SIGNED_OUT', null));
    window.__teacherFixture.release('class:a');
  });
  await expect(page.locator('#dashboardPanel')).toBeHidden();
  await expect(page.locator('#matrixSkillNameList')).toBeEmpty();
  await expect(page.locator('#matrixSkillNames')).toBeHidden();
  assert.deepEqual(errors, []);
});
