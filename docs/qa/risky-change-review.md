# BF-01 — Ownership and independent change review

**Prepared 5 November 2026. Status: reviewer designation and approval enforcement remain open.** This proposal supplies ownership routing and a review record; it does not certify independent review or change the active GitHub ruleset. BF-02 backup inventory, export and restoration remain owner-deferred.

## Current protection and ownership

The fresh readback of [ruleset 26520838](https://github.com/johnvanesyan-arch/HaiEdu/rules/26520838) confirms active protection for exactly `refs/heads/main`, required pull requests, strict `Platform release checks` from GitHub Actions integration 15368, blocked deletion/force pushes, no bypass actors and owner bypass `never`. Main is protected at `d0bbaa5488139b92346b8b720a760601896d5f29` at this checkpoint. Required approvals are **0**, required code-owner reviews are **false**, and stale-review dismissal is **false**. Passing CI can therefore satisfy the configured gate without independent approval; BF-01 is not closed.

The proposed [CODEOWNERS](../../.github/CODEOWNERS) maps every file to the existing accountable maintainer, `@johnvanesyan-arch`, whose repository permission was freshly confirmed as `admin`. This includes `.github/` and CODEOWNERS itself. It routes ownership across all roles and subjects, but does not create an independent reviewer. No other person's availability or permission is assumed, and no repository invitation or access grant is made.

GitHub requires code owners to have repository write access. PR authors cannot approve their own PRs. John must identify an available independent reviewer before required review settings can be completed. Enabling approvals without an eligible available reviewer can block all main merges. See GitHub's [CODEOWNERS documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) and [required review documentation](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/approving-a-pull-request-with-required-reviews).

## Which changes need a recorded risk review

Use a meaningful independent review for changes affecting:

- Database schema, migrations, data repair, retention or learning-history writes.
- Authentication, authorization, tenant isolation, secrets, personal identifiers or privacy controls.
- Grading, assessment evidence, mastery, answer selection, content governance or release policy.
- Shared browser/core/Edge code, dependency delivery, or cross-role and cross-subject behavior.
- Branch/release protections, CI permissions, production QA credentials or deployment controls, including ownership and this procedure.

An ordinary documentation or cosmetic change can use a short scope and validation summary, unless it changes one of these policies. The author identifies the category and explains the scope; uncertainty is recorded for the reviewer rather than silently classified as low risk. This classification is a review procedure, not a claim that GitHub currently enforces path-specific independent review.

## Review record and acceptance

Use the PR's risk-review section to keep the record beside the actual diff. For a risky change, record:

| Field | Required evidence |
|---|---|
| Source | PR URL and exact reviewed head SHA; base and deployed source where relevant |
| Reviewer | A named, available reviewer other than the author; permission verified before required-review enforcement |
| Scope | Affected consumers, roles and contracts; shared-core versus bounded-extension classification |
| Invariants | Expected preserved behavior/data, relevant authorization denials, races and failure modes |
| Verification | Actual tests and readbacks, linked results, simulated versus live coverage, and unexecuted limits |
| Recovery | Bounded rollback or containment steps, reversibility and known recovery gaps; do not claim a verified backup |
| Disposition | The reviewer's own submitted review URL, findings and their resolution at the accepted SHA |

The reviewer must inspect the diff and relevant evidence. The author or agent must not submit approval on the reviewer's behalf, relabel a checklist as independent review, or infer acceptance from green CI. Changes after review require review of the changed scope at the new head; stale evidence must not be carried forward as fresh acceptance. Existing owner usability, SME, curriculum and release gates remain separate.

For shared Edge code, the review includes every importing function and the subsequent deployment/readback plan. Merging source alone is not runtime delivery. The independent review procedure does not authorize BF-02 work, destructive data changes, new curriculum releases or learning-history resets.

## Activation and completion checklist

1. John names an available independent reviewer and their GitHub username. Verify existing repository write/admin permission; request a separate explicit decision before granting access if it is missing.
2. Add that reviewer to the applicable CODEOWNERS entries. Keep coverage for all risky surfaces, including `.github/` and CODEOWNERS. Verify GitHub parses the file without errors on the actual branch.
3. Have the independent reviewer inspect this governance change and submit their review against its current head. Complete the PR record without self-certifying acceptance.
4. Complete all five required CI jobs and merge through the existing protected PR path. Do not weaken required checks or add bypass actors.
5. With the eligible reviewer available, enable at least one required approval, required code-owner approval, stale approval dismissal and review-thread resolution on the main ruleset. Preserve strict checks and empty bypass. Read back the saved settings; do not treat a prepared configuration as active enforcement.
6. Verify an ordinary subsequent PR uses the base-branch CODEOWNERS and the expected review requirement. Inspect merge eligibility without attempting a forbidden direct push, force push or deletion. Preserve the separately configured Vercel Production/Blocking check; do not infer its current state from GitHub settings.
7. Update `docs/project-status.md` and affected delivery summaries with the exact merged source, CI and settings evidence, then synchronize Notion. Close BF-01 only after ownership, independent review and enforcement are demonstrated.

No review setting is changed by this proposal. No new tests are added for these static documents. Git diff/ownership coverage checks and the existing PR CI validate preparation; they do not establish independent human review.
