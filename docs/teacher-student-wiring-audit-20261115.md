# Teacher–student wiring audit — 15 November 2026

**Asked by John:** confirm that each teacher tool is connected to its counterpart on the student side, that teacher analytics is connected to the student page, and that the new teacher design can be connected to the same data.

**Status:** audit only. No product code changed. One connected test was added. Nothing is merged, deployed or released. Owner usability acceptance: not given.

## 1. How this was checked

| Level | What it means | Used here |
|---|---|---|
| Code trace | Both ends read and compared | Every row |
| Connected isolated run | The real server code and, where stated, the real pages, on an in-memory PostgreSQL schema with synthetic teachers and students | Rows 1–5 and 7 |
| Production run | The paused production QA suites with designated test accounts | Not run (paused by owner) |

All results are isolated. None is a signed-in production check. The branch is `claude/optimistic-ptolemy-f3gex8`; the flows in rows 1–7 are the same code as `main` except the teacher account work.

## 2. Teacher tool → student page → back to the teacher

| # | Connection | Result | Evidence |
|---|---|---|---|
| 1 | Teacher assigns a course writing task (գրավոր աշխատանք) to a class or selected students → it appears for exactly those students → the submission reaches the teacher's review queue | **Connected** | Connected runs with the real teacher and student pages: `writing-assignments.browser.test.mjs` («teacher selected delivery, lost acknowledgement and student exact-task writing use actual SQL and Edge»): a selected student receives the task, an unselected classmate receives nothing, the student writes and submits, and the teacher's queue then holds one item. Server chain: `writing-assignments.test.mjs` (7 tests). |
| 2 | Teacher grades, comments or returns → the student sees it, revises and resubmits → the new version reaches the teacher with history kept | **Connected** | `written-work.browser.test.mjs` («actual student and teacher workspaces complete draft, submit, return, revision, grading and feedback against SQL»); `teacher-feedback.browser.test.mjs` («explicit publication reaches the learner once»); server: `written-work.test.mjs`, `teacher-feedback.test.mjs`. |
| 3 | Teacher assigns one of their own tasks (text, PDF or link) → the student opens, answers or uploads → the teacher reviews → the student receives the review | **Connected** | `teacher-task-authoring.browser.test.mjs` («custom task send pins selected recipients…»), `student-teacher-tasks.browser.test.mjs` (8 tests), `teacher-task-review.browser.test.mjs` («real teacher entry… return, revision and published history use actual SQL/Edge»; «student task and teacher review render the same frozen formatted instructions safely»); server: `teacher-task-delivery`, `teacher-task-student-work` (all nine task/answer combinations), `teacher-task-review`. |
| 4 | Teacher assigns a material (PDF or link) → it appears in the student's «Իմ աշխատանքները» and opens | **Connected, one way** | `resource-assignments.browser.test.mjs` («teacher class send… arrives in actual My work page»; «…actual My work downloads exact PDF»; a selected send excludes an eligible classmate). **Nothing comes back to the teacher:** the system does not record that a student opened a material (the only recorded events are "assigned" and "cancelled"). |
| 5 | Teacher cancels something sent → the student no longer has it; the teacher keeps the record and the reason | **Connected** | Writing: «cancellation is audited and retryable, preserves writing, and removes current delivery». Materials: «cancel is reasoned and idempotent… and blocks later opens». Own tasks: «audited cancellation preserves submissions/feedback and closes new writes». The student's cancelled history: `student-work-handler.test.mjs`. |
| 6 | Teacher invites students or gives a join code → the student joins → the student appears in the roster | **Traced in code; not run end to end** | Acceptance creates the class enrollment that the teacher's roster reads (`service_accept_student_invitation_14c`, `service_redeem_institutional_join_code_14c` → `institutional_class_enrollments` → `institutional-teacher-dashboard.ts`). The existing tests check each service against stand-ins, not the whole chain on one database. The production action suite creates unused invitations and codes but does not redeem a student one. |
| 7 | The student does a diagnostic, practice and assessments → the teacher's class page shows the results | **Connected, with the findings in §3** | New connected test `tests/teacher-student-analytics-wiring.test.mjs` (real student endpoints and the real teacher analytics reader on one database). |

