# HaiEdu student interface style guide

**Version 1.0 · 27 October 2026 · Asia/Yerevan**  
**Direction:** Forest green + warm cream, selected by John.  
**Source baseline:** `94f3bfe5ac103ed402d1d5d3a167c816887762be` (PR305).

[Visual style guide](design/student-dashboard/haiedu-student-style-guide.html) · [CSS token reference](design/student-dashboard/student-style-tokens.css) · [Dashboard review](design/student-dashboard/haiedu-student-review-2026-10-26.html) · [45-function coverage](student-dashboard-function-coverage.md)

## 1. Scope and decision status

This is the reusable design specification for student Home, courses, assessments, progress, My work, supplementary materials and account surfaces. Shared student components must serve all authorized subjects, grades and schools. Illustrations and course names are presentation data, never access or learning-policy selectors.

| Status | What it means |
| --- | --- |
| Owner-selected | Forest/cream palette; four main destinations; Progress inside each course; supplementary materials below My work. |
| Retained design | Illustrated continuation/course cards, progressive disclosure, explicit logout and reduced-motion behavior from the current review. |
| Owner-approved v1 specification | The normalized type/spacing scale, stronger control border, hover/error tokens and 44 px standalone-control target below. John accepts these specifications with the full design on 27 October 2026. Their implementation is tracked by capability slice, not inferred from the specimen. |
| Still gated | Remaining 16.5B implementation, 16.5C production/four-subject acceptance, and future feature backends. |

The original dashboard preview remains unchanged by this guide. The visual guide is a separate, local specimen with fictional data and no service calls. The CSS file is a reference under `docs/`, not a stylesheet imported into production. English stays paused after C47; existing owner content/audio acceptance is reused.

## 2. Visual character

Use a calm, clear, age-appropriate interface with enough visual interest to make choices recognizable. Cream is the page canvas; white cards hold content; forest identifies actions and selection. Give the current learning action the strongest emphasis. Keep decoration quieter than instructions, answers and teacher feedback.

- Use one dominant continuation action in a given learning context. Cards may offer separate, subordinate actions.
- Pair every learning state with readable text; the green brand colour does not mean that a student has mastered something.
- Use illustrations to identify a course or material purpose. Supply a neutral fallback. Avoid childish mascots, competitive rankings or rewards that the product has not adopted.
- Keep account, school/year and selected-course context visible where it affects the action. Never infer a current grade from a course title.
- Use the existing approved logo asset. Its blue/gold brand colours are retained; the logo retains its existing branding. The owner-approved 16.5B.9 slice extends the shared Forest/cream foundation to staff dashboards independently of learner authorization; see [staff delivery](forest-staff-workspace.md). The owner-requested 16.5B.4 correction extends Forest to the public landing page and the shared account surface from first paint, independently of account role.

## 3. Colour system

All colour values are sRGB. Use semantic token names rather than scattered hex values. The prefix is `--student-` in the CSS reference; no new `--blue` alias is introduced.

### Foundation tokens

| Token suffix | Value | Use / provenance |
| --- | --- | --- |
| `canvas` | `#F5F6EF` | Warm cream page background; selected Forest palette. |
| `surface` | `#FFFFFF` | Cards, panels, forms; retained. |
| `ink` | `#23392F` | Headings and body text; selected palette. |
| `muted` | `#58695F` | Supporting text, never disabled by low opacity; selected palette. |
| `accent` | `#285B45` | Primary buttons, active navigation and links; selected palette. |
| `accent-hover` | `#214C3A` | Primary hover/pressed fill; v1 refinement. |
| `on-accent` | `#FFFFFF` | Text/icons on solid forest. |
| `selected` | `#E3EEE5` | Selected tab/navigation background; selected palette. |
| `hero` | `#E6F0E6` | Continuation card background; selected palette. |
| `hero-ink` / `hero-muted` | `#234734` / `#4A6353` | Hero heading / explanation; selected palette. |
| `art` | `#C1D8BC` | Decorative illustration fill only; selected palette. |
| `quiet` | `#EEF1EB` | Quiet surfaces, loading and disabled fills; selected palette. |
| `divider` | `#DCE4DA` | Decorative card edges and separators; not a control-identification border. |
| `border-control` | `#6F8476` | Inputs, outlined buttons and essential boundaries; v1 refinement. |
| `focus` | `#7A4718` | Keyboard focus ring on light surfaces; selected palette. |

