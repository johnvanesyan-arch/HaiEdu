# B.12.3 — Teacher Home/Today readability

2026-10-31 · UX-DENSITY-01 correction implemented in the working branch. Required release/native/visual/production checks are pending. B.12.3/B.12 remain open; subject expansion stays paused.

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

Required CI, inspected native screenshots and public release/changed-asset hashes will be recorded before this correction is reported as delivered. A successful build alone is insufficient. The persistent production blocking control was independently verified on 31 October; reuse that unchanged evidence, not a claim of a new settings check.

Roll back this presentation release if pending actions become unreachable, the class/review destination or unsaved/context guards regress, enlarged text overflows, source hashes mismatch or any required release gate fails. Existing routes and data contracts remain compatible with the previous frontend. No DNS, authentication, deployment-boundary or Master Admin changes are included.

Next is UX-ANALYTICS-02 (clearer saved Practice history), followed by remaining role checks and John’s final usability acceptance. URL overhaul, the open MFA coverage finding and Master Admin isolation retain their separate scope/approval gates and do not displace that sequence.
