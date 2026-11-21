# School teacher's roster, student panel and Skills tab: local implementation (21 November 2026)

**Current status:** Released in PR522; backend integration verified within the recorded local cases. Owner acceptance remains provisional. The [verified release record](teacher-school-release-20261121.md) supersedes all preparation-only and pending-release statements below; earlier evidence remains historical.

**Release:** merged source `5dd96d5d9f67c7dcbf95934ce2018f450cfc3928` is verified on all three public addresses. I-2 remains unactivated. Production QA not run (paused by owner).

**Scope.**
- Built: the school teacher's roster row, student panel and skill cards, to the V12 reference with the V13 Chapter I decisions and plan revision 2 (design branch `claude/teacher-v13-i2-design`, plan commit `2f6446c`, design follow-up `e8c067b`).
- John approved W1, W2, L1 and L2 on 21 November.
- Personal-account teacher: existing layout and scoring retained; the shared keyboard repair and fixed numeric date presentation apply to both teacher types.
- Out of scope: the other teacher screens.

## Branches

| Branch | Content | Base |
|---|---|---|
| `claude/teacher-school-view` (local) | Teacher change only. No I-2 code and none of the design branch's unrelated teacher-account work. | `origin/main` `f7f39df` |
| `local/teacher-i2-rehearsal` (local, never to be pushed) | `main`, then the I-2 build and Codex's follow-up cherry-picked one commit at a time (the teacher-account ancestry of `4e0965b` left out), then the teacher branch | `origin/main` `f7f39df` |

**Teacher branch commits:**
1. `84f0203` fix(keyboard): keep focus in a modal when its container has focus.
2. `9d88a05` feat(teacher): school view helpers and saved-result renderer.
3. `2e4a474` feat(teacher): school roster row, student panel and skill cards (V12/V13).
4. `3db03e5` build: rebuild teacher bundle and web assets.
5. `ba56208` test: scope Skills-tab legend lookups to the legend.
6. This record (docs).

## What changed

**Roster row (school only).** Three separate facts:
- this class's recorded check: pass or fail and the date;
- the support flag: the newest classified red estimate, with kind of work and latest included answer, «ստուգման ավարտից առաջ» only from valid full timestamps, and «Դիտել ևս N հմտություն» counting distinct skills;
- the class-based next step: two approved school-only texts, plus active practice or review progress.

The support count rule is unchanged (`studentHasNeedsSupport`).

**Student panel (school only):**
- Check box: the saved result.
  - Several scored groups: the saved combined score once, then all groups (L2).
  - Single-group deduplication only when the values match.
  - Older checks: counts only from one matching session, otherwise the percentage.
  - An unreadable saved record stays neutral.
- Next step and review count.
- Support evidence: every red estimate separately.
- Recent accuracy: from the returned sample, when supplied.
- Skill cards: red, yellow, rest; every estimate separate, with its own contract.
- Review history.
- Recent work history, with each attempt's saved score and contract, and the W1 notice «Ցուցադրվում են այս դասարանի վերջին աշխատանքները։».
- The review-thresholds note, visible.
- Today's older details in «Լրացուցիչ մանրամասներ», closed, after the history (W2, L1): review figures, the review-skill table and recent answers. The class-derived attempt cards are not reintroduced.

**Skills tab.** Unchanged semantics. A cell opens and focuses that skill's card.

**Backend: no change.** Existing response fields only; no Edge Function or migration change.

**Personal-account teacher — original implementation comparison (before final date formatting):**
- Today's roster, panel and Skills tab code paths are untouched.
- `skillEvidenceMarkup` output is byte-identical to `main` on 9 compared inputs.
- A side-by-side render against `main` (390, 768 and 1280 px; 100% and 200% root text) shows identical markup, computed box sizes and Tab focus order (42 fields, 0 differences).