The old preview control edge `#A1BBA6` measures about **2.06:1** against white. It must not be the sole visual cue identifying an input. Keep pale dividers for decoration; use the new control token when the boundary is essential.

### Semantic states

| Meaning | Text/icon | Background | Example label |
| --- | --- | --- | --- |
| Readiness / successful operation | `#167263` | `#E7F5EE` | «Պատրաստ է ստուգման» / «Պահպանված է» |
| Attention / more practice needed | `#975B15` | `#FFF2DE` | «Ամրապնդում է պետք» |
| Teacher feedback | `#7453A5` | `#F0EBFA` | «Ուսուցչի արձագանք» |
| Error / failed operation | `#9E3636` | `#FCECEC` | «Չհաջողվեց պահպանել։ Փորձիր կրկին։» |
| Neutral / unavailable | `#58695F` | `#EEF1EB` | «Դեռ հասանելի չէ» |

Success, attention and feedback colours are retained from the review. Error colours are a v1 addition. Pair states with distinct labels and, when useful, icons. Readiness, diagnostic evidence, verified mastery and teacher marking remain separate records even when their visual treatment shares a colour family.

### Verified colour pairs

| Foreground / background | Contrast (displayed to 2 decimals) |
| --- | --- |
| White / forest primary | 7.86:1 |
| Ink / cream | 11.37:1 |
| Muted / cream | 5.36:1 |
| Forest / selected sage | 6.60:1 |
| Success / mint | 5.16:1 |
| Attention / sand | 4.97:1 |
| Feedback / lavender | 5.10:1 |
| Error / pale red | 6.05:1 |
| Control boundary / white | 4.01:1 |
| Control boundary / cream | 3.69:1 |
| Focus / white | 7.66:1 |

Calculations use unrounded ratios for pass/fail. These are token-pair checks, not whole-page accessibility certification. Do not place these foregrounds over arbitrary images, gradients or untested backgrounds.

## 4. Typography and Armenian content

Use `"Noto Sans Armenian", "Noto Sans", Arial, sans-serif`. The current preview names Noto Sans Armenian but does not bundle it; fallback rendering is possible. Production font delivery, Armenian/Latin glyph coverage and weights must be verified before release. Do not assume the family name proves the font loaded. Self-hosting any font requires the actual asset and its applicable licence to be checked.

| Role | Desktop / compact | Weight | Line-height |
| --- | --- | --- | --- |
| Page heading | 32 px / 28 px | 700 | 1.3 |
| Continuation heading | 28 px / 24 px | 700 | 1.4 |
| Section heading | 22 px / 20 px | 700 | 1.4 |
| Card title | 18 px | 600–700 | 1.5 |
| Body, instructions, form input | 16 px | 400 | 1.6 |
| Main action / navigation | 16 px / 14 px for compact navigation | 600 | 1.5 |
| Supporting metadata | 14 px | 400–500 | 1.6 |
| Short nonessential caption | 12 px minimum | 400–500 | 1.5 |

Implement the scale in `rem`; allow user text settings to work. Do not shrink essential instructions, action labels or feedback to the 10–11 px sizes found in parts of the mockup. Use ordinary letter spacing for Armenian; avoid forced uppercase and negative tracking. Let Armenian labels wrap; do not hide their meaning behind ellipses. A body-text measure of roughly 60–75 characters is a layout starting point, to be checked with actual Armenian text.

Use `lang="hy"` for the Armenian interface and the applicable `lang` on English or other course passages. Preserve approved curriculum terminology. Use action-specific labels: «Շարունակել վարժանքը», «Դիտել արձագանքը», «Դուրս գալ». Use «Պահպանվում է…» while saving and «Պահպանված է» only after acknowledgement. An access denial, empty result and connection error need different messages.

