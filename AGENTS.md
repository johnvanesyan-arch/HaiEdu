# Project change policy

System changes apply platform-wide to every affected role, page, subject, grade, class, API and deployed dependency. Audit all consumers of shared code; fixing one visible page is not sufficient.

If a platform-wide change has an exception or cannot safely apply to an affected area, explain the reason to John and obtain his decision before treating the change as complete. Existing authorization boundaries and explicit rollout/content gates remain in force; platform-wide consistency does not authorize opening new curriculum releases or changing learning criteria.

For Edge Function shared-code changes, identify every importing function, compare its deployed bundle with the intended repository source, deploy every affected stale runtime dependency, and read back the deployed files. A merged shared helper does not update already-deployed functions. Record affected consumers, verification, and any exceptions in the deployment evidence.

## Subject-neutral core policy

The platform core must be subject-neutral. Put subject-specific behavior in explicit, versioned configuration or extension points; do not add subject, grade, course-code, unit-size, response-format, scoring-rule, language or content-model assumptions to shared schemas, services, APIs, navigation, analytics or authorization logic.

For every change, identify whether it belongs to the shared core or to a subject-aware extension. Shared core behavior must work from governed curriculum/programme/release data. Subject-aware extensions must declare their scope, version and contracts, preserve tenant and authorization boundaries, and remain replaceable without redesigning the core. Use `docs/subject-neutral-core.md` as the normative acceptance standard.

Existing Physics-specific behavior is not precedent for new core coupling. If an existing assumption blocks compliant work, record it as migration debt and remediate it in a bounded slice. Do not claim platform-wide compliance until the relevant acceptance criteria and multi-subject isolation checks pass.
