# Project change policy

System changes apply platform-wide to every affected role, page, subject, grade, class, API and deployed dependency. Audit all consumers of shared code; fixing one visible page is not sufficient.

If a platform-wide change has an exception or cannot safely apply to an affected area, explain the reason to John and obtain his decision before treating the change as complete. Existing authorization boundaries and explicit rollout/content gates remain in force; platform-wide consistency does not authorize opening new curriculum releases or changing learning criteria.

For Edge Function shared-code changes, identify every importing function, compare its deployed bundle with the intended repository source, deploy every affected stale runtime dependency, and read back the deployed files. A merged shared helper does not update already-deployed functions. Record affected consumers, verification, and any exceptions in the deployment evidence.
