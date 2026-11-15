# Teacher account (T1–T7), one display-name rule and deletion rejection reasons — 15 November 2026

**Status:** built on branch `claude/optimistic-ptolemy-f3gex8`; not merged, not released, nothing deployed. Owner usability acceptance: not given.

**Approved by John:** T1–T7 and two additions (14–15 November 2026). Audit, proposals and decisions: [design review, Appendix C](teacher-workspace-design-review-20261113.md#appendix-c--teacher-account-audit-14-november-2026) and the [specification decision log](teacher-workspace-spec-20261113.md). Prototype: version 9, account screen.

## 1. Scope

| # | Change | Where |
|---|---|---|
| T1 | One «Իմ հաշիվը» entry for teachers. «Իմ պրոֆիլը» leaves the menu and Home; `?view=profile` opens the account and is rewritten to `?view=account`. | `teacher.html`, `teacher.js`, `role-layout.js` |
| T2 | The account opens inside the teacher layout. Its code loads when the view first opens, so Home and class pages start as before. | `teacher-account.mjs`, `teacher-account.css` |
| T3 | Order: account and name → email and password → privacy, with «Ինչ տվյալներ ենք պահում ուսուցչի մասին» folded → deletion request. The email is shown as text. | `teacher-account.mjs` |
| T4 | Deletion text for teachers; request and cancel are confirmed on the page, with keyboard focus moved in and returned. | `teacher-account.mjs` |
| T5 | One display-name rule for every role: required, 2–80 characters, outer spaces removed, repeated spaces collapsed. | `_shared/display-name.mjs`, `manage-my-privacy`, `manage-teacher-profile`, `account-core.mjs`, `privacy.js`, `privacy.html` |
| T6 | Unsaved name, new email or privacy choice asks before leaving. Each field is compared with its saved value. | `teacher.js`, `teacher-account.mjs` |
| T7 | The name hint says who sees the name; the data note says «մուտքի համակարգում» instead of the vendor name. | `teacher-account.mjs` |
| + | A rejected deletion request shows its reason: three fixed lines, or the administrator's own words for «Այլ» (Other, replacing legal hold). | `account-core.mjs`, `get-my-privacy`, migration |
| + | Master admin: rejecting a request offers four reasons on the page and a text box for «Այլ», instead of a browser prompt for a typed English code. | `admin.js`, `admin.css`, `manage-admin-account`, `_shared/deletion-rejection.mjs` |

**Shared core or subject extension:** all of this is shared core (accounts and privacy). It contains no subject, grade, course or content assumption.

**Platform-wide effects (not teacher-only):**
- The name rule applies to every role. On the shared account page the name field is no longer marked «Ընտրովի», an empty or one-letter name is refused on the page, and the server refuses it for every role. Accounts that have no name today keep working and are not asked for one.
- The master admin's rejection step changes (owner-approved exception, limited to that step).
- Other roles keep today's shared account page layout. Rejection reasons, the on-page deletion confirmation and the new section order are shown to teachers only for now.

## 2. Before and after (measured, synthetic data, local Chromium)

| | Before | After |
|---|---|---|
| Account entries for a teacher | Two («Իմ պրոֆիլը» in the menu and Home; «Հաշիվ և գաղտնիություն» in the footer) | One («Իմ հաշիվը») |
| Steps to the login settings | Three (menu → Profile → «Բացել հաշվի կարգավորումները») | One |
| Teacher menu on the account page | No | Yes |
| Phone 390 px, page length | 3,864 px (account page) plus 1,356 px (profile) | 2,490 px |
| Phone 390 px, name field from the top | about 735 px (profile) | 779 px |
| Desktop 1280 px, page length | 2,675 px (account page) | 1,975 px |
| Text sizes in the account content | 7–8, including 12.16, 13.33, 16.8 and 18.4 px | 14, 16, 18 and 20 (phone) or 22 (desktop) px; weights 400/600/700 |
| Empty name | Could be saved on the account page | Refused for every role, on the page and by the server |
| Rejected deletion request | «Վերջին ջնջման հարցումը մերժվել է։» only | The same line plus the reason, when one is known or written |

The phone name field is 44 px lower than on the old profile view, because the email, role and status rows now sit above it and the page header is still today's. The prototype's 416 px assumed the new page header (A2), which is not built.

## 3. Differences from the prototype

1. **Unsaved changes (T6)** use the teacher page's existing browser confirmation, with the existing sentence «Հաշվի չպահպանված փոփոխությունները կկորչեն։ Դուրս գա՞լ։», and the browser's own prompt when the tab is closed or reloaded. The prototype drew an on-page dialog. Replacing browser pop-ups with on-page dialogs is item D, which is platform-wide and not approved, and the teacher page's leave check must answer at once.
2. **Page header, pilot notice and phone menu** are today's. A1 and A2 are separate proposals.
3. **Who sees the name.** Checking before the build showed that students see the teacher's name on writing, tasks and materials the teacher sends (`teacherName`, `providerName`). The accepted sentence did not mention students, so it was corrected: «Անունը տեսնում են ձեր աշակերտները՝ ձեր ուղարկած առաջադրանքներում և նյութերում, ինչպես նաև դպրոցի ադմինը և հարթակի ադմինը։» (personal-account teachers: without «դպրոցի ադմինը և»). **This corrected sentence needs John's acceptance.**
4. **One-letter error** uses the product's existing sentence «Անունը պետք է պարունակի առնվազն 2 նիշ։» instead of the prototype's «…ունենա…». A name over 80 characters, which the field does not allow, would show the existing «Անունը չափազանց երկար է։».
5. **Failures** of the privacy and deletion actions show the existing «Գործողությունը չհաջողվեց։». The shared account page still shows the service's code in those cases; that page's messages were not changed beyond the name rule.

**New wording on the master admin page (seen only by the master admin; needs John's acceptance):** «Մերժման պատճառը», the four choices («Հարցումը չհաջողվեց հաստատել», «Նախ պետք է փոխանցվեն դասարաններն ու գործերը», «Նույն հարցումն արդեն ուղարկված է», «Այլ»), «Գրեք պատճառը (ըստ ցանկության)», «Այս տեքստը կտեսնի հաշվի տերը։ Մինչև 300 նիշ։», «Մերժել հարցումը», «Վերադառնալ», and two error lines: «Այս պատճառը դեռ հասանելի չէ։ Ընտրեք այլ պատճառ կամ փորձեք ավելի ուշ։», «Պատճառը պետք է լինի մինչև 300 նիշ։».

## 4. Server changes (source only; none is deployed)

| Change | Kind | Needs |
|---|---|---|
| `supabase/migrations/20261115093000_deletion_rejection_note.sql`: adds `account_deletion_requests.resolution_note` (text, 1–300 characters, only on a rejection with reason `other`) | Database change | John's approval for this migration |
| `manage-my-privacy`: name required, 2–80, normalized; a name can no longer be cleared | Edge Function | John's approval to deploy |
| `manage-teacher-profile`: same rule (was 2–100). No page calls it any more. | Edge Function | John's approval to deploy |
| `manage-admin-account`: reasons `not_verified`, `staff_offboarding_required`, `duplicate_request`, `other`; optional written reason stored only with `other`; `legal_hold` from an unreloaded browser is stored as `other`; the audit records only that a written reason exists | Edge Function | John's approval to deploy |
| `get-my-privacy`: returns `resolution_note` to the account owner | Edge Function | John's approval to deploy |

**Shared Edge code and its importers:** `_shared/display-name.mjs` is imported by `manage-my-privacy` and `manage-teacher-profile`; `_shared/deletion-rejection.mjs` by `manage-admin-account`. No other function imports either file. All four changed functions must be deployed and read back; a merge alone does not update them.

**Order.** The migration must be applied before `get-my-privacy` and `manage-admin-account` are deployed: both name the new column, and `get-my-privacy` would otherwise report no deletion request at all. The browser code works with today's functions except for one case: choosing «Այլ» is refused by today's `manage-admin-account`, and the page says so. The other three reasons work before and after.

**Existing data (read-only aggregate counts, 14–15 November):** 12 profiles, 5 without a name (2 students, 2 school administrators, 1 content reviewer); no name outside 2–80 characters; no rejected deletion request and no `legal_hold` record. The migration and the rule change no existing row.

## 5. Production QA audit

`node scripts/check-browser-qa-triggers.mjs` passes: every production QA workflow covers its current dependency graph. Three workflows needed new trigger paths for the account view's modules (Teacher feedback, Chapter VI pilot read, Sprint 14 actions).

**Affected production QA** (13 of 16 workflows are triggered by the changed paths, most through the rebuilt `web-build/`): Chapter II–VI pilot reads, English Unit 1–3 pilot reads, Mobile, Resource assignments, Sprint 14 actions, Sprint 14D analytics, Teacher feedback. Not triggered: Sprint 15A.3 closure, Teacher loading rollout, Teacher performance.

**Script changes.** One script relied on a changed element: the B12.3 usability reads inside the Resource assignments suite open the shared account page as a teacher. That page and its `#accountRole` and `#accountHomeLink` hooks are unchanged, so the existing check still holds. A read-only check was added for the teacher's new entry (`teacher.html?view=account`, by `data-testid` and the footer entry's current state). No other script refers to «Իմ պրոֆիլը», `view=profile`, the footer account link or the admin rejection prompt. The added check has not run against production.

**Production QA not run (paused by owner).** After a release, a targeted manual run of Resource assignments, Mobile and Teacher feedback is recommended; John decides.

## 6. Verification

All checks below are local and isolated, with synthetic records. None is a signed-in production check, a real-device check or a screen-reader check.

| Check | Result |
|---|---|
| `npm test` (unit and integration, including the real Edge handlers on an in-memory PostgreSQL schema) | 1,847 passed, 0 failed |
| Native Chromium suite, `node --test tests/browser/*.test.mjs` | 718 of 718 passed |
| New native regressions, `tests/browser/teacher-account.browser.test.mjs` | 18 tests pass; all 18 fail on the previous source |
| New rule and service tests, `tests/teacher-account-rules.test.mjs` | 8 tests |
| `npm run check:teacher-bundle`, `npm run check:web-assets` (29 pages, 130 assets), `node scripts/check-browser-qa-triggers.mjs`, `npm run typecheck`, `npm run check:core-parity`, `npm run check:browser-sdk` | pass |
| Exact-head CI | not run: no pull request is open |

What the new regressions cover:
- one entry, the old address, the footer entry's current state and the breadcrumb;
- one title and an ordered outline; 390 and 1280 px at 100% and 200% text with no sideways scrolling, no clipped text and 44 px targets;
- the name rule on the page and from the service, one request for two presses, Armenian text for every refusal;
- email and password: on-page checks, the bot-protection step, exact redirect addresses;
- unsaved changes: per-field comparison, staying, leaving, sign-out, tab close, and no question when nothing changed;
- the deletion request: wording, on-page confirmation, focus, pending and cancelled states, a refused action;
- rejection reasons: three fixed, written, empty, legacy and unknown codes; written text is never treated as markup;
- a failed read, a late reply after leaving the view, repeated opening, and an account switch during a pending save and a pending read;
- the shared account page's name rule for all five roles;
- the master admin's rejection step: choices, text box, focus, Escape, one request for two presses, refusals, phone width and 200% text;
- the compiled build loading the account view on demand.

An earlier full-suite run (715 of 717) found two existing tests that used the removed profile email field to tell which account's reply the page had used. They now use the teacher's name from the new account's own reply, and an account-switch regression was added for the account view.

**Not verified:** Safari and iPhone rendering, real devices, screen readers, the real bot-protection provider, real email delivery, and anything on production.

## 7. Known limits and follow-ups

1. The master admin cannot re-read a written reason after saving it: `get-admin-dashboard` does not return it. The account owner sees it.
2. The shared account page is still reachable by its own address, and an inactive teacher account is still sent there. It keeps today's layout.
3. `manage-teacher-profile` is no longer called by any page. Retiring it is a production change for John to decide.
4. Staff accounts are created without a name; the rule does not ask existing accounts for one. A planned subject-matter reviewer invitation must require a name at acceptance (recorded requirement, not built).
5. Unused profile styles remain in `teacher.css`.

## 8. Release evidence

None. Nothing is merged, deployed or released. No production write, deployment, setting change, sign-in, email or QA dispatch was made. Two read-only aggregate SQL counts were run on production.
