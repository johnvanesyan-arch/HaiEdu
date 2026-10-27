# Sprint 16.5B.4 — subject artwork and Forest continuity

Date: 2026-10-27. Base: `020c94f015bf40cc51d5d7a8d0ea7e92d9e32222`. State: delivered under [PR313](https://github.com/johnvanesyan-arch/HaiEdu/pull/313), production `5c0683a2d81f292ab371b3aceddb7e157eb19d8b`.

The owner reported generic/tiny subject symbols and a blue account page before its Forest design loaded, and requested a Forest public landing page.

## Changes and shared-consumer audit

- `subject-visuals.mjs` is the explicit replaceable `haiedu-subject-art-v1` presentation extension. It restores the approved book/sound and atom illustrations and adds Mathematics, Armenian, Chemistry, Geography, Biology and History. Registry lookup uses only governed subject codes, fixed markup, aliases and a neutral fallback. Labels remain curriculum data. No subject/grade/course access is inferred from art.
- Home, Courses and My work share `multi-subject-home.js`; all use subject illustrations. Shared course presentation also shows its governed subject artwork. Navigation and action icons retain their original semantics. Large illustration sizing is separate from the small navigation icon flex basis.
- `privacy.html` declares a static Forest presentation attribute. Shared foundation/utility selectors render cream and green before any external module, session or profile completes, including failure and signed-out states. Authenticated student-only navigation and role-specific inventory remain driven by the existing role response. Staff account pages use the same Forest surface; staff dashboards are unchanged. The mobile utility header uses an explicit row/wrap layout to prevent its 30rem flex basis becoming an empty vertical block.
- `student-shell.css` applies Forest ink, accent, focus, border, cream and sage to the public landing page. The unresolved Home canvas is cream too. Logo, content, signup/login links and role routing are unchanged.
- Consumers of `student-forest.css` / imported `student-surfaces.css` include Home, shared/legacy course, assessment, progress/task/results, guides, written work, materials, privacy, join and identity access. Required native regressions cover these surfaces. All four explicit Physics workflow dependency lists now include the subject-art module; English wildcard paths already cover it. No backend, storage, learning policy, content, audio or teacher-feedback changes.

## Validation and release

Local typecheck, core parity, JavaScript syntax and the browser dependency guard pass. Isolated Chromium regressions add all eight subject symbols plus unknown fallback in Courses/My work, illustration dimensions, delayed student/staff account first paint, failed/signed-out account styling, and Forest landing-page routes/reflow at 320/768/1280 px. The preview uses real frontend modules with synthetic service data. Required PR CI [40510069063](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40510069063) and main CI [40510541321](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40510541321) pass all five jobs, with 1,464 unit/integration tests and 177 native Chromium checks. Vercel production is successful; release.json and all seven changed frontend files match source byte-for-byte. Live public landing and signed-out account screens show Forest. [Production screenshot](evidence/student-forest-landing-20261027.jpg).

Unchanged S45 backend acceptance (73 checks plus two-school isolation), learner/audio/writing controls and prior subject acceptance are retained under the preceding evidence. The persistent Vercel production blocking configuration is reused from the independently verified reliability record; the existing connector scope limitation remains, and no deployment-control change is made.

All 45 capability mappings and planned dependencies remain. New symbols do not claim available releases for the six future subjects. Owner usability sign-off and full four-subject 16.5C acceptance remain open. English remains paused after C47, then resumes with Unit3 learner/audio/writing acceptance and Units4–6.

## Production handoff evidence

- English Unit3 and preserved programme reads: [40510817011](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40510817011), **154/154**, exact implementation source. Read-only learning acceptance; no full learner attempt is claimed. [Receipt](evidence/student-visual-english-20261027.json).
- School analytics: [40510541374](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/40510541374), **10/10**, including two-school denial and session cleanup. [Receipt](evidence/student-visual-analytics-20261027.json).
- Reused: Physics I–VI 324 checks (40488926093), S45 73 checks plus isolation (40502331986), staff actions 143 checks (40502112158). Their backend/learning behavior is unchanged; shared presentation has fresh required native coverage and English/context acceptance. Existing owner content/audio approvals are retained.
- Serialized production QA automatically canceled superseded pending reads. The untouched Chapter III run 40510541324 was canceled while waiting, and the intended English3 read was dispatched through the existing guarded main workflow. No required CI check was canceled.

[Machine-readable release evidence](evidence/student-visual-release-20261027.json). Documentation closure preserves the tested frontend and scripts; its required CI remains required. Notion must be synchronized to the final merged documentation source and read back with every native child page preserved.
