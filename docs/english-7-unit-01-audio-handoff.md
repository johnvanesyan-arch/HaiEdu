# English 7 Unit 1 — staged bank approved and reviewer playback accepted

**Sprint 16.1C.12 — owner-approved assessed listening deployed.** Diagnostic/Mastery can use an explicit v4 policy with two plays per shared recording, all related questions visible before listening, normal speed and no transcript/translation. Counts survive refresh and question changes; interrupted listening resumes from its checkpoint, and a persistent technical failure can end unscored while retaining responses and source exposure. Practice, Chapter Review and reviewer replay remain unlimited. Required CI passed, including 87 native Chromium cases and PostgreSQL 17.6 concurrency checks; the migration, all 16 function bodies and 13 affected Edge bundles are verified. All 70 tracked tables, 20 existing versioned policies and 116 English approvals/QA passes are preserved. No English policy, form or learner release is activated. Next: the accepted 84 DB/MB/MC questions, guides/writing, source/form qualification and the existing release gates. [Capability](assessed-listening-capability.md) · [Deployment evidence](evidence/assessed-listening-release-20261022.json).

**Historical 16.1C.11 review closure · 22 October 2026 · Roadmap 4.37.** John reports that he checked and approved the remaining questions, the audios worked and everything looked good. Production readback verifies **116/116 current-version ordinary approvals and QA passes**, including L01–L06 at v2. The staged bank has **zero source holds and zero ordinary reviews pending**. Eight recordings support all 18 listening questions; seven reading sets are retained. English remains draft/inactive. Owner-reported reviewer playback acceptance is complete; browser automation remains unavailable, and no new automated UI or learner acceptance is claimed. [Closure evidence](evidence/english-7-unit-01-review-closure-20261022.json) · [Registration evidence](evidence/english-7-unit-01-listening-registration-20261022.json).

## Where to inspect the approved questions

