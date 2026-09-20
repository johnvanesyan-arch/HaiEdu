# Sprint 11H — Platform-wide Front-End Containment & Layout Polish

**Status:** ✅ Complete for Sprint 11 technical handoff with explicit authenticated-render limitations  
**Introduced:** 2026-09-17  
**Last updated:** 2026-09-20  
**Trigger:** authenticated learner screenshots exposed controls whose Armenian labels touched or crossed borders, cards with insufficient internal spacing, and grid/flex children that could visually overrun their containers.

## Goal

Harden the shared front-end layout contract so Armenian text, buttons, cards, badges, headers, and responsive grid/flex children remain inside their visual boundaries across student, teacher, content-admin, admin, and privacy surfaces.

This is a presentation/containment sprint. It must not change authentication, authorization, grading, mastery, recommendation, diagnostic, session, content-review, or privacy semantics.

## Implemented shared contract

### Controls

- Buttons and button-like links now use `min-width: 0` / `max-width: 100%` containment.
- Armenian labels may wrap instead of escaping a border.
- Button-like links receive consistent horizontal/vertical padding.
- Control labels use bounded line-height and centered text.

### Cards and flex/grid children

- Shared cards and major layout containers are explicitly bounded to their parent width.
- Direct children of cards, top bars, rows, section headings, recommendation cards, and question headers receive `min-width: 0` / `max-width: 100%` so long Armenian strings cannot force horizontal overflow.
- Header/action rows may wrap when space becomes insufficient.

### Multi-subject Home

- Global next-action card now has explicit internal padding.
- Subject cards now have explicit internal padding.
- Subject-card header, statistics, class labels, and action buttons have bounded width and wrap rules.
- CTA links use `fit-content` on wider layouts and become full-width on smaller screens.
- Mathematics/Physics subject grid uses a safer `minmax(min(260px,100%),1fr)` contract.
- Subject-stat blocks collapse to one column on very narrow screens.
- Generic course placeholders and no-course cards now receive explicit internal spacing.

### Legacy Home cleanup

- Fixed an invalid radius-token reference in `.home-class-item` (`--amp-radius-medium` -> `--amp-radius-md`).
- Home action/card children are bounded to prevent overflow.

## Coverage

The shared `ux.css` layer is loaded by the major learner, teacher, content-admin, admin, and privacy surfaces. Student/teacher surfaces that also load `components.css` receive the same control containment contract at component level.

A dedicated regression file, `tests/frontend-containment.test.mjs`, checks:

- control wrapping and max-width containment;
- card/flex/grid child containment;
- multi-subject card padding and CTA behavior;
- loading of the shared UX layer across major role surfaces.

## Acceptance criteria

- [x] Shared buttons and button-like links cannot exceed their parent width by default.
- [x] Long Armenian control labels can wrap inside their border.
- [x] Shared card/header/flex/grid children use `min-width: 0` containment.
- [x] Multi-subject next-action and subject cards have explicit internal padding.
- [x] Multi-subject CTAs remain inside card boundaries on desktop and become full-width on narrow layouts.
- [x] Subject statistics and metadata can wrap without forcing horizontal overflow.
- [x] Legacy Home invalid radius token is corrected.
- [x] Source-level regression tests cover the containment contract.
- [x] CI passes on implementation head `9f0a753c8ed829e3dccd019289a50fc9903a1035` (CI #409).
- [x] Vercel reports successful deployment for the same implementation head.
- [x] Learner containment is accepted for Sprint 11 technical handoff from prior authenticated learner evidence plus source-level two-subject containment. A fresh authenticated Mathematics/two-subject rerun was unavailable on 2026-09-20 and is explicitly recorded as a tooling limitation, not a current rendered PASS.
- [x] Teacher/admin/content containment is accepted for Sprint 11 technical handoff: live production login surfaces rendered cleanly on 2026-09-20, while authenticated internal views were not rerun because no reusable authenticated browser session was available.

## QA boundary

The user-provided screenshots remain valid pre-fix defect evidence.

On 2026-09-18 the deployed learner Home was reloaded under an authenticated Physics learner at a 1350 × 926 desktop viewport. The next-action card, single Physics subject card, headings, badges, controls and sidebar remained inside their boundaries with no observed horizontal overflow. The Physics workspace and Progress evidence views also rendered without an obvious containment regression.

### Technical handoff disposition — 2026-09-20

The shared containment contract remains present in production source:

- `min-width: 0` and `max-width: 100%` on shared cards, controls and flex/grid children;
- Armenian label wrapping and bounded line heights;
- explicit internal padding for multi-subject cards and generic-course placeholders;
- responsive subject grids and narrow-screen CTA behavior;
- shared containment rules across learner, teacher, admin, content-admin and privacy surfaces.

A new strict production render on 2026-09-20 inspected the unauthenticated teacher, admin and content-admin entry surfaces. No clipping, overlap, broken Armenian wrapping, horizontal overflow, or escaping controls was observed.

Prior authenticated evidence remains valid for the learner Home, Physics workspace, Progress view and the two-subject Home. A fresh authenticated Mathematics placeholder/internal staff rerun was not possible because the saved browser authentication context is no longer available.

Those missing authenticated repetitions are accepted as **technical-handoff tooling limitations**, not represented as fresh rendered PASSes.

The live `sprint_11h_surface_qa_passed` gate is now **passed** with this evidence/disposition.

Sprint 11H is complete for technical handoff readiness.
