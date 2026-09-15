# Sprint 11D — Grade 7 Physics Chapter I bank expansion and content QA

## Status

**Repository implementation complete; production database finalisation and independent human Physics SME sign-off remain open.**

The Chapter I bank contract is fixed at **24 purpose-exclusive effective variants per skill** across the 10 skills:

- **12 Practice** variants per skill;
- **4 Diagnostic** variants per skill, split across two 2-item-per-skill forms;
- **8 protected Mastery** variants per skill;
- **240 pilot-eligible variants** when the review-safe migrations are fully applied.

This is an acceptance floor, not a hard maximum.

The existing `provisional_no_sme_review` state is intentionally retained. `review_status='approved'` in the Sprint 11D migrations means that the item passed the platform's structured internal content workflow and technical checks. It **does not** mean an independent teacher or Physics subject-matter expert has validated the item.

## Source boundary

The re-audit uses the project's existing Chapter I curriculum architecture and development-bank source basis:

- Գ. Մելիքյան, Ս. Մաիլյան, *Ֆիզիկա 7*, Էդիթ Պրինտ, 2023, Chapter I §§1–6;
- the existing 10-skill Chapter I architecture;
- the existing Sprint 5 misconception/remediation taxonomy;
- the original 60 fixed items and their answer keys/options.

The project still records official 2026 outcome wording and independent SME validation as separate unresolved evidence tasks. Sprint 11D does not silently convert development content into officially validated curriculum content.

## Original 60-item re-audit

The original six fixed items per skill are retained as stable anchors. Sprint 11D reclassifies the legacy `unspecified` family tags and records review evidence without changing the underlying answer-key semantics.

The audit rule is:

| Skill | Fixed-item family interpretation | Difficulty treatment |
|---|---|---|
| S01 Physical phenomena | I01–I02 knowledge; I03–I06 application/classification | Existing 1–2 range retained |
| S02 Body / material / phenomenon | I01–I02 and I05 knowledge; I03–I04 and I06 application | Existing 1–3 range retained |
| S03 Scientists / Armenian physicists | knowledge | Existing 1–2 range retained |
| S04 Observation vs experiment | I02 knowledge; I05 reasoning; other fixed items application | Existing 1–3 range retained |
| S05 Inquiry chain | I01–I02 knowledge; I03–I06 reasoning | Existing 1–4 range retained |
| S06 Quantity / unit / instrument | I01–I04 knowledge; I05–I06 application | Existing 1–2 range retained |
| S07 Unit conversions | application | Existing 1–3 range retained |
| S08 Scale reading | I03 knowledge; remaining fixed items application | Existing 1–3 range retained |
| S09 Error / precision | I02/I04/I05/I06 reasoning; I01/I03 application | Existing 2–3 range retained |
| S10 Measurement planning / displacement | I02 reasoning; I01/I03/I04/I05/I06 transfer | Existing 2–4 range retained |

Every Chapter I item is also linked to the active skill-level misconception taxonomy. Response-specific misconception refinement remains an SME/content-editor task.

## Bank expansion design

### Authored parallel catalogues

S01–S06 use reviewed authored parallel scenarios to broaden context rather than merely reword a single fixed question. S09 also uses authored reasoning variants to supplement its finite numerical generator domain.

These authored scenarios are represented as **concrete variants in a shared authored-parallel catalogue**, not as fake deterministic generators. Migration `0023` marks their templates accordingly so the content-admin QA path will not attempt to regenerate them through the Sprint 11C numerical/parallel generator RPC.

### Deterministic numerical variants

S07, S08, S09 and S10 use the deterministic Sprint 11C generator architecture where mathematically safe:

- S07: length, time and volume conversion;
- S08: scale division value and scale reading;
- S09: measurement error using the current half-division rule;
- S10: displacement volume and indirect sheet-thickness measurement.

Seed, parameters, answer and semantic fingerprint remain reproducible and auditable.

The S09 measurement-error template has **10 genuinely distinct effective outputs** in its current safe parameter domain. Sprint 11D does not manufacture duplicates to hit a numerical quota. Instead, two reviewed reasoning variants complete its four-item Diagnostic capacity.

## S01 scope correction

The first authored proof catalogue included sound examples. The current Chapter I architecture explicitly establishes the classification set used by the existing bank around mechanical, thermal, electrical, magnetic and optical phenomena. Before assessment eligibility, Sprint 11D replaces the sound examples and rebalances the S01 Diagnostic/Mastery catalogue around those source-supported categories.

This correction is deliberately performed through a later migration rather than rewriting already-applied migration history.

