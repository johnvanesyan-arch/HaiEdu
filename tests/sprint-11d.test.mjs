import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const backlog = readFileSync('docs/backlog.md', 'utf8');
const recovery = readFileSync('supabase/migrations/0024_sprint_11d_partial_state_recovery.sql', 'utf8');
const fixedAudit = readFileSync('supabase/migrations/0025_sprint_11d_fixed_audit_and_candidate_gate.sql', 'utf8');
const bank = readFileSync('supabase/migrations/0026_sprint_11d_complete_candidate_bank.sql', 'utf8');
const staging = readFileSync('supabase/migrations/0027_sprint_11d_stage_candidate_pools_forms.sql', 'utf8');
const seedHardening = readFileSync('supabase/migrations/0028_sprint_11d_seed_index_search_path.sql', 'utf8');

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test('11D keeps the 24-per-skill / 240-total target', () => {
  has(backlog, /24 effective, unique concrete variants per skill — 240 across the 10 skills/, '24/240 target must remain explicit');
  has(backlog, /12 Practice variants \+ 4 Diagnostic variants .* \+ 8 protected Mastery variants/, '12/4/8 target must remain explicit');
});

test('recovery keeps premature 11D content out of learner-facing pools', () => {
  has(recovery, /pilot_ready.*false/s, 'recovery must clear pilot readiness');
  has(recovery, /set enabled = false/, 'recovery must disable accidental memberships');
  has(recovery, /provisional_no_sme_review/, 'SME status must remain provisional');
});

test('fixed-bank audit removes unspecified families without claiming SME validation', () => {
  has(fixedAudit, /sprint11dFixedAudit/, 'fixed audit metadata must be recorded');
  has(fixedAudit, /when s\.code='PHY7-U01-S10' then 'transfer'/, 'S10 fixed anchors must receive defensible family metadata');
  has(fixedAudit, /This is not independent Physics SME validation/, 'internal audit must not be represented as SME review');
  has(fixedAudit, /11D_fixed_anchor_total_not_60/, 'all 60 fixed anchors must be asserted');
});

test('new 11D candidates require technical QA plus real human content review before activation', () => {
  has(fixedAudit, /humanReviewStatus','pending'/, 'human review must begin pending');
  has(fixedAudit, /humanReviewStatus' is distinct from 'approved'/, 'activation guard must require human approval');
  has(fixedAudit, /11D_candidate_activation_gate_not_satisfied/, 'activation must fail closed');
  has(fixedAudit, /11D_mastery_candidate_requires_protected_pool/, 'Mastery candidates must require the protected pool');
});

test('candidate-bank completion creates exactly 18 new variants per skill with 8/4/6 purpose staging', () => {
  has(bank, /'PHY7-U01-S07',18/, 'S07 must receive 18 deterministic candidates');
  has(bank, /'PHY7-U01-S08',18/, 'S08 must receive 18 deterministic candidates');
  has(bank, /'PHY7-U01-S09',10/, 'S09 deterministic capacity must remain explicit');
  has(bank, /'PHY7-U01-S10',18/, 'S10 must receive 18 deterministic candidates');
  has(bank, /PHY7-U01-S09-11D-P08/, 'S09 must receive an authored Practice supplement');
  has(bank, /PHY7-U01-S09-11D-D04/, 'S09 must receive an authored Diagnostic supplement');
  has(bank, /11D_candidate_total_not_180/, 'new candidate total must be exactly 180');
  has(bank, /r\.practice<>8 or r\.diagnostic<>4 or r\.mastery<>6/, 'new per-skill allocation must be 8/4/6');
});

test('deterministic candidate generation fails loudly and reproduces stored evidence', () => {
  assert.equal(/exception when others/i.test(bank), false, 'unexpected generator errors must not be swallowed');
  has(bank, /service_preview_item_variant/, 'candidate generation must preview deterministically');
  has(bank, /service_materialize_item_variant/, 'candidate generation must use server-side materialisation');
  has(bank, /deterministic_reproduction_mismatch/, 'reproduction mismatch must fail QA');
  has(bank, /candidate_duplicate_fingerprint/, 'duplicate effective variants must be rejected');
});

test('candidate pools and Diagnostic v2 are staged, not activated', () => {
  has(staging, /select p\.id,i\.id,false/, 'new pool memberships must be disabled');
  has(staging, /form_version,2,'draft'/, 'Diagnostic v2 must remain draft');
  has(staging, /human_content_review_required/, 'staging must preserve the human-review gate');
  has(staging, /11D_baseline_pool_changed/, 'current production pools must be protected by assertions');
  has(staging, /11D_draft_diag_A_not_20/, 'Diagnostic A candidate form must contain 20 items');
  has(staging, /11D_draft_diag_B_not_20/, 'Diagnostic B candidate form must contain 20 items');
  has(staging, /11D_draft_diagnostic_overlap/, 'candidate Diagnostic forms must not overlap exactly');
});

test('draft-form membership validation is relaxed only for explicitly staged 11D candidates', () => {
  has(staging, /v_form_status='draft'/, 'draft form path must be explicit');
  has(staging, /api\.metadata->>'phase'='11D'/, 'draft exception must be scoped to 11D staging');
  has(staging, /api\.enabled=true/, 'active/non-draft forms must still require enabled membership');
});

test('post-DDL security hardening pins deterministic seed helper search_path', () => {
  has(seedHardening, /set search_path=pg_catalog,private/, 'seed helper must use a fixed search_path');
});
