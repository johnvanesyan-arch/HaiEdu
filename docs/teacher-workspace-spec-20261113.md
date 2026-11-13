# Teacher workspace design specification (Phase 2) — 13 November 2026

**Status:** proposal for owner review. No product code. John approved this phase on 13 November 2026: a design specification and a realistic prototype of teacher Home, the class page and the review queue, before any product code. Owner usability acceptance: not given.

**Inputs:**
- [Cross-role design review](teacher-workspace-design-review-20261113.md): audit, severity-rated findings, proposals A1–A3, B1–B5, C1–C3.
- [C1–C3 record](teacher-workspace-polish-20261113.md): the fixes already prepared.

**Prototype:**
- Interactive page: `docs/design/teacher-workspace-prototype-20261113.html`. It is self-contained and published privately for owner review at https://claude.ai/artifact/7Pw7LFMeAm2X57QHfmbAkB. The link opens only for people John shares it with.
- It uses HaiEdu's forest colours, the Noto Sans Armenian font and existing product wording, with synthetic example data. It is not connected to any service.
- Controls: screen (Home / Class / Review queue), width (phone 390 / desktop), data state (filled / empty / loading) and design notes. The yellow notes link each element to the item below and to its data source.

## 1. Goal and scope

Teachers should see what needs them, act on it, and find each class's students, without scrolling past repeated furniture.

**In scope:**
- teacher Home (B1);
- the class page (B2, B3);
- the writing review queue (B4);
- the teacher-facing parts of the page header (A2) and account entry (B5);
- the phone menu (A1), drawn for the teacher so it can be judged.

**Out of scope:**
- the review form's content, rubric and actions;
- the student drawer's content;
- the skill-matrix data and BF-12 legend;
- invitations and join codes;
- task authoring, the library and material assignment;
- other roles' pages.

All of these keep their current behaviour and are only moved or linked.

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
| 3 | **Աջակցության կարիք** card: students with ≥ 2 skills in «Աջակցություն է պետք», with a link to the filtered class roster | **Not available on Home today.** Class analytics load per class (BF-07). Needs a server summary, or the card is dropped. |
| 4 | **Իմ դասարանները**: class cards (name · subject, grade · school · year, pending writing pill) and «Բոլոր դասարանները» | Existing Today class cards |

**States:**
- **Empty (no classes):** the existing 4-step guide with «+ Նոր դասարան». It is not shown once classes exist.
- **Loading:** skeleton blocks in the same layout.
- **Error:** the existing unknown/denied/retry states, kept unchanged.

**Removed from Home:** the role pill, the repeated subtitle, the pilot box, the «Իմ պրոֆիլը» and «Թարմացնել տվյալները» buttons, the two path cards that duplicate the menu, and the stat cards showing «—».

**Kept:** the queue refresh (inside the queue card) and «Ի՞նչ է ներառված այս հերթում» (on the review page).

### 4.2 Class page (B2, B3)

| Order | Content | Data source |
|---|---|---|
| 1 | Breadcrumb «Դասարաններ / 7Ա · Ֆիզիկա»; H1 = class name · subject; school · year; «Բաժին» select | Existing class read |
| 2 | Action row: «Հանձնարարել գրավոր» (primary), «Հանձնարարել նյութ», «Նյութերի գրադարան», «Ավելին» (Հրավիրել աշակերտներ, Փոխել անունը, Արխիվացնել դասարանը) | Existing actions; the destinations are unchanged |
| 3 | Summary figures, which also act as filters: students, needing support, inactive 7+ days, pending writing | Students and support come from the class read; «inactive» is worked out in the browser from `latestActivityAt`; pending comes from the Today card |
| 4 | Tabs: «Աշակերտներ» (default), «Հմտություններ», «Հրավերներ · n» | Same reads as today |
| 5a | **Students:** filter chips, search, and a table (Աշակերտ, Վերջին ակտիվություն, Վերջին պատասխանների ճշգրտություն, Ուշադրության հմտություններ, «Դիտել») sorted with support needs first. On phones each student is a two-line list item. | `students[]`: `displayName`, `latestActivityAt`, `recentAccuracy`, `weakSkills` |
| 5b | **Skills:** the existing matrix, legend and evidence links | Unchanged |
| 5c | **Invitations:** the existing invitation form, pending list and join code | Unchanged |

