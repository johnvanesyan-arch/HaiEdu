# Remediation authoring validator correction

This shared change removes publication false positives without changing learner scoring, permissions, curriculum release gates or published content.

## Rules

- Armenian and Latin option labels require Unicode token boundaries. The final `ա` in `ունենա` is not option `Ա`.
- Quantity relationships and calculations on different example data are allowed. Explicit answer announcements, bare numeric conclusions and calculations that reuse the active task's inputs remain blocking errors.
- Hint checks inspect allow-listed rendered parameters, not just the unrendered template.
- Worked examples may share an operand or constant. Reusing all live inputs in the same quantity context is blocked. Numeric live placeholders in worked examples remain forbidden.
- Equal values with different labels supplied by stored variant parameters, such as hours and minutes, are distinct contexts. No subject identifiers, unit-conversion tables, answer keys or arithmetic evaluation are added.
- Label and token normalization uses NFKC and Unicode default casing, without a hard-coded language or the runtime locale. Labels remain opaque governed data; locale-specific equivalences require an explicit normalization contract and are not inferred by this heuristic.
- Preview, saved-draft feedback, review and publication validate every published variant in the guide's existing governed template/skill scope. Selecting a safe preview cannot hide a failing variant. The selected question still determines the displayed learner preview.
- The reviewer receives the checked variant count and codes/reasons for failing questions. Source metadata warnings remain nonblocking.

These deterministic text/data checks detect obvious leakage; human content and SME review remain required for meaning, correctness and curriculum alignment.

## Affected deployment consumers

Only `manage-remediation-guides` imports `_shared/remediation-authoring-validation.mjs`. Its entrypoint and bundled helper must both be redeployed and read back. `web/content-guides.js` displays the new validation details and requires the normal frontend release checks. The learner resolver is unchanged.

## Verification

Regression fixtures cover safe unit relationships, Armenian option boundaries, explicit answers, rendered live calculations, genuine copied conversions, scale examples with one common input, different unit contexts, decimal commas/periods, mathematical examples, nonnumeric language guides and all-variant validation.

Executing the actual Edge Function handler with offline database/auth fixtures verifies preview responses, review/publication rejection before the lifecycle RPC, draft preservation, and successful review/publication validation on safe content. Existing database lifecycle tests retain the authoritative snapshot, role, MFA and runtime-publication gates. The native Chromium fixture verifies the reviewer summary, failing-variant details, escaped codes and clearing of old validation errors.

Read-only production fixtures from 2026-10-05 confirm that the saved general-conversion, volume and scale drafts pass every applicable variant. Two content conflicts correctly remain: the missing-unit example solves the stored 500 ml question; the time Hint 2 solves the stored one-hour question. The validator release does not edit or publish those guides.

Deployment and complete CI results are recorded in the associated pull request after release verification.
