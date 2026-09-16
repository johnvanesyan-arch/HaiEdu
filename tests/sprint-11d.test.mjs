import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const backlog = readFileSync('docs/backlog.md', 'utf8');
const conceptual = readFileSync('supabase/migrations/0017_sprint_11d_conceptual_bank_expansion.sql', 'utf8');
const recovery = readFileSync('supabase/migrations/0024_sprint_11d_partial_state_recovery.sql', 'utf8');
const superseded = [
  'supabase/migrations/0020_sprint_11d_review_safe_bank_expansion.sql',
  'supabase/migrations/0021_sprint_11d_purpose_exclusive_pools.sql',
  'supabase/migrations/0022_sprint_11d_family_audit_corrections.sql',
  'supabase/migrations/0023_sprint_11d_authored_parallel_template_semantics.sql',
].map((path) => readFileSync(path, 'utf8'));

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test('11D keeps the 24-per-skill / 240-total acceptance target', () => {
  has(backlog, /24 effective, unique concrete variants per skill — 240 across the 10 skills/, '24/240 target must remain explicit');
  has(backlog, /12 Practice variants \+ 4 Diagnostic variants .* \+ 8 protected Mastery variants/, '12/4/8 capacity target must remain explicit');
});

test('the partially applied 0017 catalogue remains provisional', () => {
  has(conceptual, /provisional_no_sme_review/, '0017 content must remain provisional');
  has(conceptual, /this is not human SME validation/i, 'internal workflow must not be represented as SME validation');
});

test('production recovery forces every partial 11D candidate back to review-only', () => {
  has(recovery, /jsonb_set\(config, '\{pilot_ready\}', 'false'::jsonb, true\)/, 'recovery must clear pilot readiness');
  has(recovery, /review_status = 'needs_review'/, 'recovery must require review');
  has(recovery, /status = 'review'::public\.content_status/, 'recovery must remove candidates from published state');
  has(recovery, /validation_state = 'provisional_no_sme_review'/, 'SME status must remain provisional');
  has(recovery, /set enabled = false/, 'any accidental learner-pool membership must be disabled');
});

test('S01 recovery removes unsupported Sound classification and repairs protected candidates', () => {
  has(recovery, /option_key = 'F'/, 'recovery must explicitly remove the old Sound option');
  has(recovery, /PHY7-U01-S01-11D-M04/, 'M04 must be replaced');
  has(recovery, /PHY7-U01-S01-11D-M05/, 'M05 must be replaced');
  has(recovery, /PHY7-U01-S01-11D-M06/, 'M06 must be replaced');
  has(recovery, /variant_fingerprint = md5\(/, 'fingerprints must be recomputed after prompt/answer/option correction');
  has(recovery, /jsonb_build_object\('optionKey',o\.option_key,'contentHy',o\.content_hy\)/, 'fingerprint must include corrected option semantics');
});

test('authored parallel catalogues are not misrepresented as deterministic generators', () => {
  has(recovery, /template_kind = 'fixed'/, 'authored catalogues must use fixed template semantics');
  has(recovery, /'generationMode','authored_parallel_catalog'/, 'authored catalogue generation mode must be explicit');
  has(recovery, /'deterministicRerender',false/, 'authored catalogues must not be rerendered as deterministic generators');
});

test('recovery preserves audit history and records that final review is still required', () => {
  has(recovery, /'changes_requested'/, 'recovery must supersede premature approval with an auditable review event');
  has(recovery, /Final human content review and SME validation are still pending/, 'remaining review gate must be explicit');
});

test('unsafe 0020-0023 finalization drafts are no-op placeholders', () => {
  for (const text of superseded) {
    has(text, /SUPERSEDED BEFORE PRODUCTION APPLICATION/, 'superseded migration must be unmistakably marked');
    has(text, /select 1;/, 'superseded migration must be a no-op');
  }
});

test('recovery has hard assertions for review state, pool isolation and S01 scope', () => {
  has(recovery, /11D_recovery_review_state_failed/, 'review-state assertion must exist');
  has(recovery, /11D_recovery_pool_isolation_failed/, 'pool-isolation assertion must exist');
  has(recovery, /11D_recovery_sound_option_still_present/, 'Sound-option assertion must exist');
  has(recovery, /11D_recovery_sound_prompt_still_present/, 'Sound-prompt assertion must exist');
  has(recovery, /11D_recovery_template_semantics_failed/, 'template-semantics assertion must exist');
});
