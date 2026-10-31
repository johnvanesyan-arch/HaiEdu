# B.12.3 — Teacher skill evidence presentation

2026-10-31 · UX-ANALYTICS-01 · implementation prepared, not deployed. Final usability remains open; subjects stay paused.

## Reproduction and cause

A read-only owner-requested walkthrough on production `f35c4b01f7d1d0b7aff5173654be11b9090371ec` used the securely supplied Test Teacher1 identity. This is a protected QA identity, not an ordinary demonstration or final owner acceptance. Home → Classes → English7 QA A → Unit1 shows one learner, one passed unit check and all twelve matrix cells as `—`/`not_assessed`. The drawer shows a completed Diagnostic and a saved Mastery28/28 result, and existing per-contract estimates. Its first skill has71%/3,71%/3 and60%/1 observations. The roster arbitrarily lists the first three mixed skills as attention needs. No task, learner response, grade, feedback, enrollment or permission was changed. Normal UI logout returned to Account access before release QA.

The institutional analytics adapter intentionally sets the aggregate score to null and status to `mixed_contracts` when evidence belongs to different modes/policies/models/runtime provenance. Combining those estimates would violate the existing contract. The defect is the teacher renderer treating a missing aggregate as missing evidence, repeating blank legacy skill cards and ignoring the separate estimates in support filters/counts.

[Before: synthetic QA matrix](evidence/teacher-skill-matrix-before-20261031.jpg). The screenshot contains synthetic QA labels only. The original full drawer/question history is not published.

## Bounded correction

- A subject-neutral presentation helper distinguishes separate results, insufficient observations, unavailable indicators and no evidence. It preserves each reported percentage, band, response count and original contract.
- Matrix cells open the selected skill directly. The drawer puts skill evidence before advanced review history, labels each assessment mode and exposes original version metadata on demand. It removes the duplicate all-dash legacy grid.
- Roster, support counts, attention chips and support filtering use the same existing per-contract classifications. Each learner/skill counts once; an existing red classification takes precedence over yellow for that count. No thresholds, formula or combined score are introduced. Sparse/missing/unavailable evidence never becomes a weakness.
- Session status labels are Armenian. New async navigation preserves the existing actor/class/request guards and never sends a learner answer or mark.

## Consumer and contract audit

| Consumer | Disposition |
| --- | --- |
| Institutional teacher class/unit matrix, roster, filter/summary and learner drawer | All corrected together through the same helper. No course/grade IDs or skill-count assumptions. |
| Legacy owner-only teacher classes | Existing single reported score/band is presented without a new estimate or aggregate. |
| Teacher Home/Today and writing/custom review | No scoring/data changes; existing workspace counts and review flows retained. Generated dependency bundle rebuilt from canonical modules. |
| Learner progress | Uses learner-wide governed model/readiness, not class-contract estimates. Its score is a different declared scope; unchanged. |
| School admin and master-admin school oversight | Use `renderEvidenceGroups` in `analytics-provenance.mjs`, already separating original contracts and saved result groups. Their renderer and aggregate endpoint are unchanged. Existing reporting/isolation tests retained. No newly authenticated school/master acceptance claimed. |
| Edge, SQL, RLS, Auth policies, content/audio/releases | Unchanged; deployed backend/source evidence reused. Only normal UI logout closed the walkthrough session. |

## Verification and limits

All1,633 unit/integration tests pass locally, including33 targeted reporting/context/evidence checks. Typecheck, mirrored-core parity, generated teacher bundle parity, favicon/font provenance, all104 browser file syntax checks and all11 browser-QA dependency graphs pass. Three new unit cases cover status distinctions, explicit bands, no combination/mutation, legacy fallback and escaping. Two actual-page isolated Chromium cases exercise direct keyboard opening, early detail placement, support/filter consistency, repeated initialization, late class/account results and1280/768/390 widths at200% text. Local Chromium is absent; required CI/native and image inspection remain pending, not represented as local passes.

Production integration/source checks, merged evidence and source-verified Notion synchronization still gate delivery closure. The completed327/327 Resource acceptance remains evidence for its unchanged delivery/submission contracts; it is not evidence that this new matrix rendering is live. Ordinary-account, school/master and final owner usability acceptance remain open.

Related bounded findings stay in the single register: Home density/repeated headings and empty assessment groups in Practice history. They are not silently included in this capability slice. All45 mapped capabilities, scoring/analytics definitions, prior content/audio/demo acceptance, classroom speaking, English C47 and the separate four-subject gate remain.