## Purpose-exclusive assessment pools

After the bank passes its internal review/technical gates, pool membership is rebuilt as follows for **every skill**:

| Source | Practice | Diagnostic | Mastery |
|---|---:|---:|---:|
| Original fixed anchors | 4 | 0 | 2 |
| New 11D variants | 8 | 4 | 6 |
| **Total per skill** | **12** | **4** | **8** |

An item may be enabled in only one of the three Chapter I purpose pools. A database trigger rejects cross-purpose reuse and prevents unpublished, unreviewed, retired, `unspecified`, or non-pilot-ready items from being newly enabled in the Chapter I pools.

The Mastery pool remains explicitly protected.

## Diagnostic forms v2

Sprint 11D preserves the Sprint 11B forms as historical definitions and introduces active **Form A v2** and **Form B v2**:

- 20 questions per form;
- exactly 2 questions per skill;
- 10 skills represented;
- zero exact-item overlap between A and B;
- all questions originate from the purpose-exclusive Diagnostic pool.

The forms remain labelled `provisionalParallelism=true`. Structural balance and non-overlap do **not** constitute psychometric equivalence.

## Practice and Mastery capacity

A skill now has 12 Practice variants for an 8-question bounded session. This gives four items of headroom beyond one full session and makes exact-repeat fallback exceptional rather than structurally inevitable.

A skill has 8 protected Mastery variants while one full Mastery Check uses 2 per skill. The bank can therefore support multiple unseen-first / low-overlap attempts before protected-pool exhaustion becomes necessary.

## Review-trigger safety

During implementation, the Sprint 8 revision triggers were re-checked. They correctly force an item back to `needs_review` / `review` whenever assessable item metadata, an answer key, or answer options change.

The final 11D migration sequence therefore follows this order:

1. mutate/reclassify/materialise content;
2. update answer keys/options where required;
3. map misconceptions;
4. record technical QA;
5. record structured internal content-review evidence;
6. only then set workflow status to `approved` / `published`;
7. rebuild assessment pools;
8. run hard acceptance assertions.

Earlier draft migrations `0018` and `0019` are intentionally no-op placeholders because they did not correctly respect all of those review-trigger semantics. The corrected implementation is in `0020+`.

## Hard acceptance checks

The migrations fail rather than silently continuing if any of the following is false:

- each skill has exactly six original fixed anchors and 18 new purpose-tagged variants;
- every pilot-eligible item has a non-`unspecified` family;
- every pilot-eligible item is published and internally workflow-approved;
- every pilot-eligible item has an answer key and misconception mapping;
- every single-choice answer exists among its options;
- every numeric/quantity item has tolerance metadata;
- each skill has exactly 12 Practice, 4 Diagnostic and 8 protected Mastery items;
- there is zero enabled cross-purpose item overlap;
- Diagnostic A v2 and B v2 each contain 20 items;
- each form contains exactly two items per skill;
- Diagnostic A/B have zero exact-item overlap.

## Migration sequence

- `0017_sprint_11d_conceptual_bank_expansion.sql` — authored conceptual/reasoning catalogue; already applied to production during 11D implementation.
- `0018_sprint_11d_numeric_pool_rebuild.sql` — superseded/no-op.
- `0019_sprint_11d_numeric_pool_rebuild_v2.sql` — superseded/no-op after review-trigger audit.
- `0020_sprint_11d_review_safe_bank_expansion.sql` — corrected fixed-bank audit, deterministic expansion, S01 correction, S09 supplement, misconception mapping and review-safe publication.
- `0021_sprint_11d_purpose_exclusive_pools.sql` — exact 12/4/8 pools, Diagnostic v2 and database eligibility guard.
- `0022_sprint_11d_family_audit_corrections.sql` — fine-grained preservation of stronger original family labels.
- `0023_sprint_11d_authored_parallel_template_semantics.sql` — distinguishes authored parallel catalogues from deterministic generators.

## Outstanding gates

### Production database finalisation

The Supabase connector began returning persistent upstream HTTP 502 errors while the corrected migrations were being prepared. Repository implementation and CI can proceed independently, but Sprint 11D must not be represented as fully live until migrations `0020`–`0023` are confirmed in the production project and the live 12/4/8 + Diagnostic-form verification queries pass.

### Independent human review

The repository still contains the dedicated Chapter I SME review sheet. It has not been signed off. Therefore:

- `provisional_no_sme_review` stays in place;
- no item is described as teacher-validated or SME-validated;
- the independent human content/Physics review gate remains open unless the product owner explicitly accepts another disposition.
