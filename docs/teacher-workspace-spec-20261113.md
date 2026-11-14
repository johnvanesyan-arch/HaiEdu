# Teacher workspace design specification (Phase 2) — 13 November 2026

**Status:** proposal for owner review. No product code.

**Decision log:** 13 November 2026, John chose option B for students needing support. Each class card shows its own support count for that class's subject and current unit, linking to that class's filtered roster. There is no single cross-class «Տեսնել աշակերտներին» button: a teacher with several grades, classes and subjects could not tell which class it opens, and support status differs by subject and unit. John approved this phase on 13 November 2026: a design specification and a realistic prototype of teacher Home, the class page and the review queue, before any product code. Owner usability acceptance: not given.

**Decisions, 14 November 2026 (John):**
- **Devices:** teachers use both phones and computers. Phone and desktop layouts have equal priority; the build order does not change.
- **Current priority:** the teacher's own account (today's «Իմ պրոֆիլը» view and the shared «Իմ հաշիվը» page). All roles are to be aligned to one source of truth later; this work is the teacher-first step.
- **Display name:** no role may save an empty name. This is platform-wide: the shared account endpoint applies it to every role, including students. The length limits and whitespace handling (recommended: 2–80 characters, repeated spaces collapsed) are not yet confirmed.
- **Read-only check behind the decision** (aggregate counts, no names read, 14 November): 12 profiles. All 3 teachers and the 1 master admin have a name. 5 accounts have none: 2 students, 2 school administrators, 1 content reviewer. No name has 1 character, more than 80 characters, or extra spaces. The rule only blocks saving an empty name; it does not fill in existing empty names.

**Inputs:**
- [Cross-role design review](teacher-workspace-design-review-20261113.md): audit, severity-rated findings, proposals A1–A3, B1–B5, C1–C3.
- [C1–C3 record](teacher-workspace-polish-20261113.md): the fixes already prepared.

**Prototype:**
- Interactive page: `docs/design/teacher-workspace-prototype-20261113.html`. It is self-contained and published privately for owner review at https://claude.ai/artifact/7Pw7LFMeAm2X57QHfmbAkB. The link opens only for people John shares it with.
- It uses HaiEdu's forest colours, the Noto Sans Armenian font and existing product wording, with synthetic example data. It is not connected to any service.
- The example teacher has four classes across two grades and three subjects (7Ա Physics, 7Բ Physics, 7Ա English, 8Բ Maths), each with its own students, units and skills.
- Controls:
  - screen: every teacher screen, chosen from a list;
  - width: phone 390 or desktop;
  - data state: filled, empty, loading, load error or signed out;
  - teacher type: school or personal account;
  - action result: OK, network failure, rate limit, account changed, version conflict or upload error, which drives the error states inside each flow;
  - design notes, on or off.

  Every screen works in every data state, for both teacher types, at both widths. The yellow notes link each element to the item below and to its data source.

## 1. Goal and scope

Teachers should see what needs them, act on it, and find each class's students, without scrolling past repeated furniture.

**In scope (since version 4, 13 November 2026):** every teacher screen:
- Home (B1, B7);
- the class list, create class, and the class page with its Students, Skills, «Հանձնարարություններ» and Invitations tabs (B2, B3);
- the student drawer;
- the review queue for course writing and the teacher's own tasks (B4);
- the assign flow (B8);
- the material library and add-material form;
- «Իմ առաջադրանքները» and the task editor;
- archive, account (B5) and the guide (D);
- the phone «Ավելին» menu (A1);
- load-error (B6) and signed-out states.

**Added in version 5 (13 November 2026), items 1–11 from the coverage check:**
1. Sign-in, forgotten password and setting a password from the teacher's invitation email. These pages are shared by all roles; nothing is changed beyond the shared layout decision.
2. The personal-account teacher path: the 4-step guide, create class with a year, and the reusable join code with a new-code confirmation.
3. The full account page: data summary, email and password changes, privacy choices and the deletion request.
4. Student drawer: per-skill evidence separated by purpose, review history and work history. A matrix cell opens the drawer on that skill.
5. Class panels: rename, invitation results per address, the one-time code with cancel, pending-invitation cancel, and «analytics unavailable».
6. Sent items: recipients and history, the cancelled list with reason, and resending after a failure.
7. Library: search, status and extra filters, student preview, editing as a new version with the previous version kept, «Հեռացնել հասանելիությունից».
8. Tasks: course-task preview, own-task student preview, copy, PDF upload states, the version-conflict recovery and change history.
9. Review: the scope explanation, pagination, read-only returned work, and a grade change with a reason.
10. Errors inside each flow: network failure with a safe retry, the BF-16 rate-limit wait, account changed, version conflict, upload error, and the unsaved-changes guard (including back/forward).
11. Downloads and copy actions.