**States:**
- **Empty class:** the invitation form is the main content.
- **Loading:** skeleton blocks.
- **Unavailable analytics:** the existing message inside the Students tab.

**Size target:** 30 students take about 52 px per row on desktop (today 213 px) and about 64 px on a phone (today 486 px).

### 4.3 Review queue (B4)

| Order | Content | Data source |
|---|---|---|
| 1 | H1 «Գրավորի ստուգում», «Ներկայացված աշխատանքներ բոլոր ակտիվ դասարաններից» | — |
| 2 | Status chips (existing wording): «Սպասում են ստուգման», «Վերադարձված են», «Ստուգված են», each with a count | Pending course writing across classes exists. **Returned and checked items across classes: investigate.** |
| 3 | Optional filters: Դասարան (all), Բաժին (all), Տեսակ (Բոլորը / Դասընթացի / Իմ կազմած) | **Custom tasks across classes: investigate.** Today they need a class/unit context. |
| 4 | List rows: student, task, class · unit · type · date, an age pill after 3 days | Existing queue entry fields |
| 5 | Open item: the existing review form (submission, rubric, comment, «Ուղարկել գնահատականն ու մեկնաբանությունը», «Վերադարձնել վերանայման», «Պահպանել սևագիրը», «Հաջորդ աշխատանքը»). Desktop: shown beside the list. Phone: full screen with «Վերադառնալ ցանկին». | Existing review module |

**Unsaved-work guard:** kept. Leaving an open review with changes asks first, as today.

**Required before building:** a 0.5-day investigation of whether the existing reads can supply the cross-class returned/checked lists and custom tasks without a server change. If they can't, B4 ships with course writing «Սպասում են ստուգման» across classes first and keeps the class/unit picker for the rest, which is a smaller, honest first step.

## 5. Production QA and test hooks

**Production QA scripts that use teacher elements:**
- Mobile, Teacher feedback, Resource assignments, Sprint 14 actions, Teacher performance and B12.3 reads use the sidebar link hrefs (`.hm-role-nav a[href$="view=classes"]`, `view=archive`).
- They also use `#classList .teacher-class-button`, `#rosterAnalyticsCard`, `#teacherWorkflowEntries`, `data-today*` and `#teacherPageTitle`.

**Each build slice:**
1. Adds `data-testid` hooks to the new elements: `teacher-home-queue`, `teacher-home-support`, `teacher-class-card`, `class-actions`, `class-summary`, `class-tab-students|skills|invites`, `roster-row`, `review-status-chip`, `review-filter-class|unit|kind`, `review-queue-row`, `review-open-item`.
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

1. **The «Աջակցության կարիք» card on Home.** Approve a small server summary (schema/Edge approval later), or drop the card.
2. **A1/A2 scope.** Apply the phone menu and page header to all staff roles (recommended), or treat teacher pages as an exception.
3. **Phone menu items.** Գլխավոր, Դասարաններ, Ստուգում, Ավելին as drawn, or another set.
4. **Pilot notice.** Sidebar label only (drawn), or keep the visible notice on Home.
5. **B4 first step.** Approve the 0.5-day investigation before choosing the full or the smaller version.
6. **Validation.** Can one or two teachers try the prototype for 20–30 minutes? Suggested tasks:
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
- «Աջակցության կարիք» as a card title;
- «Ոչ ակտիվ», «Ոչ ակտիվ 7+ օր»;
- «Ստուգում» (short phone label), «Ավելին»;
- «Հանձնարարել նյութ» as a button;
- «Ներկայացված աշխատանքներ բոլոր ակտիվ դասարաններից»;
- «Դասընթացի» / «Իմ կազմած» (type filter).

These need Armenian review before they ship. The rubric criteria and student texts in the prototype are synthetic examples, not product content.
