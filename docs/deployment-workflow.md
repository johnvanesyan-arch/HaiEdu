# Deployment workflow

To avoid exhausting Vercel Hobby deployment/build limits during active development:

- Batch related implementation changes into one Git commit whenever practical.
- Do not commit after every individual file edit.
- Prefer one implementation commit per coherent feature/QA fix, followed by one production deployment.
- Run local/CI validation before pushing the batch.
- Avoid creating throwaway branches that trigger preview deployments unless a preview is actually needed.
- If production deployment is rate-limited, stop creating new deployment-triggering commits and wait for the rolling window to clear before retrying.

This policy applies to ongoing pilot work on the Armenian Mastery Platform.


## Platform-wide changes and Edge Function dependencies

John's standing policy (2026-09-28): system changes apply across every affected platform surface. Explain any proposed exception and ask for his decision. Preserve explicit rollout gates and authorization boundaries.

- Inventory all direct and transitive consumers of changed shared code, including API operations and UI error states.
- Supabase Edge Functions carry their own shared dependencies. Merging a helper does not update existing deployments.
- Compare each affected deployed bundle against repository source, including its entrypoint and every relative import. Update stale runtime dependencies together, keeping JWT verification enabled.
- Read back each deployed bundle and record its version and source comparison. Identify harmless formatting/type-only differences explicitly.
- Verify positive access, expired/ended/no enrolment denial, subject/grade isolation, and unavailable-data presentation. Never modify real learner records merely to test access.
- Record deployment evidence and remaining authenticated QA separately; source comparison is not a signed-in end-to-end test.