**Out of scope:** other roles' pages, and the student-side screens these actions lead to.

The form fields, rubric, matrix data, invitations, join codes and upload rules shown are today's. All of these keep their current behaviour and are only moved or linked.

## 2. Principles

Each principle is drawn from the review findings.

1. **Work first.** The first screen on a 390 × 844 phone shows the page title and the main action, not page furniture. Findings F3 and H-2.
2. **One place for each thing.** One page title per view, one pilot label (sidebar footer), one account entry, one review flow. Findings F4, F6, H-4, H-7, H-9.
3. **Hide what isn't needed by default** (Factor Eleven): onboarding only for a teacher with no classes; the invitation form only in its tab once a class has students; rename and archive under «Ավելին».
4. **The same patterns across roles** (EatApp: one shell, many pages). Status chips and filters copy the content reviewer's queue, with the teacher's existing wording. The page header and the phone menu are shared staff components (A1/A2).
5. **No new data unless marked.** Every figure in the prototype comes from a read that exists today. The one exception is labelled «Needs new data» and needs a decision (§6).
6. **Accessibility is kept.** 44 px targets, 200% text without sideways page scrolling, one H1 with an ordered outline, visible focus, real tables with captions, `aria-pressed` and `aria-selected` on toggles and tabs. Native regressions in each build slice prove these.

## 3. Shared elements

| Element | Desktop (≥ 900 px content width) | Phone | Item |
|---|---|---|---|
| Menu | Sidebar 232 px: logo, «Աշխատասեղան · Ուսուցիչ», Գլխավոր, Դասարաններ, Գրավորի ստուգում (pending badge), Հանձնարարել գրավոր, Նյութերի գրադարան, Արխիվացված դասարաններ. Footer: «Փորձնական տարբերակ», «Իմ հաշիվը», «Դուրս գալ». | Header about 56 px (logo, «Ուսուցիչ», account button). Fixed bottom menu: Գլխավոր, Դասարաններ, Ստուգում (badge), Ավելին. | A1 (shared staff layout: decision 3) |
| Page header | Breadcrumb where nested; H1 28 px; one muted line; the page's main action on the right | H1 24 px, at about 70 px from the top | A2 |
| Pilot notice | Sidebar-footer label only | Under «Ավելին» | A2 (reverses the PR374 choice; owner decision) |
| Account | «Իմ հաշիվը» in the sidebar footer; name editing moves into it | Header account button | B5 |
| Type and shape | H1 28/24, H2 22/20, H3 18, body 16, small 14, tiny 12; weights 400/600/700; radii 8/12/16/pill; colours only from `forest-tokens.css` | — | A3 (the rules apply to new staff CSS) |

## 4. Screens

### 4.1 Home (B1)

