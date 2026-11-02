# Student chapter availability — 2026-11-02

Status: inconsistency confirmed; correction prepared for review. Production has not been changed by this investigation. Native CI and the exact signed-in student journey remain pending.

## Confirmed cause and scope

The owner reported Physics 7 chapters visible in some student areas and blocked in others. Fresh read-only Supabase metadata shows active pilot releases for all six units, PHY7-U01 through PHY7-U06; the superseded Chapter I legacy release remains inactive. The live `service_student_learning_navigation` definition iterates authorized pilot/production release units and rechecks each student context. It has no two-chapter limit.

Current reviewed main is `d556270e84fcce0e1677f8f03851dc310da645e8`, tree `f7c92ea3b3c5a330b985407e76ac802483e54ce2`. Its `web/physics-7.html` still says Chapters II–VI have not been activated and renders five static, non-clickable “Հետագայում” cards. Home and `course.html` instead render the authorized contexts returned by `get-student-classes`. This establishes a real interface contradiction; it does not establish which exact URL the owner used or which learner-specific prerequisite was unmet.

The available browser currently shows the Test Teacher 1 workspace, not a student session. No student credential, session token, submission, mark or account setting was changed. The exact student account and its per-chapter learning state have not been verified. This inspection does not establish whole-account usability acceptance.

## Proposed correction and consumer audit

The shared student navigation renders available units from the existing authorized enrollment/programme group, in curriculum sequence, linking each unit with its exact enrollment, release and unit IDs. It contains no Physics-specific unit count or inferred release. Refreshes with unchanged navigation preserve disclosure state and keyboard focus; removed access clears the old links. Focused task pages hide the chapter selector using the existing focused-task state.

| Consumer | Proposed behavior |
| --- | --- |
| `physics-7.html` | Preserve Chapter I topics/skills and provisional notice; remove stale future cards and expose the authorized chapter list. |
| `assessment.html` | Clearly identify Chapter I; offer other released chapters through the same selector. |
| `progress.html` | Retain Chapter I evidence and link other released units to their own progress tab. |
| `diagnostic.html`, `mastery.html` | Retain existing Chapter I results/entry/rules and show chapter navigation outside focused task execution. |
| `practice.html` | Retain focused-task behavior; no competing chapter controls during the task. |
| Home and governed `course.html` tabs | Preserve their existing context lists; add regression comparison with all six released chapters and a second subject/class. |

A released chapter is not the same as an unlocked activity. Practice still requires that chapter's Diagnostic; Mastery still requires its own readiness/retry conditions. No activation, scoring, question content, assessment policy, authorization, backend function or migration changes are proposed.

## Verification and remaining work

The four added native regressions use actual student HTML/modules/styles with synthetic Auth and Edge responses. They compare Home → legacy topics → all five course tabs, exercise all six compatibility routes, retain selected-enrollment isolation, check repeated refresh/revocation, and capture chapter-navigation words/bounds at 390/1280px and normal/200% text. These are isolated browser tests, not signed-in production account evidence.

Initial local verification: 21 focused checks passed; typecheck, all 106 browser-script syntax checks, all 11 browser dependency graphs and diff checks passed. All 1,649 local unit/integration checks subsequently passed, with zero failures/skips/cancellations. Required native CI remains pending at this preparation checkpoint. The public production Physics page returned HTTP 200 and still contains the exact stale inactive-chapters claim and all five static future cards.

The exact student-session review needs the intended student to be signed in. Any release requires the existing PR/main/native/aggregate checks and verified canonical source. Keep B.12.3 open, subject expansion paused and all separate security/URL/Master Admin gates unchanged.
