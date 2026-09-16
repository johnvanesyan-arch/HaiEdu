# Sprint 11D — Grade 7 Physics Chapter I bank expansion and content QA

## Status

**Technical candidate-bank construction is complete in production. Human content review remains the final 11D activation gate.**

The live database now contains the full structural Chapter I target:

- **60 fixed anchors** — 6 per skill;
- **180 new Sprint 11D candidates** — 18 per skill;
- **240 structural variants total** — exactly 24 per skill;
- intended final allocation per skill: **12 Practice + 4 Diagnostic + 8 protected Mastery**.

The 180 new variants are deliberately **not pilot-ready yet**. All remain:

- `status='review'`;
- `review_status='needs_review'`;
- `technicalQaStatus='passed'`;
- `humanReviewStatus='pending'`;
- `pilot_ready=false`;
- `validation_state='provisional_no_sme_review'`.

No new 11D candidate is enabled in a learner-facing pool. The currently active production pools remain the known-safe 11A/11B baseline: **40 Practice, 40 Diagnostic, 20 protected Mastery**.

## Numeric contract

The final intended Chapter I allocation is:

| Source | Practice | Diagnostic | Mastery | Total |
|---|---:|---:|---:|---:|
| Existing fixed anchors | 4 | 0 | 2 | 6 |
| New 11D variants | 8 | 4 | 6 | 18 |
| **Per skill** | **12** | **4** | **8** | **24** |
| **Across 10 skills** | **120** | **40** | **80** | **240** |

The 24-per-skill figure is an acceptance floor, not a hard maximum.

## Fixed-bank re-audit

All 60 original Unit 1 items were re-audited without changing their answer semantics. The audit removed the remaining `unspecified` family classifications and preserved the stronger labels already present where appropriate.

| Skill | Fixed-item family interpretation |
|---|---|
| S01 Physical phenomena | I01–I02 knowledge; I03–I06 application |
| S02 Body / material / phenomenon | I01–I02 and I05 knowledge; I03–I04 and I06 application |
| S03 Scientists / Armenian physicists | knowledge |
| S04 Observation vs experiment | I02 knowledge; I05 reasoning; remaining items application |
| S05 Inquiry chain | I01–I02 knowledge; I03–I06 reasoning |
| S06 Quantity / unit / instrument | I01–I04 knowledge; I05–I06 application |
| S07 Unit conversions | application |
| S08 Scale reading | I03 knowledge; remaining items application |
| S09 Error / precision | I02/I04/I05/I06 reasoning; I01/I03 application |
| S10 Measurement planning / displacement | I02 reasoning; remaining items transfer |

All 60 fixed anchors are published and internally re-audited, while still retaining `provisional_no_sme_review`.

## New candidate-bank construction

### Authored parallel catalogues

S01–S06 use authored parallel scenarios. S09 also uses authored reasoning scenarios because its deterministic numerical domain is finite.

The original 0017 catalogue was recovered after the partial-production incident and normalized so authored parallel content is represented as a **fixed authored catalogue**, not as a deterministic generator. Authored candidates no longer carry generator seeds.

### Deterministic candidates

S07, S08, S09 and S10 use the Sprint 11C deterministic generator framework:

- S07 — length, time and volume conversion;
- S08 — scale division and scale reading;
- S09 — measurement-error variants;
- S10 — displacement volume and indirect sheet-thickness measurement.

Every deterministic 11D candidate was reproduced from its stored template + seed and checked against the stored prompt, parameters, answer and semantic fingerprint.

The S09 numerical generator has only **10 unique safe outputs** in its current parameter domain. Sprint 11D therefore uses those 10 deterministic variants plus two authored reasoning candidates to complete S09's Practice/Diagnostic capacity instead of manufacturing duplicates.

## S01 recovery correction

The first partially applied catalogue introduced an unsupported sixth physical-phenomenon category, **Sound**. Migration `0024` corrected production by:

- removing the Sound option from every S01 11D candidate;
- replacing the three affected protected candidates with source-aligned thermal/electrical/optical examples;
- correcting the answer keys;
- recalculating semantic fingerprints from the corrected prompt, answer and option set.

There are now zero remaining Sound-option rows in the S01 11D candidate catalogue.

## Technical QA

All 180 new 11D candidates currently pass the technical gate:

