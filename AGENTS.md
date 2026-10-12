# Project change policy

System changes apply platform-wide to every affected role, page, subject, grade, class, API and deployed dependency. Audit all consumers of shared code; fixing one visible page is not sufficient.

If a platform-wide change has an exception or cannot safely apply to an affected area, explain the reason to John and obtain his decision before treating the change as complete. Existing authorization boundaries and explicit rollout/content gates remain in force; platform-wide consistency does not authorize opening new curriculum releases or changing learning criteria.

For Edge Function shared-code changes, identify every importing function, compare its deployed bundle with the intended repository source, deploy every affected stale runtime dependency, and read back the deployed files. A merged shared helper does not update already-deployed functions. Record affected consumers, verification, and any exceptions in the deployment evidence.

## Documentation status policy

`docs/project-status.md` is the authoritative current delivery/gate register. Update it with dated evidence when status changes, then align affected roadmap, backlog, README and API summaries in the same change. The roadmap defines scope/sequence; dated sprint reports preserve historical evidence. Do not interpret technical or sequencing closure as SME approval, empirical calibration or production release. Sync Notion summaries to the merged source commit while preserving native child pages. API descriptions must match the relevant implementation and state the scope of any deployed verification.

## Release reliability policy

Every dashboard or shared browser-code release must pass the CI workflow, including its isolated Chromium regressions, and the aggregate `Platform release checks` job. Keep every required CI job in that aggregate. A successful build or a Vercel `READY` state alone does not establish that a page is usable. The persistent production Deployment Check must be configured and verified separately; do not describe release blocking as enforced from the CI job alone.

For observer, listener or asynchronous UI fixes, add a regression that reproduces the reported failure and check every affected consumer. Verify that observers settle, repeated initialization does not multiply handlers, pending actions are not submitted twice, and old responses do not update a new item or account where those behaviours are affected. Use native browser coverage for browser event-loop behaviour; describe VM tests and mocked services accurately.

Shared dependency changes must retain the relevant browser QA triggers. Run `node scripts/check-browser-qa-triggers.mjs`, update its entrypoints when an acceptance flow changes, and review computed imports or URLs that its static dependency graph cannot resolve. Production acceptance must verify the intended frontend commit before starting, keep its reviewed-main and designated-fixture guards, and clean up only records created by that run. Isolated PR checks must not acquire production credentials as a shortcut.

## Subject-neutral core policy

The platform core must be subject-neutral. Put subject-specific behavior in explicit, versioned configuration or extension points; do not add subject, grade, course-code, unit-size, response-format, scoring-rule, language or content-model assumptions to shared schemas, services, APIs, navigation, analytics or authorization logic.

For every change, identify whether it belongs to the shared core or to a subject-aware extension. Shared core behavior must work from governed curriculum/programme/release data. Subject-aware extensions must declare their scope, version and contracts, preserve tenant and authorization boundaries, and remain replaceable without redesigning the core. Use `docs/subject-neutral-core.md` as the normative acceptance standard.

No subject may be treated as the platform default, reference implementation or privileged path. Existing subject-specific behavior is not precedent for new core coupling. If an existing assumption blocks compliant work, record it as migration debt and remediate it in a bounded slice. Do not claim platform-wide compliance until the relevant acceptance criteria and multi-subject isolation checks pass.

## Whole-skill question-bank authoring policy

Before deploying any new or revised question batch, compare it with the entire applicable skill bank and within the proposed batch, across families, templates, releases and assessment purposes. Include draft, approved, retired and historically exposed versions; inspect related/equivalent skill mappings where the same outcome is represented under another code. Compare scenarios, illustrations, solution steps, required inferences, answers and distractor logic—not just wording, IDs or evidence-purpose labels. Follow the mandatory evidence record and decisions in `docs/assessment-evidence-blueprint-policy.md`.

Every question must be supported by the applicable textbook/programme. Creative applications may vary the context only within taught concepts and explicit assumptions; they must not introduce untaught science or procedures. Numeric bank targets (including twelve practice questions per skill) do not authorize padding. Record useful intentional practice variants separately from new reasoning coverage; rework or omit redundant questions. If defensible content falls short, record the shortfall and obtain John's decision on the bank plan without weakening assessment/release gates. Existing approvals/history are preserved; substantive corrections require new versions and fresh review. Exact-text and metadata QA are not a semantic-diversity check. Missing or stale whole-bank comparison evidence blocks the authoring/deployment handoff.


The owner-authorized `haiedu-protected-parallel-pilot-v1` addendum permits a separately recorded protected parallel assessment variant only within an explicitly approved, bounded candidate manifest. Use its complete source, comparison, stimulus/protection and review criteria; it is not a general exception to whole-bank review. Repeated claims/procedures do not become new independent reasoning coverage. Outside the authorized pilot, existing dispositions remain in force. See the policy addendum and the Chapter II owner decision record for the current four-candidate scope.
