# Chapter II owner-authorized pilot release — 2026-10-13

**State: implementation merged and frontend deployed; database deployment blocked; Chapter II remains draft and inactive.** The owner directed: “You can release Chapter II; we will do the specialist review later.” This authorizes a provisional learner pilot using the approved Chapter II bank. The existing database distinguishes `pilot` from `production`: independent SME approval is required for production promotion, while pilot activation requires the other six evidenced release gates. [Deployment blocker and readback](evidence/chapter-ii-pilot-deployment-blocker-20261013.json).

## Decision and retained limitations

The earlier instruction to hold allocation pending specialist review is superseded for this bounded pilot. All 192 current approved questions, 263 active definitions and 57 published guides retain their existing human approvals. `provisional_no_sme_review` and the `external_sme_approved=pending` gate remain explicit. No specialist review, reviewer identity or approval is manufactured.

The owner authorized release after the historical direct-read exposure uncertainty was reported. The approved bank is retained for provisional pilot use under that direction. The former route could expose published prompts; actual third-party retrieval is unknown. The repaired access rule and zero governed delivery events do not prove historical non-exposure. Independent source/protection review and a production exposure disposition remain open; the pilot does not establish empirical form equivalence or suitability for high-stakes use.

The assessment contract remains one lifetime Chapter II Diagnostic of 16 questions, two per skill; Mastery has 16 questions, two per skill, with at least 13 correct overall and at least one correct in every skill. The configuration retains `minimumPercent=80`, the existing rounded-score comparison, all eight skills in readiness, up to three Mastery attempts, and the existing review lifecycle. The prepared pilot model adopts eight-question Practice and twelve-question Chapter Review settings.

## Preserve Chapter I while opening Chapter II

The original draft successor included both chapters. Superseding the active Chapter I release would remove its active learning context and separate learners from current release-bound progress; two Chapter I sessions were open at preflight. The bounded release design narrows the still-unactivated candidate to Chapter II and keeps Chapter I on its original active pilot release. The prepared shared release registry change permits simultaneous active releases only for disjoint programme/unit scopes. Existing activation gates, account/enrollment authorization and immutable activated snapshots remain enforced.

The deployed frontend navigation change groups authorized chapters by enrollment and programme, retaining the exact release identity on every chapter link and action. Chapter II does not become an authorized learner context until its database configuration and activation complete. This shared rule has no Physics, grade or chapter-count default. The release transaction is designed to preserve Chapter I questions, pools, blueprints, model, baselines, attempts and sessions; it has not run in production.

The existing governed recommender resolves prerequisites only inside the selected release. The recorded Chapter I S02 → Chapter II S02 curriculum edge is preserved, but this release does not add cross-release prerequisite recommendations or copy Chapter I mastery into Chapter II. All eight Chapter II skills still participate in its approved readiness and pass rules. Cross-release prerequisite routing remains integration work.

## Version-bound assessment allocation

The author audit binds current question versions, approvals, QA and source/comparison references. It prepares two disjoint Diagnostic forms and three disjoint Mastery forms, each with two questions per skill. Sixteen other Mastery questions remain reserves. Similar question pairs are separated; this is an author-level protection decision, not independent specialist approval or measured equivalence.

The merged Mastery implementation uses an opt-in versioned form-selection declaration: the runtime selects an entirely unseen declared form and verifies its complete membership atomically. It does not mix questions from different reviewed forms or substitute reserves automatically. A new reviewed blueprint is required to change the declared allocation. Its database migration remains pending. Existing unconfigured/legacy delivery keeps its previous contract. The [implementation and consumer audit](governed-mastery-form-selection.md) records the concurrency controls and the bounded legacy nonoverlap requirement.

## Verification and activation evidence

The [allocation manifest](evidence/chapter-ii-pilot-allocation-20261013.json) binds the exact audited forms. [Isolated configuration evidence](evidence/chapter-ii-pilot-preparation-20261013.json) verifies the real policy/model validators, current production row constraints and the 13/16, 12/16 and per-skill scoring boundaries. The shared release-scope consumer audit is recorded in [release governance](disjoint-release-unit-governance.md).

The implementation merged in [PR #206](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/206) at `a64269e1ab83d2b52d1a8af0d65559bab580aeec`. All five final CI jobs passed in [run 38386280582](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/38386280582), including 1,282 passing Node tests and zero failures. Vercel production was verified `READY` on that implementation commit. This verifies the implementation's CI and frontend deployment, not database deployment or live Chapter II acceptance.

Both Supabase connector attempts to apply the first database migration failed with `Invalid or expired requestState` (JSON-RPC `-32602`, `invalid_request_state`). Readback confirms that the private release-unit registry/governance function and corresponding migration-history entry are absent. All 37 tracked preflight content/source/learner table counts and digests are unchanged. Database migrations, production rollback rehearsal, form/policy/model configuration, pilot activation and authenticated chapter switching remain pending. No Chapter II learner release or completed live acceptance is claimed. [Failure and readback evidence](evidence/chapter-ii-pilot-deployment-blocker-20261013.json).

The guarded [activation transaction](../scripts/releases/chapter-ii-pilot-20261013.sql) requires the reviewed implementation commit and exact migration hashes, stops on source/content drift, and verifies existing content and Chapter I history are unchanged. After the connector is restored and the reviewed schema migrations are deployed, run this transaction first with its final `COMMIT` replaced by `ROLLBACK`. Implementation CI has passed; the production rehearsal and readback are still required before committing activation. The dedicated production read-acceptance workflow is triggered only by the subsequent activation evidence record.

[Authoritative status](project-status.md) · [Preflight and review packet](chapter-ii-assessment-qualification.md) · [Independent Physics review](grade7-physics-chapter2-sme-review.md).