The full suites that contain the tests named above passed on this branch on 15 November: 1,847 unit and integration tests and 718 native browser tests.

**Boundaries checked by the same tests:** an unselected classmate receives nothing; another class, school or teacher cannot read or send; a student's evidence does not reach another class's teacher.

**Limit of the page-level runs.** Several of them mount the real assign and review modules in a test page that loads the teacher styles but not the full teacher layout. The entry from the real `teacher.html` into those modules is covered separately (`teacher-review.browser.test.mjs`, `teacher-today.browser.test.mjs`).

## 3. Teacher analytics and the student page

### 3.1 What matches (connected test)

For one synthetic student in one class and unit:

| Item | Student page | Teacher class page |
|---|---|---|
| Diagnostic result | 0 of 3 | 0 of 3 |
| Session list (kind, state, score) | identical | identical |
| Number of answers behind each skill | identical | identical |
| A skill's percentage and status while it has one kind of evidence | 39%, too few observations | 39%, too few observations |
| While an assessment is open | results hidden | the open session shown without a score |
| Another class's teacher | — | receives none of this student's answers |

Both sides read the same sessions and answers, keyed by the same class enrollment, curriculum release and unit, and use the same scoring model.

### 3.2 Finding A1 — the "needs support" count ignores a student once they have practised (defect)

Reproduced with the real code. A student answers every diagnostic question wrong, then every practice question wrong on the same skill.

| Where | What it shows |
|---|---|
| Student page | The skill is «Աջակցություն է պետք», 24% |
| Teacher page, roster filter «Աջակցության կարիք» and the summary cards | The student **is** counted |
| Teacher page, class header «N աջակցություն է պետք», and the Home total | The student is **not** counted |
| Teacher page, suggested next step for the student | "Monitor" instead of "practise this skill" |

Cause: once a skill has results from two kinds of work (diagnostic and practice), the server keeps them separate and gives the skill no single status. The server's support count and its suggested step look only at the single status, so they skip that skill. The page's own filter looks at each separate result and counts it. Two rules for the same label are used on one screen.

Effect: after the diagnostic, the students who practise a weak skill and still struggle are the ones who drop out of the header count and get "monitor".

### 3.3 Finding A2 — the teacher never sees the single status the student sees (by design)

After two kinds of work on a skill, the student sees one figure (24% in the run above) and the teacher sees «Առանձին արդյունքներ» with one figure per kind (diagnostic 39%, practice 27%). The student's figure covers all their work in the release; the teacher's covers this class only and is never combined. The code labels the two scopes differently on purpose. It is not a wiring fault, but a teacher and a student looking at the same skill will read different numbers.

### 3.4 Finding A3 — "recent accuracy" is usually blank

The roster's «Վերջին պատասխանների ճշգրտություն» is shown only when the student's last 20 answers all come from one kind of work. In the run it was 0% after the diagnostic and blank from the first practice answer onward. A student needs 20 answers in a row of one kind before the figure returns.

### 3.5 Finding A4 — activity is per unit

A student's "last activity" on the class page is their last answer in the selected unit. A student working in another unit of the same class looks inactive there.

### 3.6 Reasoning consulted before any analytics suggestion (15 November, at John's instruction)

Sources: the Notion page «HaiEdu — Student Testing Analytics: Mechanism and Current Status» (snapshot of 3 November 2026) and the two repository records it cites, [teacher skill evidence, 31 October](teacher-skill-evidence-20261031.md) and [teacher analytics colours, 2 November](teacher-analytics-colours-20261102.md).

What they establish:
1. A skill's figure is a progress estimate, not a school grade and not proof that a chapter was passed. Fewer than three observations is "insufficient evidence"; the bands are provisional and not validated.
2. Results from different kinds of work (and different policies or models) are kept as **separate estimates on the teacher side on purpose**. "A missing combined score is not treated as missing or weak evidence." Sparse, unavailable or absent evidence stays neutral.
3. The student's own progress uses a learner-wide scope; the teacher's class estimates use a class scope. The two "retain their different scopes" by decision.
4. A colour or count on the teacher page presents the server-reported classification; it is never a new scoring rule.
5. The 31 October record states the rule for support: "Roster, support counts, attention chips and support filtering use the same existing per-contract classifications. Each learner/skill counts once; an existing red classification takes precedence over yellow."

