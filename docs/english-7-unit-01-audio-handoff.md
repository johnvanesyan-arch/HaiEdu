# English 7 Unit 1 — original audio registered and review ready

**16.1C.10 · 21 October 2026 · Roadmap 4.35.** John supplied all five original recordings and explicitly accepted their speaker distinction and listening quality. The files are now in private storage and registered as five immutable audio versions and five ordered shared task sets. Their **12 questions are v2 and pass QA**. The existing **98 approvals** are preserved; the remaining **six source holds** are L01–L06, which depend on three publisher recordings. English remains draft/inactive. [Registration evidence](evidence/english-7-unit-01-audio-registration-20261021.json) · [Owner decision](evidence/english-7-unit-01-audio-owner-acceptance-20261021.json).

## Where to review

Open the [review queue](https://www.haiedu.am/content-review.html) and search `ENG7-U01`. Open a question, select **Նախադիտում**, then **Բեռնել ձայնագրությունը** and the audio play control. Under **QA և ստուգում**, these 12 saved v2 questions have passing QA. The misconception-mapping message is a non-blocking warning; it is separate from the cleared source-registration error. Ordinary content approval remains a human review step.

| Recording | Linked questions | Duration | Reviewer example |
| --- | --- | ---: | --- |
| Original Practice group | L07–L10 | 35.97 s | [L07](https://www.haiedu.am/content-item.html?id=73bbe712-fbcf-5995-ab9d-eae8282531d3&from=review) |
| Diagnostic A, source A | DA-25, DA-27 | 18.29 s | [DA-25](https://www.haiedu.am/content-item.html?id=c1c2b141-2b6b-5e96-aa1e-930979c25853&from=review) |
| Diagnostic A, source B | DA-26, DA-28 | 35.08 s | [DA-26](https://www.haiedu.am/content-item.html?id=35e4d137-f3ad-5760-a511-14a4bc2485cd&from=review) |
| Mastery A, source A | MA-25, MA-27 | 21.16 s | [MA-25](https://www.haiedu.am/content-item.html?id=bf9b27c1-9ea0-5855-ac04-fd62e826086f&from=review) |
| Mastery A, source B | MA-26, MA-28 | 32.84 s | [MA-26](https://www.haiedu.am/content-item.html?id=2dc57892-dac2-578b-a93e-b74d8f3bf5dd&from=review) |

Question wording, keys, source-family identities, source order and v1 history are unchanged. New versions attach the actual audio through the existing atomic content revision path. This is protected reviewer-catalogue onboarding; it does not approve the question or enable learner allocation.

## Accepted bank and current counts

| Purpose | Accepted target | Authored/staged | Approved | Passing QA | Audio-linked, awaiting review | Source-held | Still to author |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Practice | 60 | 60 | 50 | 54 | 4 | 6 | 0 |
| Diagnostic | 56 | 28 | 24 | 28 | 4 | 0 | 28 |
| Mastery | 84 | 28 | 24 | 28 | 4 | 0 | 56 |
| **Total** | **200** | **116** | **98** | **110** | **12** | **6** | **84** |

The 84 remaining questions are Diagnostic B, Mastery B and Mastery C, 28 each, within the accepted authoring manifest. These forms also require their own sources and recordings. The current five files complete the existing original scripts, not the full 200-question bank. No further bank-size acceptance is needed.

## Verification and protection

All five supplied MP3s were preserved byte for byte, fully decoded with FFmpeg and checked against the original scripts and all 12 keys. Local speech recognition supports the mapping; separate tail transcriptions resolved two recognition-boundary repetitions. This is technical/transcript evidence, not a new independent human listening review. John’s exact listening/speaker decision is recorded separately. [Script and whole-bank comparison](evidence/english-7-unit-01-audio-script-alignment-20261021.json).

The `learning-audio` bucket is private, with the unchanged 8 MiB limit and approved audio MIME types. Hash-based filenames reveal no answers. The deployed authenticated handler verifies private-bucket state, exact byte length and SHA-256 before returning bytes; it exposes no Storage URL. No runtime code, schema, scoring rule or authorization policy changed. The existing source-family protection remains in force, including for derivatives and re-recordings.

The production rollback rehearsal restored all **70 tracked public tables**. The committed registration adds five audio versions, five task sets, 12 immutable question snapshots and 12 QA runs. The atomic revision path regenerates option row IDs and answer-key update timestamps while preserving their content and ordering. All unaffected rows remain intact, and **63 table fingerprints are identical**. The 98 existing approvals, seven reading sets, learner evidence, policies, pools/forms and release gates are unchanged.

**Reviewer browser verification passed:** all five recordings loaded through the authenticated protected handler and played sequentially to their actual end without media errors at 1348×925. L07 visibly shows passing QA on v2 and an enabled approval button; no question was approved by this check. All 70 public table fingerprints remained unchanged through playback. Exact deployed frontend bytes and commit `9abe7cc521ddca2df568cea233c2bfb9f019353d` were verified before this acceptance. Learner mobile acceptance and assessed delivery are separate release work; no new two-school learner acceptance is claimed here. Existing unchanged capability/isolation evidence is retained.

## Remaining publisher recordings

All **20 publisher originals** are retrieved and match the course inventory. Unit counts remain **5 / 4 / 4 / 7 / 0 / 0**, with 12 core and eight support/enrichment candidates. Transcription of Unit 1 tracks 1-1, 1-2 and 1-3 supports the Emmie, Gordon and Miriam script mapping. Their **separate actual recording-review/reuse record remains pending**, so they were not registered in this batch. They supply L01–L06, the six remaining source holds. No publisher licence or listening approval is inferred from file availability or from acceptance of the five original uploads.

Nineteen publisher originals fit the current limit. Unit 2 track 4, **Do-Re-Mi**, is 8,401,702 bytes: **13,094 bytes (0.16%) over 8 MiB**. Preserve it and prepare a permitted, reviewed smaller delivery copy. This unrelated Unit 2 file does not cause the six Unit 1 holds. The p.74 ex.8 mapping and p.75 ex.9 script mismatch also remain review work. [Course inventory](english-7-course-audio-inventory.md).

## Next bounded slices

1. Complete ordinary review of these 12 audio-linked v2 questions. Resolve the three publisher recordings’ review/reuse record, then register/link L01–L06 and verify their playback and QA.
2. Accept and implement assessed-listening playback/interruption semantics before Diagnostic/Mastery allocation. Current runtime supports replayable Practice/Chapter Review and reviewer preview; Diagnostic/Mastery audio is still rejected. Capped playback, set-wide accounting and transcripts are not adopted by this source-registration step.
3. Author the remaining 84 questions with fresh whole-bank/source comparisons, one primary agent and one slice at a time. Human review can proceed alongside authorized preparation.
4. Onboard nine guides and the writing package; resolve final rubric/workload, misconception mapping, protected-form qualification, source/voice reuse evidence, SME and English release gates. Verify learner desktop/mobile and cross-subject/two-school behavior before activation.

John’s supplied-recording authorization covers this bounded protected catalogue use. Actual provider/voice-use evidence belongs in the learner-release review; no provider account, runtime TTS or ElevenLabs integration is enabled. Speaking stays classroom-assessed.

16.1 completes one production-ready English Unit 1 slice. Mathematics 7 follows in 16.2, Armenian Language 7 in 16.3, then four-subject integration in 16.4. Sprint 16 Physics integration remains open. Sprint 16.5 preserves functionality and applies the accepted design direction across subjects, grades and academic years; Sprint 17 still requires 16.4 and 16.5C acceptance.
