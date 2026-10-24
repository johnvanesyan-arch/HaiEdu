# Advanced question editing QA

Date: 2026-10-24. Base: `b4110cb1f3f3fdbbb3151de67797f8f513f9d5df`.

## Visible content and collapsed configuration

The question editor uses native details/summary sections labeled «Ընդլայնված». Raw stimulus JSON and classic answer feedback codes sit in a closed content section. Question-family configuration and misconception mappings sit in a closed metadata section. Typed answers retain visible labels and accepted-answer text while field IDs, length limits and normalization rules move inside per-field Advanced sections. Typed/matching/ordering locale codes also collapse. Matching IDs collapse; ordering IDs remain visible because reviewers use those codes to define the accepted sequences.

Question text (including the existing English field), answer options, correct answers, numeric tolerance and units, matching cardinality, accepted sequences, audio/task-set selectors and change summaries stay accessible. Existing hint drafts remain in the ordinary question preview. Editable teaching-guide hints remain on their existing guide page; no hint is moved into Advanced and no new hint-authoring contract is introduced.

Collapsing does not clear, disable or omit inputs from serialization. A wording-only revision preserves stimulus JSON, response definitions, answer keys, normalization, feedback codes and metadata. The same immutable save/QA/approval workflow and unsaved-change tracking remain in force. Read-only controls stay read-only.

New typed/matching rows open their required code settings so authors can complete them. Invalid stimulus JSON reopens Content → Advanced and focuses its textarea; a missing family reopens Metadata → Advanced and focuses its input. Structured validation exposes its technical settings. These recoveries issue no failed local-validation write and preserve edits. Ordinary disclosure toggles do not mark content dirty.

## Scope and verification

- Shared consumers: the question controller and its typed/arrangement editor modules. These editor modules are imported only by the question controller; their contracts and learners’ renderers are unchanged. New CSS targets the Advanced disclosures. The guide editor is unchanged and keeps its hint fields accessible.
- Native browser cases exercise all seven supported answer formats: single choice, true/false, numeric, quantity, typed fields, matching and ordering. Four cases are added; existing matching/ordering cases gain collapsed-setting checks.
- Desktop 1365px and mobile 390px: native keyboard toggling, visible ordinary controls, hidden technical controls, exact saved payloads, no horizontal overflow and validation recovery. Closed JSON/feedback/family fields survive a saved wording change; hints remain visible in Preview.
- Typed fields preserve exact normalization/definition/answer contracts while editing labels; new rows expose their required codes, and invalid length settings reopen Advanced. Matching/ordering definitions and keys retain their existing round-trip and isolation checks.
- All 28 relevant browser cases pass, including prior list navigation, action-panel, media/source, observer-settling and old account/item response guards. Synthetic auth/API fixtures are used; no authenticated production reviewer write is claimed.
- The VM node fixture adds the query API used when validation focuses a field; its no-write and preserved-edit assertions remain intact.
- Browser syntax and dependency-trigger checks pass. All 1,423 non-browser tests pass locally; all five required PR/main CI jobs remain release gates. Reuse the separately inspected, unchanged Production / Blocking Deployment Check.

No subject/grade/year assumptions, backend, database, question content, scoring, authorization or release policy changes. Unit 2’s publication hold and Sprint 16.5’s agreed design scope remain unchanged. The final Notion checkpoint records merged source, CI, production deployment and exact live asset readback, preserving native child pages.
