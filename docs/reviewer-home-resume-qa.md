# Reviewer home resume QA

Date: 2026-10-24 · Roadmap 4.71

## Behavior

The home page replaces five sidebar-duplicate Quick access links with Continue reviewing. It shows the last successfully loaded question's code, prompt excerpt, curriculum context, review status and QA status from the current authorized dashboard. Approved questions use an open-last-question label. Bank totals remain available in a native collapsed summary. Priority work remains visible; on phones, its badges stack below readable question context.

New accounts or browsers receive Start reviewing (or Open question bank when there is no pending work). Archived or unavailable questions explain the fallback. Failed detail requests do not overwrite the last successful item. The resume card is first in DOM and visual order before the priority list.

## Scope and isolation

The common reviewer UI is subject-, grade-, programme- and academic-year-neutral. There is no account migration. Browser localStorage keeps an account-bound pointer for 30 days, bounded to 20 account pointers: user/item IDs, timestamp, list source and optional list token only. It stores no question text or credentials and grants no access. It persists across same-browser visits/sign-outs, is not cross-device history, and fails safely when storage is blocked. The card is cleared immediately on sign-out or account change; late dashboard responses cannot restore signed-out content.

An existing valid account-bound tab-local filtered-list snapshot is reused for Previous/Next and return-to-list behavior. Its existing eight-hour lifetime is unchanged. When that context expires or is absent, resume opens the question directly. Focus/storage events update the pointer against the already authorized dashboard data, without new polling or claiming real-time server status. Opening the item still uses normal authorization.

## Validation

- Full non-browser suite: 1,423 passing tests.
- Relevant native Chromium suites: 35 passing cases (seven new home cases, 28 existing navigation/action/advanced/observer regressions).
- Widths 1365, 820 and 390: resume through filtered list and Previous/Next, new-account fallback, keyboard summary toggle, no horizontal overflow, mobile priority context width and stacked badges.
- Failed detail, retired/missing item, persistent visits, separate accounts, sign-out during held dashboard read, expired/malformed history, expired list context, focus/storage events and blocked storage.
- Screenshots reviewed on desktop and mobile. Fixtures use synthetic accounts/API responses, without production content writes.
- Browser syntax and QA dependency checks pass. The observer fixture includes the new imported helper.

## Release

One batched PR carries the UI, browser coverage and aligned README/status/roadmap/backlog. All five required CI jobs and the separate Production/Blocking Deployment Check govern release. The final merged source, main CI and exact production asset readback are recorded in the Notion roadmap checkpoint after verification.

No backend, content, QA criteria, scoring, authorization or curriculum release changes. The Unit 2 material-publication/live-acceptance hold and Sprint 16.5 redesign scope remain unchanged.