**Keyboard fix (shared, retained under the owner's finalization instruction).**
- **Defect:** in today's real page (both teacher types), clicking ordinary text in the student panel puts focus on the dialog container. Shift+Tab then left the panel for the inert page body.
- **Fix:** `createModalFocus.trapTab` in `web/keyboard-focus.mjs` now treats the container like focus outside its controls. This is the same rule as the prototype fix in V13 revision 3.
- **Consumers:** only the teacher student panel uses `createModalFocus`.
- **Regressions:** the regressions for both teacher types fail on the previous code and pass now.
- **Personal behaviour changes:** keyboard containment is repaired; finalization also changes date presentation to the same numeric format used for school teachers. Layout, actions and scoring are retained.

## Saved-result guard fix (21 November, after Codex's independent review)

**Finding RESULT-GUARD-1.** A saved result record the page cannot read could disagree across views:
- the roster trusted a raw `passed: true` and showed a pass;
- the panel fell back to the stored status, and could say «Գլխի կրկնությունը պարտադիր չէ։» while a review was required.

Codex found no normal current writer producing such a record. The real analytics builder does pass one through unchanged.

**Fix (`f078819`, Codex's proposed patch applied unchanged):**
- one validated `schoolCheckStatus` decides pass or fail for the roster, check box and history;
- a saved record decides only when it is readable;
- an unreadable record is neutral («Տվյալը հասանելի չէ», existing wording), with no fallback to the stored status or the raw score;
- the stored status applies only when no saved record exists.

**Regressions:**
- Codex's test, integrated as `tests/teacher-school-view-unreadable-result.test.mjs`: 4 fail and 4 pass on the previous source; 8/8 pass with the fix;
- a new browser case on the real compiled page, which fails on the previous source.

**Generated outputs:** rebuilt in `76c9847`.

**Checks after the fix:**

| Check | Result |
|---|---|
| `npm test` | 1,910/1,910 |
| Browser suites, one at a time | `teacher-school-view` 16/16, `teacher-skill-evidence` 8/8, `teacher-matrix-accessibility` 9/9, `keyboard-focus` 23/23, `teacher-mobile-review-layout` 8/8, `teacher-feedback` 6/6, `teacher-performance-readiness` 2/2, `learning-context` 9/9, `forest-staff` 20/20, `built-web` 35/35, `student-course-page` 11/11, `student-home` 46/46, `learning-acceptance` 12/12 |
| Other checks | `check:teacher-bundle`, `check:web-assets` (41 releases, 557 files), `check-web-syntax` and the QA-trigger check pass |

The full 54-suite browser run was not repeated after the fix.

## Verification (teacher branch, before the guard fix)

| Check | Result |
|---|---|
| `npm test` | 1,902/1,902 pass; 0 cancelled or skipped |
| Native Chromium, all 54 browser suites one at a time | 722 pass, 0 fail. `teacher-matrix-accessibility` first failed 3 tests on page-wide text lookups now matching the new support flag; the lookups were scoped to the legend (`ba56208`) and it passes 9/9. |
| New `tests/teacher-school-view.test.mjs` | 13 tests (all plan revision 2 §7.1 cases) |
| New `tests/browser/teacher-school-view.browser.test.mjs` | 15 tests:<br>• roster at 390, 768 and 1280 px, normal and 200% root text (with computed-size checks);<br>• panel at three widths, 200%;<br>• older and several-group results;<br>• keyboard containment including after text clicks, Escape and Close focus return, support and skill-cell focus;<br>• late responses across students, class change and sign-out;<br>• personal view at three widths, 200% |
| `check:teacher-bundle`, `check:web-assets`, `check-web-syntax` | pass |
| `check-browser-qa-triggers` | pass, no omissions |
| Production QA scripts | none reads the changed wording or hooks; preserved ids: `#rosterAnalyticsCard`, `#matrixUnitTitle`, `#teacherUnitFilter`, `#rosterMessage`, `#rosterSchool` |

**Affected production QA** (trigger dependencies; not run, paused by owner):
- `chapter-ii-…` to `chapter-vi-pilot-read-acceptance`;
- `english-unit1-…` to `english-unit3-pilot-read-acceptance`;
- `mobile-browser-qa`;
- `resource-assignments-acceptance`;
- `sprint-14-actions-qa`;
- `sprint-14d-analytics-qa`;
- `teacher-feedback-acceptance`.

`assessment-reporting.mjs` and `keyboard-focus.mjs` are shared, so student and admin asset chunks were rebuilt; their exports used there are unchanged.

## Real pages with the local backend: passed in Codex's local staging (21 November)

**Not run in this session.** `main`'s BF-21 database fixture builds pg_cron from `codeload.github.com/citusdata/pg_cron`, which returns HTTP 403 here (GitHub access to that repository is not enabled; not retried or worked around).

**Codex ran it in its owned local staging.** Source: independent review handoff, archive SHA-256 `9e01f90b…0dba`, all included checksums matching; `review-summary.json` `connectedIntegration.status` = `PASS_FOR_RECORDED_LOCAL_CASES`.

| Run | Commit | Result |
|---|---|---|
| Baseline (`baseline-run5`, run `db30c16a…`) | teacher `932b087` | PASS |
| I-2 (`i2-run2`) | rehearsal `1390f1e` | PASS |

**Baseline run (`932b087`).** Real local Auth, PostgREST and Edge Functions; real API responses, no mocked responses. Covered:
- two fictional schools: the school teacher's roster, panel and Skills tab (cell to card focus) with real class evidence (14 learning sessions, 28 answers);
- cross-school detail requests refused with 403, in both directions;
- a real successful (200) student-detail response held across sign-out and discarded;
- all test sessions closed and owned cleanup verified.

**I-2 run (`1390f1e`).** Through the real pages:
- one learner failed the older check at 16/20 (saved rule `phy7-u01-v1`, raw 80%);
- another learner passed the older check at 18/20;
- the required review carried over;
- the second check passed under I-2, saved as 15/18 · 83% (raw 75%, rule `phy7-u01-i2-v1`);
- eight later S07 practice answers, one correct;
- the personal teacher's existing panel displayed both the older 90% result and the saved I-2 15/18 result; keyboard containment passed for all three fictional personal-class students;
- school administrator mastery groups stayed separate by saved rule version, while the two practice sessions remained in one comparable group.

**Seeded data (disclosed by Codex):** synthetic schools, users, curriculum, item banks, runtime contracts and initial readiness. S07 cumulative readiness was seeded weak after the old checks, so that practice could start. Answers and sessions were entered through the real pages.

**Local setup notes (Codex):**
- the local gateway was extended, outside product source, to expose `get-teacher-student`;
- storage and mail containers were stopped after migrations, for disk space, so those journeys are not verified;
- earlier failed driver runs (disk capacity, a date-format assertion, a missing gateway route, an S07 readiness seed) were setup issues, not accepted evidence.

**Not covered by these connected runs:**
- the baseline fixture had no personal teacher; the separate I-2 rehearsal **did** exercise one, as recorded above. The earlier version of this delivery note incorrectly described the personal path as untested;
- recent accuracy with a value: it was empty in the fixtures; covered by unit and browser tests;
- the saved-result guard fix `f078819`, which came after these runs. It is presentation-only and verified by unit and browser tests here; the connected runs were not repeated on it;
- Safari, real devices, screen readers and production.

## Local rehearsal branch (I-2 plus the teacher view)

**Build.** `origin/main`, then 13 commits cherry-picked (`-x`) in order: the Chapter II and I rehearsal commits, the I-2 build `92351ab` and `4e0965b`, and Codex's six commits `6461df4` … `a8e7bb1`.
- Conflict resolution:
  - I-2 documents: took the commit's version;
  - the status register: kept `main`'s and inserted only the I-2 entry, never the teacher-account entries;
  - code: no conflicts;
  - generated outputs: rebuilt once.
- Then the teacher branch was merged.
- **Excluded:** none of `web/teacher-account.mjs`, `web/account-core.mjs` or the deletion-note migration is present.
- **Archive:** compared with `main`, the rehearsal web archive is append-only (22 additions) and its integrity check passes. The CI history check, which compares a commit with its own parent, is not meaningful for this local branch.

**Checks at merge `1390f1e`:**
- `npm test`: 1,940/1,940.
- Native Chromium:
  - `teacher-school-view` 15/15;
  - `teacher-skill-evidence` 8/8;
  - `teacher-matrix-accessibility` 9/9;
  - `keyboard-focus` 23/23;
  - `student-home` 48/48;
  - `student-course-page` 13/13;
  - `learning-acceptance` 12/12.
- `check:teacher-bundle` passes.
- QA-trigger check: no omissions.

The remaining 47 browser suites ran on the teacher branch only, not on the rehearsal branch.

## Handoff findings before finalization (historical)

1. **Local backend.** Passed in Codex's local staging for the recorded cases (see above). Not repeated on the guard fix `f078819`.
2. **Keyboard fix.** It changes personal-view behaviour, as a defect fix (above). John to confirm.
3. **Review history.** The V12 list drops today's cycle, session and question-count columns from the review history table. Proposal: keep that table inside «Լրացուցիչ մանրամասներ» too (would need John's acceptance).
4. **Active-work progress.** Shown only for practice and chapter review, which have approved texts. A diagnostic or mastery check in progress shows only the next step.
5. **Roster toolbar.** V12's roster filter chips and stat cards are not built (outside these three views); today's search and count stay.
6. **Skill card summary.** It names the skill without its code (V12); today's cards showed the code. Ask John if the code should stay visible.
7. **Dates (corrected 21 November).**
   - **What the page does:** formats dates with `toLocaleDateString('hy-AM')`.
   - **What the earlier statement got wrong:** this record said that gives `DD.MM.YYYY` in Chromium. It does not. The test Chromium has no Armenian locale data (`supportedLocalesOf(['hy-AM','hy'])` is empty, and the resolved locale is `en-US`), so 12 November 2026 renders as `11/12/2026`, month first, which a reader can take for 11 December. `12.11.2026` is what Node gives, because Node has full ICU.
   - **Not new:** today's teacher page also formats dates this way («Վերջին ակտիվություն» and recent answers).
   - **If a fixed format is wanted:** agree a deterministic format (for example `DD.MM.YYYY` built from the date parts) and verify it. That would be a decision for John.
   - Not checked in Safari or on devices.
8. **History limit.** History still shows the server's 20 most recent sessions, presented as recent (W1).

Owner usability acceptance: provisionally accepted for the school teacher's roster, student panel and Skills tab. This does not approve the wider teacher redesign or activate assessment changes.


## Finalization — 21 November 2026

John asked Codex to finish the improvement, fix remaining problems and make bounded implementation decisions. The teacher-only candidate retains the approved three views and existing server contracts. No migration, Edge Function change, assessment-rule activation or unrelated teacher-account work is included.

**Closure decisions and fixes:**
- Keep the shared panel keyboard repair for both teacher types. A final native check caught a second focus bug: closed review-details contents still returned layout rectangles, so Shift+Tab targeted a hidden region. Modal control discovery now excludes closed-details contents while retaining their summaries; school/personal wrapping, opening/closing details and focus return pass.
- Use deterministic `DD.MM.YYYY` dates and `DD.MM.YYYY HH:mm` times in the browser's local timezone. This removes the ambiguous US fallback when Armenian locale data is missing. Ordering and timestamp comparisons are unchanged. Both teacher types, including invitations, use the helper.
- Restore cycle, session, question-count and completion-time columns under the existing closed «Լրացուցիչ մանրամասներ» section. Its horizontally scrollable table is keyboard reachable. The simpler review list remains visible above it.
- Keep skill names in collapsed school cards and retain the full skill code inside each expanded card.
- Keep the unreadable-result guard: roster, check box and history stay neutral; an unreadable record cannot imply that required review is optional.
- Add the new date helper to all affected QA workflow dependency lists. Production QA remains paused.

**Source:** frontend closure `1d5bd33a`, QA dependency follow-up `bb304a34`, VM fixture repair `544164eb`, and final modal repair `2092749a`, based on the verified handoff `b2e03da`. The source remains subject-neutral; support counts and evidence-contract grouping are unchanged.

**Verification:** all 1,912 code tests and ten build/type/syntax/dependency/privacy checks pass. The full native run covers 729 checks; 728 initially passed, with one unrelated fixed-sleep reporting-test failure. Test-only `6c1a22ab` waits up to two seconds for actual receipt instead of sleeping 50ms, while retaining the 500ms action limit, 10-second collector delay and abort/drain assertions. The complete reporting browser file then passes 5/5. Thus all 729 cases are covered across runs; this is not described as one green full local run. Exact-head CI must still pass. All teacher checks pass at 390/768/1280 px, normal/200% text, including school/personal local dates in Yerevan and Los Angeles.

Seven connected teacher phases pass with real local Auth, PostgREST, Edge Functions and compiled pages: non-null diagnostic accuracy (100%, 20 answers), school/personal views, cross-school refusal, a held successful response discarded after sign-out, three unreadable-report variants staying neutral, and complete metadata restoration. These used 40 actual diagnostic answers plus two explicitly seeded historical mastery headers; native old-path mastery creation was not claimed in this teacher-only run.

The separate I-2 rehearsal passes four native phases: old 16/20 failure and 18/20 pass; required review; saved I-2 15/18 · 83% with raw 75%; one S07 practice estimate spanning two sessions/16 answers; school/personal history and school-admin groups. It remains local. Both runs closed all Auth sessions and removed owned resources. Backend/data evidence comes from `544164eb` and `fd8918c1`; the later modal-only change is covered by final native regressions, including five checks on the final local I-2 composition `78adeb87`.

**Separate existing defect:** the first teacher-only attempt exposed the old learner-start query against a nonexistent lifecycle column. Read-only inventory confirmed both invalid queries in live endpoint version 34. [PR521](https://github.com/johnvanesyan-arch/HaiEdu/pull/521) contains the minimal independent repair and its actual-schema/native learner evidence. This teacher candidate does not import I-2 or deploy that endpoint. [Sanitized teacher evidence](evidence/teacher-school-view-final-20261121.json).

**Release boundary:** repository review, required PR checks, owner merge approval, exact-build failure-report registration and release verification remain pending. Registering the new approved browser build `7ef5840df5ede544ecfea25f2a01e44b35599afb594b36e7fb6c754a7ae0dae9` for 30 days preserves the existing failure-alert system. The [prepared one-build statement](evidence/teacher-school-build-registration-20261121.sql) requires approval and does not run automatically. After registration, read back its expiry and reset the existing reminder to 21 days after registration. No production QA, production sign-in or hosted settings change was performed.

**Scope limits retained:** roster filter chips and wider teacher screens remain separate; active-progress wording covers practice and chapter review only. History remains the server's 20 most recent sessions, labelled accordingly. Chromium evidence is not Safari, device or screen-reader certification. Local Storage and mail delivery are outside this teacher read/presentation exercise.
