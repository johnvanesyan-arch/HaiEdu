# BF-14 — repository automation security, 11 November 2026

Status: prepared for review, not merged or released. GitHub security-feature settings remain unverified. This record covers repository development/release infrastructure shared by every role and subject.

Owner usability acceptance: not given.

## Problem and proposed behavior

The main CI workflow inherited token permissions from GitHub defaults. All 22 workflows selected outside Actions by movable version tags, and checkout left its token available to subsequent Git commands. There was no Dependabot configuration.

The candidate gives CI explicit `contents: read`, pins all 78 Action references to full commit SHAs, and sets `persist-credentials: false` on all 26 checkouts. Existing read-only permissions are preserved. The three workflows that retrieve another run's artifacts retain `actions: read`; uploading the current run's artifacts uses GitHub's separate artifact runtime authorization and does not require a repository write grant.

The review also found that Sprint 15A.3's legacy production-QA workflow had a pull-request trigger and no main-branch check. If automatic QA were enabled, a same-repository PR could receive its production QA account credentials. The initial BF-14 PR triggered only a skipped run because the owner's pause is active; no credential use or exposure is claimed. The candidate removes that PR trigger, restricts the job to main, and checks the exact main branch and repository before checkout or credentials. All 21 production-QA credential consumers are now covered by a regression requiring main-only operation. The ordinary isolated CI workflow retains pull-request checks without production credentials.

The new Dependabot configuration proposes npm and GitHub Actions updates weekly, Mondays at 06:00 Asia/Yerevan. Each ecosystem has at most two open version-update PRs, with minor/patch updates grouped. Proposals still require review, the normal exact-head CI gate and owner-controlled release. No merge automation is added. This schedule starts only after the configuration reaches the default branch; security-update proposals additionally depend on repository settings. Changes to application dependencies must regenerate affected browser assets and pass the existing parity/build/QA-trigger checks.

## Pin provenance

The official `actions/*` repositories were read through GitHub, and public Git refs were independently resolved with HTTPS Git. Each full SHA matches the currently resolved v4/v5 tag and its exact version tag. GitHub reports each selected commit's signature as verified, and its action manifest uses Node 20. This is provenance and interface verification, not an independent audit of every bundled Action dependency.

| Action | Previous tag | Resolved version | Full commit | References |
| --- | --- | --- | --- | --- |
| actions/checkout | v4 | v4.4.0 | `11d5960a326750d5838078e36cf38b85af677262` | 26 |
| actions/setup-node | v4 | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` | 25 |
| actions/setup-python | v5 | v5.6.0 | `a26af69be951a213d495a4c3e4e4022e16d87065` | 2 |
| actions/upload-artifact | v4 | v4.6.2 | `ea165f8d65b6e75b540449e92b4886f43607fa02` | 22 |
| actions/download-artifact | v4 | v4.3.0 | `d3f86a106a0bac45b974a628896c90dbdf5c8093` | 3 |

Exact upstream reference, commit and action-manifest URLs are in the [sanitized evidence](../evidence/repository-security-20261111.json). Pin updates require a fresh upstream provenance review; the date above is not an approval of future versions.

## Verification and production QA scope

All 22 YAML workflows were parsed and compared with main `0c9577f79d4ec8901954042452035b2f639b3df2`. After accounting for the reviewed SHA references, checkout credential persistence, CI permission and Sprint 15A.3 main-only safeguards, their parsed structures are identical. Every other job, command, event, main path trigger, fixture/account guard, artifact name/path, cancellation rule, input and timeout is preserved. All five CI jobs and the aggregate's four dependencies remain intact.

The comparison verifies all 16 production-QA pause conditions and all 20 shared fixture serialization groups. Application source, compiled browser files, archive, backend, dependency versions/lockfile and deployment configuration are unchanged. No production QA was dispatched and no account was signed in.

Local verification:
- Dependabot configuration passes its JSON schema.
- Actionlint 1.7.12 validates all 22 workflows after filtering one exact existing diagnostic. Raw baseline lint reports 20 `queue: max` diagnostics: that tool version does not recognize the concurrency option documented by GitHub. The queue settings are preserved; raw failure is retained outside the repository. External shellcheck/pyflakes integrations are disabled.
- Workflow semantic-preservation and least-privilege checks pass.
- Source/build parity, browser-QA trigger coverage, TypeScript and email checks pass. The first full local run passed 1,792/1,794 with two failures: existing learner-workflow guards required the old movable download-artifact tag. Their two assertions now require full 40-character commits, retaining every other safety assertion byte-for-byte. The complete 1,794/1,794 local rerun passes on initial pinned candidate `e39b176e18a942a5360f058c73ba3b0ca79e6ce3`; the original failure and both log digests are retained.
- After adding the main-only credential fix, all 12 focused cases pass (the previous 11 plus one new all-consumer security regression). That regression fails against the original main workflows and passes against the candidate. It executes the actual shell guard with main, pull-request, feature-branch, case-variant and wrong-repository fixtures; no credentials or network are used. Final full-suite/native counts must be taken from required CI on the revised head.
- Required hosted CI must pass all five jobs on the exact final PR head. Native Chromium behavior is verified there; a new signed-in production walkthrough is not claimed.

Affected production QA: all 21 non-CI workflows receive the same Action/checkout changes. Sixteen retain automatic-run pause guards and five remain manual-only. No production acceptance script or expected application behavior changes. Production QA not run (paused by owner). If a live run is requested, select only the scope the owner requests; no weekly full run is introduced.

## Actual settings readback and remaining decisions

The repository is public. Main ruleset 26520838 is active for `refs/heads/main`, requires strict `Platform release checks`, blocks force pushes/deletion, has no bypass actors and reports owner bypass as `never`. Required human approvals remain zero and code-owner review is not enabled: BF-01 still needs an independent reviewer. Automatic merged-branch deletion is false.

The connected GitHub tool omits `security_and_analysis` and does not expose security-administration operations. The local GitHub CLI is not signed in and no shared-browser control tool is available. The account's reported administrator role does not make these missing readbacks available through this connection. Therefore dependency graph, Dependabot alerts/security updates, secret scanning/push protection and CodeQL mode are unverified, not assumed disabled. No repository setting has been changed.

A repository administrator must inspect the actual settings at [GitHub code security](https://github.com/johnvanesyan-arch/HaiEdu/settings/security_analysis). The concrete settings review is:

1. Confirm dependency graph, Dependabot alerts and security-update proposals; enable missing protections only under specific owner approval.
2. Confirm secret scanning and push protection and read back any approved change.
3. Check whether CodeQL uses default setup, advanced setup or neither. Preserve an existing setup; if none exists, prepare the available default JavaScript/TypeScript and Python scanning for owner approval and verify its first completed scan.
4. Decide automatic deletion of future merged branches separately. Existing branch deletion is outside this candidate.
5. Keep BF-01's reviewer decision separate; no independent review is invented or waived.

Full BF-14 closure requires those actual setting readbacks and any approved enablement/scan evidence. Passing CI and merging these workflow changes alone do not close that settings portion.

## Release boundary

This candidate needs explicit approval for its eventual PR plus a fresh confirmation that no other agent is merging or releasing, as required by [AGENTS.md](../../AGENTS.md). After a merge, verify all five main CI jobs and the canonical source served by both HaiEdu domains. Settings changes require their own concrete authorization and readback. Production QA remains paused.