How this changes the findings above:
- **A2 and A3 are documented decisions**, not faults. No change to them is suggested. The design has to show them honestly (separate results; an accuracy figure that is often blank).
- **A1 is not a scoring question.** The documented rule already says support counts follow each separate classification, which is what the page's filter and summary cards do. The class header line still shows the server's older number, which that correction did not reach, so it disagrees with the documented rule. The suggested next step is produced by the server and is not covered by either record; whether it should follow the same rule is an analytics definition for John, and **no change to it is suggested here**.
- No threshold, formula, combined score or scope change is suggested anywhere in this audit.

## 4. Can the new design be connected to the existing data?

"Available" means an existing read already returns it. "In the browser" means the page can work it out from an existing read. "New server work" needs John's approval for a schema or Edge Function change.

| New design element (prototype) | Verdict | Detail |
|---|---|---|
| Account (T1–T7) | **Built and tested** | [Record](teacher-account-20261115.md) |
| Home: pending count, oldest submission, «Շարունակել ստուգումը» | Available, course writing only | The cross-class Today read returns submitted course writing, oldest first, 12 per page. **It does not include the teacher's own tasks.** Personal-account teachers get no count. |
| Home: class cards with pending counts | Available for six classes | The Today read returns at most six class cards. |
| Home and class list: «N աշակերտի աջակցություն է պետք» per class | New server work | Already known. It also needs finding A1 settled first: which rule counts a student. |
| «Ընթացիկ բաժին՝ …» per class | **Not in the data** | A class has no "current unit". The class page opens on the first unit in the list. This needs a product rule (for example, the unit with the latest activity, or one the teacher sets) and then data. |
| Class list grouped by grade | Available | Each class row carries its grade. |
| Class page: class name as title, unit selector, tabs | Available | Same class read as today. |
| Class page: «Աջակցության կարիք» figure and filter | In the browser | The page's existing rule works. The header count must stop using the server's number (finding A1). |
| Class page: «Ոչ ակտիվ 7+ օր» | In the browser, per unit | From "last activity", with the limit in finding A4. |
| Class page: pending writing for the class | Available, course writing only | The Today read filtered to one class. |
| Compact roster: name, last activity, attention skills | Available | Attention skills must come from the skills table as the page does today, not from the server's short list (finding A1). |
| Compact roster: recent accuracy column | **Mostly empty** | Finding A3. Keep the column and accept blanks, drop it, or change the rule (new server work). |
| Skills tab and the student panel's evidence by kind of work | Available | Unchanged. |
| Student panel: «Աշխատանքների պատմություն» with the student's writing tasks and a link into review | **Not in the data** | Today that section lists learning sessions, not writing. A per-student list of writing and own tasks needs new server work. The prototype is wrong here. |
| Review queue: «Սպասում են ստուգման» across classes, course writing | Available | The Today read; a class filter is supported. |
| Review queue: «Վերադարձված են» and «Ստուգված են» across classes | New server work | Those lists exist only per class and unit. |
| Review queue: own tasks across classes, and the «Տեսակ» filter | New server work | Own-task queues exist only per class and unit. |
| Review: grade change with a reason, read-only returned work, history | Available | Existing review services. |
| One «Հանձնարարել» flow over the three services | In the browser | The three services stay separate; each has preview and send. |
| Assign: «Ընտրել աջակցության կարիք ունեցողներին» | In the browser | From the class read for the chosen unit, using the page's rule. |
| Class «Հանձնարարություններ» tab: everything sent to the class | In the browser, per unit | Three existing lists, each for one class and unit. The tab can follow the selected unit; "the whole class across units" needs new server work. |
| Sent item: «ներկայացրել են 17/28» | Available for own tasks only | The own-task list returns a submission count per sent item. The course-writing list returns only the number of recipients, so its count needs new server work. Materials have nothing to submit. |
| Sent item: each recipient's state («Ներկայացրել է», «Սևագիր», «Դեռ չի բացել», «Բացել է») | **Not in the data** | Recipient lists return only the student's name. Opening a material or task is not recorded at all, so «Բացել է» would need a new record of student activity, which is also a privacy decision. |
| Sent item: cancel with a reason, cancelled list, repeat a failed send | Available | Existing services. |
| Library, add material, preview, new version, remove access | Available | Existing services. |
| «Իմ առաջադրանքները», editor, copy, PDF states, version conflict | Available | Existing services. |
| Load error keeping the teacher menu; first-time teacher card | In the browser | No data needed beyond today's reads. |
| Phone menu and page header | In the browser | Shared staff layout. |