## 5. Layout, spacing and shape

| Token / rule | Specification |
| --- | --- |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48 px; use `rem` equivalents. |
| Main content inset | 32 px wide screens; 24 px medium; 16 px compact. |
| Card inset / gap | 24 px / 16–24 px; compact card inset 16 px. |
| Main content maximum | 1280 px, centred in the available main region; layout recommendation, not a fixed viewport. |
| Focused learning column | Up to 820 px; text measure may be narrower. |
| Sidebar | Approximately 224 px; approximately 192 px in the medium shell. |
| Radius | 8 px small elements; 12 px controls; 16 px cards; 20 px hero/dialog; full radius for badges/avatars. |
| Border | 1 px decorative separators; essential control edges use `border-control`; focus ring 3 px with 3 px offset. |
| Elevation | Cards usually flat; small hover shadow on actionable cards; strongest shadow reserved for dialogs. |

The review uses container thresholds around 1100, 760 and 500 px. Keep these as starting points: a wide shell supports a sidebar and multi-column cards; at or below 760 px use the four-item bottom navigation; at or below 500 px stack major cards. Do not compress text to preserve columns. CSS grid children need `min-width:0`; use flexible widths and wrapping. Reserve bottom padding for the mobile navigation and safe-area inset; controls and focused elements must not be obscured.

Test actual 360/768/1280 px viewports and 200% browser zoom in 16.5C. Also check the 320 CSS-pixel reflow condition described by WCAG 1.4.10; the previous container-width checks do not establish that result. Dense data tables or essential diagrams may need their own labelled scrolling region, without forcing the entire page to scroll in two directions.

## 6. Navigation and logout

| Location | Items and behavior |
| --- | --- |
| Main sidebar | «Գլխավոր» → «Դասընթացներ» → «Իմ աշխատանքները» → «Հավելյալ նյութեր». |
| Mobile bottom bar | Same four destinations; visible «Նյութեր» may shorten the final label, with full accessible name «Հավելյալ նյութեր». |
| Inside selected course | «Գնահատումներ» → «Դասընթաց» → «Առաջընթաց». No duplicate global Progress entry. |
| Account utility | Top-right avatar with accessible name «Բացել հաշիվը»; desktop utility link remains available. |
| Logout | Labelled «Դուրս գալ» at the desktop sidebar bottom and directly below account identity. Mobile/focused work: avatar → account → logout. |

Use `aria-current="page"` for the active destination. If course sections are implemented as tabs, supply the complete tab semantics/keyboard behavior; otherwise use navigation links, not a partial tab ARIA pattern. Use buttons for actions and anchors for navigation. Preserve existing bookmarked URLs and the exact authorized context.

Logout is a neutral utility action, distinct from the destructive account-deletion request. Both entry points must call the same existing signout path and retain session/cache cleanup and stale-response guards. This guide does not specify a new logout confirmation flow or change draft/session policy.

## 7. Component recipes

| Component | Appearance and interaction contract |
| --- | --- |
| Primary button | Forest fill, white text, 12 px radius, minimum 44 px height; hover `accent-hover`; visible focus. One dominant action per task context. |
| Secondary button | White surface, ink label, essential control border; used for back, details and utilities. |
| Text link/action | Forest text; inline links are underlined. Standalone actions retain a 44 px target. Never require hover to reveal a function. |
| Pending / disabled action | Stable label/width with explicit pending wording; prevent duplicate submission. Explain unavailable actions nearby. Do not show false success or rely on grey colour alone. |
| Input/select/textarea | Persistent visible label, 16 px input text, 44 px minimum height, strong outline; help and error associated with the field. Preserve entered text on recoverable failure. |
| Course card | Illustration, real course/grade context, current unit, labelled evidence count, specific open action. Art remains decorative when the text already conveys its meaning. |
| Resource card | Title, learning goal, topic, teacher/HaiEdu provenance, format; time/recommendation only if explicitly supplied. Handle withdrawn, denied, unavailable and no-filter-match states. |
| Progress indicator | Display the evidence label and numerator/denominator. Practice readiness is not verified mastery. Colour/ring fill cannot replace the text. Zero/unknown data must not look like a completed result. |
| Status badge | Text plus optional status icon; noninteractive unless it is an explicit filter. Feedback and verified result labels identify their source. |
| Disclosure | Native `details`/`summary` where appropriate; labelled expandable step with keyboard support; opening the explanation does not start an assessment. |
| Dialog | Clear title, labelled close control, deliberate initial focus, containment and return to the trigger. Keep the existing Escape/cancel policy for the action. |
| Loading / empty / error | Reserved layout, explanatory text and valid next step. Loading animation is decorative; empty enrollment, no materials, no matches and access denied are different states. |
| Toast / save status | Use a suitable status announcement; keep actionable errors visible. Never move keyboard focus just to announce a save. |

