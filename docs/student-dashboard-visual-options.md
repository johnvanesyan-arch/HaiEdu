# Student dashboard — colour and interaction options

**Owner request:** 2026-10-27 Asia/Yerevan. Replace the dominant dashboard blue with alternatives, make the interface more visual/dynamic, and remove the duplicate main-menu «Առաջընթաց» entry.

**Status:** 16.5A design revision prepared. The navigation correction is explicitly requested; the final colour choice and complete dashboard design acceptance are pending. This does not implement production UI, stored preferences or new services. English remains paused after C47.

## Options for comparison

| Review option | Accent / background | Recommendation and trade-off |
| --- | --- | --- |
| Forest + warm cream — «Անտառ» | `#285B45` / `#F5F6EF` | Recommended initial option: subdued contrast and a lighter visual hierarchy. Selection and success must keep distinct text labels because both may use green. |
| Plum + lavender — «Սալորագույն» | `#704875` / `#F8F4F8` | More expressive while separating the main accent from green success states. Purple feedback cards need clear labels so colour alone does not define their purpose. |
| Terracotta + sand — «Տեռակոտա» | `#965139` / `#FCF6F0` | Warmest option. Keep amber attention states explicitly labelled and visually distinct from the decorative palette. |

The [interactive preview](design/student-dashboard/haiedu-student-review-2026-10-26.html) offers all three in its review toolbar. Forest is the review starting point, not an approved production default. The logo retains the existing brand colours. Primary navigation, buttons, selected tabs, Home, materials and dialogs share palette tokens; learning statuses retain their semantic text and colours. Theme choices are local to this page load, with no saved account preference.

## Concrete interaction changes

- A lighter illustrated continuation card retains one primary action and the selected-course readiness explanation. The ring opens that course’s skill map; it does not award completion.
- Home course selection updates the continuation card and selected course tile while retaining keyboard focus. Illustrated cards open the selected course normally. Visual type is explicit fictional fixture metadata, not a production subject-specific rule.
- Expandable learning steps explain diagnostic, practice and mastery states and link to the corresponding course view. Their status comes from the selected fictional scenario; they do not start an assessed attempt.
- Brief card/illustration feedback and entry/disclosure transitions respect reduced motion. The review-only «Առանց շարժման» control disables them; no motion carries essential information.
- The English feedback example opens its own English work context even when another course is selected on Home. Existing local drafts survive palette changes.

These changes aim to make choices and next steps clearer. No measured engagement or learning-outcome improvement is claimed. Persistent goals, avatars, rewards and account themes remain separately proposed features under S44; this revision does not silently adopt them.

## One progress destination

Main and mobile navigation now contain **Գլխավոր → Դասընթացներ → Իմ աշխատանքները → Հավելյալ նյութեր**. The course tabs remain **Գնահատումներ → Դասընթաց → Առաջընթաց**. Account/security/privacy stay in the utility entry; future History keeps its separate dependency.

The complete S21 progress function remains: readiness, skill filters, skill details and access to the existing result/history model. Home shortcuts open Progress for the selected authorized course. No cross-course percentage or ranking is added. In 16.5B, legacy progress bookmarks must preserve actor/course/year/programme/release context when resolving to this view. This design revision removes no deployed route or learner record.

## Evidence and next delivery

[Evidence](evidence/student-dashboard-colors-20261027.json) records 93 native Chromium container-layout checks, 18 interactions and 18 targeted text-colour contrast pairs. All selected pairs exceed 4.5:1; the minimum is 4.78:1. This is not a full accessibility audit: actual device viewports, 200% browser zoom, complete contrast/control review and authenticated production acceptance remain 16.5C work. Existing unchanged learning/source evidence is reused.

Screenshots: [Forest](design/student-dashboard/haiedu-dashboard-forest-20261027.jpg), [Plum](design/student-dashboard/haiedu-dashboard-plum-20261027.jpg), [Terracotta](design/student-dashboard/haiedu-dashboard-clay-20261027.jpg).

After the complete design and colour direction are accepted, implement the shared shell/Home/course navigation in the existing bounded 16.5B sequence. Keep every mapped function and future dependency in the 45-entry coverage matrix. Resource authoring/protected delivery, four-subject integration and formal-pilot acceptance retain their existing gates.
