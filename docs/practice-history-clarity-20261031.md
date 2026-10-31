# B.12.3 — Practice-history clarity

2026-10-31 · UX-ANALYTICS-02 implemented in the working branch; required release/native/visual/production verification is pending. B.12.3/B.12 remain open; subject expansion stays paused.

## Problem and bounded correction

The teacher walkthrough found completed Practice reports listing every configured group as a fraction, including0/0 for groups not assessed in that activity. The full three-sentence scope notice repeated in each session row. Both behaviours come from the shared saved-result renderer, also used by the learner’s course/history/player. School/Master Admin aggregate reporting had a separate formatter with the same empty-group problem.

- Explicit saved zero numerator/zero denominator groups say “Չի գնահատվել”. A genuine0/3 result remains0/3 and0%; missing or invalid group values say unavailable. Supported v2 counts and v3 points stay on their original scales. The existing two-decimal point display is retained; the saved pass decision and pass-role flag remain authoritative.
- Teacher and student histories show individual activity cards with the existing mode, completion/status and exact result. Original version/provenance details remain expandable. History requires no horizontal table scrolling.
- Each history section has one keyboard-operable scope disclosure. Full rules and standalone player results keep their original scope text. Teacher Diagnostic/Mastery summary cards share a disclosure and no longer nest block results inside a bold inline wrapper.
- The same group renderer serves school/master aggregates without combining contracts, computing new percentages or changing their original pass counts.

## Consumer audit

| Consumer | Treatment |
| --- | --- |
| Teacher learner drawer, session history and Diagnostic/Mastery summary | New shared result state; activity cards and shared section scope; original request/actor/class guards and version details retained. |
| Student course/progress/assessment history, baseline and completed shared player | Same group-state helper. History cards retain completion timestamps and all existing metadata; standalone/player scope remains visible. Existing action/navigation/unsaved/submission controls unchanged. |
| School Admin direct analytics and Master Admin school analytics | `renderEvidenceGroups` uses the same group formatter; saved contract separation, aggregation and pass counts unchanged. No new authority or destination. |
| Shared student navigation | Base/Forest compact breakpoints agree at1100px across all student pages. This corrects the tablet/200% sidebar squeeze without adding requests/listeners or changing public/other-role menus; the separate820px account-role chooser stays unchanged. |
| Shared components CSS | Only new history classes and explicit assessment-state markers styled; other existing pages load the same stylesheet without matching the new history selectors. Other tables and controls unchanged. |
| Teacher dependency bundle | Regenerated from canonical modules with unchanged pinned dependencies. Generated SDK alphabet whitespace remains untouched; source syntax/parity and required native gates establish validity. |
| Backend, RLS/Auth, assessment models, curriculum/audio and release controls | No changes. Reuse existing verified evidence for unchanged contracts, including Resource41191092937 (327/327,54+54 isolation and acknowledged cleanup). No production learner attempt, mark or feedback publication is created for the presentation correction. |

This is subject-neutral core presentation using governed report labels and stored records. No subject/grade/skill count, educational outcome, threshold or new role-switching privilege is introduced. Unsupported result schemas retain their existing fallback; missing historical reporting is not reconstructed.

## Verification and rollout

Three new focused checks cover v2/v3 unassessed versus observed zero, unavailable inputs, immutable original results, accessible shared scope and separate aggregate contracts. Existing saved pass/rounding,10/2/4 historical scales and escaped-label cases remain. New native cases render the actual teacher drawer and full student shell with synthetic API fixtures, checking both result versions, a saved failed Mastery despite rounded80%, all version details, keyboard disclosure, read-only requests and1280/960/768/390px200% readability (teacher at1280/768/390). Existing real Edge/SQL player-history coverage verifies the retained scope in its new section location. These fixtures are not production learner evidence, physical-device/browser-chrome zoom testing or final owner usability acceptance.

Required all-five PR/main CI, inspected screenshot/digest receipts and public release/changed-asset hashes will be recorded before reporting this correction delivered. The persistent Production/Blocking control retains its independently verified31Oct baseline; no settings are changed. All11 browser-QA dependency graphs and their main/fixture/source/cleanup guards are retained. A successful build alone does not establish usability.

Roll back if unassessed groups become zero grades, observed zeros disappear, the saved result/pass flag/denominator changes, version details or scope become unreachable, card content overflows or a required release check/source comparison fails. The previous frontend remains compatible because API/record/URL contracts are unchanged.

Next is the remaining role usability pass, including UX-NAV-02 (enlarged shared staff navigation), then John’s explicit acceptance. URL overhaul, the open MFA coverage finding and Master Admin isolation retain their separate planned scope/approval gates. All45 capability mappings, accepted content/audio, classroom speaking, English C47 and the separate four-subject gate remain.
