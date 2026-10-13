# Direct question-read protection repair

**Deployed and verified:** 2026-10-13 06:52 UTC (10:52 Asia/Yerevan). [Production and regression evidence](evidence/direct-question-read-protection-20261013.json).

During the final Chapter II approval closure, automated PR review identified a prompt-exposure risk. The live `items` RLS rule allowed published, non-retired questions unless they belonged to an enabled active protected assessment pool. Approved but unallocated questions therefore fell outside that protection. An anonymous database-role probe returned 372 question rows, including all 37 final-batch questions. The release being inactive and having no pools did not prevent those direct reads.

The review also alleged option exposure, but the live evidence narrows the finding: migration 0081 had already removed public/learner option policies. The same anonymous probe returned zero options and zero answer keys. This incident concerns direct question rows, including their prompts, stimuli and configuration.

## Correction and scope

Migration `20261013065104_protect_direct_question_reads.sql` removes the anonymous question-read policy and replaces the authenticated published-item rule with staff-only reads. Existing teacher, admin and content-admin access is retained. All student question delivery goes through the existing authorized lesson endpoints; the rule does not depend on a subject, chapter, purpose, pool membership or release being populated.

The browser-source audit found no direct `items` table consumer. All nine server-side consumers use service-role clients after their existing role/session/context checks: content dashboard/history, question/guide management, teacher student history, session start/delivery, answers and remediation. The three directly relevant public views are security-invoker views with no anonymous or authenticated SELECT grant; no public security-definer function referencing `items` is executable by either client role. No Edge function or browser source was changed or redeployed.

## Verification

- Two isolated database regressions passed. They reproduce the predecessor-policy leak, exercise anonymous and authenticated learner denial across two subjects and question states, preserve staff/service reads, and verify content rows are unchanged.
- The existing governed-runtime SQL fixture completes Diagnostic delivery and grading across three curriculum contexts under `service_role`; direct learner reads and inactive-release launch remain denied.
- Live production role probes return zero prompts, options and keys for anonymous, student and school-admin roles. Teacher item/key access and admin/content-admin/service access retain their previous policies. These are database-role checks, not a new authenticated browser or HTTP acceptance claim.
- All 38 complete-table counts and fingerprints match immediately before and after the repair. All content, human approvals, QA, history, pool/form, release and learner evidence rows are preserved. The only persistent changes are RLS policies and migration history.
- Security advisors report no new finding. Existing service-only/no-policy informational findings and the existing disabled leaked-password protection warning are unchanged.

The first production rollback rehearsal request failed with an MCP request-state error; readback verified the original policies were unchanged. The purpose-built migration operation then succeeded. Deployed policy readback and all production role probes passed.

## Remaining exposure boundary

Previous anonymous-role readability is confirmed. It does not prove that a third party retrieved the questions; the repair also cannot prove historical non-exposure. Record an exposure-risk disposition before protected assessment use. Human content approvals remain valid, but they do not establish protected eligibility. Chapter II remains draft, inactive and unallocated. Recorded editorial work, independent SME/protection qualification, disjoint allocation and release gates remain open.
