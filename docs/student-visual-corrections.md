# Sprint 16.5B.4 — subject artwork and Forest continuity

Date: 2026-10-27. Base: `020c94f015bf40cc51d5d7a8d0ea7e92d9e32222`. State: implementation candidate; release checks pending.

The owner reported generic/tiny subject symbols and a blue account page before its Forest design loaded, and requested a Forest public landing page.

## Changes and shared-consumer audit

- `subject-visuals.mjs` is the explicit replaceable `haiedu-subject-art-v1` presentation extension. It restores the approved book/sound and atom illustrations and adds Mathematics, Armenian, Chemistry, Geography, Biology and History. Registry lookup uses only governed subject codes, fixed markup, aliases and a neutral fallback. Labels remain curriculum data. No subject/grade/course access is inferred from art.
- Home, Courses and My work share `multi-subject-home.js`; all use subject illustrations. Shared course presentation also shows its governed subject artwork. Navigation and action icons retain their original semantics. Large illustration sizing is separate from the small navigation icon flex basis.
- `privacy.html` declares a static Forest presentation attribute. Shared foundation/utility selectors render cream and green before any external module, session or profile completes, including failure and signed-out states. Authenticated student-only navigation and role-specific inventory remain driven by the existing role response. Staff account pages use the same Forest surface; staff dashboards are unchanged. The mobile utility header uses an explicit row/wrap layout to prevent its 30rem flex basis becoming an empty vertical block.
- `student-shell.css` applies Forest ink, accent, focus, border, cream and sage to the public landing page. The unresolved Home canvas is cream too. Logo, content, signup/login links and role routing are unchanged.
- Consumers of `student-forest.css` / imported `student-surfaces.css` include Home, shared/legacy course, assessment, progress/task/results, guides, written work, materials, privacy, join and identity access. Required native regressions cover these surfaces. All four explicit Physics workflow dependency lists now include the subject-art module; English wildcard paths already cover it. No backend, storage, learning policy, content, audio or teacher-feedback changes.

## Validation and release

Local typecheck, core parity, JavaScript syntax and the browser dependency guard pass. Isolated Chromium regressions add all eight subject symbols plus unknown fallback in Courses/My work, illustration dimensions, delayed student/staff account first paint, failed/signed-out account styling, and Forest landing-page routes/reflow at 320/768/1280 px. The preview uses real frontend modules with synthetic service data. Required CI, production commit/assets and affected live acceptance will be recorded after release; none are claimed from a preview.

Unchanged S45 backend acceptance (73 checks plus two-school isolation), learner/audio/writing controls and prior subject acceptance are retained under the preceding evidence. The persistent Vercel production blocking configuration is reused from the independently verified reliability record; the existing connector scope limitation remains, and no deployment-control change is made.

All 45 capability mappings and planned dependencies remain. New symbols do not claim available releases for the six future subjects. Owner usability sign-off and full four-subject 16.5C acceptance remain open. English remains paused after C47, then resumes with Unit3 learner/audio/writing acceptance and Units4–6.
