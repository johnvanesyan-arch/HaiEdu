# B.12.3 — Teacher analytics colours and class-workspace layout

2026-11-02 Asia/Yerevan. UX-ANALYTICS-03 and UX-CLASS-LAYOUT-01 are technically corrected, deployed and source/native verified through [PR387](https://github.com/johnvanesyan-arch/HaiEdu/pull/387), main `5b4f1f04c94d33b514b3650ad2b1302e64455f79`. [Verified receipt](evidence/teacher-analytics-colours-20261102.json). B.12.3/B.12 and owner usability acceptance remain open; subjects stay paused.

## Reported problem and correction

The owner’s Physics 7 Chapter 1 screenshot shows sparse skill evidence («Դիտարկումները դեռ քիչ են») painted as dark Forest buttons. The generic Forest normal/hover action selectors outrank the original evidence-control styles, covering the underlying semantic colour. Both public baseline stylesheets exactly match committed source; this is not a guessed scoring or server failure.

Existing evidence buttons are now scoped under `#matrixWrap`. Their surface remains transparent, border stays zero and text inherits the cell’s reported band through normal/hover/focus states. Hover strengthens the underline. Existing click targets, keyboard outlines and direct skill details remain. Shared action-button styling elsewhere is unchanged.

| Reported evidence | Presentation retained |
| --- | --- |
| Classified secure | Green |
| Classified developing | Yellow |
| Classified needs support | Red |
| Separate original contracts | Separate Forest-tinted state; no combined score |
| Insufficient observations, unavailable indicator or no evidence | Neutral; sparse/unavailable evidence opens its existing detail, empty evidence remains text |

A skill band is independent of the whole-unit passed counter. The UI neither invents a classification for sparse data nor requires a passed unit before showing a valid server-reported band. All percentages, model thresholds, contracts, support counts and recorded pass decisions remain.

Image inspection also found existing enlarged-text layout defects. The class heading squeezed words into individual letters beside its return action; the filter group later widened full-page captures to 1366/882px for 1280/768 viewports. The same small stylesheet correction lets the specific heading/action group wrap, gives the copy a responsive basis and uses text-relative filter columns with bounded labels/selects. Skill-table horizontal scrolling stays inside its existing wrapper.

## Scope and consumer audit

| Consumer | Disposition |
| --- | --- |
| Institutional teacher class/unit matrices | Same root/helper for every subject, programme, grade, class and year; governed fields/context preserved |
| Legacy owner-only teacher matrices | Same CSS root; existing single reported estimates retained |
| Teacher drawer, roster, support filters/counts, Home and review | Existing runtime JavaScript/helper source is unchanged; direct-detail and stale actor/class regressions remain |
| School Admin and Master Admin | Independent evidence articles/text do not use these masked matrix buttons; renderer, API and permissions unchanged |
| Student, Content Reviewer and static staff preview | Different views; source and authority unchanged |
| Backend, SQL, Auth, models, learner records, content/audio and release controls | Exact source reused; no learner response, grade, enrollment, permission or configuration change |

This is subject-neutral presentation with no new subject, grade, unit-size, scoring or threshold assumption. The existing server determines bands. All 45 mappings, accepted content/audio/demo, classroom speaking, English C47, four-subject and independent SEC-AAL/URL-P1/MASTER-P2 gates remain.

## Verification and visual findings

Ten focused state/reporting checks, typecheck, Node syntax, all 11 QA dependency graphs and diff checks pass locally. Local Chromium is absent. Current actual-page isolated Chromium execution is the required GitHub CI, not a local or signed-in owner run.

Two new native regressions cover seven evidence states, five distinct computed surfaces, inherited text colours, normal/hover transparency and borders, keyboard focus, 44px targets and 1280/768/390 widths at 100%/200% computed root text. Glyph ranges keep heading/back-link words intact. Document/control bounds prevent filter-driven page overflow. Valid classified bands remain visible without manufacturing a passed unit. A separate one-learner/four-sparse-cells pattern retains 12 neutral skills and zero passed/support/required-review/no-activity counters. Existing drill-down, repeated render and stale class/account regressions remain. Native requests use isolated synthetic DTOs, not production marks.

The first run 41443919949 passes 1,649 unit/integration + 393 native; six inspected images reveal the heading issue. Run 41446345264 also passes 1,649/393 after the heading correction, but PNG dimensions reveal filter overflow. These passing CI receipts remain historical and are not treated as final visual acceptance. The fixture now supplies the API’s explicit null for unavailable recent accuracy instead of an omitted required field; no production accuracy renderer/value is changed.

Final corrected-source [PR CI 41448039304](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41448039304) and [main CI 41449602048](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41449602048) pass all five required jobs: **1,649 unit/integration + 393 native**, zero failures/skips/cancellations. Artifact 13143721435, 36,894,229bytes, has verified ZIP SHA256 `ef92bd7c40a08f54406d7ce2cff8365c34f0bd01c4f2e78976c4e773ee304187`. All six final PNG widths exactly equal the requested viewport. Four changed final captures are freshly inspected; the two mobile captures are byte/SHA256-identical to already-inspected images. All six image hashes and scope are in the receipt. These are computed text-enlargement/synthetic actual-page checks, not physical-device/browser-zoom or owner acceptance.

Retained representative unaltered captures: [desktop 1280](evidence/teacher-analytics-colours-1280-normal-20261102.png) · [768 at 200% text](evidence/teacher-analytics-colours-768-large-20261102.png) · [mobile 390](evidence/teacher-analytics-colours-390-normal-20261102.png). The complete six-image set remains in the verified artifact with hashes in the merged receipt.

## Release and remaining limits

Production `dpl_6Bdpu2GSLWdYm8f3PG3cbbazYoRr` and public `release.json` match main 5b4f1f04. The new teacher CSS is 25,277 bytes with exact served/source SHA256 `2b574763ef06ccba7935f55301c7550efe7aa01743f65c56d2a89e79c67c3cc7`; the shared Forest stylesheet remains unchanged at 14,504 bytes. A READY candidate was observed while the canonical site retained 50e7345 during main CI; promotion was verified after all-five pass. Prior independently verified 31 Oct Production/Blocking configuration evidence is reused without a settings write. Thirteen other non-documentation roots, including Supabase, scripts, packages and deployment configuration, remain exact. Earlier 191/191 + 54 backend/isolation evidence is retained without relabelling its source.

The existing automatic guarded [Chapter VI read 41449601588](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41449601588) also completes against exact main 5b4f1f04: **324/324 read checks + 54/54 isolation controls**, all 12 run-owned sessions close HTTP 204. Artifact 13144393850 is digest-verified (`e05e4d25916aa834075a0b1c700208bcff9c2d527afcba239d2d603cd92b3e21`). It preserves Chapters I–VI learning baselines and creates no answers/exposures. This is fresh protected-fixture read evidence, not a signed-in teacher colour walkthrough or question-bank isolation certification. No manual dispatch/retry or concurrency-setting change was used.

The cloud teacher page is signed out. No sign-in or credential request occurred. The screenshot contains no class/release identity, and the requested full page URL has not been supplied, so its exact learner counts are not independently certified. Other programme fixtures are not substituted for that context. A bounded 11:35–11:55 UTC read-only log sample contains four dashboard HTTP 200 responses, without correlation to this image; health/advisories were read without changes. The owner’s raw screenshot is not republished. The original QA HTTP 0 transport cause remains a separate, unconfirmed investigation.

Next is a focused ordinary-account matrix/layout recheck and the remaining five-role usability review, followed by John’s explicit acceptance. Record any still-unexercised step and provide the exact class/release URL for the screenshot’s data check. B.12.3/B.12 remain open and subjects stay paused. Documentation closure follows normal PR/main gates and source-verified synchronization of the existing Notion map, preserving 13 child pages and 9 independent gate rows. Roll back through the existing guarded frontend release process if colours, focus, controls/context or required gates fail; no data/session migration is needed.
