import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const conceptual = readFileSync('supabase/migrations/0017_sprint_11d_conceptual_bank_expansion.sql', 'utf8');
const bank = readFileSync('supabase/migrations/0020_sprint_11d_review_safe_bank_expansion.sql', 'utf8');
const pools = readFileSync('supabase/migrations/0021_sprint_11d_purpose_exclusive_pools.sql', 'utf8');

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test('11D fixes a 24-variant per-skill purpose-exclusive target', () => {
  has(pools, /12 Practice \+ 4 Diagnostic \+ 8 protected Mastery = 24/, 'target must be documented as 12/4/8');
  has(pools, /r\.practice<>12\s+or\s+r\.diagnostic<>4\s+or\s+r\.mastery<>8/, 'pool acceptance target must be 12/4/8');
  has(pools, /11D_cross_pool_overlap/, 'cross-purpose overlap must be a hard failure');
  has(bank, /new_bucketed_count<>18/, 'each skill must add 18 reviewed variants to six fixed anchors');
});

test('11D keeps Mastery protected and purpose-exclusive', () => {
  has(pools, /PHY7-U01-MASTERY-PROTECTED-A/, 'protected Mastery pool must remain explicit');
  has(pools, /purposeExclusive',true/, 'pools must advertise purpose exclusivity');
  has(pools, /chapter1_item_already_enabled_in_other_purpose_pool/, 'database trigger must reject cross-purpose reuse');
  has(pools, /chapter1_mastery_pool_must_be_protected/, 'Mastery pool must be protected');
});

test('11D creates versioned non-overlapping Diagnostic forms', () => {
  has(pools, /form_version=2/, 'Diagnostic v2 must be explicit');
  has(pools, /11D_diag_A_not_20/, 'Form A must contain 20 items');
  has(pools, /11D_diag_B_not_20/, 'Form B must contain 20 items');
  has(pools, /11D_diagnostic_form_overlap/, 'A/B overlap must fail the migration');
  has(pools, /11D_diagnostic_skill_distribution_invalid/, 'each form must contain two items per skill');
});

test('11D expands conceptual skills and preserves provisional SME status', () => {
  for (const skill of ['S01','S02','S03','S04','S05','S06','S09']) {
    assert.ok(conceptual.includes(`PHY7-U01-${skill}`), `${skill} must have 11D parallel content`);
  }
  has(conceptual, /provisional_no_sme_review/, 'new content must retain provisional SME status');
  has(bank, /not independent human Physics SME validation/i, 'internal workflow approval must not be represented as SME validation');
});

test('11D corrects S01 source scope before pool eligibility', () => {
  has(bank, /sourceScopeCorrection','11D_textbook_architecture_alignment/, 'S01 proof catalogue must be source-scope corrected');
  assert.equal(/Ձայնային/.test(bank), false, 'review-safe final migration must not introduce the unsupported sound category');
});

test('11D uses deterministic generation and handles finite S09 capacity explicitly', () => {
  has(bank, /PHY7-U01-S07',18/, 'S07 must receive 18 deterministic variants');
  has(bank, /PHY7-U01-S08',18/, 'S08 must receive 18 deterministic variants');
  has(bank, /PHY7-U01-S09',10/, 'S09 numerical generator capacity must be explicit');
  has(bank, /PHY7-U01-S10',18/, 'S10 must receive 18 deterministic variants');
  has(bank, /PHY7-U01-S09-11D-D03/, 'S09 needs a reviewed Diagnostic supplement');
  has(bank, /PHY7-U01-S09-11D-D04/, 'S09 needs a second reviewed Diagnostic supplement');
});

test('11D is safe with the existing revision triggers', () => {
  has(bank, /mutates\s+content first[\s\S]*records QA\/review evidence second[\s\S]*only then publishes\/approves/i, 'review-safe ordering must be documented');
  has(bank, /set review_status='approved',status='published'/, 'final approval must happen after assessable edits');
});

test('11D audits misconception coverage and structural QA', () => {
  has(bank, /item_misconception_mappings/, 'new variants need misconception mapping');
  has(bank, /11D_review_gate_failed/, 'review gate must be present');
  has(bank, /11D_single_choice_gate_failed/, 'single-choice answer/option validation must be present');
  has(bank, /11D_numeric_tolerance_gate_failed/, 'numeric tolerance validation must be present');
  has(pools, /11D_ineligible_pool_members/, 'pool members must pass the eligibility gate');
});
