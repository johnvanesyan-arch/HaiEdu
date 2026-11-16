# Agent handover: teacher workspace and teacher account — 16 November 2026

Open work from the session of 14–16 November 2026. It continues the [14 November handover](agent-handover-20261114.md). Rules for every agent are in [AGENTS.md](../AGENTS.md); `docs/project-status.md` is the authoritative status register. This note is not updated after 16 November.

## 1. John's current instructions (read first)

1. **Nothing is being published yet.** No pull request, merge, deployment or production QA without John's explicit approval for that step.
2. **The work now is design only:** make the new teacher design match what the student account can do today.
3. **Tell John first** about any function or design element that would have to be added on either the teacher or the student account. Do not build it.
4. **Consult the testing and scoring reasoning before suggesting any analytics change.** Sources: the Notion page «HaiEdu — Student Testing Analytics: Mechanism and Current Status», and the repository records it cites (`docs/teacher-skill-evidence-20261031.md`, `docs/teacher-analytics-colours-20261102.md`, `docs/mastery-engine.md`). The outcome so far is in §3.6 of the [wiring audit](teacher-student-wiring-audit-20261115.md).
5. John reads short, plain answers. He asked for no flattery, stated uncertainty, and facts kept apart from opinions.

## 2. State at handover

| Item | State |
|---|---|
| Branch `claude/gifted-maxwell-toy1j4` | Pushed, at `8429a4c`. Holds C1–C3 (teacher fixes approved on 13 November), the design review, specification and prototype, and decision records. No product code after C1–C3. |
| Branch `claude/optimistic-ptolemy-f3gex8` | Pushed, at the commit that adds this note. Stacked on the branch above. Adds the teacher account build, the wiring audit and its test. |
| `main` | At `942a92d` (PR 499, BF-21). It is 26 commits ahead of the point both branches started from. |
| Pull requests | None opened for this work. |
| Merged, deployed, released | Nothing. |
| Production | No write, deployment, setting change, sign-in, email or QA dispatch. Three read-only aggregate SQL counts were run (profiles by role and name; deletion requests by status and reason; earlier class and enrollment counts). No personal data was read. |
| Prototype | `docs/design/teacher-workspace-prototype-20261113.html`, version 10, published privately at https://claude.ai/artifact/7Pw7LFMeAm2X57QHfmbAkB. The published page matched the file when version 10 was published. Read it with the Artifact tool before republishing from a new session. |
| Notion | Not synchronised for any of this work. Nothing is merged, so there is no merged source commit to synchronise to. |
| Environment | `mikehakobyan.com` and `www.mikehakobyan.com` are still in the cloud environment's allowed hosts from the design reference. John has not said whether to remove them. |

## 3. What exists on the branches

### 3.1 C1–C3 teacher fixes (approved; not released)
Unchanged since the 14 November handover. [Record](teacher-workspace-polish-20261113.md).

### 3.2 Teacher account build: T1–T7 and two additions (approved for build; not released)
[Record](teacher-account-20261115.md). In short:
- One «Իմ հաշիվը» entry inside the teacher layout; «Իմ պրոֆիլը» removed; `?view=profile` still opens the account.
- A display name is required for every role: 2–80 characters, outer spaces removed, repeated spaces collapsed.
- A rejected deletion request shows its reason. «Այլ» (Other) replaces legal hold and shows what the administrator wrote.
- The master admin chooses the rejection reason on the page.
- Server source, **not deployed**: one migration and four Edge Functions. Order matters: the migration first. See the record, §4.

Checks on the final tree (local, isolated, synthetic records): `npm test` 1,853 passed; native browser suite 718 of 718; bundle, web-asset and QA-trigger checks pass. CI has not run, because no pull request is open.

### 3.3 Wiring audit (no product change)
[Audit](teacher-student-wiring-audit-20261115.md) and the connected test `tests/teacher-student-analytics-wiring.test.mjs`.
- Course writing, review and return, the teacher's own tasks, materials and cancellation are connected in both directions.
- Nothing records that a student opened a material.
- Invitation → join → roster was traced in code but not run end to end.
- Teacher analytics reads the same sessions and answers as the student page.
- The class header's «աջակցություն է պետք» count still uses an older server number that disagrees with the documented rule from 31 October. John has not asked for it to be fixed.

### 3.4 Prototype check scripts
`docs/design/prototype-checks/verify.mjs` and `paths.mjs` are the scripts used to check the prototype. Run them one at a time:

```bash
node docs/design/prototype-checks/verify.mjs "$PWD" "$PWD/docs/design/teacher-workspace-prototype-20261113.html" /tmp/prototype-check
```

```bash
node docs/design/prototype-checks/paths.mjs "$PWD" "$PWD/docs/design/teacher-workspace-prototype-20261113.html"
```

`verify.mjs` renders every screen, data state, teacher type and width (340 renders) and runs the account screen's behaviour checks. Update its expectations whenever the prototype's wording or behaviour changes.

## 4. Decisions John has made

| Date | Decision |
|---|---|
| 13 Nov | C1–C3 approved. Support counts per class, not one cross-class button (option B). |
| 14 Nov | Teachers use both phones and computers. Current priority: the teacher's own account. All roles are to be aligned to one source of truth later. |
| 14 Nov | No role may save an empty name; 2–80 characters. Existing unnamed accounts are not asked for one. The main content reviewer may stay unnamed; a future subject-matter reviewer invitation must require a name. |
| 14 Nov | Teacher-first exception on the shared account page. |
| 14–15 Nov | Show the reason for a rejected deletion request. «Այլ» replaces legal hold, with the administrator's own text. |
| 15 Nov | Exception for the master admin's rejection step. John accepted the Armenian wording of the new account text. |
| 15 Nov | T1–T7 with the two additions approved for the build. |
| 15 Nov | Not publishing yet. Design-only scope, as in §1. |

