// School teacher roster, panel and Skills tab (plan revision 2, 21 November 2026): pure helpers and
// result rendering. Presentation of the server's saved results and classifications only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  supportEvidence, supportFlag, answeredBeforeCheck, skillCardOrder, schoolNextStep, activeWorkProgress,
  recentAccuracySummary, schoolSkillCardsMarkup, skillAttentionBand, workKindLabel,
} from '../web/teacher-skill-evidence.mjs';
import { schoolCheckResultMarkup, schoolAttemptMarkup, matchedCheckCounts, assessmentResultMarkup } from '../web/assessment-reporting.mjs';

const contract = (mode, extra = {}) => ({ mode, releaseId: 'r1', unitId: 'u1', blueprintId: 'b1', policyBindingId: null, modelId: 'm1',
  academicPolicyId: 'a1', runtimeBuildId: 'x1', provenanceStatus: 'exact', modelProvenanceStatus: 'exact', runtimeProvenanceStatus: 'exact', ...extra });
const est = (band, mode, lastAttemptAt, extra = {}) => ({ status: band, band, percent: band === 'needs_support' ? 30 : band === 'developing' ? 55 : 90,
  evidenceCount: 4, sessionCount: 1, lastAttemptAt, contract: contract(mode), ...extra });
const row = (skillId, estimates, extra = {}) => ({ skillId, code: `U-${skillId}`, nameHy: `Հմտություն ${skillId}`, evidenceCount: 4,
  status: estimates.length > 1 ? 'mixed_contracts' : estimates[0]?.status ?? 'not_assessed', band: estimates.length === 1 ? estimates[0].band : 'not_assessed', estimates, ...extra });
const textOf = html => html.replace(/<[^>]+>/g, '\n').split('\n').map(s => s.trim()).filter(Boolean);

test('support flag: classified needs_support only; newest full timestamp first, then curriculum order', () => {
  const student = { matrix: [
    row('S01', [est('needs_support', 'practice', '2026-11-14T08:00:00Z')]),
    row('S02', [est('insufficient_evidence', 'practice', '2026-11-20T08:00:00Z', { band: 'not_assessed', percent: 20 })]),
    row('S03', [est('provenance_unavailable', 'practice', '2026-11-20T09:00:00Z', { band: 'not_assessed', percent: null })]),
    row('S07', [est('needs_support', 'practice', '2026-11-14T09:30:00Z'), est('needs_support', 'mastery_check', '2026-11-12T10:00:00Z')]),
  ] };
  const evidence = supportEvidence(student);
  assert.deepEqual(evidence.map(e => [e.row.skillId, e.kind]), [['S07', 'Վարժություն'], ['S01', 'Վարժություն'], ['S07', 'Յուրացման ստուգում']],
    'same day: 09:30 beats 08:00; sparse and unavailable never count');
  const flag = supportFlag(student);
  assert.equal(flag.row.skillId, 'S07');
  assert.equal(flag.moreSkills, 1, 'two S07 estimates are one skill; S01 is the only other skill');
  assert.equal(supportFlag({ matrix: [row('S01', [est('developing', 'practice', '2026-11-14')])] }), null);
  // Ties fall back to curriculum order; invalid dates sort last.
  const tie = supportEvidence({ matrix: [row('S05', [est('needs_support', 'practice', 'not-a-date')]), row('S02', [est('needs_support', 'practice', '2026-11-01T00:00:00Z')]), row('S03', [est('needs_support', 'practice', '2026-11-01T00:00:00Z')])] });
  assert.deepEqual(tie.map(e => e.row.skillId), ['S02', 'S03', 'S05']);
});

test('support count semantics are today’s: a student counts when any classified estimate needs support', () => {
  const rows = [row('S01', [est('secure', 'practice', 'x'), est('needs_support', 'mastery_check', 'x')]), row('S02', [est('insufficient_evidence', 'practice', 'x', { band: 'not_assessed' })])];
  assert.equal(skillAttentionBand(rows[0]), 'needs_support');
  assert.equal(skillAttentionBand(rows[1]), null);
  assert.equal(supportEvidence({ matrix: rows }).length > 0, rows.some(r => skillAttentionBand(r) === 'needs_support'));
});

