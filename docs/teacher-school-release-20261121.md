# School teacher views and legacy-start repair — verified release, 21 November 2026

The approved school teacher roster, student panel and Skills tab are released in [PR522](https://github.com/johnvanesyan-arch/HaiEdu/pull/522), source `5dd96d5d9f67c7dcbf95934ce2018f450cfc3928`. The independent old-path learning-start repair is released in [PR521](https://github.com/johnvanesyan-arch/HaiEdu/pull/521), source `bdf6142e7c05ef2ae5017f862880a08b6e8a2537`, and deployed as `start-learning-session` version **35**.

John approved both merges, the specific server deployment and exact-build registration, and confirmed release coordination. Owner usability acceptance remains **provisional**, limited to these three teacher views. This record supersedes preparation-only statuses retained in the earlier delivery records.

## What changed

The school roster separates the saved check result, support evidence and next step. The panel and Skills tab preserve each full evidence contract and saved result group. Unreadable results remain neutral. Recent work is labelled as recent; older review columns remain available under the closed details section. Expanded skill cards retain their codes. Dates are unambiguous numeric local dates. Keyboard navigation now handles both panel-container focus and closed disclosures correctly.

Personal teachers retain their layout, actions and scoring; the shared keyboard repair and date formatting also apply there. The teacher change uses existing server responses and adds no teacher endpoint or schema change. The reporting browser test's fixed 50ms sleep was replaced with a bounded wait for request receipt while retaining its action-speed and cleanup assertions.

The separate server repair removes two filters on a nonexistent lifecycle column. Student/release/unit isolation, four valid learning-session filters, all 12 shared source files and all scoring/review/attempt rules are preserved.

## Verification

All five required CI jobs passed for both PRs and both merged sources:

| Change | Reviewed PR head | Merged source | Code / native browser checks |
| --- | --- | --- | --- |
| Server repair | [44892889825](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44892889825) | [44895033445](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44895033445) | 1,891 / 707 |
| Teacher release, including merged server repair | [44895152328](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44895152328) | [44896068810](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/44896068810) | 1,914 / 729 |

The final merge tree equals reviewed tree `018095b6b4acb44f9ca665c79fe815b54529f978`. All required database and concurrency jobs also passed. Earlier teacher-only CI passed 1,912 code checks; the combined count adds the two server-query regressions.

Fresh static verification on `haiedu.am`, `www.haiedu.am` and `armenian-mastery-platform.vercel.app` checked the exact merged commit before and after, the exact manifest, **all 29 HTML pages and 128 current assets on each address**, and their security, cache and MIME headers. All matched. That is 480 logical GETs including repeat identity checks; redirects are counted separately in the receipt. HTML and JavaScript were read as bytes, not executed. The public addresses updated automatically without manual promotion or domain changes. [Static evidence](evidence/teacher-school-hosted-static-20261121.json).

The live server was checked immediately before deployment at version 34. Version 35 readback matches all **13 source hashes**, with JWT verification still enabled and no import map. Independent comparison confirms exactly two deleted lines and unchanged dependencies. No production sign-in or learner request was made. The unchanged external npm dependency's resolved binary was not independently inventoried. [Deployment evidence](evidence/legacy-start-deployment-20261121.json).

The [teacher delivery record](teacher-school-view-delivery-20261121.md) retains the seven real local teacher/backend phases, explicitly seeded historical display headers, late-response and tenant checks, malformed-result restoration, and browser dimensions. The separate [learner repair record](legacy-start-lifecycle-repair-20261121.md) retains its native 112-answer/six-session journey, required review and unseen-question retry. The I-2 compatibility rehearsal remains separate and local; **I-2 was not activated**. Local Auth sessions and owned resources were cleaned up. These local proofs are not a signed-in production journey.

## Failure-reporting registration

Exact browser build: `7ef5840df5ede544ecfea25f2a01e44b35599afb594b36e7fb6c754a7ae0dae9`. The owner-approved one-build upsert was read back as active. It changes no reporting settings or learner records and does not establish a new signed-in reporting test.

- Registered: **21 November 2026, 14:37:10.955228 Asia/Yerevan**.
- Expires: **21 December 2026, 14:37:10.955228 Asia/Yerevan**.
- Existing maintenance reminder reset and confirmed: **12 December 2026, 14:37:11 Asia/Yerevan**, 21 days after registration, rounded to seconds.

The reminder requires reading the current release and runbook before any separately approved renewal. A later release may supersede this registration. [Registration receipt](evidence/teacher-school-reporting-registration-20261121.json).

## Boundaries and production QA

**Production QA not run (paused by owner).** Affected dependencies: Chapter II–VI and English Units 1–3 pilot-read acceptance, mobile browser QA, resource assignments, teacher feedback, Sprint 14 actions and Sprint 14D analytics. Teacher-loading rollout remains a consumer with its existing narrow triggers. Date-helper dependencies are covered. Before real classroom use, a separately authorized targeted teacher/mobile and relevant curriculum check is recommended; no full production round was dispatched.

Wider teacher screens and roster filter chips are outside this release. Active-progress wording covers practice and chapter review; history remains the server's 20 most recent sessions. Safari, real devices, screen readers, wider classroom capacity and a fresh signed-in hosted teacher journey remain unverified. No assessment rule, curriculum release, hosted secret or environment setting was changed.

[Combined machine-readable release record](evidence/teacher-school-release-20261121.json).