The **44 × 44 CSS-pixel** standalone target is a HaiEdu v1 usability choice. It is not a claim that WCAG 2.2 AA universally requires 44 px; SC 2.5.8 specifies 24 × 24 px with defined exceptions. Do not stretch inline prose links into button-sized blocks.

## 8. Learning surfaces and future slots

- **Home:** greeting, selected context/course, one continuation card, course cards, returned work when supported, expandable learning steps. Only show a resume action when supported by the actual state.
- **Course and assessments:** preserve prerequisite, readiness, attempt and release states. A card opens the applicable rules/details; decorative animation must not start an assessed attempt.
- **Listening:** visible play/pause and labelled timing; no autoplay. Display attempt allowances from the existing server policy, without invented fixed limits or a reset-on-reload. Respect assessed transcript/replay restrictions. Accessibility alternatives for protected tests need a governed accommodation contract, not an unrestricted script link.
- **Writing and teacher feedback:** distinguish local draft, acknowledged save, submission, returned revision and teacher response. Keep earlier versions/history and errors legible. Never imply that a written task changes automatic mastery.
- **Supplementary materials:** below My work, with optional course/work shortcuts. Optional practice materials are not automatically graded assignments or mastery evidence.
- **Future accounts:** reserve positions for history, assignments, notifications, accommodations and other mapped capabilities, but show working controls only when authorized services exist. Goals, avatars, XP, streaks and personalized recommendations are not silently adopted by this style guide.

See the 45-entry matrix for the full dependency mapping. The student shell is shared; no subject-specific navigation fork or hard-coded grade/skill count is permitted.

## 9. Icons, illustrations and motion

Use the existing outlined SVG vocabulary with rounded caps/joins, approximately 20–24 px and a consistent 1.7–2 px stroke. Give icon-only controls a readable accessible name. Decorative SVGs use `aria-hidden="true"`; informative images receive an equivalent text alternative. Do not use emoji as the primary navigation icon system.

Use simple book, sound, science or neutral learning illustrations with forest/sage accents. Bind illustration choice to optional presentation metadata with a neutral fallback. `web/subject-visuals.mjs` declares `haiedu-subject-art-v1`, keyed by governed `subjectCode`: English book/sound, Physics atom, Mathematics set square, Armenian letter/book, Chemistry flask, Geography globe, Biology plant/DNA and History classical building. Artwork is decorative and never activates a course; unknown subjects use the neutral book. Use the dedicated 160 × 98 px artwork sizing, not the 20 px navigation-icon flex basis. Avoid implying that all courses share a fixed visual or all progress is automatically assessed.

| Motion | v1 limit |
| --- | --- |
| Button/background/focus feedback | 120–160 ms; avoid `transition: all`. |
| Card hover | Up to 2 px lift, about 160 ms; only on hover-capable devices. |
| Intro/disclosure decoration | About 200 ms, once; no looping attention grab. |
| Loading | Use text or a stable skeleton with `aria-busy`; a reduced-motion view stays informative. |

