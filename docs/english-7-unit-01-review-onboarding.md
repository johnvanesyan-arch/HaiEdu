# English 7 Unit 1 — reviewer onboarding

**16.1C.9 current update — 2026-10-21:** Ordinary approval is verified for 98 questions, including all 17 reading questions at v2; 18 listening questions remain blocked by missing registered audio. All 20 publisher MP3s are downloaded and hash-verified. John is producing the five original recordings externally; 12 questions depend on those files and six use three publisher clips. The accepted bank is unchanged; 84 DB/MB/MC questions, guide/writing onboarding, assessed-playback policy/runtime and learner release remain open. [Current handoff and evidence](english-7-unit-01-audio-handoff.md).

**16.1C.8 reading registration — 2026-10-21:** John accepted all seven exact passages for the MVP. The sources are registered and linked to 17 v2 questions, all passing saved technical QA; source catalog/preview checks pass for all 17. The bank now has 98 passes / 18 listening holds. Unchanged wording, keys, source families and v1 history are preserved. The 98 ordinary question approvals are now verified under C9; audio and learner release remain open; bounded owner reuse authorization does not assert a publisher licence. [Acceptance](evidence/english-7-unit-01-reading-acceptance-20261021.json) · [Evidence](evidence/english-7-unit-01-reading-registration-20261021.json).

**16.1C.6 · 2026-10-21 Asia/Yerevan · 116 existing questions staged for ordinary review; English remains inactive.**

Open the [review queue](https://www.haiedu.am/content-review.html), sign in as a content reviewer/administrator, choose **Բոլորը** (All), and search **ENG7-U01**. Open a question to inspect its learner preview, answer key, explanations and private source material. The [question bank](https://www.haiedu.am/content-bank.html) also exposes the English / Grade 7 / Unit 1 review catalogue. Refresh an already-open page to clear its short-lived dashboard cache.

| Bank | Staged questions | Accepted target | Still to author |
| --- | ---: | ---: | ---: |
| Practice | 60 | 60 | 0 |
| Diagnostic | 28 | 56 | 28 |
| Mastery | 28 | 84 | 56 |
| Total | 116 | 200 | 84 |

Ninety-eight questions are now `published / approved` with passing current-version QA: 81 at v1 and all 17 reading questions at v2. Eighteen listening questions remain `draft / needs_review` at v1. This ordinary content approval does not activate the English curriculum or satisfy independent SME/release gates. Those 18 listening questions retain the source-registration hold. The seven accepted reading passages now render through registered text-source links. The listening drafts/scripts or clearly labelled publisher-script summaries remain reviewer notes; they are not playable audio or evidence that a recording was auditioned. Actual recordings, permissions and protected delivery remain separate work under the accepted playable-audio plan.

## What caused the missing handoff

C1/C4/C5 saved the authoring packets in the private repository without importing them into the site's catalogue. Treating that as a completed reviewer handoff was a sequencing mistake. Inactive draft staging can precede human review; it does not confer content approval. John's explicit correction authorizes this onboarding. The original packet's disabled import plan remains a historical authoring record; the separately versioned C6 manifest governs this import.

## Shared implementation and access

`haiedu-authoring-review-v1` is a generic, optional reviewer attachment contract. `items.config.authoringReview` contains only `{schemaVersion,snapshotVersion}`. Full explanations and source drafts reside in the immutable `item_versions.snapshot.authoringReview` attachment, under existing administrator/content-reviewer RLS. The live `manage-content-quality` v14 detail endpoint validates the item code/version pointer and returns the attachment only after its existing authorization checks. Teacher prompt/key access is unchanged; no broader claim about existing teacher access is made.

The preview labels these notes as private and distinguishes an inherited original note from a later question revision. It escapes source text and clears it with the existing item/account lifecycle. Primary question/option labels now say “question text” and “option text,” allowing subject-configured language without an Armenian-only label. No English-specific branch was added to shared core logic.

QA and approval revalidation require a source-backed question to reference a non-revoked registered task set with the expected source family and text/audio modality. An old passing QA record cannot bypass this check. Existing source-binding membership/version checks, ordinary content review, MFA, SME and release controls remain in force. The reading source review and bounded MVP reuse authorization are recorded under C8; listening registration still needs its own reviewed recordings and permission evidence.

The inactive catalogue adds one subject, programme, unit and draft release, with 14 provisional skills. Skill-layer and difficulty classifications are review metadata, not adopted scoring/readiness criteria. Each item has one fixed template/family for editing and history; these identities claim no extra reasoning coverage or source independence. Formal outcome reconciliation and all seven release gates remain pending. There are no English pool links, qualified forms, approvals or activated releases. Nine guides and the writing package remain in the canonical authoring packet; this slice imports automatic questions only. Speaking stays classroom-assessed.

## Evidence and delivery

The [guarded transaction](data/english-7-unit-01-review-onboarding-20261021.sql) passed a production-schema rollback rehearsal, restored all 70 table fingerprints, then committed only the allowed additions. Exact readback matched **1,073 rows across 16 tables**, including all item/options/key/version attachments. Every pre-existing row was preserved; 54 tables stayed wholly unchanged. The original three content-packet hashes and the previous whole-bank/scoring evidence are reused because no authored wording, key, response definition or source changed.

Saved structural QA uses the actual deployed-v14 evaluator against a read-only materialized-row adapter, with exact saved-input/result comparison and `run_by = null`; it is not an authenticated human QA action. The new approval/privacy/history regression and existing typed/arrangement revision regressions pass **3/3**. Native Chromium reviewer tests pass **14/14**, including desktop/mobile escaping, source holds, inherited notes, item/sign-out clearing, observer settlement and existing approval/media flows. Browser dependency trigger checks pass. All four v14 Edge bundle files read back exactly; unchanged dashboard v7 and both of its files also match source.

The live browser showed the normal sign-in wall. Authenticated live reviewer acceptance is therefore not claimed; native browser tests use network/Auth doubles. Required main CI, its aggregate `Platform release checks`, and exact production frontend readback remain mandatory delivery checks. The unchanged persistent Production/Blocking check attestation is [reused](evidence/vercel-deployment-check-verification-20261020.json); Vercel connector authorization still returns 403, without changing settings or credentials.

The [delivery evidence](evidence/english-7-unit-01-review-onboarding-20261021.json) records saved data, hashes, preservation, source readbacks and verification limits. The merged commit is the roadmap **4.31** Notion synchronization source; post-merge CI/production evidence and exact source stamp are verified before handoff, preserving all 11 native child pages.

Next: ordinary review of these questions; author the accepted 84 DB/MB/MC questions against the full now-staged bank; complete source/audio, guide/writing and formal curriculum review. Final assessed-listening/scoring policy, qualification and authenticated English learner-release acceptance remain open.

## Checking the registered reading questions

Refresh the review queue or reopen a reading question. R01–R09, DA-21–24 and MA-21–24 are v2 with passing saved QA. Their source is already attached; do not paste the passage into the question field or save another version merely to select it. The selector now offers the one registered matching set. Ordinary question approval remains a separate reviewer action. Future corrections must use the versioned source/question workflow.