Open the [reviewer page](https://www.haiedu.am/content-review.html) and select approved content, then search `ENG7-U01`, or use the direct question links below. L01–L06 are approved at v2 with their audio links and passing QA. Their misconception-mapping warning is non-blocking and separate from the cleared source-registration errors. John has confirmed successful playback and inspection; the six ordinary approval records were independently read back from production.

| Recording | Linked questions | Duration | Reviewer example | Current evidence |
| --- | --- | ---: | --- | --- |
| Emmie | L01–L02 | 19.57 s | [L01](https://www.haiedu.am/content-item.html?id=e83ac783-0c53-5e75-a370-413089ff8e63&from=review) | Approved v2; QA passed; owner reports playback success |
| Gordon | L03–L04 | 28.29 s | [L03](https://www.haiedu.am/content-item.html?id=5c42c2f0-ed04-5ab6-a956-51aa96660b5f&from=review) | Approved v2; QA passed; owner reports playback success |
| Miriam | L05–L06 | 32.44 s | [L05](https://www.haiedu.am/content-item.html?id=2bc6c17f-88ab-51bc-af54-90d96321703a&from=review) | Approved v2; QA passed; owner reports playback success |
| Original Practice group | L07–L10 | 35.97 s | [L07](https://www.haiedu.am/content-item.html?id=73bbe712-fbcf-5995-ab9d-eae8282531d3&from=review) | Ordinary approvals verified; C10 playback evidence retained |
| Diagnostic A, source A | DA-25, DA-27 | 18.29 s | [DA-25](https://www.haiedu.am/content-item.html?id=c1c2b141-2b6b-5e96-aa1e-930979c25853&from=review) | Ordinary approvals verified; C10 playback evidence retained |
| Diagnostic A, source B | DA-26, DA-28 | 35.08 s | [DA-26](https://www.haiedu.am/content-item.html?id=35e4d137-f3ad-5760-a511-14a4bc2485cd&from=review) | Ordinary approvals verified; C10 playback evidence retained |
| Mastery A, source A | MA-25, MA-27 | 21.16 s | [MA-25](https://www.haiedu.am/content-item.html?id=bf9b27c1-9ea0-5855-ac04-fd62e826086f&from=review) | Ordinary approvals verified; C10 playback evidence retained |
| Mastery A, source B | MA-26, MA-28 | 32.84 s | [MA-26](https://www.haiedu.am/content-item.html?id=2dc57892-dac2-578b-a93e-b74d8f3bf5dd&from=review) | Ordinary approvals verified; C10 playback evidence retained |

Question wording, keys, source-family identities, source order and v1 history are unchanged. New versions attach audio through the existing atomic content revision path. The registration itself created no ordinary question approval or learner allocation. John subsequently approved all six v2 questions through the reviewer workflow; this closure verifies those human records.

## Accepted bank and current counts

| Purpose | Accepted target | Authored/staged | Approved | Passing QA | Audio-linked, awaiting review | Source-held | Still to author |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Practice | 60 | 60 | 60 | 60 | 0 | 0 | 0 |
| Diagnostic | 56 | 28 | 28 | 28 | 0 | 0 | 28 |
| Mastery | 84 | 28 | 28 | 28 | 0 | 0 | 56 |
| **Total** | **200** | **116** | **116** | **116** | **0** | **0** | **84** |

The remaining questions are Diagnostic B, Mastery B and Mastery C, 28 each, within the accepted manifest. They need their own sources and recordings. Eight registered files complete the sources for the existing 18 listening questions; they do not complete the 200-question bank. No further bank-size acceptance is needed.

## Source identity, verification and protection

John uploaded the three C11 recordings and supplied matching files for verification. They differ from the original publisher MP3s. Their exact generation/transformation provenance is not established; they are recorded as **owner-supplied versions of the textbook scripts**, not publisher originals. Full-file decoding, local speech recognition and tail corroboration support the scripts on textbook p.144 and all six existing keys. All three corrected Storage names, sizes and MD5 ETags match the supplied files; their SHA-256 hashes and durations were calculated locally. The audio bytes were not edited or re-encoded. No independent human audition, publisher licence or learner-distribution permission is inferred. [Review record](evidence/english-7-unit-01-publisher-audio-review-20261021.json) · [Script/key alignment](evidence/english-7-unit-01-publisher-audio-alignment-20261021.json).

The bucket remains private with its unchanged 8 MiB limit. The unchanged protected handler checks private-bucket state, byte length and SHA-256 before delivering bytes and exposes no Storage URL. All three textbook-script recordings retain the original single source family; re-recording does not create independent unseen assessment material. No API, schema, shared runtime, scoring or authorization change was made.

The rollback rehearsal restored all **70 tracked public tables**. Commit at **00:25:26 Asia/Yerevan on 22 October** added three audio versions, three sets, six immutable snapshots and six automated QA records. Independent persisted readback matched the transaction. All unaffected rows and 110 ordinary approvals were preserved; **63 whole-table fingerprints are identical**. Option row IDs and answer-key update timestamps changed through the established revision path, while their meanings and order remain identical. The bank now has 151 immutable question snapshots, seven reading sets and eight audio sets.

The exact deployed QA evaluator passed 6/6 on materialized production rows, and its results were stored with an automated/null actor and independently verified. This is not an authenticated HTTP/browser test. The subsequent read-only closure verifies all six new ordinary approvals against current v2 records, saved QA and matching human review records. The other 12 audio-question approvals remain verified. All 116 staged questions are now approved.

**Playback evidence boundary:** John’s latest statement, “I checked and approved the remaining questions; the audios worked, and everything looks good,” closes owner-reported reviewer inspection/playback acceptance for the remaining three files. Database readback corroborates all six approvals. Browser automation still cannot safely resume its native credential state; no recovery, fresh automated UI assertions, independent audition, learner desktop/mobile or two-school acceptance is claimed. C10’s successful authenticated playback evidence for the other five unchanged files is retained. [C10 evidence](evidence/english-7-unit-01-audio-registration-20261021.json).

## Remaining course audio and next slices

All **20 publisher originals** remain retrieved and hash-verified. Unit counts are **5 / 4 / 4 / 7 / 0 / 0**, with 12 core and eight support/enrichment candidates. Unit 2 Do-Re-Mi remains 13,094 bytes over the 8 MiB limit and needs a permitted, reviewed smaller delivery copy. The p.74 ex.8 mapping and p.75 ex.9 script mismatch remain review work. These do not block L01–L06 registration. [Course inventory](english-7-course-audio-inventory.md).

1. Assessed-listening capability is deployed and technically verified under 16.1C.12. No further playback-policy acceptance is needed. English activation still requires its own qualified forms and final assessment/release contract.
2. Author the accepted 84 DB/MB/MC questions (28 each), with their own protected sources/recordings and fresh whole-bank comparisons, one primary agent and one bounded slice at a time. No further bank-size acceptance is needed.
3. Onboard nine guides and the writing package; resolve final rubric/workload, misconception mapping, protected-form qualification, source/voice reuse, SME and English release gates. Verify learner desktop/mobile and cross-subject/two-school behavior before activation.

No ElevenLabs account or runtime TTS integration is enabled. Speaking stays classroom-assessed. One complete English unit remains the 16.1 MVP goal; Mathematics 7 follows in 16.2, Armenian Language 7 in 16.3, then four-subject integration in 16.4. Sprint 16.5 applies the accepted design direction while preserving all functionality; Sprint 17 still requires 16.4 and 16.5C acceptance.