## 5. Waiting for John

**Asked and not yet answered:**
1. Go-ahead to correct the prototype so it shows only what the product does today (the proposal in §6). John paused this to ask about the scoring reasoning and has not answered since.
2. Acceptance of one corrected sentence in the built account view: «Անունը տեսնում են ձեր աշակերտները՝ ձեր ուղարկած առաջադրանքներում և նյութերում, ինչպես նաև դպրոցի ադմինը և հարթակի ադմինը։» It replaced an accepted sentence that wrongly left students out.
3. Acceptance of the new wording on the master admin's rejection step (listed in the account record, §3).
4. Which of the nine possible new functions he wants, if any (audit §4.2).
5. Whether to check invitation → join → roster end to end, and how.
6. Whether to run any production QA suite.

**Still open from the 14 November handover:** the pull request for C1–C3; the scope of the phone menu and page header (A1/A2); phone menu items; pilot notice; one assign entry (B8); review button wording; C4–C6; the old preview page; teacher validation of the prototype.

**No longer open:** the display name rule; device use; the 0.5-day investigation (the audit answered it: the cross-class read covers submitted course writing only).

## 6. The next step, once John agrees

Correct the prototype. It currently shows several things the product cannot do. Details and tables are in the audit, §4.1 and §4.2.

1. **Fix five mismatches:** the invented "three weak skills" support rule; a percentage in every skills cell; recent accuracy shown for everyone; writing tasks in the student panel's history; no sign of the student's stage in the unit.
2. **Put back what today's roster has:** «Հաջորդ առաջարկություն», the chapter-review summary, and the remove-student action for personal-account teachers.
3. **Mark as "not available today"** instead of drawing as working: support counts on Home; a class's current unit; returned and reviewed work across classes; own tasks in the cross-class queue; submission counts for course writing; each recipient's state; a student's writing history; one list across all units; any "opened" state.

Then re-run the prototype checks, republish to the same link and record the version in the design review.

## 7. Errors made in this work, so they are not repeated

1. **The prototype presented data that does not exist as if it did** (versions 4–10). Check each element against the service that would supply it before drawing it.
2. **"The teacher sees who opened a material" was stated and was wrong.** Opens are not recorded.
3. **A prototype review claimed a locked deletion state for teachers.** An administrator cannot approve a teacher's deletion request, so that state is reached only by students.
4. **A sentence was presented for acceptance before its facts were checked.** Students do see the teacher's name.
5. **Analytics changes were suggested before reading the documented reasoning.** Two of three "findings" were documented decisions.

## 8. Before any pull request

1. Ask John to confirm the pull request and that no other agent is merging.
2. Rebase both branches on `main`. Expect conflicts in the top entries of `README.md`, `docs/project-status.md`, `docs/sprint-roadmap.md`, `docs/backlog.md` and `docs/api-contract.md` (keep both sets, newest first) and in `web-build/current.json`.
3. After the rebase run `npm run build:teacher` and `npm run build:web-assets`, and commit the result. Start from a clean `web-build/` so no unused intermediate build is committed.
4. `main` changed `.github/workflows/ci.yml` and added fresh-database and local-staging checks. Check whether the new migration `20261115093000_deletion_rejection_note.sql` has to be registered with them.
5. Re-run `npm test`, the full browser suite, `npm run check:teacher-bundle`, `npm run check:web-assets` and `node scripts/check-browser-qa-triggers.mjs`.
6. Suggested order: C1–C3 first, then the account build. Each merge needs John's approval.
7. `main` now has a local staging runner (`scripts/run-local-staging.py`, BF-21) with fictional accounts and end-to-end journeys. It may be the right place to check invitation → roster. It was not examined in this session.

## 9. Working notes

- **Install first:** `npm ci`. A new container has no `node_modules`.
- **Run the suites one at a time.** `npm test` takes about 5.5 minutes and the browser suite about 9. Running them together causes timeouts.
- **Clean up after tests:** they leave `scripts/releases/__pycache__/` and `artifacts/`. Neither is ignored by git. Delete both before committing.
- **Teacher account fixture:** `tests/fixtures/teacher-account-browser.mjs` wraps the teacher performance fixture and adds the account services.
- **Connected student and teacher fixture:** `tests/fixtures/learning-acceptance.mjs` runs the real student endpoints and the teacher analytics reader on one database. The reader runs in its own context, so compare its lists as text; `assert.deepEqual` on its arrays fails.
- **Edge Function tests** strip imports and inject bindings. A new shared import must be added to the bindings in `tests/fixtures/teacher-task-privacy-api.mjs` and `tests/teacher-role-boundary.test.mjs`.
- **Account view code loads on demand** (`import('./teacher-account.mjs')` in `teacher.js`). New modules it imports need trigger paths in the production QA workflows; `check-browser-qa-triggers` reports what is missing.
- **Unsaved changes in the account view** use the teacher page's browser confirmation, not an on-page dialog. On-page dialogs are item D, platform-wide and not approved.
- **Headless Chromium shows dates in English.** This is not a product defect.

## 10. Other open work (not touched in this session)

Check the current status register first, because `main` has moved: BF-16 activation and observation; BF-21 follow-ups; PR 43; the Dependabot pull requests; draft PR 407; owner usability acceptance of the student design phases; Supabase egress.
