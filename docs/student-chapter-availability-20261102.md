# Student chapter availability — 2026-11-02

Status: inconsistency confirmed; correction prepared for review. Production has not been changed by this investigation. The signed-in chapter walkthrough is now confirmed; the updated candidate is awaiting fresh native CI.

## Confirmed cause and scope

The owner reported Physics 7 chapters visible in some student areas and blocked in others. Fresh read-only Supabase metadata shows active pilot releases for all six units, PHY7-U01 through PHY7-U06; the superseded Chapter I legacy release remains inactive. The live `service_student_learning_navigation` definition iterates authorized pilot/production release units and rechecks each student context. It has no two-chapter limit.

Current reviewed main is `d556270e84fcce0e1677f8f03851dc310da645e8`, tree `f7c92ea3b3c5a330b985407e76ac802483e54ce2`. Its `web/physics-7.html` still says Chapters II–VI have not been activated and renders five static, non-clickable “Հետագայում” cards. Home and `course.html` instead render the authorized contexts returned by `get-student-classes`. This establishes a real interface contradiction; it does not establish which exact URL the owner used or which learner-specific prerequisite was unmet.

The owner subsequently signed into the intended student account. Fresh visible UI confirms all six Physics chapters in Home and the current workspace, and reproduces the stale future cards by following the Chapter I topics link. Chapter I has a completed Diagnostic and incomplete Mastery readiness; Chapter II has an existing unfinished Diagnostic; Chapters III–VI expose Diagnostic while Practice/Mastery/Review correctly require that chapter baseline. No assessment was started, answered or submitted by this walkthrough. No student credential, session token, submission, mark or account setting was changed. This bounded read-only chapter review is not whole-account usability acceptance.

## Proposed correction and consumer audit

The shared student navigation renders available units from the existing authorized enrollment/programme group, in curriculum sequence, linking each unit with its exact enrollment, release and unit IDs. It contains no Physics-specific unit count or inferred release. Refreshes with unchanged navigation preserve disclosure state and keyboard focus; removed access clears the old links. Focused task pages hide the chapter selector using the existing focused-task state.

| Consumer | Proposed behavior |
| --- | --- |
| `physics-7.html` | Preserve Chapter I topics/skills and provisional notice; remove stale future cards and expose the authorized chapter list. |
| `assessment.html` | Clearly identify Chapter I; offer other released chapters through the same selector. |
| `progress.html` | Retain Chapter I evidence and link other released units to their own progress tab. |
| `diagnostic.html`, `mastery.html` | Retain existing Chapter I results/entry/rules and show chapter navigation outside focused task execution. |
| `practice.html` | Retain focused-task behavior; no competing chapter controls during the task. |
| Home and governed `course.html` tabs | Preserve their existing context lists; replace the stale not-activated fallback with neutral loading text; add regression comparison with all six released chapters and a second subject/class. |

The first native run (41470416028) passed 396/397 checks and failed the new multi-enrollment compatibility test. Inspection found two separate causes: Practice has a `.practice-topbar` header that the new `.topbar` mount selector missed, and its session-start `history.replaceState` discarded enrollment/release/unit. The shared mount now targets the page header, and the Practice URL keeps its selection. The updated candidate preserves all supplied selection values, including malformed duplicates so the existing gate still fails closed. That failed run remains failed. The second run (41473477683) passed 395/397: it confirmed the remaining Practice mount failure and exposed word wrapping under the expanded enlarged-text check. Both failed runs are preserved. The third run (41476102261) passed 395/397: the Practice chapter list now mounts, but a test readiness locator incorrectly matched both true/false radio options; whole-word checks passed while document bounds exposed the higher-specificity shared `h2` font-size rule. The next candidate targets the named radio and scopes the mobile heading size above that shared rule, retaining rem scaling and the complete overflow assertion. The third failed run is also preserved. The next candidate fixes the header target and the higher-specificity Forest wrapping rule, reserves horizontal word space as font size grows, and retains relative-unit mobile headings so 200% text is still enlarged. Visual inspection of its synthetic enlarged-text captures also found the older topic/summary grid squeezing skill labels into letters; the updated extension CSS wraps by content size and the same four-width/text captures now check the affected words and document bounds.

A released chapter is not the same as an unlocked activity. Practice still requires that chapter's Diagnostic; Mastery still requires its own readiness/retry conditions. No activation, scoring, question content, assessment policy, authorization, backend function or migration changes are proposed.

## Verification and remaining work

The four added native regressions use actual student HTML/modules/styles with synthetic Auth and Edge responses. They compare Home → legacy topics → all five course tabs, exercise all six compatibility routes, retain selected-enrollment isolation, check repeated refresh/revocation, and capture chapter-navigation words/bounds at 390/1280px and normal/200% text. These are isolated browser tests, not signed-in production account evidence.

Initial local verification: 21 focused checks passed; typecheck, all 106 browser-script syntax checks, all 11 browser dependency graphs and diff checks passed. All 1,649 local unit/integration checks subsequently passed, with zero failures/skips/cancellations. First native CI passed 396/397; the corrected source requires fresh CI. These historical local results describe the first candidate, not a waiver of current-source checks. The public production Physics page returned HTTP 200 and still contains the exact stale inactive-chapters claim and all five static future cards.

The owner-supplied student chapter review is complete within the read-only scope above. No submission, marking, personal usability acceptance or full-account certification is claimed. Any release requires the existing PR/main/native/aggregate checks and verified canonical source. Keep B.12.3 open, subject expansion paused and all separate security/URL/Master Admin gates unchanged.
