# Sprint 11C — Parameterised and parallel item variants

## Status

**Complete.** Sprint 11C adds deterministic, seed-reproducible item generation for selected Grade 7 Physics Chapter I constructs while preserving the existing protected answer-key and content-review architecture.

This sprint expands the **generation capability**, not the pilot-eligible bank. Generated candidates enter `review` / `needs_review` state and are deliberately excluded from Practice, Diagnostic and Mastery pools until Sprint 11D technical QA and human content review approves them.

## Core generation model

A generated item now has four linked identities:

`item family → item template → seed/parameters → concrete materialised variant`

The exact concrete variant is auditable through:

- `item_template_id`;
- `variant_seed`;
- `variant_parameters`;
- `variant_key`;
- `variant_fingerprint`;
- protected `item_answer_keys`.

The same active template + seed deterministically renders the same prompt, parameters, answer, options and semantic fingerprint. Materialising the same seed twice is idempotent rather than creating duplicate items.

## Parameterised templates

Sprint 11C introduces deterministic generators for educationally safe numerical constructs:

- S07 length conversions to metres;
- S07 time conversions to seconds;
- S07 volume conversions from millilitres to litres;
- S08 scale division value;
- S08 scale reading;
- S09 measurement-error calculation using the current Chapter I half-division rule;
- S10 irregular-body volume by water displacement;
- S10 indirect sheet-thickness calculation.

Generation uses a stable seed-derived index and fixed, reviewed parameter domains. There is no live generative-AI dependency and no stochastic answer generation.

## Parallel-context templates

Simple number substitution is not appropriate for every construct. Two explicit parallel-context generators were therefore added:

- S04 observation vs experiment classification;
- S05 hypothesis-test design.

These vary the scenario while preserving the intended construct and difficulty band. They are still provisional content pending Sprint 11D human review; the architecture does not claim psychometric equivalence merely because scenarios share a template.

## QA and integrity controls

The generator layer checks for:

- missing or unsupported item types;
- invalid difficulty values;
- missing numeric tolerances;
- missing quantity-unit metadata;
- duplicate answer options;
- answer keys not represented by single-choice options;
- answer placeholders leaking into prompts;
- answer/correct-option fields leaking into public `variant_parameters`;
- explicit answer markers in option text;
- duplicate effective variants through a semantic fingerprint.

`variant_fingerprint` has an active-item uniqueness constraint so two different seeds/templates cannot silently materialise the same effective item.

The service functions `service_preview_item_variant` and `service_materialize_item_variant` are executable by `service_role` only. Ordinary authenticated learners cannot call them directly.

## Content-admin integration

`manage-content-quality` now supports:

- `preview_generated_variant`;
- `materialize_generated_variant`.

Both remain behind the existing admin/content-admin role gate. Technical QA for a generated item re-renders the stored seed and verifies that the stored prompt, parameters, answer key and semantic fingerprint exactly match the deterministic renderer before the item can pass QA.

## Proof set

Sprint 11C materialises 20 generated candidates across S04, S05, S07, S08, S09 and S10. They are intentionally left in review state.

Live database checks confirmed:

- 10 active generation templates: 8 parameterised + 2 parallel;
- 20 generated concrete candidates;
- 20/20 generator QA valid;
- 20/20 prompt reproduction exact;
- 20/20 parameter reproduction exact;
- 20/20 answer reproduction exact;
- 20/20 fingerprint reproduction exact;
- 20 distinct semantic fingerprints;
- 0 generated candidates enrolled in an assessment pool;
- ordinary `authenticated` role cannot execute preview/materialisation RPCs;
- `service_role` can execute them;
- re-materialising an existing template + seed returns the existing item instead of creating a duplicate.

## Boundary with Sprint 11D

Sprint 11C proves that safe constructs can be expanded deterministically and that reasoning items can use reviewed parallel contexts. It does **not** claim that the 20 proof candidates are pilot-ready.

Sprint 11D owns the actual Chapter I production-bank expansion and review gate. Its fixed acceptance target is **at least 24 effective unique variants per skill, 240 across 10 skills**, with a minimum capacity of **12 Practice + 4 Diagnostic + 8 protected Mastery variants per skill**. Generated candidates count toward that target only after technical QA and human content review make them eligible.
