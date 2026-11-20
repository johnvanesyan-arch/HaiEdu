// Chapter I decision I-2, option A — student pages (plan revision 3, §4). SOURCE-LEVEL checks:
// every place that shows the rule, readiness text, counts or the latest score reads the server's
// versioned rule or saved result record, and keeps today's wording when the server sends none.
// The pages are not rendered here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const TODAY_READY = 'Բոլոր ընթացիկ հմտությունները պատրաստ են անկախ ստուգման։';

test('mastery page: rule text, saved pass score and S07 shown without a pass/fail tone', () => {
  const js = read('web/mastery.js'), html = read('web/mastery.html');
  assert.match(html, /<span id="masteryRuleText" data-testid="mastery-rule-text">≥80% ընդհանուր և առնվազն 1\/2 յուրաքանչյուր հմտությունից<\/span>/);
  assert.match(js, /if \(s\.rule\?\.textsHy\?\.rule\) \$\("masteryRuleText"\)\.textContent = s\.rule\.textsHy\.rule;/);
  assert.match(js, /\$\{s\.rule\?\.textsHy\?\.rule \?\? "Անցողիկ կանոնը փորձնական է՝ առնվազն 80% ընդհանուր/);
  assert.match(js, /const score = savedScore\(result\.assessmentResult, result\.score\);/);
  assert.match(js, /\$\("resultRule"\)\.textContent = result\.ruleTextsHy\?\.rule \?\? "Փորձնական անցողիկ կանոն/);
  assert.match(js, /const score = savedScore\(check\.assessmentResult, \{ correct: check\.correct, answered: check\.answered, percent: check\.percent \?\? 0 \}\);/);
  assert.match(js, /renderSkillResults\(result\.skillResults \?\? \[\], result\.assessmentResult\)/);
  assert.match(js, /renderSkillResults\(check\.skillResults \?\? \[\], check\.assessmentResult\)/);
  assert.match(js, /const tone = scored && !scored\.has\(r\.skillId\) \? "neutral" : passed \? "success" : "danger";/);
  assert.match(js, /\$\("resultSkills"\)\.innerHTML = groupsMarkup\(record\) \+/);
});

test('assessment page: rule item, ready text and latest score follow the server', () => {
  const js = read('web/assessment.js'), html = read('web/assessment.html');
  assert.match(html, /<li id="masteryRuleItem" data-testid="mastery-rule-text">Փորձնական անցողիկ կանոն՝/);
  assert.match(js, /if \(rule\) \$\("masteryRuleItem"\)\.textContent = rule\.rule;/);
  assert.ok(js.includes(`rule?.ready ?? "${TODAY_READY}"`));
  assert.match(js, /const latestScore = latest\?\.assessmentResult\?\.score \?\?/);
  // The locked text is the server's message (I-2: «Ստուգումը բացելու համար նախ ամրապնդեք պահանջվող հմտությունները։»).
  assert.match(js, /\$\("masterySummary"\)\.textContent = mastery\?\.messageHy \?\? "Ամրապնդեք բոլոր հմտությունները՝ ստուգումը բացելու համար։";/);
});

test('topics, progress and practice pages count the required skills; S07 is noted on the topics page', () => {
  for (const file of ['web/physics-7.js', 'web/progress.js', 'web/app.js']) {
    const js = read(file);
    assert.match(js, /const progress = allSkills\.requiredTotal\s+\? \{ completedSkills: allSkills\.requiredCompleted, totalSkills: allSkills\.requiredTotal,/, file);
    assert.match(js, /: allSkills;/, file);
  }
  const topics = read('web/physics-7.js');
  assert.match(topics, /\$\{skill\.requiredForReadiness === false \? '<small class="student-skill-note">Չի սահմանափակում ստուգարքի հասանելիությունը<\/small>' : ""\}/);
  assert.match(topics, /masteryStatus\.rule\?\.textsHy\?\.ready \?\? "Բոլոր հմտությունները պատրաստ են անկախ ստուգման։"/);
  assert.match(topics, /masteryStatus\.latestCheck\?\.assessmentResult\?\.score\?\.percent \?\? masteryStatus\.latestCheck\?\.percent/);
  const progress = read('web/progress.js');
  assert.equal((progress.match(/masteryStatus\.rule\?\.textsHy\?\.ready \?\?/g) ?? []).length, 2, 'both ready texts on Progress');
  assert.match(progress, /const savedScore = latestCheck\?\.assessmentResult\?\.score;/);
});

test('today\'s Home and Course already honour requiredForReadiness from the dashboard', () => {
  const home = read('web/student-home-model.mjs'), course = read('web/course-page.js');
  assert.match(home, /const required = \(data\.skills \|\| \[\]\)\.filter\(skill => skill\.requiredForReadiness !== false\);/);
  assert.match(course, /s\.requiredForReadiness === false \? '<small class="student-skill-note">Չի սահմանափակում ստուգարքի հասանելիությունը<\/small>'/);
  assert.match(course, /data\.skills\.filter\(s => s\.requiredForReadiness !== false\)\.every\(s => s\.ready === true\)/);
});
