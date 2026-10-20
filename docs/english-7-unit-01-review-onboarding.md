# English 7 Unit 1 — reviewer onboarding

**16.1C.6 · 2026-10-21 Asia/Yerevan · 116 existing questions staged for ordinary review; English remains inactive.**

Open the [review queue](https://www.haiedu.am/content-review.html), sign in as a content reviewer/administrator, choose **Բոլորը** (All), and search **ENG7-U01**. Open a question to inspect its learner preview, answer key, explanations and private source material. The [question bank](https://www.haiedu.am/content-bank.html) also exposes the English / Grade 7 / Unit 1 review catalogue. Refresh an already-open page to clear its short-lived dashboard cache.

| Bank | Staged questions | Accepted target | Still to author |
| --- | ---: | ---: | ---: |
| Practice | 60 | 60 | 0 |
| Diagnostic | 28 | 56 | 28 |
| Mastery | 28 | 84 | 56 |
| Total | 116 | 200 | 84 |

All 116 remain `draft / needs_review / provisional_no_sme_review`. Eighty-one standalone questions pass structural QA. The other 35 have an explicit source-registration hold: 17 reading and 18 listening questions. Their draft passages, scripts or clearly labelled publisher-script summaries are available to reviewers. The source previews are not playable audio, registered learning stimuli or evidence that a recording was auditioned. Actual recordings, permissions and protected delivery remain separate work under the accepted playable-audio plan.

## What caused the missing handoff

C1/C4/C5 saved the authoring packets in the private repository without importing them into the site's catalogue. Treating that as a completed reviewer handoff was a sequencing mistake. Inactive draft staging can precede human review; it does not confer content approval. John's explicit correction authorizes this onboarding. The original packet's disabled import plan remains a historical authoring record; the separately versioned C6 manifest governs this import.

## Shared implementation and access

`haiedu-authoring-review-v1` is a generic, optional reviewer attachment contract. `items.config.authoringReview` contains only `{schemaVersion,snapshotVersion}`. Full explanations and source drafts reside in the immutable `item_versions.snapshot.authoringReview` attachment, under existing administrator/content-reviewer RLS. The live `manage-content-quality` v14 detail endpoint validates the item code/version pointer and returns the attachment only after its existing authorization checks. Teacher prompt/key access is unchanged; no broader claim about existing teacher access is made.

The preview labels these notes as private and distinguishes an inherited original note from a later question revision. It escapes source text and clears it with the existing item/account lifecycle. Primary question/option labels now say “question text” and “option text,” allowing subject-configured language without an Armenian-only label. No English-specific branch was added to shared core logic.

QA and approval revalidation require a source-backed question to reference a non-revoked registered task set with the expected source family and text/audio modality. An old passing QA record cannot bypass this check. Existing source-binding membership/version checks, ordinary content review, MFA, SME and release controls remain in force. Source registration still needs genuine review and permission evidence.

The inactive catalogue adds one subject, programme, unit and draft release, with 14 provisional skills. Skill-layer and difficulty classifications are review metadata, not adopted scoring/readiness criteria. Each item has one fixed template/family for editing and history; these identities claim no extra reasoning coverage or source independence. Formal outcome reconciliation and all seven release gates remain pending. There are no English pool links, qualified forms, approvals or activated releases. Nine guides and the writing package remain in the canonical authoring packet; this slice imports automatic questions only. Speaking stays classroom-assessed.

## Evidence and delivery

The [guarded transaction](data/english-7-unit-01-review-onboarding-20261021.sql) passed a production-schema rollback rehearsal, restored all 70 table fingerprints, then committed only the allowed additions. Exact readback matched **1,073 rows across 16 tables**, including all item/options/key/version attachments. Every pre-existing row was preserved; 54 tables stayed wholly unchanged. The original three content-packet hashes and the previous whole-bank/scoring evidence are reused because no authored wording, key, response definition or source changed.

Saved structural QA uses the actual deployed-v14 evaluator against a read-only materialized-row adapter, with exact saved-input/result comparison and `run_by = null`; it is not an authenticated human QA action. The new approval/privacy/history regression and existing typed/arrangement revision regressions pass **3/3**. Native Chromium reviewer tests pass **14/14**, including desktop/mobile escaping, source holds, inherited notes, item/sign-out clearing, observer settlement and existing approval/media flows. Browser dependency trigger checks pass. All four v14 Edge bundle files read back exactly; unchanged dashboard v7 and both of its files also match source.

The live browser showed the normal sign-in wall. Authenticated live reviewer acceptance is therefore not claimed; native browser tests use network/Auth doubles. Required main CI, its aggregate `Platform release checks`, and exact production frontend readback remain mandatory delivery checks. The unchanged persistent Production/Blocking check attestation is [reused](evidence/vercel-deployment-check-verification-20261020.json); Vercel connector authorization still returns 403, without changing settings or credentials.

The [delivery evidence](evidence/english-7-unit-01-review-onboarding-20261021.json) records saved data, hashes, preservation, source readbacks and verification limits. The merged commit is the roadmap **4.31** Notion synchronization source; post-merge CI/production evidence and exact source stamp are verified before handoff, preserving all 11 native child pages.

Next: ordinary review of these questions; author the accepted 84 DB/MB/MC questions against the full now-staged bank; complete source/audio, guide/writing and formal curriculum review. Final assessed-listening/scoring policy, qualification and authenticated English learner-release acceptance remain open.
