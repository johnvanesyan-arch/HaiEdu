# Student Home reopens on the last unit — 9 November 2026

This is Phase 2b of the 7 November student design review: item B7, Home pre-selection. John approved it on 9 November 2026 («I approve everything»).

**Scope.** Shared core presentation for every subject, grade, school and release:
- `web/learning-navigation.mjs` (remember, recall and forget helpers);
- `web/multi-subject-home.js` (Home);
- `web/course-page.js` (records the opened unit).

## Problem

A student with more than one unit who opened Home fresh had to choose a course and a unit from two dropdowns on every visit before seeing a next step. A fresh visit means a bookmark, after signing in, or the phone home-screen icon. Home showed «Ո՞ր բաժնից շարունակենք». Links from the course page already carried the unit; fresh visits did not.

## Change

| Situation | Before | After |
|---|---|---|
| Home opened with no unit in the link, more than one unit, and a unit remembered for this account that is still one of its units | Empty state; both dropdowns to choose | Home opens on that unit: the next step, path and readiness load from the same single dashboard read. The link is updated to name the unit, as a manual choice does. |
| Nothing remembered, another account's record, a unit no longer available, or unreadable storage | Empty state | Unchanged: empty state, no dashboard read |
| Exactly one unit | Selected automatically | Unchanged |
| A unit named in the link | That unit | Unchanged; it also becomes the remembered unit |
| Courses and My work | — | Do not apply the remembered unit |

**What is remembered.** The account ID and the three selection IDs (enrollment, release, unit) of the last unit the student opened on the course page or chose on Home.
- **Where:** in this browser only (`localStorage`, key `haiedu.lastLearningSelection`). It holds one record, so nothing accumulates.
- **Validation:** the record is used only when its account ID matches the signed-in account and its unit is one of that account's current learning contexts. Otherwise it is ignored.
- **Sign-out:** the record is cleared.
- **Not stored:** names, titles, scores and any other data.

**Rules kept:**
- **Home never starts an attempt** (16.5B.1). The pre-selected unit only fills the existing next-step card, path and selected course card.
- **No default subject** (`docs/architecture.md`, subject-neutral core). Home never chooses a unit the student has not opened or chosen. A student with no remembered unit sees the empty state as before; the existing test «Home never chooses a default subject…» is unchanged and passes.
- **No extra requests.** A remembered unit triggers the same single dashboard read as a manual choice.

## Production acceptance audit (before merge)

**Fresh storage in every production script.** Every production script that opens student Home creates a new browser context. Its `storageState` contains only the sign-in token, so no remembered unit exists. This covers:
- Chapters II–VI;
- English Units 1–3;
- Mobile;
- Resource;
- written-work and teacher-task delivery.

**Home opened once, at the start.** The scripts open Home once at the start of each context and leave through a course card. None returns to Home without a unit in the link after opening a course page.

**Unaffected views.** Mobile opens `?view=courses`, and the work scripts open `?view=work`. Neither view applies the remembered unit.

**Request rules already allow the read.** If a remembered unit were applied, its dashboard read has the exact three-ID selection shape. `allowedBrowserRequest` and `mobileReadAllowed` already accept that shape.

**No changed hooks.** No script reads the Home selectors, the empty state or `localStorage`.

## Verification (isolated, synthetic fixtures — not a live production check)

**Unit** (`tests/learning-navigation.test.mjs`). The record:
- belongs to one account;
- keeps only the four IDs;
- rejects invalid input without overwriting;
- ignores corrupt storage;
- is cleared by forget;
- survives blocked storage without errors.

**Chromium, Home** (`tests/browser/student-home.browser.test.mjs`):
- **Reopening:** Home reopens on the chosen unit with exactly one dashboard read, an updated link without `action`, and no session start.
- **Fail-closed:** another account's record, a revoked unit and corrupt storage all give the empty state with no dashboard read. This passes on both the old and new source.
- **Link precedence:** a unit named in the link wins and becomes the remembered unit.
- **Courses and sign-out:** Courses does not apply the remembered unit, and signing out clears it.

**Chromium, course page** (`tests/browser/student-course-page.browser.test.mjs`): opening a unit records it, and Home then reopens there.

The new positive tests fail on the previous source.

**Owner usability acceptance:** not given. **Live production check:** after merge.
