# Versioned assessment scope — Sprint 15C.15

**Owner-approved 2026-10-15 · Roadmap 3.78 · Implemented and deployed; final production acceptance in progress.**

The former runtime included every answered item in the pass denominator and every frozen skill in first-attempt readiness. That could make supporting/additional knowledge compulsory. John approved the [Chapter III contract](chapter-iii-assessment-contract-proposal.md) at 20:02:38 Asia/Yerevan on 2026-10-15.

## Contract and consumers

`haiedu-assessment-policy-v2` adds explicit delivered, scored and readiness-required skill sets, plus labelled reporting groups that partition delivery. Scored sets cannot split a reporting group. Mode/scope/coverage/model/lifecycle validation, immutable bindings, response types and whole-form protection remain enforced. The historical SQL validator function name dispatches both closed versions for API compatibility; v1 rules and bound histories remain unchanged.

Only Mastery has pass/readiness sets. All delivered questions still require a response. V2 compares the exact scored fraction with the threshold, then applies configured per-skill minima. Finalization independently recomputes the expected pass and score from the original binding and answered items. Failed-skill targets contain scored skills only. The existing readiness model is unchanged: secure score and evidence count OR recent recovery. Required Chapter Review still qualifies by completion and keeps the same retry lifecycle; non-gating errors create no additional retry lock.

Completed sessions save `assessmentResultReporting` in metadata. Learner player/history, teacher latest results/history and school contract aggregates read the separate scales. The pass score never shares a denominator with the descriptive overall accuracy. Active assessments do not expose running correctness. The generic core has no Physics IDs, chapter counts or language-specific policy keys. Group labels are chapter configuration, escaped on display. No result certifies laboratory performance.

The [approved Chapter III configuration](evidence/chapter-iii-assessment-v2-configuration-20261015.json) defines 16-question D/M forms, 8-question Practice, 12-question Chapter Review, and the 10/2/4 distribution. It is a configuration recipe, not an active model, policy binding or allocated form. Model/lifecycle IDs and qualified forms must be bound during separately authorized release preparation. Existing Chapter I/II configurations are unchanged.

## Verification and deployment boundary

Local SQL integration verifies the three approved 16-question pass/fail cases, mandatory-only readiness, all-response completion, saved/reloaded group results, required review and disjoint retry forms, unchanged v1 all-skill readiness/denominator, and a different subject with three delivered / one scored question. JS/SQL reject duplicate/missing/foreign scope and invalid grouping. Staff loaders and aggregates are exercised against saved SQL results. The new suite is also required on PostgreSQL 17.6 CI; native Chromium covers learner instructions, all 16 answers, result reload and mobile history.

The shared Edge audit identifies 14 importing functions. **Deployment and exact readback are complete; final production acceptance is pending.** See the [dated deployment checkpoint](evidence/assessment-policy-v2-deployment-20261015.json). Every affected bundle must be deployed and read back exactly; the existing JWT setting is retained, including the already custom-authenticated teacher-student endpoint. Deployment will append runtime provenance and move only active implementation pointers; historical builds/sessions/models/approvals remain immutable. Authenticated production acceptance uses designated guarded QA accounts and verifies Chapter I/II access/switching without new learner evidence.

Required closeout: aggregate Platform release checks, deployed SQL/ACL and Edge parity, runtime provenance, production frontend commit/read acceptance, content/learner preservation, documentation merge and Notion exact-source synchronization. Chapter III stays draft/inactive; zero qualified forms and independent SME/exposure gates remain.