| Order | Content | Data source |
|---|---|---|
| 1 | H1 «Գլխավոր», «Բարի գալուստ, ‹name›», secondary «+ Նոր դասարան» | Existing teacher profile |
| 2 | **Ստուգման հերթ** card: pending count, the oldest submission's age, the number of classes; primary «Շարունակել ստուգումը» (opens the first item in the review queue), «Ամբողջ հերթը» | Existing combined Today read (count, entries, per-class counts) |
| 3 | **Իմ դասարանները**: one card per class, attention first. Each card shows name · subject, grade · school · year, «Ընթացիկ բաժին՝ …», and up to two links: «N աշակերտի աջակցություն է պետք» (opens *that* class's roster with the «Աջակցության կարիք» filter, for the same unit) and «N գրավոր սպասում է ստուգման» (opens the review queue filtered to that class). Otherwise «Հիմա ուշադրության կարիք չկա». Then «Բոլոր դասարանները». | Pending counts: existing Today class cards. **Support counts and the current unit: not available on Home today.** They need a small per-class (class + subject programme + unit) server summary, or they are left out. Student counts appear only on the class page. |

**States:**
- **Empty (no classes), school teacher (B7):** one guided card for the school path:
  1. whether the school year is open (from the existing school notice);
  2. create a class;
  3. invite students;
  4. see who needs help.

  The review blocks are hidden until a class exists. Personal-account teachers keep the existing 4-step guide. Neither is shown once classes exist.
- **Loading:** skeleton blocks in the same layout.
- **Load error (B6), on every screen:** the teacher menu stays, «Չհաջողվեց բեռնել տվյալները» is shown with «Փորձել կրկին» as the main action, and there is no sign-in prompt unless the session is actually missing. Access-denied and signed-out states keep their current behaviour.

**Removed from Home:** the role pill, the repeated subtitle, the pilot box, the «Իմ պրոֆիլը» and «Թարմացնել տվյալները» buttons, the two path cards that duplicate the menu, and the stat cards showing «—».

**Kept:** the queue refresh (inside the queue card) and «Ի՞նչ է ներառված այս հերթում» (on the review page).

### 4.2 Class list (B2)

«Դասարաններ» in the menu opens the list of active classes, never a single class.
- **Grouping:** when the teacher has more than one grade, classes are grouped under grade headings («7-րդ դասարան», «8-րդ դասարան»). Within a grade, classes needing attention come first.
- **Cards:** the same cards as on Home.
- **Actions:** «+ Նոր դասարան»; «Արխիվացված դասարաններ» at the end.
- **Data:** the existing paginated class directory (24 per page) and search are kept. Grouping applies within each loaded page.

### 4.3 Class page (B2, B3)

| Order | Content | Data source |
|---|---|---|
| 1 | Breadcrumb «Դասարաններ / 7Ա · Ֆիզիկա»; H1 = class name · subject; school · year; «Բաժին» select | Existing class read |
| 2 | Action row: «Հանձնարարել գրավոր» (primary), «Հանձնարարել նյութ», «Նյութերի գրադարան», «Ավելին» (Հրավիրել աշակերտներ, Փոխել անունը, Արխիվացնել դասարանը) | Existing actions; the destinations are unchanged |
| 3 | Summary figures, which also act as filters: students, needing support (for the selected unit; the line «Աջակցության կարիքը՝ ըստ «Բաժին N»-ի հմտությունների» says which), inactive 7+ days, pending writing | Students and support come from the class read; «inactive» is worked out in the browser from `latestActivityAt`; pending comes from the Today card |
| 4 | Tabs: «Աշակերտներ» (default), «Հմտություններ», «Հրավերներ · n» | Same reads as today |
| 5a | **Students:** filter chips, search, and a table (Աշակերտ, Վերջին ակտիվություն, Վերջին պատասխանների ճշգրտություն, Ուշադրության հմտություններ, «Դիտել») sorted with support needs first. On phones each student is a two-line list item. | `students[]`: `displayName`, `latestActivityAt`, `recentAccuracy`, `weakSkills` |
| 5b | **Skills:** the existing matrix, legend and evidence links | Unchanged |
| 5c | **Invitations:** the existing invitation form, pending list and join code | Unchanged |

**States:**
- **Empty class:** the invitation form is the main content.
- **Loading:** skeleton blocks.
- **Unavailable analytics:** the existing message inside the Students tab.

**Size target:** 30 students take about 52 px per row on desktop (today 213 px) and about 64 px on a phone (today 486 px).

### 4.5 Account (B5, H-17)

«Իմ հաշիվը» opens inside the teacher layout.
- **Display name:** one field with one rule. **Owner decision:** required 2–100 characters, or optional up to 80.
- **Other sections:** login details, privacy and data, and the deletion request keep the existing account-page content and actions.
- **Scope:** the account page is shared by every role, so this falls under the platform-wide change rule (A2).

### 4.6 Assign flow (B8)

**Proposal:** one «Հանձնարարել» entry replaces the separate «Հանձնարարել գրավոր» page and the «Հանձնարարել նյութ» card. The three services behind it (writing assignments, own-task delivery, resource assignments) stay separate.

**Steps:**
1. **Ինչ եք հանձնարարում:** class, unit, and type («Դասընթացի գրավոր», «Իմ առաջադրանքը», «Նյութ (PDF կամ հղում)»). Skipped when started from a class page or the student drawer.
2. **Choice:** the existing course catalog for the unit, the teacher's own tasks, or published materials, with «+ Ստեղծել նոր առաջադրանք» or «+ Ավելացնել նյութ».
3. **Recipients:** the whole class or selected students, with search and «Ընտրել աջակցության կարիք ունեցողներին». An optional instruction for own tasks and materials.
4. **Confirm:** a summary, «Նախադիտում․ ինչ կտեսնի աշակերտը» and «Հաստատել և ուղարկել», using the existing wording.
5. **Done:** «Ուղարկումը հաստատված է» with «Դիտել ուղարկումը» (the class «Հանձնարարություններ» tab) and «Հանձնարարել այլ աշխատանք».

**Entry points:** the menu; the class page; the student drawer (that student preselected); a library material, own task or the editor's «Պահպանել և շարունակել» (each starts at step 3).

**Class «Հանձնարարություններ» tab:** everything sent to the class in one list, with submissions, a review link and cancel. It needs a combined read of three existing lists; this is checked in the B4 investigation.

### 4.7 Library, own tasks and editor

- **Material library:** inside the teacher layout (H-17), filtered by course and unit. Each material shows its status and actions: «Հանձնարարել», «Աշակերտի տեսքի նախադիտում», «Խմբագրել». The add-material form keeps today's fields, rights checks and three buttons.
- **«Իմ առաջադրանքները»:** gets its own menu item (today it is reached through «Հանձնարարել գրավոր» → «Ստեղծել իմ առաջադրանքը / սևագրերը»). The editor keeps today's fields, review settings and buttons.

### 4.8 Archive, create class, guide, phone menu, signed out

- **Archive:** one title, grouped by school year, with search. «Վերակտիվացնել» asks for confirmation on the page itself.
- **Create class:** one title, with only the authorised school/year/subject options. After creation the teacher lands on the new class's invitation screen.
- **Guide:** inside the teacher layout, sections collapsed. Today's anchors are kept, so contextual «Ինչպե՞ս» links still work.
- **Phone «Ավելին»:** a full-label menu screen for everything not in the bottom bar.
- **Signed out:** the only state with a sign-in button. After signing in the teacher returns to the same page.
- **Confirmations:** archive, cancel and reactivate are confirmed on the page, not with the browser's own pop-up (item D, platform-wide).

### 4.4 Review queue (B4)

| Order | Content | Data source |
|---|---|---|
| 1 | H1 «Գրավորի ստուգում», «Ներկայացված աշխատանքներ բոլոր ակտիվ դասարաններից» | — |
| 2 | Status chips (existing wording): «Սպասում են ստուգման», «Վերադարձված են», «Ստուգված են», each with a count | Pending course writing across classes exists. **Returned and checked items across classes: investigate.** |
| 3 | Optional filters: Դասարան (all; each option shows the grade), Բաժին (enabled after a class is chosen, because units belong to a class's subject), Տեսակ (Բոլորը / Դասընթացի / Իմ կազմած) | **Custom tasks across classes: investigate.** Today they need a class/unit context. |
| 4 | List rows: student, task, class · unit · type · date, an age pill after 3 days | Existing queue entry fields |
| 5 | Open item: the existing review form (submission, rubric, comment, «Ուղարկել գնահատականն ու մեկնաբանությունը», «Վերադարձնել վերանայման», «Պահպանել սևագիրը», «Հաջորդ աշխատանքը»). Desktop: shown beside the list. Phone: full screen with «Վերադառնալ ցանկին». | Existing review module |

**Unsaved-work guard:** kept. Leaving an open review with changes asks first, as today.

**Required before building:** a 0.5-day investigation of whether the existing reads can supply the cross-class returned/checked lists and custom tasks without a server change. If they can't, B4 ships with course writing «Սպասում են ստուգման» across classes first and keeps the class/unit picker for the rest, which is a smaller, honest first step.

## 5. Production QA and test hooks

**Production QA scripts that use teacher elements:**
- Mobile, Teacher feedback, Resource assignments, Sprint 14 actions, Teacher performance and B12.3 reads use the sidebar link hrefs (`.hm-role-nav a[href$="view=classes"]`, `view=archive`).
- They also use `#classList .teacher-class-button`, `#rosterAnalyticsCard`, `#teacherWorkflowEntries`, `data-today*` and `#teacherPageTitle`.

**Each build slice:**
1. Adds `data-testid` hooks to the new elements: `teacher-home-queue`, `teacher-class-card`, `class-card-support`, `class-card-pending`, `class-grade-group`, `class-actions`, `class-summary`, `class-tab-students|skills|invites`, `roster-row`, `review-status-chip`, `review-filter-class|unit|kind`, `review-queue-row`, `review-open-item`.
2. Moves the touched production QA locators to those hooks or to role + name, in the same PR.
3. Keeps hrefs and view parameters stable, so menu clicks in scripts keep working.

`#rosterAnalyticsCard` and `#teacherWorkflowEntries` get a replacement hook before they are removed.

**Fixture accounts:** the Sprint 14 actions and Teacher feedback suites expect particular states for the designated fixture teachers. Before a slice merges, check whether a moved element changes which state a script must reach.

**Affected production QA, by slice (estimate; confirmed with `check-browser-qa-triggers` per PR):**

| Slice | Suites |
|---|---|
| B1 | Mobile, Teacher feedback, Chapter VI read |
| B2/B3 | Mobile, Resource assignments, Sprint 14 actions, Teacher performance |
| B4 | Teacher feedback |
| A1/A2 | All staff-role suites |

## 6. Decisions needed from John

1. **Support counts on Home and class-list cards (option B).** Approve a small per-class server summary (class + subject programme + current unit; schema/Edge approval later), or leave support counts to the class page only.
2. **A1/A2 scope.** Apply the phone menu and page header to all staff roles (recommended), or treat teacher pages as an exception.
3. **Phone menu items.** Գլխավոր, Դասարաններ, Ստուգում, Ավելին as drawn, or another set.
4. **Pilot notice.** Sidebar label only (drawn), or keep the visible notice on Home.
5. **B4 first step.** Approve the 0.5-day investigation before choosing the full or the smaller version.
6. **Display name rule (B5).** Required 2–100 characters (today's teacher Profile rule), or optional up to 80 (today's account-page rule).
7. **One assign entry (B8).** Replace «Հանձնարարել գրավոր» and «Հանձնարարել նյութ» with one «Հանձնարարել» flow, and give «Իմ առաջադրանքները» its own menu item.
8. **Review button wording.** One set of labels for course writing and own-task review. Today course writing says «Ուղարկել գնահատականն ու մեկնաբանությունը» / «Վերադարձնել վերանայման», and own tasks say «Հրապարակել ստուգումը» / «Վերադարձնել շտկման». The prototype uses «Ուղարկել ստուգումը» / «Վերադարձնել վերանայման» as a placeholder. Armenian review needed.
9. **Validation.** Can one or two teachers try the prototype for 20–30 minutes? Suggested tasks:
   - find who needs help in 7Ա;
   - check the oldest pending writing and move to the next;
   - find the join code;
   - switch to the custom-task list.

   Observe; don't explain.

## 7. Build order once approved

1. B2 + B3, the class page: biggest measured gain, no server change.
2. B1, Home, without the support card unless decision 1 says otherwise.
3. B4, after the investigation.
4. A2 + A1, shared staff layout, after decision 2.
5. B5, account.
6. A3: rules applied slice by slice.

Each slice is one PR with:
- native regressions that fail on the previous source;
- production QA script updates;
- `npm run build:web-assets` and `npm run build:teacher` where needed;
- a dated record with "Owner usability acceptance: not given";
- status/README/roadmap/backlog alignment.

## 8. Language

All Armenian wording in the prototype reuses existing product text, except these new labels:
- «Այսօր», «Ամբողջ հերթը», «Ամենավաղը ներկայացվել է …»;
- «N աշակերտի աջակցություն է պետք», «Ընթացիկ բաժին՝ …», «Հիմա ուշադրության կարիք չկա», «Աջակցության կարիքը՝ ըստ … հմտությունների»;
- «Ոչ ակտիվ», «Ոչ ակտիվ 7+ օր»;
- «Ստուգում» (short phone label), «Ավելին»;
- «Հանձնարարել նյութ» as a button;
- «Ներկայացված աշխատանքներ բոլոր ակտիվ դասարաններից»;
- «Դասընթացի» / «Իմ կազմած» (type filter);
- assign flow and other new labels: «Հանձնարարել» as a menu item, «Ինչ եք հանձնարարում», «Ընտրել աջակցության կարիք ունեցողներին», «Հանձնարարել այս աշակերտին», «Հանձնարարություններ» (tab), «Ուղարկել ստուգումը», «Մուտք գործեք՝ շարունակելու համար», «Ավելին» screen descriptions;
- guide texts, which are shortened examples;
- version 5 additions:
  - unsaved-changes dialog: «Մնալ էջում», «Դուրս գալ առանց պահպանելու», «Եթե հիմա դուրս գաք…»;
  - error states: the explanatory sentences, «Կրկնել նույն գործողությունը», «Ֆայլը չկցվեց», «Պահպանված տարբերակը փոխվել է»;
  - the forgotten-password confirmation;
  - recipient statuses: «Ներկայացրել է», «Դեռ չի բացել», «Բացել է»;
  - the deletion-request confirmation text;
  - «Ցուցանիշը հաշվարկված է»;
  - «Փոխել գնահատումը», «Չեղարկել փոփոխությունը».

  Everything else in the prototype reuses existing product wording.

These need Armenian review before they ship. The rubric criteria and student texts in the prototype are synthetic examples, not product content.