**Summary.** Most of the design connects to existing data. Three elements shown in the prototype have no data behind them (current unit, each recipient's state, the student's writing history), four need new server reads (cross-class returned and reviewed lists, own tasks across classes, support counts on Home, submission counts for course writing), and one column would be mostly empty (recent accuracy).

### 4.1 Where the prototype does not match how the product works today

These are design errors in the prototype, found while checking it against the current functions. Correcting them adds nothing new.

| Prototype | Product today |
|---|---|
| A student "needs support" when three or more skills are weak (a rule invented for the prototype's example data) | A student needs support when any skill has a "needs support" classification in any kind of work |
| The skills table shows a percentage in every cell | A cell can be a classified result, «Առանձին արդյունքներ», «Դիտարկումները դեռ քիչ են», «Ցուցանիշը հասանելի չէ» or «Տվյալ դեռ չկա» |
| Recent accuracy shown for nearly every student | Often blank (finding A3) |
| The roster row has no "next suggestion" and no chapter-review summary | Today each row shows «Հաջորդ առաջարկություն» and the chapter-review summary |
| Personal-account teachers have no way to remove a student | Today's roster has that action for them |
| The student panel's history lists writing tasks | It lists learning sessions |
| The student's stage in the unit (diagnostic done, practice, mastery check passed or failed, review required) is not visible on the class page | The student page is built around those stages, and today's teacher page shows them in the row and the panel |

### 4.2 Additions the design would need — nothing here is built or proposed without John's decision

**New functions on the teacher side (server work):**
1. Support count per class for Home and the class list.
2. A "current unit" for a class (needs a product rule first).
3. Returned and reviewed work across classes.
4. The teacher's own tasks in the cross-class queue and the Home count.
5. Submission counts for sent course writing.
6. Each recipient's state on a sent item.
7. A student's writing and task history in the student panel.
8. Everything sent to a class across all its units in one list.

**New function on the student side:**
9. Recording that a student opened a material or task (needed only for «Բացել է» / «Դեռ չի բացել»). This is also a privacy decision.

**Design elements to add to the new teacher design (no new data):**
10. The student's stage in the unit on the roster row or the student panel.
11. The «Հաջորդ առաջարկություն» line and the chapter-review summary, kept somewhere in the new roster or panel.
12. The remove-student action for personal-account teachers.
13. The four non-numeric skill states in the skills table and its legend.

## 5. Corrections to earlier statements

1. On 15 November I told John the teacher "sees who opened" an assigned material. That is wrong: opens are not recorded.
2. Prototype versions 4–10 show course-writing submission counts, recipient states, a per-class current unit, own tasks in the Home queue and a writing history in the student panel as if existing data supplied them. They do not. The prototype's design notes for those elements need correcting before anyone relies on them.

## 6. Decisions for John

1. **Finding A1.** No analytics change is proposed (§3.6). For the design: every "needs support" figure in the new design uses the documented rule (each separate classification), worked out on the page as the filter does today. The existing header line is a leftover for John to schedule separately, if at all.
2. **Finding A3.** Design choice only: keep the accuracy column and accept blanks, or leave it out of the new roster. The rule itself stays.
3. **Elements with no data** (current unit, recipient states, writing history in the student panel, and submission counts for course writing): remove them from the design, or approve new server work for the ones worth having. Recording that a student opened something is a privacy decision as well as a technical one.
4. **Row 6.** Whether to build a connected test for invitation → join → roster (about half a day to a day), or run the production action suite once.
5. **Production check.** Whether to run the Teacher feedback, Resource assignments and writing delivery suites on production. They are paused.

## 7. What was not checked

- Anything on production, real devices, Safari, screen readers.
- Row 6 end to end.
- The school administrator's and master admin's analytics.
- Whether the six-card limit and the 12-per-page queue are enough for a teacher with many classes.
