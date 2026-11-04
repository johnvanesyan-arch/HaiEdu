# BF-05 — clearer teacher/admin evidence presentation

2026-11-04 Asia/Dubai. Candidate implementation; no BF-05 production deployment yet. Reports P3:D5/P4:A2. Shared, subject-neutral presentation using authorized context. BF-04 is already live at mainc86564d.

## Evidence and decision

The read-only production inventory contains31 sessions across4 class scopes,15 original contract groups and8 runtime builds. [Pseudonymous inventory](../evidence/evidence-compatibility-inventory-20261104.json) retains contract/runtime governance identifiers, not learner identities or answers. Historical manifests differ in scoring/atomic accumulation, presentation and Diagnostic behavior. A shared model ID is insufficient proof of equivalence. No cross-build mapping is approved, and `runtimeBuildId` remains in `evidenceContractKey`. No unknown build is pooled.

Practice appears before Diagnostic baseline, followed by Mastery and Review. Each purpose retains its original per-contract results. The latest known activity appears first; additional results are in keyboard-accessible native disclosures, with actual differing contract dimensions explained and technical provenance retained inside details. Unknown-purpose and unregistered-version labels remain explicit and escaped. The teacher matrix keeps neutral mixed state, adds purpose labels, and preserves the same support-count classification. The learner drawer labels the selected subject/grade/chapter and per-version answer/session counts. School/Master cards label programme/class/chapter/release from already-authorized options.

School evidence now separates school/year/class/programme plus the full original evidence contract. Participation and completion totals stay descriptive; no merged performance score is introduced. Original per-contract percentages, saved pass decisions, reporting groups, genuine zero results, model/threshold rules, permissions and source records remain. BF-05 adds no database migration; the only migration-path change reconciles newly applied BF-04 ledger20261104111921 with identical SQL bytes.

## Complete consumer audit

| Changed shared source | Affected consumers | Release requirement |
|---|---|---|
| institutional-teacher-analytics.ts | get-teacher-dashboard; get-teacher-student | Deploy/read back both; retain dashboard verify_jwt=true and existing student verify_jwt=false (handler authenticates). |
| school-performance-analytics.ts | get-school-performance-analytics | Deploy/read back; retain verify_jwt=true. |
| analytics-provenance.mjs | Teacher skill drawer; School Admin; Master Admin | Shared purpose/context/details presentation; served module and generated teacher bundle verification. |
| teacher-skill-evidence.mjs / teacher.js | Teacher matrix, attention count/filter, learner drawer | Preserve original state and support calculation, regenerate teacher dependency bundle. |
| staff-forest.css | All role workspaces, scoped evidence selectors | Verify affected role layouts at phone/desktop200% text; unrelated workspace layout unchanged. |

Static import/dependency-trigger audit covers all designated production acceptance entrypoints, including generated teacher sources. No computed importer exception was identified.

## Verification and limits

All1,706 local unit/integration tests pass with zero failures/skips/cancellations, including eight new tests for purpose order/nonmutation, original percentages/support, runtime-only compatibility uncertainty, two subject labels, class/build separation with reconciled descriptive sums, genuine zeros, friendly context, escaped malicious labels and explicit empty scope. Typecheck, five-module core parity and browser-trigger audit pass. The generated teacher bundle matches canonical source. Authored files pass whitespace checks; esbuild retains existing SDK multiline-string trailing whitespace in generated output, which is not hand-normalized.

Six new native browser cases cover Teacher, School Admin and Master Admin at390/1280px with200% text, real page/controller fixtures, keyboard version disclosure, exact provenance, purpose order, preserved counts and horizontal layout. Native CI and six screenshot inspections remain pending; no local Chromium or fresh ordinary-account BF-05 journey is claimed. Fresh BF-04 source-guarded production QA continues on canonical c86564d before any BF-05 promotion.

Release order: complete all five PR gates and inspect screenshots; stage frontend; merge through protected main and pass all five main gates; deploy/read back all three Edge consumers; promote intended frontend and compare public assets; run applicable guarded authenticated acceptance and retain failures; align status/Notion to merged source. Owner usability acceptance, any future historical equivalence, BF-02 restoration, EnglishC47, full S2 and independent gates remain open.
