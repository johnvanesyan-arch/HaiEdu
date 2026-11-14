# Teacher workspace cross-role design review — 13 November 2026

Phase 1 of 3: audit and proposals. The audit itself changed no source, QA script, production data or setting. Owner usability acceptance: not given.

**Owner decisions, 13 November 2026:**
- C1–C3 approved and implemented. See [teacher-workspace-polish-20261113.md](teacher-workspace-polish-20261113.md).
- Phase 2 approved: a design specification and a realistic prototype of Home, the class page and the review queue, before any product code.
- A1–A3, B1–B5 and D remain proposals. Decision 3 (platform-wide staff layout vs a teacher exception) and the phone/computer usage question remain open.

## 0. Approach and where it comes from

John pointed to mikehakobyan.com/work as a reference. The review read the Work page, three case studies (Factor Eleven, Hotelchamp, EatApp's design system) and the About page. Sololearn was also fetched but not used. The site is a portfolio, not a written method, so I took only the techniques it describes explicitly:

| Technique (as stated on the site) | Source | How I applied it here |
|---|---|---|
| Heuristic evaluation on Nielsen's 10, each issue rated "critical, serious or mild" | Hotelchamp | Section 3 |
| "Navigation mapped as an end user" | Hotelchamp | Teacher job flows, section 2 |
| Audit the "drifting variants" first, then "one shell, many pages" with a 2-layer token system | EatApp | Cross-role shell audit, section 1; proposals A1–A3 |
| "Deciding what not to show by default"; "collapsible detail"; design empty, loading and long-value states | Factor Eleven | Proposals B1–B3 |
| "Start with the product question, not the screen"; "prototype early and realistically" | About | Phase plan, section 5 |
| Interviews, shadowing, usage data ("real data beats assumptions") | Factor Eleven, Sololearn | **Not possible for me.** See the gap below. |

**The main gap is that there is no evidence from real use.**
- Production has 3 active teacher memberships, 129 active assigned classes (most are probably QA-created), at most 2 students in any class, and 5 active enrollments in total. These are aggregate read-only counts; no personal data was read.
- Vercel Web Analytics returned no data for the last 31 days, so there is no device split.
- Everything below therefore comes from inspection and measurement, not from teacher behaviour. The ranking in section 6 rests on assumptions that I label as such.

## 1. Cross-role audit (measured)

**One staff layout, four roles.** Teacher, school admin, master admin and content reviewer all use the same shared staff layout (`role-layout.css/js`, which imports `staff-forest.css`). Students have their own (`student-shell` + `student-forest.css`). Both layouts already share `forest-tokens.css`, the font and the green palette.

| | Student | Teacher | School admin | Master admin | Content reviewer |
|---|---|---|---|---|---|
| Phone menu | Fixed bottom menu, 4 items, full labels | Top row, 7 links, sideways scroll | Same row, 5 links | Same row, 8 links | Same row, 9 links |
| H1 position on a 390 px phone | about 30 px | 279 px | 300 px | 281 px | 300 px |
| H1 size, desktop / phone | 28 / 24 | 24 / 24 | 32 / 28.8 | 24 / 20 | 32 / 28.8 |
| Title card with role pill | No | Yes | Yes, plus an eyebrow and an extra «Հաշվի մուտք» button | Yes | Yes, plus an eyebrow |
| Pilot notice | No | Every view | No | Yes | No |
| Account entry | «Իմ հաշիվը» | «Իմ պրոֆիլը» (menu) + «Հաշիվ և գաղտնիություն» (sidebar foot) | Sidebar foot | Sidebar foot | Sidebar foot |
| How the review queue works | n/a | Home: list across classes. Review view: 3 dropdowns first. | n/a | "Operations queue" | Status chips (All, Awaiting review, Changes requested, QA issues, Approved) plus search |

**Interpretation.**
- The teacher pages are not off on their own. The phone problems (sideways menu, title pushed about 280 px down) come from the shared staff layout and affect every staff role.
- The real inconsistencies are (a) between the staff layout and the student layout, and (b) inside the staff layout, where each role builds its page header differently: four H1 sizes, eyebrows on some pages, the pilot notice on some.
- **Style values declared in each role's CSS** (static count across the full stylesheet stack):

  | Page | font-size values | radius values | hex/rgb colour literals |
  |---|---|---|---|
  | Student Home | 52 | 31 | 261 |
  | Teacher | 47 | 26 | 240 |
  | School admin | 32 | 16 | 156 |
  | Master admin | 30 | 17 | 160 |
  | Content reviewer | 38 | 17 | 174 |

- **Student pages only look consistent because `student-forest.css` overrides on top.** Underneath, every role has the same drift, and a teacher-only patch would add a seventh layer of overrides. That is the EatApp "drifting variants" problem.

## 2. Teacher jobs as an end user (desktop unless stated)

| Job | Path today | Friction |
|---|---|---|
| J1 Create a class and invite students | Home «+ Նոր դասարան» → form → class page → invitation form (emails) or join-code disclosure | Works. The invitation form stays large on the class page even after students have joined. |
| J2 See who needs help | Menu «Դասարաններ» → class → past 4 workflow cards, the class header and the invitation form → roster → student drawer | 30 synthetic students: roster starts at 2,034 px and the matrix at 8,427 px (phone: 3,199 and 17,780). Each roster entry is about 213 px (phone about 486 px). |
| J3 Review writing | Home «Շարունակել ստուգումը», 1 click; the review opens inside Home | Via the menu «Գրավորի ստուգում»: choose list, class and unit from three dropdowns before any work appears. |
| J4 Assign writing | Menu «Հանձնարարել գրավոր» → class and unit → task → students | **Defect:** the selection card has 0 px padding at every width; text and dropdowns touch the card edge. Cause: `teacher.css:83` pads only `#teacherReviewRoot .teacher-review-picker`. Only the empty state was exercised. |
| J3/J4 mode switch | «Դասընթացի գրավորները» / «Իմ կազմած աշխատանքները» | *Corrected during C2:* `aria-pressed` is set once a class and unit exist. Before that, the hidden container still showed because `.wa-actions{display:flex}` overrode the `hidden` attribute, so two inert buttons appeared. Once active, the selected mode was not styled. Fixed in C2. |
| J5 Share material | Class page cards «Բացել գրադարանը» / «Ուղարկել առաջադրանք», or the menu «Նյութերի գրադարան» | Not exercised beyond rendering. |
| J6 Account | «Իմ պրոֆիլը» (name, link onward) vs «Հաշիվ և գաղտնիություն» | Two places; students have one. |

Not covered:
- a first-time teacher with zero classes (the fixtures always have classes);
- custom-task authoring;
- the library and material assignment;
- error and retry states;
- screen readers beyond existing tests.

## 3. Heuristic evaluation (Nielsen; severity: critical / serious / mild)

No critical issue was found: nothing I exercised blocks a task.

| # | Issue | Heuristic | Severity |
|---|---|---|---|
| H-1 | Phone menu hides 4 of 7 destinations in a sideways scroll (all staff roles) | Recognition rather than recall | Serious |
| H-2 | Phone: work starts below the first screen («Շարունակել ստուգումը» at 1,073 px; 3,085 px at 200% text) (all staff roles) | Aesthetic and minimalist design | Serious |
| H-3 | Class page puts generic content before class data; matrix at 8,427 / 17,780 px for 30 students | Minimalist design; flexibility and efficiency | Serious |
| H-4 | Two review entry points behave differently, and neither matches the content reviewer's queue pattern | Consistency and standards | Serious |
| H-5 | Writing mode buttons: inert before a class/unit exists; selected mode not styled (fixed in C2) | Visibility of system status | Serious |
| H-6 | Assign writing picker has no padding | Aesthetic; consistency | Mild (visible defect) |
| H-7 | Repeated pilot notice, role pill and duplicated headings (Profile, Create, Archive) | Minimalist design | Mild |
| H-8 | Four H1 scales across staff roles; 17 rendered text sizes on teacher pages | Consistency and standards | Mild |
| H-9 | Account split («Իմ պրոֆիլը» + «Հաշիվ և գաղտնիություն»; students: «Իմ հաշիվը») | Consistency; match the real world | Mild |
| H-10 | Generic class title («Դասարանի աշխատատարածք») instead of the class name | Match the real world | Mild |
| H-11 | Guide page uses a third visual style | Consistency | Mild |
| H-12 | A few text links about 26 px tall; matrix cells 43 px wide | Accessibility (tap size) | Mild |
| H-13 | Load failure for a signed-in teacher shows the sign-in card with a filled «Մուտք գործել» button; the retry is secondary and the teacher menu is gone (Appendix B) | Help users recover from errors | Serious |
| H-14 | A new school teacher with no classes sees three empty review blocks and «Ակտիվ դասարան դեռ չկա։ Բացեք «Իմ դասարանները»…», which points to an equally empty list. The 4-step guide appears only for personal-account teachers. | Recognition; minimalist design | Serious |
| H-15 | Display name editable in two places with different rules: Profile requires 2–100 characters (`manage-teacher-profile`); the account page allows 0–80 and can clear it (`manage-my-privacy`, audited) | Consistency and standards | Serious |
| H-16 | Material-assignment card (`.assignment-teacher-panel`) and the course-writing review card on the class page (`.written-work` outside `#teacherReviewRoot`) have 0 px inner padding: the C1 defect in two more places | Aesthetic; consistency | Mild (visible defect) |
| H-17 | Material library and the account page open outside the teacher layout (no teacher menu); the way back is a single button | Consistency; user control | Mild |
| H-18 | An empty class shows an empty roster, five «0» skill figures with a legend and filters, and a second «Աշակերտ դեռ չկա» message | Minimalist design | Mild |
| H-19 | Library «Գործողությունների ուղեցույց» link is 22 px tall | Accessibility (tap size) | Mild |
| H-20 | `teacher-workspace-preview.html` (an earlier fictional-data preview) is still published but no page links to it | Maintenance | Mild |

Checked and found fine: no page overflow and no script errors in 78 teacher renders; no contrast failures on solid backgrounds.

**Ruled out:** English-looking dates in my screenshots come from the test browser's locale data. The code formats every date with `hy-AM`.

## 4. Proposals (numbered, not approved)

**A. Shared staff layout ("one shell, many pages")**

These change all four staff roles. Under AGENTS.md that is platform-wide: every consumer and every QA suite gets audited.

- **A1 Phone menu.** Full labels and no sideways scroll for all staff roles. One pattern: a fixed bottom menu with each role's 3–4 main destinations plus «Ավելին». Students already use a fixed bottom menu. Needs your choice of each role's main items. Estimate: 2–3 days.
- **A2 One page-header component** for all staff roles:
  - one H1 scale (the student scale: 24 phone / 28 desktop);
  - an optional eyebrow;
  - no role pill (the menu already identifies the role);
  - one rule for the pilot notice (once per session or on Home only);
  - one account entry in the sidebar foot.

  Goal: the H1 near the top on phones and work visible on the first screen. Estimate: 1.5–2 days.
- **A3 Staff design rules written down**, in the spirit of EatApp's DESIGN.md: semantic tokens for type, radius and weight, mapped from `forest-tokens.css`, with do/don't rules. New staff CSS uses tokens only, and the old values are migrated slice by slice. This is the existing deferred D4 work, done for staff pages. Estimate: 1 day for rules and tokens; migration happens per slice.

**B. Teacher information design**

Teacher only, so no exception is needed.

- **B1 Home answers "what needs me now?"** It shows pending reviews (the existing list), students needing support (the existing counts, linked), and quick create. The welcome copy and the onboarding steps appear only for a teacher with no classes. Estimate: 1 day.
- **B2 Class page:**
  - the class name as the H1;
  - order: students and progress, then the skills matrix, then materials and assignments as one action row;
  - the invitation form collapsed once the class has students.

  Estimate: 1 day.
- **B3 Compact roster rows**: name, last activity, accuracy, weakest skills, open, about 3–4× shorter. Search stays. BF-12 matrix accessibility is preserved. Estimate: 1–1.5 days.
- **B4 Review queue aligned with the content reviewer's pattern**: «Գրավորի ստուգում» opens on the cross-class pending list, with status chips and class/unit as optional filters. Reviews open in the review view, not inside Home. Needs a 0.5-day investigation of whether the existing workspace read is enough (no server change) before I commit to it. Estimate: 1–2 days after that.
- **B5 One account entry**: «Իմ հաշիվը» for teachers, with name editing moved into it. «Իմ պրոֆիլը» leaves the main menu. Estimate: 0.5–1 day.

**C. Fixes**

Teacher only, and small enough to ship first.

- **C1** Assign writing picker padding (`teacher.css:83` → include `#teacherAssignWritingRoot`), with a regression test. Estimate: 1 hour. *Implemented.*
- **C2** Writing mode buttons hidden until usable, with a visible selected state (they already had `aria-pressed`). Estimate: 2 hours. *Implemented.*
- **C3** Duplicate H2/H3 removed (Profile, Create, Archive); 44 px tap areas for small links; matrix cells 44 px. Estimate: 2–3 hours. *Implemented.*
- **C4** Material-assignment card padding in the library (`.assignment-teacher-panel`). Teacher-facing, but `resource-library.html` is a shared staff page, so check other staff roles. Estimate: 1 hour. *Proposed after the second pass.*
- **C5** Course-writing review card padding when opened from the class page (`.written-work` outside `#teacherReviewRoot`). Estimate: 1 hour. *Proposed after the second pass.*
- **C6** 44 px tap area for the library guide link. Estimate: 30 minutes. *Proposed after the second pass.*

**B additions after the second pass (teacher only):**
- **B6** Load-failure state: keep the teacher menu; show «Չհաջողվեց բեռնել…» with «Փորձել կրկին» as the main action; show sign-in only when the session is actually missing. Estimate: 0.5 day.
- **B7** First-time school teacher: a teacher with no classes sees one guided card for the school path. It explains that the school administrator first opens the year, then offers «+ Նոր դասարան», then invitations. The empty review blocks are hidden until a class exists. Estimate: 0.5–1 day.
- **B5 (strengthened by H-15):** one place and one rule for the display name. Which rule wins (required 2–100, or optional ≤ 80) is an owner decision. The account page is shared by every role.

**A addition:** the library and the account page join the staff layout (H-17), as part of A1/A2.

**D. Later:**
- the guide inside the teacher layout (H-11);
- retire or keep `teacher-workspace-preview.html` (H-20). Removing a published page is a production change and needs your approval.
- in-page confirmations instead of the browser's own pop-up. They're used on every role's pages (teacher, school admin, master admin, content, account), so this is platform-wide.

## 5. Phase plan

1. **Phase 1, this document:** audit and proposals.
2. **Phase 2, a design specification and a realistic prototype before any product code:**
   - Home, class page and review queue, in the real staff layout with synthetic data, at phone and desktop widths;
   - a written token and rules document for the staff layout (A3).

   You review it. Ideally one or two real teachers try it for 20–30 minutes each. Without that, Phase 3 still rests on assumptions. Estimate: 1.5–2 days.
3. **Phase 3, build approved items in slices.** Each slice is one PR with:
   - updated production QA scripts and stable `data-testid` hooks;
   - native browser regressions;
   - a dated record ("Owner usability acceptance: not given").

   Suggested order: C1–C3 → A2 → B2 + B3 → B1 → B4 → A1 → B5 → A3 migration. The production suites they affect are listed in Appendix A and the C1–C3 record (`.hm-role-nav` in 5 scripts; `#rosterAnalyticsCard`, `#teacherWorkflowEntries`, `data-today`, `#teacherPageTitle` and `teacher-workflows.html` in others). A1 and A2 also affect school admin, master admin and content reviewer suites, which I have not mapped yet.

## 6. Recommendation and the assumptions behind it

I recommend shipping **C1–C3 now**: they are low risk, teacher only, and fix a visible defect. In parallel I'd start **Phase 2 for A2 + B2 + B3**, because the class page is where the teacher's main job (J2) breaks down as class size grows. That holds whatever device teachers use.

**Assumption:** teachers use both phones and computers. A1 (phone menu) ranks lower only because it touches all staff roles and needs your decision on each role's main items, not because it matters less. If you know teachers mostly use phones, A1 and A2 move to the top.

## Appendix A — Teacher view measurements

The audit run before the cross-role review used the same fixtures and script. Its proposals T1–T10 were folded into the A/B/C items above.

### A.1 Method and limits

**What was run.** The real `teacher.html` and `teacher-workflows.html` pages (HTML, scripts and styles at `main` `8a55009`) in local headless Chromium, using two existing synthetic fixtures from the repository:
- `tests/fixtures/teacher-today-browser.mjs`: real Home and review server handlers against an in-memory PostgreSQL copy of the schema, with two submitted synthetic writing tasks.
- `tests/fixtures/teacher-performance-browser.mjs`: mocked dashboard reads with synthetic analytics (8 students × 4 skills; a separate 30-student run for page length).

**Views:** Home (with pending work and without), Classes, Archive, Create class, Profile, Assign writing (empty), Review (empty and with a queue), a review opened from Home, the class workspace, the student drawer and the teacher guide.

**Sizes:** 390 × 844, 768 × 1024 and 1280 × 900, each at 100% and 200% text. That gives 78 measured renders. For comparison, student Home and Courses were measured with the same script.

**Evidence type.** Isolated, synthetic and simulated. This is not a signed-in production check and not a real-device check. No production request was made and no QA account was used.

**Fixture artefacts, not product findings.** «Synthetic learner» as the teacher's greeting, and the English rubric labels («Task and audience», «Organisation») both come from synthetic data.

**Not covered:**
- custom-task authoring;
- the teacher resource library and the material-assignment flow;
- invitation, rename and archive actions beyond rendering;
- `teacher-workspace-preview.html`;
- `school-teacher.html`, which is the school administrator's view of a teacher, not a teacher page;
- screen-reader behaviour beyond the existing tests;
- real class sizes and real usage data.

### A.2 Findings (measured)

#### F1. Baseline checks pass
- No horizontal page overflow and no page script errors in any of the 78 renders.
- No text contrast failure on solid backgrounds. Gradient and image backgrounds were skipped.
- Tap targets: only a few text links are about 26 px tall («Բոլոր դասարանները», «Ստուգման ուղեցույց», «Հանձնարարելու ուղեցույց»). Matrix cells are 43 px wide. The rest meet 44 px.

#### F2. Phone navigation hides destinations in a sideways scroll
- On phones, the teacher menu is one row of 7 links (`web/role-layout.css:175`, `overflow-x:auto; white-space:nowrap`).
- At 390 px, three labels are fully visible and the fourth is cut («Հա…»). At 200% text, one and a half are visible.
- BF-10 removed hidden sideways scrolling for students, who have a fixed 4-item bottom menu.

#### F3. On a phone, page furniture pushes the work below the first screen
| Teacher Home, 390 × 844 | Text 100% | Text 200% |
|---|---|---|
| Page title (H1) | 279 px | 659 px |
| Pending-review summary | 985 px | 2,703 px |
| «Շարունակել ստուգումը» button | 1,073 px (below the first screen) | 3,085 px |

- Above the title: logo, menu row, account link and sign-out button (about 188 px). At 200% this block takes about 490 of the 844 px.
- Then the breadcrumb, a title card with an «Ուսուցիչ» role pill, the pilot notice, the greeting and three buttons.
- Student Home on the same phone has a 74 px header card and starts with content.
- The 31 Oct readability change (PR374) required these items to be on the first screen only at 1280 × 900. That still holds: the button is at 524 px there.

#### F4. The same elements repeat on every view
- The pilot notice («Փորձնական ուսուցչական միջավայր») appears on every teacher view. PR374 deliberately kept its title visible.
- The «Ուսուցիչ» role pill appears in every title card.
- Several views repeat the page title as a heading:
  - Profile: H1 and H2 «Իմ պրոֆիլը»;
  - Create class: H1 and H2 «Նոր դասարան»;
  - Archive: H1, H2 and H3 «Արխիվացված դասարաններ».
- On Home, «Իմ պրոֆիլը» is both a menu item and a quick-action button. The two path cards lead to the same places as the menu items «Դասարաններ» and «Գրավորի ստուգում».
- Account-related links are in two places: the «Իմ պրոֆիլը» view (name, plus a link to account settings) and «Հաշիվ և գաղտնիություն». Students have a single «Իմ հաշիվը».

#### F5. Class workspace: the class's own data comes last
Order on the page:
1. Generic titles: H1 «Դասարանի աշխատատարածք», H2 «Դասարանի մանրամասներ». The class name is only in a metadata line until a later H2.
2. Four workflow cards.
3. The class header with rename and archive.
4. The full invitation form with a large text box.
5. The student list (roster).
6. The skills summary.
7. The skills matrix.

| Synthetic 30-student class | Desktop 1280 | Phone 390 |
|---|---|---|
| Roster starts | 2,034 px | 3,199 px |
| Matrix starts | 8,427 px | 17,780 px |
| Total page height | 11,075 px | 20,930 px |
| Height per roster entry | ≈ 213 px | ≈ 486 px |

#### F6. Writing review has two entry points that work differently
- **Home** shows a combined pending list across all classes. «Շարունակել ստուգումը» opens the review inside Home, between the list and the recent-classes section (desktop page 3,588 px).
- **The «Գրավորի ստուգում» view** (menu item and Home path card) starts with three dropdowns: list, class, unit. It shows no pending work until you choose a class and a unit.
- The same label therefore leads to a different flow from Home's review button.
- I have not confirmed whether the review view could reuse the Home list without a server change.

#### F7. Teacher pages use a looser type and shape system than student pages
| Measure (same script) | Student Home/Courses | Teacher views |
|---|---|---|
| Font sizes | 12, 14, 15, 16, 18, 20/22, 24/28 | 17 distinct values, including 11.52, 12.48, 13.12, 13.76, 14.08, 15.2, 18.4, 21.6 and 24.8 |
| Weights | 400 / 600 / 700 | 400 / 500 / 600 / 650 / 700 / 800 |
| Corner radii | 8 / 12 / 16 / pill | 8, 9, 10, 10.4, 12, 12.8, 14, 14.4, 16, 20, pill, 50% |
| H1 on desktop | 28 px | 24 px |
| H2 | 20 (phone) / 22 (desktop) | 22 or 18 on the same page (Home: «Ստուգման հերթ» 18, «Դասընթացի գրավորները» 22) |

- The two roles already share the font (Noto Sans Armenian UI) and the green palette.
- `teacher.html` loads 11 stylesheets from the older stack and not `student-forest.css`.
- Student D2 (merging the 13 and 15 px sizes) is still deferred, so the student scale is not final either.

#### F8. The teacher guide is a third style
- `teacher-workflows.html` uses `student-forest.css` plus its own styles: H1 44.8 px, H2 28.8 px, and no teacher menu.
- It has a «Ուսուցչի էջ» back link at the top.
- On a phone the page is 13,217 px long (66,599 px at 200%), and its 8-link table of contents is 506 px tall.
- I did not check the guide's text against the current interface.


## Appendix B — Second pass: the remaining teacher pages (13 November 2026)

**Method.** I ran the existing native tests for:
- the material library and material assignment;
- writing assignment (recipients, preview);
- custom-task authoring, preview and review;
- course-writing review on the class page;
- the teacher account and privacy page;
- skill evidence and practice history.

A preload script made each of their screenshots also record the same layout metrics as Appendix A: 80 tests passed, 59 measured screenshots. I also rendered:
- a school teacher with no classes;
- a personal-account teacher;
- a dashboard load failure;
- a non-teacher account;
- the class page's join-code, rename and archive panels.

All of this used synthetic data in isolation, not production.

Some flows run inside the tests' harness page, which loads the teacher styles without the full teacher layout. Findings that depend on that harness are excluded; for example, the custom-review picker padding is correct inside the real review view.

**Measured:**
- No sideways page scrolling and no contrast failures on solid backgrounds in any flow.
- Repeated-defect checks found the two cards in H-16.
- Radio buttons in the writing-recipient list are 13 × 13 px, but the whole label is clickable.

**Functional:**
- **Display name (H-15):** the two screens call different endpoints that both write `profiles.display_name`.
- **Confirmations:** archive, cancel invitation, cancel join code, new join code and leaving with unsaved work use the browser's own `window.confirm` pop-up. Playwright dismisses these automatically, so the archive panel was seen without being confirmed.
- **Non-teacher account:** teacher.html sends it to the student Home, as intended. The student page then had no synthetic data, so its error is a fixture artefact.

**Not audited:** the shared sign-in page (`account-access`), which is the same for every role, and real devices or screen readers.

## Appendix C — Teacher account audit (14 November 2026)

**Scope.** John set the teacher's own account as the current priority: the «Իմ պրոֆիլը» view in `teacher.html` and the shared account page `privacy.html`, as a teacher. Other roles' account pages follow later.

**Method.** The real pages ran in local headless Chromium with synthetic data. Widths: 390 and 1280 px, each at 100% and 200% text. Accounts: school and personal teachers, active and deletion-pending. One read-only aggregate count on production (no names read). Not a signed-in production check and not a real-device check. No script errors and no sideways scrolling in any render.

**Facts from the code.**
1. The display name is saved in two places with different rules. `manage-teacher-profile`: required, 2–100 characters, repeated spaces collapsed, not audited. `manage-my-privacy`: optional, up to 80, can be cleared, audited. Only the first checks for an active live session.
2. School administrators see the teacher's name, and the teacher's email when the name is empty (`get-school-admin-overview`). The platform administrator can search by name. The profile view says the name appears only in the teacher's workspace. Whether any student page shows a teacher's name was not verified.
3. The deletion section opens with the student rule; the teacher rule is a second sentence.
4. Unsaved changes are protected only on sign-out, not when leaving through «← Գլխավոր».
5. Creating a staff account does not appear to set a name, as far as the code shows; this was not confirmed against the staff invitation flow.

**Measured.**

| | Profile view | Account page as a teacher |
|---|---|---|
| Teacher menu | Yes | No (only «← Գլխավոր» and «Դուրս գալ») |
| Phone, 100% text | 1,356 px; H1 at 279 px; name field at about 735 px | 3,864 px; H1 at 45 px; data list about 1,000 px, placed before login details |
| Phone, 200% text | 3,032 px | 10,749 px |
| Desktop | 900 px | 2,675 px; name card stretched to 955 px; empty space in the password column |
| Text sizes | 7 | 7–8, including 12.16, 13.33, 16.8 and 18.4 px |

Other findings: reaching the login settings takes three steps (menu → Profile → «Բացել հաշվի կարգավորումները»); the read-only email looks like an editable field; the text mentions «Supabase Auth».

**Production data (aggregate, 14 November).** 12 profiles: all 3 teachers and the master admin have a name; 2 students, 2 school administrators and 1 content reviewer have none. No name has 1 character, more than 80 characters or extra spaces.

**Proposals T1–T7 and decisions.**
- T1 One «Իմ հաշիվը» entry; «Իմ պրոֆիլը» leaves the menu and Home, and its address opens the account.
- T2 The account inside the teacher layout, built as one shared account module that other roles adopt later. *Teacher-first exception approved by John, 14 November.*
- T3 Order: name and email → login details → privacy, with the data list folded → deletion.
- T4 Deletion text for teachers, with confirmation on the page.
- T5 One display-name rule enforced by one server function. *Decided by John, 14 November: no role may save an empty name; 2–80 characters, spaces collapsed. Existing accounts are not forced to add a name; the main content reviewer may stay unnamed; the planned subject-matter reviewer invitation must require one.*
- T6 Unsaved-changes guard on any navigation away.
- T7 Correct wording on who sees the name; no vendor name. Armenian review needed.

**Prototype (version 6, 14 November).** The account screen implements T1–T7 with synthetic data. Measured with design notes off (version 7 figures): phone page 2,287 px (3,864 today), name field at 416 px from the top of the page, desktop 1,833 px (2,675 today). Prototype checks: 340 renders (17 screens × 5 data states × 2 teacher types × 2 widths) with one H1, no sideways scrolling and no script errors; 30 account interaction checks; 10 click paths at both widths.

**Found while checking: phone menu at 200% text (A1).** The proposed four-item bottom menu did not fit at 200% text. The prototype now wraps it to two rows, but it then takes 24–28% of the height on phones 667 px tall or shorter (BF-10 allows 20% for students), and at 360 px and narrower it still overflows by up to 23 px. The A1 build must reuse BF-10's fallbacks. The `teacher.html` header link (logo and role) is 28 px tall in the account render.

**Prototype version 7 (14 November, after a review of version 6).** The review found the account screen misrepresented some behaviour; version 7 corrects it. No T1–T7 design decision changed.
- Unsaved changes are worked out per section by comparing values, as today's account page does. Saving the name no longer hides an unsaved privacy choice, and a box ticked and unticked again is not a change.
- An empty, malformed or unchanged email shows today's «Մուտքագրեք նոր էլ. հասցե։» instead of a success message.
- A "saved" message is removed when its value changes again.
- The password section shows the bot-protection bar when the button is pressed, as today (about 65 px).
- Opening an on-page confirmation moves keyboard focus into it; cancelling or Escape returns focus to the control that opened it. This applies to every confirmation in the prototype. Section links move focus to their section.
- The new sentences say «ադմին», the word the account page uses. The teacher page itself uses both «ադմին» and «ադմինիստրատոր» today.
- The phone header link is 44 px tall; the saved name appears in the Home greeting and history lines; a note states that the email is masked only in the prototype.

**Deletion requests for teachers: how the code behaves today.** `manage-admin-account` refuses to approve a deletion request for any non-student account (`staff_offboarding_required`). A teacher's request can therefore only stay pending, be cancelled by the teacher, or be rejected; the account is removed later through the separate staff deletion step, which itself is refused while a request is open. The account stays «Ակտիվ» throughout. The locked «Ջնջման հաստատման փուլում» state is reached only by student accounts. The page already receives the rejection reason (`resolution_code`) but does not show it. Version 6 had shown an invented status label, and the version 6 review wrongly expected the locked state for teachers; both are corrected. *Decided by John, 14 November:* show the reason for a rejected request. The prototype (version 8) shows a line for each of the four codes an administrator can record (`staff_offboarding_required`, `not_verified`, `duplicate_request`, `legal_hold`) and none for an unknown code. All four lines are new wording for Armenian review. The legal-hold line is a neutral placeholder: what a user should be told in that case is an owner decision, not a design one.

Version 7 and 8 checks: the same 340 renders; 65 (version 7) and 69 (version 8) account and focus checks; 10 click paths at both widths; no script errors. Chromium only: Safari, iPhone and screen readers were not checked.

Owner usability acceptance: not given.
