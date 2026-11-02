# B.12.3 — Teacher analytics colours

2026-11-02 Asia/Yerevan. UX-ANALYTICS-03 and the class-heading readability finding UX-CLASS-LAYOUT-01 have bounded working CSS corrections. Required native CI, production source verification, merged closure evidence and Notion synchronization remain pending. B.12.3/B.12 and final owner acceptance stay open; subjects remain paused.

## Reported state and cause

The owner-supplied Physics 7 Chapter 1 screenshot shows four clickable cells labelled «Դիտարկումները դեռ քիչ են» painted as dark Forest actions. Other cells say «Տվյալ դեռ չկա». The existing renderer deliberately maps sparse/unavailable/empty evidence to `not_assessed`, while preserving the server’s separate results and classified bands. The data cells should retain those semantic colours.

The public baseline is main `50e7345a7117df4eb736f0d511c3c37deafac7e3`. Fresh public reads of `teacher.css` and `staff-forest.css` return HTTP 200 and exactly match the committed source. The generic Forest normal/hover action rules outrank the original `.skill-evidence-link` rules. They give every clickable data cell white text, a dark green background and an action border, covering its underlying green/yellow/red/neutral/separate-result surface. The old browser regressions checked state text, drill-down, filters, keyboard and layout, but did not assert the computed matrix-button colours.

The cloud teacher page is signed out. No sign-in was attempted and no credential was requested. The screenshot contains no class/release identifiers; the exact selected learner context has not been replayed or its counts independently certified. Bounded read-only logs show four dashboard HTTP 200 responses in 11:35–11:55 UTC, without a client correlation tying them to this image. Existing project health/advisories were read without changes. Known programme fixtures are not substituted as evidence for the screenshot’s unidentified context. This correction addresses the confirmed CSS conflict; it does not diagnose unrelated counts from a different class/release.

## Bounded correction and consumers

The existing normal and hover rules are scoped under `#matrixWrap`. Evidence buttons inherit their cell’s text colour and keep a transparent background/zero border even after the shared action theme loads. Hover strengthens the underline without changing the reported band. Existing keyboard outlines, names, click targets and direct skill-detail behaviour remain.

The initial PR native run 41443919949 passed all 393 checks, including both new colour cases. Inspection of all six captured normal/enlarged images confirmed the colours but exposed a separate existing class-heading flex layout squeezing words into individual letters at 200% text. This candidate now lets that specific heading/action group wrap, gives its copy a responsive flex basis and checks actual glyph ranges for intact words at all six width/text combinations. Normal controls and class identities are unchanged. The synthetic DTO also supplies the API’s explicit null for unavailable recent accuracy, removing an invalid-fixture `undefined%`; no production accuracy value or renderer is changed. The earlier passing CI is retained as history, not final visual acceptance. Final-source native verification remains required.

| Consumer | Disposition |
| --- | --- |
| Institutional teacher class/unit matrix | Every matrix cell uses the same selector, across programmes, subjects, grades and academic years. All existing state distinctions remain. |
| Legacy owner-only teacher class matrix | Same matrix root/helper and CSS; its existing single-band estimates are preserved. |
| Teacher skill drawer, support counters/filter/roster, Home and review | Existing helper/controller logic remains exact. No new classification, percentage or combined estimate. |
| School Admin and Master Admin oversight | Existing `renderEvidenceGroups`/assessment-group articles and text are not the masked matrix buttons. No renderer/API/authority change. |
| Student learning/progress and Content Reviewer | Their existing role-specific views/permissions stay unchanged. Shared primary-action styling is retained. |
| Static staff preview | Does not consume `#matrixWrap`/`skill-evidence-link`; unchanged. |
| Shared runtime/Edge, SQL, Auth, content/audio and release controls | Unchanged. No deployment of backend dependencies, learner answers, grades, enrollments or permissions is needed. |

This is subject-neutral shared presentation. The CSS does not infer a subject, grade, skill count or evidence threshold. Existing server contracts determine classifications. Sparse observations remain neutral; there is no requirement introduced to pass a unit check before a valid reported skill band can appear. Different contracts are not combined. All 45 mappings, accepted content/audio/demo, classroom speaking, English C47, four-subject and independent SEC-AAL/URL-P1/MASTER-P2 gates remain.

## Verification plan and current evidence

Ten focused state/reporting checks, typecheck, Node syntax, all 11 browser-QA dependency graphs and diff checks pass locally. Initial required PR CI passes 1,649 unit/integration and 393 native checks; the final heading/readability correction still requires fresh native CI. No new entrypoint, dependency, workflow path or queue setting is introduced. Local Chromium is absent, so native browser execution is pending required CI rather than claimed from local syntax checks.

Two new actual-page isolated native regressions are prepared. One covers separate, sparse, unavailable, missing, green, yellow and red evidence; distinct computed surfaces, inherited text colours, transparent/zero-border normal and hover controls, keyboard focus, 44px targets, 1280/768/390 widths at 100%/200% text, unchanged support counts and classified evidence without inventing a passed unit. The second mirrors the screenshot’s one-learner/four-sparse-cells pattern, preserving 12 neutral skills and zero passed/support/review/no-activity counters. Neither creates a learner response, mark or publication. The existing direct-detail and stale class/account regressions remain.

Required all-five PR/main CI and inspection of the new synthetic native screenshots must pass before completion. Verify the canonical release and exact served CSS through the normal guarded promotion. Reuse unchanged backend/isolation evidence by source; any existing automatic guarded workflow is recorded separately, not described as a new owner session or a full learner attempt. Roll back through the existing release process if semantic colours or focus disappear, an interaction breaks, source differs or a required gate fails. The original HTTP 0 transport cause remains separate and unconfirmed.