test('«before the check» needs two valid timestamps and a strictly earlier answer', () => {
  const check = { completedAt: '2026-11-12T10:00:00Z' };
  assert.equal(answeredBeforeCheck('2026-11-12T09:59:59Z', check), true);
  assert.equal(answeredBeforeCheck('2026-11-12T10:00:00Z', check), false);
  assert.equal(answeredBeforeCheck('2026-11-12T18:00:00Z', check), false, 'same day, later time');
  assert.equal(answeredBeforeCheck(null, check), false);
  assert.equal(answeredBeforeCheck('bad', check), false);
  assert.equal(answeredBeforeCheck('2026-11-01T00:00:00Z', { completedAt: null }), false);
  assert.equal(answeredBeforeCheck('2026-11-01T00:00:00Z', null), false);
});

test('evidence: estimates stay separate; a shared blueprint and model with another runtime build is not merged', () => {
  const a = est('needs_support', 'practice', '2026-11-10T00:00:00Z'), b = est('secure', 'practice', '2026-11-11T00:00:00Z', { contract: contract('practice', { runtimeBuildId: 'x2' }) });
  const html = schoolSkillCardsMarkup([row('S01', [a, b])]);
  assert.match(html, /Վարժություն՝ Առանձին արդյունքներ · 2/);
  assert.equal((html.match(/class="skill-estimate /g) || []).length, 2, 'both estimates rendered');
  assert.equal((html.match(/evidence-technical-details/g) || []).length, 2, 'each estimate keeps its own contract');
  const single = schoolSkillCardsMarkup([row('S02', [est('developing', 'practice', '2026-11-10T00:00:00Z')])]);
  assert.doesNotMatch(single, /Առանձին արդյունքներ/);
  assert.match(single, /Վարժություն՝ Զարգացող · 55%/);
});

test('skill cards: red, then yellow, then the rest, curriculum order within each; neutral states stay neutral', () => {
  const rows = [row('S01', [est('secure', 'practice', 'x')]), row('S02', [est('developing', 'practice', 'x')]), row('S03', [est('needs_support', 'practice', 'x')]),
    row('S04', [], { evidenceCount: 0, status: 'not_assessed' }), row('S05', [est('needs_support', 'mastery_check', 'x')])];
  assert.deepEqual(skillCardOrder(rows).map(r => r.skillId), ['S03', 'S05', 'S02', 'S01', 'S04']);
  const html = schoolSkillCardsMarkup(rows);
  assert.match(html, /data-skill-evidence="S04"[\s\S]*?Տվյալ դեռ չկա/);
  assert.equal((html.match(/data-testid="school-skill-card"/g) || []).length, 5);
  assert.match(html, /data-testid="school-skill-code">U-S03<\/p>/);
  assert.doesNotMatch(html.match(/<summary>[\s\S]*?<\/summary>/)[0], /U-S03/, 'the summary keeps the skill name; its code is inside the card');
  const escaped = schoolSkillCardsMarkup([row('S01', [], { code: '<script>code</script>' })]);
  assert.match(escaped, /&lt;script&gt;code&lt;\/script&gt;/);
});

test('next step: two approved school-only texts; every other action keeps the server text', () => {
  assert.equal(schoolNextStep({ action: 'mastery_check_retry', messageHy: 'server' }), 'Այս դասարանում ավարտվել է գլխի պարտադիր կրկնություն։');
  assert.equal(schoolNextStep({ action: 'review_chapter', messageHy: 'server' }), 'Առաջարկվում է կրկնել գլուխը։');
  for (const action of ['unit_complete', 'required_chapter_review', 'practice_skill', 'take_diagnostic', 'monitor', 'finish_active_session'])
    assert.equal(schoolNextStep({ action, messageHy: `server ${action}` }), `server ${action}`);
  assert.equal(schoolNextStep(null), null);
  assert.equal(activeWorkProgress({ mode: 'practice', answered_count: 3, planned_item_count: 8 }), 'Վարժությունն ընթացքի մեջ է · պատասխանել է 8 հարցից 3-ին');
  assert.equal(activeWorkProgress({ mode: 'chapter_review', answered_count: 5, planned_item_count: 12 }), 'Գլխի կրկնությունն ընթացքի մեջ է · պատասխանել է 12 հարցից 5-ին');
  assert.equal(activeWorkProgress({ mode: 'mastery_check', answered_count: 5, planned_item_count: 20 }), null, 'no approved text; no running correctness');
});

test('recent accuracy: from the same returned sample; kind and count from the sample; 0% shown; hidden otherwise', () => {
  const sample = n => Array.from({ length: n }, () => ({ contract: contract('chapter_review') }));
  assert.deepEqual(recentAccuracySummary({ recentAccuracy: 0, recentAttempts: sample(14) }), { percent: 0, kind: 'Գլխի կրկնություն', count: 14 });
  assert.equal(recentAccuracySummary({ recentAccuracy: null, recentAttempts: sample(5) }), null);
  assert.equal(recentAccuracySummary({ recentAccuracy: 80, recentAttempts: [] }), null);
  assert.equal(recentAccuracySummary({ recentAccuracy: 80, recentAttempts: [...sample(2), { contract: contract('practice') }] }), null, 'mixed contracts');
  assert.equal(workKindLabel({ contract: { mode: 'diagnostic' } }), 'Ախտորոշիչ');
});

const v2 = (groups, score, passed = true) => ({ schemaVersion: 'haiedu-assessment-result-v2', passed, score, groups });
const g = (label, correct, answered, determinesPass) => ({ key: label, label, correct, answered, percent: answered ? Math.round(100 * correct / answered) : null, determinesPass });

test('school check result: older check counts only from one matching session; otherwise percentage only', () => {
  const check = { result: 'passed', percent: 90, completedAt: '2026-11-09T10:00:00Z', assessmentResult: null };
  const s = (completedAt, correct = 18, answered = 20) => ({ mode: 'mastery_check', status: 'completed', completedAt, correct, answered });
  assert.match(schoolCheckResultMarkup(check, [s('2026-11-09T10:00:00Z')]), /18 \/ 20 · 90%/);
  assert.deepEqual(matchedCheckCounts(check, [s('2026-11-01T00:00:00Z'), s('2026-11-02T00:00:00Z')]), null, 'no blind first check');
  const unmatched = schoolCheckResultMarkup(check, [s('2026-11-01T00:00:00Z')]);
  assert.match(unmatched, />90%</); assert.doesNotMatch(unmatched, /\/ 20/);
  const ambiguous = schoolCheckResultMarkup(check, [s('2026-11-09T10:00:00Z'), s('2026-11-09T10:00:00Z', 17)]);
  assert.match(ambiguous, />90%</); assert.doesNotMatch(ambiguous, /\/ 20/);
  // A failed check at 80% stays failed: status comes from the saved result, never from the percentage.
  const failed = schoolCheckResultMarkup({ result: 'failed', percent: 80, completedAt: '2026-11-05T10:00:00Z' }, [s('2026-11-05T10:00:00Z', 16, 20)]);
  assert.match(failed, /Չի անցել/); assert.match(failed, /16 \/ 20 · 80%/); assert.doesNotMatch(failed, /Անցած է/);
  assert.match(schoolCheckResultMarkup(null), /Այս դասարանում ստուգման արդյունք դեռ չի գրանցվել։/);
});

test('school check result: single scored group equal to the score is shown once, with its label', () => {
  const record = v2([g('Պարտադիր և օժանդակ հմտություններ', 15, 18, true), g('Լրացուցիչ վերջնարդյունք', 0, 2, false)], { correct: 15, answered: 18, percent: 83 });
  const html = schoolCheckResultMarkup({ result: 'passed', percent: 75, completedAt: '2026-11-12T10:00:00Z', assessmentResult: record });
  const lines = textOf(html);
  assert.equal(lines.filter(l => /15\/18 · 83%|15 \/ 18 · 83%/.test(l)).length, 1);
  assert.ok(lines.includes('Պարտադիր և օժանդակ հմտություններ՝ 15/18 · 83% · հաշվի է առնվում ստուգարքը հանձնելիս'));
  assert.ok(lines.includes('Լրացուցիչ վերջնարդյունք՝ 0/2 · 0%'), '0/2 is an assessed zero');
  assert.doesNotMatch(html, /75%|15 \/ 20/, 'raw whole-check figures never replace the saved result');
});

test('school check result: several scored groups show the saved combined score once, then every group', () => {
  const record = v2([g('Պարտադիր վերջնարդյունքներ', 8, 10, true), g('Օժանդակ հմտություններ', 2, 2, true), g('Լրացուցիչ վերջնարդյունքներ', 0, 0, false)], { correct: 10, answered: 12, percent: 83 });
  const lines = textOf(schoolCheckResultMarkup({ result: 'passed', percent: 69, completedAt: '2026-11-13T10:00:00Z', assessmentResult: record }));
  assert.equal(lines.filter(l => l === '10 / 12 · 83%').length, 1);
  assert.ok(lines.includes('Պարտադիր վերջնարդյունքներ՝ 8/10 · 80% · հաշվի է առնվում ստուգարքը հանձնելիս'));
  assert.ok(lines.includes('Օժանդակ հմտություններ՝ 2/2 · 100% · հաշվի է առնվում ստուգարքը հանձնելիս'));
  assert.ok(lines.includes('Լրացուցիչ վերջնարդյունքներ՝ Չի գնահատվել'), '0/0 is unassessed');
});

test('school check result: v3 points, malformed records and label escaping', () => {
  const points = { schemaVersion: 'haiedu-assessment-result-v3', passed: false, score: { earned: 7.5, possible: 10, percent: 75 },
    groups: [{ key: 'm', label: 'Գնահատվող <i>', earned: 7.5, possible: 10, percent: 75, determinesPass: true }, { key: 'a', label: 'Լրացուցիչ', earned: 1, possible: 2, percent: 50, determinesPass: false }] };
  const html = schoolCheckResultMarkup({ result: 'failed', percent: 75, completedAt: '2026-11-13T10:00:00Z', assessmentResult: points });
  assert.match(html, /Չի անցել/); assert.match(html, /Գնահատվող &lt;i&gt;՝ 7\.5\/10 միավոր/); assert.match(html, /Լրացուցիչ՝ 1\/2 միավոր/);
  assert.doesNotMatch(html, /<i>/);
  for (const bad of [{ schemaVersion: 'haiedu-assessment-result-v9', passed: true, score: { correct: 1, answered: 1 }, groups: [] },
    v2([g('x', 1, 2, true)], { correct: 3, answered: 2 }), { schemaVersion: 'haiedu-assessment-result-v2', score: { correct: 1, answered: 2 }, groups: [] }]) {
    const out = schoolCheckResultMarkup({ result: 'passed', percent: 75, completedAt: '2026-11-13T10:00:00Z', assessmentResult: bad });
    assert.match(out, /Տվյալը հասանելի չէ/); assert.doesNotMatch(out, /75%/, 'no fallback to the raw percentage');
  }
});

test('history attempt lines carry each attempt’s own saved score', () => {
  assert.deepEqual(textOf(schoolAttemptMarkup({ assessmentResult: 'failed', correct: 16, answered: 20, scorePercent: 80, reporting: null })), ['Ստուգարքը չի անցել · 16 / 20 · 80%']);
  const record = v2([g('Պարտադիր և օժանդակ հմտություններ', 15, 18, true), g('Լրացուցիչ վերջնարդյունք', 0, 2, false)], { correct: 15, answered: 18, percent: 83 });
  assert.deepEqual(textOf(schoolAttemptMarkup({ assessmentResult: 'passed', correct: 15, answered: 20, scorePercent: 75, reporting: record })),
    ['Ստուգարքն անցած է · 15 / 18 · 83%', 'Լրացուցիչ վերջնարդյունք՝ 0/2 · 0%']);
});

test('the student and personal displays are unchanged by the school renderer', () => {
  const record = v2([g('Պարտադիր', 8, 10, true)], { correct: 8, answered: 10, percent: 80 });
  assert.match(assessmentResultMarkup(record, { includeScope: false }), /Ստուգարքն անցած է · 8\/10 · 80%/);
});
