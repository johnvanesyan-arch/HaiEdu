# Student refinement production QA: causes and corrections — 6 November 2026

This record closes the production QA failures recorded on 5 November for Sprint 16.5B (PR412–PR419). Both Resource-assignment causes were defects in the production acceptance scripts, introduced by my PR416 and PR419 student changes. The product behaved as designed. The Chapter and English Unit 2 failures were a one-off and passed on re-run.

## Causes (from job logs, edge logs and one read-only database lookup)

| Failure | Builds | Cause | Correction |
|---|---|---|---|
| Resource: writing-delivery stage threw after 204/204 recorded checks | `b9cde5b`, `9128da5`, `071e5e5`, `58796b1` (last pass `e25cebe`) | Since PR416, My work opens on «To do». The writing step reuses an approved task the QA learner had already finished (work state `reviewed`), so the new assignment is listed under «Returned». The step waited 30 s for its button on the default tab. Edge logs: `get-student-work` 200 at 06:19:47 UTC on 6 Nov, no writing `open`, cleanup 30 s later. Database: assignment `87052cf9…` learner work state `reviewed`. | [PR423](https://github.com/johnvanesyan-arch/HaiEdu/pull/423) `b6e2bef`: the step chooses the assignment's state tab, using the page rule `workBucket`, and retries if the page falls back to the source lists. The browser regression covers both modes. |
| Resource: 3 × «unexpected browser mutation blocked» | `071e5e5` | PR419's read-only `get-student-work` call was not on the script's browser request list. The page fell back to the source lists. | [PR422](https://github.com/johnvanesyan-arch/HaiEdu/pull/422) `58796b1`: allows only the exact read shape (student, `inbox`, empty or `{state: current\|history}`). A unit test pins accepted and rejected shapes. |
| Chapters II–VI and English Unit 2: one check each | `071e5e5`, 17:41–18:14 UTC on 5 Nov | **Not determined.** PR419 changed nothing these suites use, and no deploy happened during the window. Edge function logs show no server errors. English Units 1 and 3 passed immediately after. The failing check names are only in the run artifacts, which this environment cannot download. | None needed so far: Chapter III and English Unit 2 passed on `58796b1`. |

Product behaviour is unchanged: finished work is not listed as «to do».

## Verification on production (designated QA fixtures, read-only except owned test records)

- `58796b1`: Chapter III (dispatched with owner approval), English Units 1–3 and Mobile pass. Resource still failed at the writing step (the second cause).
- `b6e2bef`: Resource **passes 329/329**. The writing step opens the exact pinned task for School A and School B, existing writing is unchanged, and owned records and all sessions are cleaned up. English Units 1–3 and Mobile also pass.

## Limits

- Chapters II, IV, V and VI have not run since their 5 November failures. Their pass on a later build is not yet evidenced.
- The one-off cause of the 5 November chapter window remains unconfirmed.
- No owner usability acceptance has been given for PR412–PR419.

## Process lesson (recorded at the owner's request)

All four post-merge failures in this sprint came from student UI changes that broke assumptions in production acceptance scripts:
- PR417's second `.course-tabs`;
- PR416's default tab;
- PR419's new request;
- a lost brace in PR417.

Those scripts cannot run before merge (production credentials stay out of PR checks). From now on, every student-facing PR searches `scripts/` for the selectors, page views and endpoints it changes, and records the result in the PR.