- non-`unspecified` item family;
- answer key present;
- valid single-choice answer/option relationship where applicable;
- numeric/quantity tolerance present where applicable;
- active skill-level misconception mapping present;
- no duplicate active semantic fingerprints inside the 11D candidate bank;
- deterministic items reproduce exactly from template + seed;
- all candidates remain isolated from learner-facing pools.

Technical QA is explicitly **not** treated as human content approval or Physics SME validation.

## Staged assessment structure

Every new candidate has exactly one **disabled** intended-purpose membership:

- 80 staged Practice candidates;
- 40 staged Diagnostic candidates;
- 60 staged protected-Mastery candidates.

The database activation guard rejects any attempt to enable an 11D candidate unless all of the following are true:

1. `technicalQaStatus='passed'`;
2. `humanReviewStatus='approved'`;
3. `pilot_ready=true`;
4. `status='published'`;
5. `review_status='approved'`;
6. the destination pool matches the candidate's intended purpose;
7. Mastery candidates are assigned only to a protected Mastery pool.

This prevents a future migration or admin action from accidentally bypassing the human review gate.

## Diagnostic v2 candidates

Two new Chapter I Diagnostic forms are staged as **drafts**, not active forms:

- `PHY7-U01-DIAG-A`, version 2 — 20 candidates;
- `PHY7-U01-DIAG-B`, version 2 — 20 candidates.

Each draft contains:

- exactly 2 items per skill;
- all 10 skills;
- zero exact-item overlap between A and B.

The existing version-1 forms remain active until the 11D human-review/activation step. Draft-form validation was tightened so only explicitly staged 11D candidate memberships may be referenced while disabled; active forms still require enabled parent-pool membership.

`provisionalParallelism=true` remains explicit. Structural balance and non-overlap are not claims of psychometric equivalence.

## Review-trigger safety

The Sprint 8 revision triggers are preserved. Any assessable content change forces an item back into review. The final workflow therefore remains:

1. author/materialise candidate;
2. update answer/options if required;
3. map misconception taxonomy;
4. run technical QA;
5. keep the candidate in `review / needs_review`;
6. obtain real human content approval;
7. set `humanReviewStatus='approved'`, `pilot_ready=true`, and publish;
8. activate the staged purpose-exclusive pool membership;
9. activate Diagnostic v2 only after all its items are approved.

## Migration history

- `0017_sprint_11d_conceptual_bank_expansion.sql` — partially applied authored catalogue; later recovered safely.
- `0018`–`0019` — superseded no-op drafts.
- `0020`–`0023` — superseded no-op finalisation drafts; intentionally never used for production finalisation.
- `0024_sprint_11d_partial_state_recovery.sql` — restored all partial 11D content to review-only, corrected S01 scope/options/fingerprints and normalized authored-template semantics.
- `0025_sprint_11d_fixed_audit_and_candidate_gate.sql` — re-audited all 60 fixed anchors, mapped misconceptions, technically checked recovered authored candidates, and installed the fail-closed activation guard.
- `0026_sprint_11d_complete_candidate_bank.sql` — completed the missing S07/S08/S09/S10 candidates and established the exact 18-new-variants-per-skill candidate bank.
- `0027_sprint_11d_stage_candidate_pools_forms.sql` — staged disabled purpose memberships and draft Diagnostic v2 forms without changing current production delivery.
- `0028_sprint_11d_seed_index_search_path.sql` — fixed the deterministic seed helper's mutable `search_path` warning found by the post-DDL security advisor.

## Current production verification

Live verification currently shows:

```text
Fixed anchors                     60
Fixed anchors with unspecified     0
Fixed anchors published/approved  60

New Sprint 11D candidates        180
Technical QA passed              180
Human review pending             180
Pilot-ready candidates             0
Learner-enabled 11D candidates     0
Duplicate 11D fingerprints         0

Structural bank                  240
Per skill                         24
Intended Practice / skill         12
Intended Diagnostic / skill        4
Intended Mastery / skill           8
```

## Remaining 11D gate

The remaining blocker is **real human content review of the 180 new candidates**. Until that occurs:

- they do not count as pilot-eligible variants under the Sprint 11D acceptance rule;
- the expanded 12/4/8 pools remain staged rather than active;
- Diagnostic v2 remains draft;
- the active platform continues using the previous 40/40/20 production pools;
- `provisional_no_sme_review` remains in place even after internal human review until an actual Physics SME signs off.

The next 11D operation is therefore a controlled human-review/approval pass followed by a small activation migration, not further item generation.
