# English 7 Unit 1 — DB / MB / MC audio upload and registration handoff

**Sprint 16.1C.15 · 22 October 2026.** John supplied all six requested recordings and authorised the next integration slice. Full-file decoding and exact normalized speech-to-script comparison pass for every file; all twelve question/key mappings agree. The audio bytes are unchanged. The registration plan is deliberately disabled because the six actual objects are not yet present in private Storage.

## Required next action

Upload the **six MP3s** from `HaiEdu_Unit1_DB_MB_MC_Audio_Upload.zip` into the **root of the existing private `learning-audio` bucket**. Keep their long filenames unchanged. Upload neither the ZIP nor its README. Those names are SHA-256 hashes, required by the existing immutable-audio database constraint; they do not change the content. The README maps each internal filename to the original script name. No new bucket, public access, limit increase, replacement of existing files or transcoding is needed.

The Supabase connector supports database/management operations but has no Storage byte-upload operation. No task-scoped upload credential is configured. The earlier browser route failed because native credential state could not safely resume; fresh-tab/reset/troubleshooting attempts already failed under C11. This slice does not retry or bypass that boundary. It prepares the exact package so upload can be the next concrete action. Direct `storage.objects` insertion would not upload bytes and is not used.

## Six supplied files

| Recording | Questions | Duration | Bytes | Technical result |
| --- | --- | ---: | ---: | --- |
| `eng7-u01-db-audio-a-v1.mp3` | ENG7-U01-DB-25, ENG7-U01-DB-27 | 31.71 s | 524,339 | Decode and normalized script/key match passed |
| `eng7-u01-db-audio-b-v1.mp3` | ENG7-U01-DB-26, ENG7-U01-DB-28 | 34.27 s | 565,299 | Decode and normalized script/key match passed |
| `eng7-u01-mb-audio-a-v1.mp3` | ENG7-U01-MB-25, ENG7-U01-MB-27 | 26.83 s | 446,181 | Decode and normalized script/key match passed |
| `eng7-u01-mb-audio-b-v1.mp3` | ENG7-U01-MB-26, ENG7-U01-MB-28 | 34.93 s | 575,748 | Decode and normalized script/key match passed |
| `eng7-u01-mc-audio-a-v1.mp3` | ENG7-U01-MC-25, ENG7-U01-MC-27 | 34.93 s | 575,748 | Decode and normalized script/key match passed |
| `eng7-u01-mc-audio-b-v1.mp3` | ENG7-U01-MC-26, ENG7-U01-MC-28 | 40.44 s | 663,937 | Decode and normalized script/key match passed |

The incoming attachments use a double `.mp3.mp3` suffix. This is harmless to their audio content; the upload package already contains single-suffix hash filenames. All files are mono MP3 at 44.1 kHz and below the unchanged 8 MiB limit. No recording needs to be regenerated based on these checks.

## Verification and boundaries

Local faster-whisper 1.2.1/base.en int8, without a script prompt, transcribed every file. Across 571 spoken words, the transcript matches the authored scripts after punctuation/case, hyphenation, spoken-number rendering and equivalent British/American spelling normalization. Spoken speaker numbers and their order match in all three group recordings. All answer-bearing details are present. This is automated verification, not an independent human audition, voice-distinctness acceptance or a listening-difficulty study. No audio was sent to a cloud transcription service.

Fresh production readback retains **200 staged / 176 in-app approved / 188 QA passed / 12 source-held** questions: 60 Practice, 56 Diagnostic and 84 Mastery. Twelve reading questions are owner-accepted and QA-ready at v2 but still await the authenticated Approve action. The twelve listening questions remain v1 with missing-source holds. Thirteen reading sets, eight audio sets and 247 immutable question versions remain registered. All 71 public-table fingerprints match C14; existing whole-bank, grading, source-family and runtime evidence can be reused. No content, approval, policy, allocation or production storage record was changed.

The prepared plan preserves exact prompts, option order, answer keys, source-family IDs, scope and member order. Each recording supports two questions and retains its protected form assignment. A re-recording or renamed file does not reset source exposure or become independent reasoning coverage.

## Resume after upload

1. Read the actual Storage objects and verify private bucket configuration, exact names, MIME, byte lengths and ETags against the supplied files. Refresh current source/runtime and preservation baselines.
2. Record genuine bounded source/reuse and listening-review evidence. Register six immutable audio versions and six shared task sets through the existing guarded workflow, rehearse rollback and attach the unchanged twelve questions as v2.
3. Execute and save current-version QA, verify source selectors/previews, preserve all existing approvals/history, and verify authenticated protected playback against the uploaded bytes.
4. Complete ordinary in-app question review. Then continue the bounded nine-guide/writing onboarding slice and final rubric/workload, source/voice rights, SME, protected-form qualification and learner-release gates. Speaking remains classroom-assessed.

The approved listening policy remains unchanged: unlimited Practice/Chapter Review/reviewer replay, and two plays shared per recording per Diagnostic/Mastery assessment with the deployed interruption rules. English remains draft/inactive. Technical receipt does not close authenticated playback, human content/SME or learner release.

[Prepared registration plan](content/english-7-unit-01-bcd-audio-registration-plan.json) · [Exact technical evidence](evidence/english-7-unit-01-bcd-audio-preparation-20261022.json) · [Unchanged sources/scripts](english-7-unit-01-bcd-source-review.md) · [Authoritative status](project-status.md).
