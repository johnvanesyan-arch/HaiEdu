# Deployment workflow

To avoid exhausting Vercel Hobby deployment/build limits during active development:

- Batch related implementation changes into one Git commit whenever practical.
- Do not commit after every individual file edit.
- Prefer one implementation commit per coherent feature/QA fix, followed by one production deployment.
- Run local/CI validation before pushing the batch.
- Avoid creating throwaway branches that trigger preview deployments unless a preview is actually needed.
- If production deployment is rate-limited, stop creating new deployment-triggering commits and wait for the rolling window to clear before retrying.

This policy applies to ongoing pilot work on the Armenian Mastery Platform.
