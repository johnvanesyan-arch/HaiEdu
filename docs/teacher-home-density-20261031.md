# B.12.3 — Teacher Home/Today readability

2026-10-31 · UX-DENSITY-01 technically corrected through PR374 and production/source verified. B.12.3/B.12 remain open; subject expansion stays paused.

## Problem and bounded change

The read-only QA walkthrough found a large shell heading, pilot notice, separate welcome card and two workflow cards above the useful Today queue. Classes repeated “Իմ դասարանները” as both its page and section title. This layout is unchanged from the verified pre-correction Home screenshot; the intervening skill-evidence release changed class reporting, not this composition.

The teacher header uses a smaller Forest heading. A compact greeting/action row replaces the separate welcome card; class progress and writing-review links retain their destinations and keyboard access. The pilot title stays visible and its full policy text is a native disclosure. Today puts the real pending count and continue action ahead of optional scope/help details; custom-task review remains a separate visible link. Classes retains its create action, active-only collection/count and refresh/pagination while using one page title.

## Consumer and preservation audit

| Consumer | Treatment |
| --- | --- |
| Teacher Home, active Classes and teacher page header | Bounded presentation correction with existing Forest tokens; all existing route/view identities and actions retained. |
| Today course-writing queue, live class cards, custom-review link | Existing selectors, combined read, original count meaning, exact context/record links, loading/unknown/denied states, pagination and review controller retained. |
| Teacher review/create/profile/archive/class detail | Same compact teacher page header; their existing workflows, account/logout controls, unsaved guards and permissions remain. |
| Teacher bootstrap/dependency bundle | Regenerated from canonical sources; startup bundle unchanged. No added request, listener or write path. |
| Student, School Admin, Master Admin, Content Reviewer and shared account/material pages | Shared design tokens/components unchanged. The layout correction is scoped to the teacher page, without role-switching privileges or new destinations. |
| Backend, assessment history, memberships, content and audio | No changes. Reuse existing verified source and approved content/delivery evidence for unchanged contracts. |

## Verification and limits

The new native regression uses the actual teacher page and isolated SQL-backed Today/directory handlers. It requires the real nonzero pending count, continue action and both progress/review shortcuts within a 1280×900 first screen. It checks keyboard pilot disclosure, optional queue explanation, one Classes page title, read-only navigation, browser Back and direct opening of a pending review. Existing native cases retain queue/review/reload/filter/pagination/denial/retry/unsaved/account-change behavior and 1280/768/390px enlarged-text readability. Synthetic fixtures are not ordinary-account or owner usability acceptance; 200% root text is not a claim about browser-chrome zoom or physical devices.

All five required PR/main jobs pass on final source: PR CI41212761216 and main CI41213622015, with1,633 unit/integration and367 native checks, zero failures, cancellations or skips. The added first-screen test and all retained review/context/account cases pass. Initial CI41212008155 passed365/367 native: both failures identify the same long pilot-policy word at narrow200% text. Shorter natural wording retains the experimental/validation warning; the Home test now opens that disclosure at1280/768/390px200% text before checking natural-word readability. No test or threshold was weakened.

The25,791,234-byte native ZIP (artifact13046772695) is downloaded and SHA256-verified against `a7b16cca5c357e22c134e9e669f58d79b0fa6b7177ead3831797df23badfa6bd`. All five final images are inspected: [Home first screen](evidence/teacher-home-first-screen-20261031.png), [Classes](evidence/teacher-classes-compact-20261031.png), and Home at200% text [1280px](evidence/teacher-home-enlarged-1280-20261031.png), [768px](evidence/teacher-home-enlarged-768-20261031.png), [390px](evidence/teacher-home-enlarged-390-20261031.png). These use synthetic fixture labels; no ordinary learner work or account data is published.

Functional merge `7f3168eeccfd842b1e84cb1707b80d9b78ae6bf8` is public through `dpl_HhzGvwz6AuGP3vmoL6FLFSFHVuo9`; deployment metadata and public `release.json` match. All five changed served files, including the complete288,756-byte dependency bundle, match repository bytes/SHA256. Only README/docs/tests/web root objects change from294df9cf; the other13 runtime/configuration roots are exact. Backend deployments, assessment scoring/history, content/audio and the completed Resource41191092937 (327/327,54+54 isolation, acknowledged cleanup) are reused unchanged. [Machine-readable receipt](evidence/teacher-home-density-20261031.json). No additional production learner submission, mark, feedback publication, enrollment or permission change is made for this correction.

The final1280px/200% capture also exposes cropped labels in the pre-existing fixed-width staff navigation rail. That shared-role issue is explicitly recorded as UX-NAV-02 for the remaining role checks; body containment/focus checks alone do not establish complete navigation usability. The persistent production blocking control was independently verified on 31 October; reuse that unchanged evidence, not a claim of a new settings check.

Roll back this presentation release if pending actions become unreachable, the class/review destination or unsaved/context guards regress, enlarged text overflows, source hashes mismatch or any required release gate fails. Existing routes and data contracts remain compatible with the previous frontend. No DNS, authentication, deployment-boundary or Master Admin changes are included.

Next is UX-ANALYTICS-02 (clearer saved Practice history), followed by remaining role checks including UX-NAV-02 and John’s final usability acceptance. URL overhaul, the open MFA coverage finding and Master Admin isolation retain their separate scope/approval gates and do not displace that sequence.
