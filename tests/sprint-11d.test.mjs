import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const conceptual = readFileSync('supabase/migrations/0017_sprint_11d_conceptual_bank_expansion.sql', 'utf8');
const corrected = readFileSync('supabase/migrations/0019_sprint_11d_numeric_pool_rebuild_v2.sql', 'utf8');

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test('11D fixes a 24-variant per-skill purpose-exclusive target', () => {
  has(corrected, /r\.practice<>12\s+or\s+r\.diagnostic<>4\s+or\s+r\.mastery<>8/, 'pool acceptance target must be 12/4/8');
  has(corrected, /11D_cross_pool_overlap/, 'cross-purpose overlap must be a hard failure');
  has(corrected, /11D_unspecified_family_in_eligible_bank/, 'eligible items cannot retain unspecified family metadata');
});

test('11D keeps Mastery protected from Practice/Diagnostic by pool membership', () => {
  has(corrected, /PHY7-U01-MASTERY-PROTECTED-A/, 'protected Mastery pool must remain explicit');
  has(corrected, /purpose-exclusive pools/i, 'pool rebuild must be purpose-exclusive');
  has(corrected, /role','mastery_anchor','protected',true/, 'legacy Mastery anchors must remain protected');
});

test('11D creates versioned non-overlapping Diagnostic forms', () => {
  has(corrected, /form_version=2/, 'Diagnostic v2 must be explicit');
  has(corrected, /11D_diag_A_not_20/, 'Form A must contain 20 items');
  has(corrected, /11D_diag_B_not_20/, 'Form B must contain 20 items');
  has(corrected, /11D_diagnostic_form_overlap/, 'A/B overlap must fail the migration');
});

test('11D expands conceptual skills with parallel variants and preserves provisional SME status', () => {
  for (const skill of ['S01','S02','S03','S04','S05','S06','S09']) {
    assert.ok(conceptual.includes(`PHY7-U01-${skill}`), `${skill} must have 11D parallel content`);
  }
  has(conceptual, /provisional_no_sme_review/, 'new content must retain provisional SME status');
  has(conceptual, /this is not human SME validation/i, 'internal review must not be represented as SME validation');
});

test('11D uses deterministic generation for numerical constructs and handles finite S09 capacity explicitly', () => {
  has(corrected, /PHY7-U01-S07',18/, 'S07 must receive 18 new deterministic variants');
  has(corrected, /PHY7-U01-S08',18/, 'S08 must receive 18 new deterministic variants');
  has(corrected, /PHY7-U01-S09',10/, 'S09 finite numerical generator capacity must be explicit');
  has(corrected, /PHY7-U01-S10',18/, 'S10 must receive 18 new deterministic variants');
  has(corrected, /PHY7-U01-S09-11D-D03/, 'S09 needs a reviewed diagnostic supplement');
  has(corrected, /PHY7-U01-S09-11D-D04/, 'S09 needs a second reviewed diagnostic supplement');
});

test('11D enforces structural QA before assessment eligibility', () => {
  has(corrected, /11D_structural_item_gate_failed/, 'structural gate must be present');
  has(corrected, /11D_single_choice_gate_failed/, 'single-choice answer/option validation must be present');
  has(corrected, /11D_numeric_tolerance_gate_failed/, 'numeric tolerance validation must be present');
});
