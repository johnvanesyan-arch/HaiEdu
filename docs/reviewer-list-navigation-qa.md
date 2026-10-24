# Reviewer list continuity QA

Date: 2026-10-24. Base: `b5b8a4bc113b5ff4ac09c883c4c224410991c3eb`.

## Behavior

The bank captures its actual filtered, curriculum-scoped row order before opening a question. The review queue captures its ranked filtered order. Each snapshot contains item IDs, filter values, disclosure state and scroll position, with an opaque URL token. Returning to the list or using browser Back restores that context. Previous/Next displays the current position and follows the captured order; approving a question does not shift the next item. The current authorized dashboard intersects the captured IDs, and retired items leave review-queue navigation.

Snapshots are tab-local and account-bound, expire after eight hours and are limited to twenty. They store no question content, credentials or authorization. Invalid/expired/unavailable storage and standalone links fall back to the ordinary item page. Sign-out/account changes clear the old account's context. Initial session notification preserves a valid returning context.

Full-page item navigation retains the native unsaved-edit warning and prevents old-page responses from changing the next item. Previous/Next disables during detail loading and pending writes. Existing save, QA and approval guards remain; retire/restore and refresh now also reject overlapping workflow actions. Current backend reads and reviewer/MFA authorization remain authoritative.

## Affected consumers

Shared core: `content-bank.html`, `content-review.html`, `content-item.html`, their three controllers and the new navigation helper. The curriculum controller reapplies scope synchronously before capturing bank rows, including when a skill selection resets. The dashboard event supplies the authenticated user ID so the two bank modules can restore regardless of initialization order. New styles target only the new item navigation; standalone item back links remain available when there is no list context. Legacy content views retain their existing navigation.

The implementation has no subject, grade, academic-year, programme, unit-count or question-format assumptions. Existing governed dashboard/catalogue data supplies these scopes. No API, database, Edge bundle, assessment criteria, content, release status or approval is changed. Unit 2 material publication remains held; Sprint 16.5 keeps its agreed scope and mock-up reference.

## Verification

- Six new native Chromium cases use actual frontend files with isolated synthetic authentication and API data. Two subjects/grades, two units per programme and separate programme versions exercise scope boundaries.
- Desktop 1365px and mobile 390px: exact row sequence, Previous/Next boundaries, all bank filters, advanced-filter disclosure, vertical scroll and return. Item/navigation screenshots are emitted to the existing CI artifact directory.
- Review queue: search/tab restoration, stable navigation after approval, freshly filtered list on return.
- Browser Back; direct item URL; expired metadata and blocked storage.
- Unsaved navigation cancelled and accepted; pending QA disables navigation and repeated clicks submit once; sign-out during a pending response clears context; another account cannot inherit it.
- Fourteen existing observer/editor regressions pass, covering settling, singular handlers, old item/account responses and the media/structured/source editors.
- Browser syntax and dependency-trigger checks pass. All 1,423 non-browser tests pass locally; all five required CI jobs remain release gates.
- Production reviewer session was signed out. Fixture coverage does not claim authenticated production interaction or content publication.
- The persistent Vercel Deployment Check was separately inspected during this session: GitHub `Platform release checks`, Production, Blocking. Its unchanged configuration is reused.

Required CI (including native Chromium, PostgreSQL/concurrency and the aggregate gate) must pass before merge. The merged commit, main CI, production deployment and byte-identical live frontend readback are recorded in the final Notion checkpoint. Documentation is prepared with this implementation; that final checkpoint establishes release completion.
