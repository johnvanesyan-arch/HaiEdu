# BF-22 — private connection and build-registration handoff

Recorded 17 November 2026 (Asia/Yerevan), against reviewed main `ebbac695dc394dd04ebd04c1cc28e28a944bdb9a`. The owner confirmed **“Both saved; reporting off”** after following the private connection-key setup instructions. Credential saving is owner-reported; the live key match has not been tested. The [private service installation](client-failure-private-service-setup-20261117.md) is complete; collection remains disabled. This record adds the release/renewal procedure and preserves the separate activation gate.

## Private connection setup

The current GitHub integration cannot access the Actions secrets public-key endpoint (HTTP 403, resource not accessible by integration). The Supabase connection has no Edge Function secret-setting operation. No available browser profile records a GitHub or Supabase sign-in. This is an access limitation, not a pending automatic-approval rejection.

Use one cryptographically random 32-byte value, encoded as exactly 64 lowercase hexadecimal characters. Save that same value in both settings below. Do not use a Supabase project API key, service-role key, account password or personal access token.

| Dashboard | Name | Value |
| --- | --- | --- |
| [Supabase Edge Function secrets](https://supabase.com/dashboard/project/xzyjvwiiibuarpotppid/functions/secrets) | `HAIEDU_CLIENT_FAILURE_SUMMARY_KEY` | The generated connection key |
| [GitHub repository Actions secrets](https://github.com/johnvanesyan-arch/HaiEdu/settings/secrets/actions) | `BF22_CLIENT_FAILURE_SUMMARY_KEY` | The same connection key |
| Supabase Edge Function secrets | `HAIEDU_CLIENT_FAILURE_REPORTS_MODE` | `off` |

Leave `BF22_CLIENT_FAILURE_ALERTS` unset/false and the browser configuration false. Preserve the existing enabled `BF22_FAILURE_ALERTS` layer. Do not change production-QA or BF-16 settings.

A standalone local setup helper has been supplied privately to the owner. It generates the value in the owner's browser, has no network requests or storage, and contains no pre-generated credential. Its copy button has a manual-copy fallback. Only confirmation that the settings were saved is needed in chat; the key must not appear in repository files, issues, logs, evidence receipts or chat. Supabase's [current secret-management documentation](https://supabase.com/docs/guides/functions/secrets) confirms saved secrets are available without redeploying the functions.

**Verification boundary:** in `off` mode the summary route returns 503 before comparing credentials. Therefore a disabled response does not prove that the two saved keys match. Owner confirmation establishes a reported configuration action, not end-to-end verification. The live match is tested during the separately approved activation/inspection step. Do not enable collection solely to test the key during this setup.

## Registration for each frontend release

Responsibility belongs to the operator conducting that release. The operator prepares the exact SQL and readback, obtains any required production-write approval, and records completion with the release. John remains the project owner; this document does not grant agents standing database-write or activation authority.

1. Start from a clean checkout of the exact reviewed release candidate. Run the existing browser build/archive checks and all required CI gates. Never substitute an arbitrary hash or an unreviewed local manifest.
2. If reporting is disabled, registration is not needed. For first activation, prepare the enabled frontend candidate first: changing the browser switch changes the build identity. Registering today's disabled build would not register that future candidate.
3. For an approved enabled candidate, run `node scripts/client-failure-build-registration.mjs`. This only emits SQL from `web-build/current.json`; it makes no network request or database change. Review the statement and its build ID against that exact commit, obtain the required approval, and execute it through the authorized production SQL connection before releasing that build.
4. Read back the exact build row and expiry from `private.client_failure_builds`. Confirm the returned ID matches the reviewed manifest and the expiry is approximately 30 days ahead of database time. Save only the commit, build ID, registration time, expiry and verification outcome in the release record.
5. After release, verify `/release.json` and `/asset-manifest.json` on `haiedu.am`, `www.haiedu.am` and `armenian-mastery-platform.vercel.app` against the intended commit/build. Use the repository's existing static verification tooling and required CI; Vercel READY alone is insufficient.
6. For rollback, inspect the target build's registration before serving it with reporting enabled. An unknown or expired build is refused by the collector. Do not delete or renew all previous build rows indiscriminately.

Registration upserts one fixed build ID and extends its expiry to 30 days from database time. It does not enable collection, modify learning records or grant GitHub database access. GitHub must retain only the narrow summary credential.

## Renewal when there is no new release

Proposed arrangement, to be accepted before activation: record a maintenance review date 21 days after registration and its 30-day expiry in the activation handoff. John initiates that maintenance session; the agent/operator then performs the bounded check and approved renewal. This is a manual procedure, not an installed scheduler or reminder. Credential-saving confirmation is not acceptance of this maintenance responsibility. If that ownership and review date are not accepted, keep collection off until an alternative renewal arrangement is agreed.

At maintenance, verify the currently served commit and manifest on all public addresses, confirm the exact checkout/build identity, and inspect the current registration. Renew only the reviewed current build using the same generator and approval/readback steps. If public addresses disagree, resolve the release state before registering a guessed build. Registration of old open-tab builds must be separately justified; it is not implied by renewal of the current site.

An expired registration causes diagnostic reports to be refused; classroom requests continue independently. Silence is not proof of healthy reporting. If an expiry is missed, record the coverage gap rather than claiming uninterrupted monitoring.

## Preparation evidence and pending work

- All 14 existing focused reporting controls pass, including fixed-destination summary polling, capability validation, off-mode behavior and SQL-only build registration.
- The browser-QA dependency check passes. There is no application, schema, service, workflow or browser-code change in this preparation.
- A fresh read-only database check finds zero rows in all four reporting tables and one active 15-minute retention job. No build was registered and no diagnostic report was inserted.
- The setup helper's actual HTML content was checked in native Chromium: valid random-key format, one generation per page, clipboard success and fallback, pagehide clearing, phone-width fit, zero network requests and zero page errors. The managed browser disallows local-file navigation, so this proves execution of the supplied HTML content, not successful file opening in the owner's browser. No generated test key was recorded.
- After the owner's saving confirmation, a fresh unsigned POST with empty JSON returned 503 `summary_unavailable` and `Cache-Control: no-store` from the deployed summary route. In the reviewed handler, this request is refused before credential comparison or data access when the mode is off. It does not verify the saved key's presence, format or match.
- Credential saving is owner-reported. Direct administrative readback and live key-match verification remain unperformed. No automatic renewal job, reminder, new-layer notification or signed-in production check has been run. [Machine-readable receipt](../evidence/client-failure-connection-20261117.json).

Next, complete a separately reviewed activation plan covering renewal responsibility, the backend mode, enabled frontend build registration, bounded signed-in acceptance, GitHub inspect-only verification, and new-layer notification delivery. Broader BF-22 coverage remains open. Documentation publication/merge and its required CI/release checks are recorded separately from this setup evidence.

Production QA not run (paused by owner). Affected production QA: none for this documentation/setup preparation. Owner usability acceptance: not applicable; no HaiEdu page design changes.
