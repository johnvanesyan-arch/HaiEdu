# Student My work: one status filter and one refresh — 5 November 2026

This is the Sprint 16.5B refinement of the student «Իմ աշխատանքները» view (`index.html?view=work`).

**Scope.** It is shared core and applies to every subject, grade, school and release. It changes only how assigned work that the page already loads is presented and refreshed. No request, authorization, scoring or submission behaviour changed.

**Design reference.** Forest style guide v1.0 and the 5 November refinement canvas (artboard «Իմ աշխատանքները · հեռախոս · առաջարկ»).

## Problem (observed)

My work showed a decorative banner, then three independent sources:
- «Ուսուցչից» (teacher tasks);
- «Գրավոր առաջադրանքներ» (writing assignments);
- «Նյութերով առաջադրանքներ» (material assignments).

Each source had its own «Թարմացնել» button, and items in every state were mixed together. A learner could not see what still needed doing, or what came back with feedback, without reading every card.

## Change

| Area | Before | After |
|---|---|---|
| Top of My work | Decorative banner | Toolbar with a status filter and one «Թարմացնել». The page title stays in the shared header. |
| Status filter | None | «Կատարելու · Վերադարձված · Ներկայացված», starting on «Կատարելու». It applies across all three sources. Counts are shown only when every source shows its full current list. |
| Refresh | One button per source (3) | One button that reloads every source. The per-source buttons are omitted only on My work. Standalone uses and error «Փորձել նորից» buttons are unchanged. |
| Empty filtered source | Not applicable | «Այս վիճակով աշխատանք այստեղ չկա։» appears when a source has items but none in the chosen status. |

**State mapping** (`web/student-work-hub.mjs`; presentation only):

| Status | Teacher tasks | Writing assignments | Material assignments |
|---|---|---|---|
| Կատարելու (to do) | `not_started`, `draft` | `not_started`, `draft`, no state | always (see below) |
| Վերադարձված (returned) | `returned`, `reviewed` | `changes_requested`, `reviewed` | — |
| Ներկայացված (submitted) | `submitted` | `submitted` | — |

- Cancelled items and history views are never filtered.
- An unknown future state gets no status, so it is never hidden.

**Counts honesty:**
- a count is the number of items currently loaded;
- `+` is added while any source has unloaded pages («Բեռնել ավելին»);
- counts are hidden while any source:
  - shows its cancelled history,
  - has a teacher task open in place,
  - failed to load.

**Open teacher task safety:** the single refresh never reloads or closes a teacher task that is open in place, so unsaved text is kept. The other two sources still refresh.

**Not changed:**
- each source's requests, paging, history, open/download actions, editing and unsaved-work protection;
- the deep links;
- the «Գրավոր աշխատանքներ՝ ըստ դասընթացի» course cards;
- the teacher pages.

## Deferred, with reasons

- **One mixed list instead of three sections.** Each source pages separately, and the teacher-task editor opens inside its section. A truthful merged list with exact totals needs a combined, paged student-work endpoint. That is new API work, outside this refinement.
- **Course filter («Դասընթաց»).** It needs the same combined source to stay correct across pages.
- **Material assignments have no completion state.** Opening or downloading is deliberately not recorded as done, so they always appear under «Կատարելու». Moving them out of to-do requires a product decision about what "done" means for a material.

## Verification (isolated, synthetic fixture — not a live production check)

- **New Chromium regressions** in `tests/browser/student-work.browser.test.mjs` (6 tests, all fail on the previous source):
  - toolbar replaces the banner;
  - three statuses with counts;
  - one refresh and no per-source refresh buttons;
  - targets of at least 44 px, without split words or overflow, at 375 and 1280 px;
  - filtering across all sources, with cancelled history still visible;
  - one refresh reloads each source exactly once and keeps the filter;
  - `+` with unloaded pages, and hidden counts during history;
  - an empty state.
- **Teacher-task harness (real student-work service fixture):** refresh while a task is open with unsaved text keeps the text, does not reload the task list, writes nothing, and still refreshes the other sources.
- **Unit:** `tests/student-work-hub.test.mjs` covers the state mapping, unknown states and the toolbar markup.
- **Browser QA triggers:** `web/student-work-hub.mjs` was added to the six production-acceptance workflows that already watch the assigned-work modules. `scripts/check-browser-qa-triggers.mjs` passes.
- **Owner usability acceptance:** not given. **Live production check:** not performed.