Honor `prefers-reduced-motion: reduce`: remove nonessential movement and animation, keep state changes immediate. The visual guide's motion switch is local to the specimen, not a stored student preference. No autoplaying audio, confetti, parallax, perpetual bouncing or unsupported progress celebration.

## 10. Accessibility and release checklist

- Aim for WCAG 2.2 AA; this document and token calculations do not establish conformance.
- At least 4.5:1 for ordinary text; 3:1 applies to qualifying large text. Essential control/state cues and meaningful graphics need 3:1 against adjacent colours, subject to the standard's exceptions. HaiEdu uses 4.5:1 for its ordinary labels and metadata.
- Keep all functions keyboard reachable, logical focus order, visible focus, a skip link and meaningful headings. Test focus against its actual adjacent background; the brown focus token is specified for light surfaces, not arbitrary dark fills.
- Preserve reflow, user zoom/text settings and Armenian wrapping. Do not hide controls under sticky headers or the mobile bar.
- Label fields, expose selected/expanded/error states, announce asynchronous results appropriately, and retain errors without discarding answers.
- Check native disabled controls, keyboard alternatives to any future drag interaction, screen-reader names, motion and contrast in every relevant state.
- Reuse unchanged content/audio evidence. Add targeted UI regressions for changed behavior; run required CI/browser/aggregate gates. Verify the intended production commit and affected shared consumers before declaring rollout complete.

## 11. Implementation handoff

The CSS reference is namespaced under `[data-haiedu-student]`, contains no subject IDs and is not wired into the application. Treat it as a starting token contract; map it to existing shared components after complete design acceptance. Audit staff consumers before changing any shared global styles.

| Difference from PR305 preview | Required follow-through in 16.5B |
| --- | --- |
| 15 px root and some 10–11 px labels | Apply the 16/14/12 px role scale; essential labels never use the caption size. |
| Mixed one-off gaps, corners and insets | Consolidate to the specified spacing/radius scale without clipping Armenian text. |
| Pale essential control outlines | Use `border-control`; retain pale `divider` only for decorative separation. |
| Local fictional data and explanatory actions | Bind to governed existing services; complete S45 services/authoring separately. |
| Named font without bundled assets | Verify production font delivery and actual Armenian/Latin coverage. |
| Container-width evidence | Complete actual-viewport, zoom/reflow, keyboard, motion and authenticated acceptance. |

16.5B starts with shared shell/Home/course navigation, then course/assessment/progress and work/account surfaces. The S45 resource slice includes authoring and protected delivery. 16.5C and four-subject acceptance remain separate; no new content, marking policy, playback allowance or release is authorized here.

## 12. Sources and evidence

Project sources are pinned to the baseline at the top: [redesign](student-dashboard-redesign.md), [visual decision](student-dashboard-visual-options.md), [coverage matrix](student-dashboard-function-coverage.md), [supplementary materials](student-supplementary-materials.md), and the [authoritative status](project-status.md). Historical browser checks: [palette](evidence/student-dashboard-colors-20261027.json) and [Forest/logout](evidence/student-dashboard-forest-logout-20261027.json). This guide's artifact/token checks are in [style-guide evidence](evidence/student-style-guide-20261027.json).

Primary accessibility references, consulted 27 October 2026: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [minimum target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), and [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). The 44 px target and typography/spacing/motion values are HaiEdu design choices, not quotations from these standards.

## 16.5B.1 implementation trace — 27 October 2026

Full design/style-guide acceptance is bound to source `feb82ce0116a8ae3b75d0147327661861f91c833`; see the [owner record](evidence/student-dashboard-approval-20261027.json). The shared student shell/Home implementation uses `web/student-forest.css`, a locally delivered OFL Noto Sans Armenian variable font and native SVG outline artwork. The reference under `docs/` remains a specimen. The implemented desktop rail is 248 px (224 px at the medium breakpoint), adjusted to fit Armenian labels; the mobile navigation stacks long labels without clipping. Materials stays in the approved fourth slot but has no live entry until its complete service slice. Other course/work/account component refinements remain to be completed. [Delivery and evidence](student-home-implementation.md).
