# Chapter IV Batch 1 approval checkpoint — 15D.4R

**Verified:** 2026-10-17 21:46:07 UTC / 2026-10-18 Asia/Yerevan. **Status:** questions approved; guides reviewed; publication and definition approval pending.

John requested “Let’s try to approve Batch 1” at 21:14:16 UTC. Codex performed the ordinary review actions through the signed-in HaiEdu reviewer, under the recorded owner delegation. This is delegated ordinary review, not personal inspection by John or independent SME approval.

| Batch 1 component | Before | Saved this pass | Current |
| --- | --- | --- | --- |
| Questions | 20 approved, 64 pending | 64 distinct current-v1 approvals | 84 approved |
| Guides | 1 published, 49 drafts | 49 `review` lifecycle transitions | 1 published, 49 reviewed/unpublished |
| Definitions | 65 draft | None | 65 draft |

All question text, options, keys, mappings and immutable versions match the checked staging evidence. All 84 current QA records pass with zero errors/warnings. The 87 review audit rows represent 84 distinct approved versions: three repeated approvals predate this pass and remain preserved. No new duplicate approval was created.

All learner guide wording, hints, worked examples and source metadata are unchanged. The normal UI creates authoring v2 on review and normalizes the unused `misconceptionCode` from null to an empty string. Runtime guides and their history remain unchanged because no publication was completed.

## Remaining action and blocker

Guide publication requested the existing six-digit authenticator confirmation. Automatic approval review rejected secure MFA submission because it treated publication as a separate side effect not explicitly covered by “approve Batch 1”. No alternate credential entry, SQL approval or indirect publication path was attempted. Definition approvals also require MFA; their 65 records remain draft, without new review events.

The next action is explicit authorization to publish the 49 reviewed Batch 1 guides and approve its 65 definitions, followed by secure MFA through the normal UI. The existing ordinary-review delegation remains recorded; this is an action-time approval-review block. Batches 2/3 and chapter release are outside this checkpoint.

## Preservation and scope

Of 59 tracked tables, 56 retain exactly matching counts and fingerprints. The three expected changes are `items`, `item_reviews` (+64) and `remediation_guide_authoring_versions` (+49). Baseline fingerprints match for those tables after excluding only the new events and restoring the approved items’ prior lifecycle metadata for the comparison. Pre-existing history and unrelated content are preserved.

Chapter totals are 236 questions (84 approved, 152 draft), 138 guides (one published, 49 reviewed/unpublished, 88 authoring drafts), and 150 draft definitions. The runtime guide table still has 137 drafts and one publication. Batch 2 retains 86 questions/50 guides/46 definitions pending; Batch 3 retains 66/38/39. U04 remains inactive with a draft release and no assessment allocation. Final chapter assessment/practical contracts and independent SME/exposure qualification remain open.

[Metadata evidence](evidence/chapter-iv-batch-01-approval-20261018.json) · [Owner delegation](evidence/chapter-iv-three-batch-authorization-20261017.json) · [Authoritative status](project-status.md).

Restricted evidence contains the exact before/after content, audit readback, preservation queries, version equivalence and the 59-table fingerprints. Public documentation contains no protected assessment stimuli or solutions. Required CI, merged documentation and exact-source Notion synchronization close this checkpoint; the partial content status must not be represented as full Batch 1 approval or chapter release.
