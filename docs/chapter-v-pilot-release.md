# Chapter V knowledge-only provisional pilot — 15E.6

Owner approval: 2026-10-19T17:11:56+04:00, adopting the exact proposal from `21857537b15ad4d5959fa3476ab00e2b91274fd4`. Activation committed at **2026-10-19T14:01:19.796321+00:00**. Authenticated production acceptance passed **191/191**, plus two-school isolation **54/54**, on exact deployed main `9f73f75146961119b3a22a0b98ce9ce2ff620ded` in [workflow 39267457694](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/39267457694).

## Active contract

152 approved questions (88 Practice, 24 Diagnostic, 40 Mastery), 88 published guides and 108 active definitions are unchanged. Diagnostic 12 / Practice 8 / Mastery 12 / Review 12. Mastery requires 10/12 and one correct answer in each of eight required skills, with three attempts and the existing review-after-failure lifecycle. S09/S10 remain optional Practice/Review only. Numerical readiness and runtime code are unchanged.

Two Diagnostic and three Mastery forms contain 60 distinct approved v1 questions. Four other Mastery questions remain approved, retained and unallocated. Exact form membership and snapshot/approval/QA bindings remain in restricted evidence; there is no independent qualification, empirical-equivalence or historical non-exposure claim. No question, hint, guide or misconception wording changed.

## Activation evidence

The bounded configuration transaction rehearsed with ROLLBACK; all 59 tracked table fingerprints were identical afterward. Activation passed 61 preservation scopes and exact readback of **458 rows across eight configuration tables**, plus four governed policy bindings and three pool reconciliations. Chapters I–IV, approved content, learner records and prior settings are preserved. The external SME gate stays pending and no independent reviewer was fabricated. [Activation](evidence/chapter-v-pilot-activation-20261019.json) · [Configuration](evidence/chapter-v-assessment-v2-configuration-20261019.json).

Two initial oversized connector requests returned `invalid_request_state`. Readback confirmed unchanged state. A smaller equivalent transaction retained every guard and succeeded; no guard was bypassed. The successful SQL uses transaction-local variables and no schema DDL.

**Evidence erratum:** immutable activation metadata recorded `outcomes: 8`. The authoritative curriculum snapshot has **six programme outcomes** (four mandatory, two additional); LAB-LEVER and LAB-INCLINE are two separately tracked activities. An attempted metadata correction was rejected by the active-release immutability guard and rolled back; that guard was retained. The generator now records six. This corrects an evidence count only: stored skill scopes, policies, content and scoring were correct and unchanged. [Erratum](evidence/chapter-v-pilot-evidence-erratum-20261019.json).

## Remaining boundary

Specialist/exposure review and assessment of performed laboratory work are owner-deferred. This release assesses knowledge only and makes no practical-completion claim. The approved learner label is `Գիտելիքներ․ լաբորատոր աշխատանքների կատարումը չի գնահատվում`.

The new main-only acceptance flow retains designated QA fixtures and verifies all five chapter contracts, reciprocal school isolation, mixed release/unit denials, protected direct-read controls and desktop/mobile switching without starting learning sessions or submitting answers. Home → I at 1365 px and I → II → III → IV → V → I at 390 px passed for both schools without page errors or attempted learning mutations. Existing baselines/history/session state were unchanged; all 59 tracked public table fingerprints matched the post-activation baseline. Only login sessions created by the runner were closed. [Acceptance evidence](evidence/chapter-v-pilot-read-acceptance-20261019.json). 15E.6 is complete for this technical scope. The next content sprint is Chapter VI mapping; specialist/exposure and practical gates remain separate.
