# Typed answers and gap-filling — 16.1B.2

2026-10-20. Owner direction: implement the remaining capabilities one at a time. This slice implements bounded typed responses only. The capability is deployed and verified. Required PR/main CI passed 1,341 tests, 73 native browser checks and PostgreSQL 17.6/concurrency checks. [Production read acceptance](evidence/typed-fields-production-read-20261020.json) passed 268/268 with two-school isolation 54/54. [Release evidence](evidence/typed-fields-release-20261020.json) records source, function/bundle hashes and preservation checks.

## Capability and authoring

`typed_fields` is a registered response extension, version `haiedu-typed-fields-v1`. A single short answer and a question containing several labelled gaps share the same contract. This version supports 1–10 required fields, up to 500 Unicode code points per field, and 1–20 accepted alternatives per field. There is no word-bank, fuzzy matching or automatic semantic correction in this slice. Matching and ordering are tracked separately in [16.1B.3](matching-ordering-capability.md); audio and shared task sets remain future work.

The public `items.config.responseDefinition` contains only the version, explicit content locale, layout and field definitions. The existing `promptHy` transport property retains its historical name; it transports the authored prompt, including English. Field labels/inputs use the declared locale. No subject, unit or release is selected by the capability.

```json
{
  "schemaVersion": "haiedu-typed-fields-v1",
  "layout": "short_answer",
  "locale": "en",
  "fields": [{"id": "colour", "label": "The sky is ____.", "maxLength": 30}]
}
```

Accepted answers remain exclusively in the governed answer key. For example:

```json
{
  "schemaVersion": "haiedu-typed-fields-v1",
  "fields": {
    "colour": {
      "accepted": ["blue"],
      "normalization": {
        "trim": true,
        "collapseWhitespace": false,
        "apostrophes": false,
        "caseMode": "ascii-insensitive"
      }
    }
  }
}
```

Every normalization rule is explicit. Whitespace handling covers spaces, tabs, CR and LF; apostrophe normalization covers U+2018/U+2019. Case modes are exact case or ASCII A–Z case insensitivity. Other case equivalences, punctuation, contractions, spelling and British/American variants require explicit reviewed alternatives. Blank accepted answers, normalized duplicate alternatives, unknown keys/versions and malformed fields are rejected. Intentionally submitted blank fields receive zero. Open-ended paraphrases belong in the separately implemented teacher-review route.

The content editor provides field labels/IDs, limits, alternatives and normalization controls plus a learner preview. Save validates both definition and private key atomically, retains the previous version, and returns the question to `review / needs_review`. Technical QA checks the same closed contract. Existing approval, source/whole-bank comparison and current-version QA gates remain required. No questions are created or approved by this engineering release.

## Requests and drafts

The existing governed `get-session-item` response includes `item.responseDefinition`, the student's own `responseDraft`, and `draftRevision`. Answer alternatives are never included. `submit-answer` and `submit-mastery-answer` accept:

```json
{
  "sessionId": "<bound session UUID>",
  "sessionItemId": "<served assignment UUID>",
  "itemId": "<served item UUID>",
  "response": {"schemaVersion": "haiedu-typed-fields-v1", "fields": {"colour": " blue "}},
  "draftRevision": 0,
  "saveDraft": true
}
```

`saveDraft: true` stores no attempt or score and returns `{saved:true,draftRevision:1}`. Omit `saveDraft` or set it to false to submit. Every required field must be present as a string; empty strings are valid answers, missing/extra IDs are not. The server rejects a stale draft revision with `typed_fields_draft_conflict` and malformed input with `typed_fields_response_invalid`. Draft requests cannot fall through to a legacy scoring path. Current live session, enrollment, school, year, release, unit, item exposure and frozen policy/version checks apply to both save and submit.

The browser saves after typing pauses, serializes saves, waits for pending saves before submission, retains text after failures and guards navigation with unsaved text. Reopening the session restores the saved draft. Context changes dispose listeners/timers and suppress stale responses; repeated submission cannot create a second attempt. A successful submission deletes its draft. Drafts are service-only, RLS-protected, scoped to the student, included in the privacy inventory and cascade with the session assignment/account. Unsubmitted drafts are not teacher-visible.

## Scoring and reporting

This capability requires an explicitly adopted immutable `haiedu-assessment-policy-v3` snapshot, `scoringStrategy: normalized-item-score-v1`, `itemWeight: 1` and `responseCapabilities: {typed_fields: haiedu-typed-fields-v1}`. V3 otherwise retains the v2 exact delivered/scored/readiness scopes and reporting groups. V1/v2 cannot admit typed fields. No active policy or learning-model configuration is rewritten by the migration.

Each field scores 0 or 1. The item score is correct fields / required fields, and each item contributes at most one point regardless of its field count. `correct` means every field is correct. Original text, normalized text and component evidence are retained separately. The existing explicitly bound numerical learning model receives the normalized item score once, with its own declared difficulty/help factors; this capability supplies no default mastery model.

`haiedu-assessment-result-v3` reports `earned`, `possible`, fully correct item count, answered item count and points percentage. V3 pass decisions compare the unrounded points percentage with the declared threshold and still enforce explicitly configured `minimumCorrectBySkill` counts of entirely correct items. No English passing threshold is selected here. Student, teacher and school reports display points distinctly from entirely correct answers. Active diagnostics/mastery checks keep grading and component results hidden until completion.

The same transaction that records the final answer now records the final report and closes the session. This also fixes v2 diagnostic completion attempting to add its report after the baseline was already immutable. The immutable-baseline guard is retained. Mastery finalization independently recomputes the score from recorded attempts.

## Verification and rollout boundary

Synthetic tests cover exact alternatives, grammar distinctions, blanks, malicious fields, private keys, partial credit, closed policy versions, frozen results, draft conflicts, repeated submission, revocation/cross-context denial, RLS, authoring snapshots and mobile browser save/resume. Required CI includes real PostgreSQL 17.6 and the complete native Chromium suite. The production migration changes schema/functions only; there is no curriculum/content activation.

All 16 affected Edge consumers were deployed and read back byte-for-byte against the tested source; all 15 SQL definitions match. The connector assigned migration version `20261020140928`; its unchanged SQL body and fixture path are reconciled in the repository. Existing JWT settings are preserved, including the previously explicit internally authenticated `get-teacher-student` configuration. The existing Vercel Production/Blocking check remains required. Production preserved all 23 tracked content, policy and learner-data snapshots. The new draft table is empty and private; no typed items or v3 blueprint policies are activated. Full typed save/submit/scoring flows use isolated SQL/native browser fixtures; production verification covers read-only grading, exact deployed definitions, access controls and existing role/chapter flows. A pre-deployment SQL whitespace-escaping defect was reproduced and fixed; 192 normalization cases now prove SQL/JavaScript parity. The documentation closure retains the verified runtime source and synchronizes the merged source stamp to Notion. English content, accepted-answer policy choices, unit thresholds and release approval remain separate gates.
