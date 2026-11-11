# BF-14 — repository automation security, 11 November 2026

Status: owner settings enabled; workflow and isolated browser-runtime candidate prepared in PR466. All five required jobs must pass on the exact revised head before an approved merge. This record covers shared repository development/release infrastructure.

Owner usability acceptance: not given.

## Problem and resulting behavior

CI inherited repository-token permissions, all22 workflows selected outside Actions by movable tags, and26 checkouts saved credentials for later Git commands. The candidate pins all78 references to reviewed full commits, sets checkout credential persistence to false and gives CI explicit contents-read access. Existing read-only permissions are preserved; only the three existing cross-run artifact readers retain actions-read permission.

The legacy Sprint15A.3 production-QA workflow could receive QA credentials on same-repository PRs when autorun was enabled. Its PR trigger is removed, its job requires main, and exact branch/repository checks run before checkout or credentials. All21 production-QA credential consumers are covered by a regression. The ordinary CI workflow continues to check PRs with isolated fixtures and no production credentials.

Weekly npm/Actions update proposals are configured for Mondays06:00 Asia/Yerevan, with at most two open version-update PRs per ecosystem and grouped minor/patch changes. Review, build parity and release gates remain necessary; no merge automation is introduced. This configuration becomes active after merge.

## Required browser job repair

Three hosted CI attempts stopped during Chromium system-dependency installation because Ubuntu package-server names could not be resolved. No hosted browser cases ran. Initial candidate [43038458520](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43038458520) and revised [attempt1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43040332107/attempts/1)/[attempt2](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43040332107/attempts/2) remain failed. The same Ubuntu26.04 runner image downloaded packages successfully in the last good main run earlier that day; the observed failure is package download/name resolution, not a browser assertion.

The isolated CI browser job now uses the official Playwright environment:

`mcr.microsoft.com/playwright:v1.63.0-resolute@sha256:b022639ae9197f864040f92eef7b57c6d4b47db2190f77c909d8a5d902dd4b7e`

The official [documentation](https://github.com/microsoft/playwright/blob/v1.63.0/docs/src/docker.md) and [build recipe](https://github.com/microsoft/playwright/blob/v1.63.0/utils/docker/Dockerfile.resolute) specify Ubuntu26.04 with the browsers and system libraries installed. Registry index, amd64 manifest and configuration hashes were independently checked; the image configuration supplies `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`. Its version matches all three locked Playwright packages at1.63.0. Node22 is still selected for the test process.

The old mirror-adjustment and browser/dependency-install steps are removed from this job. The existing `node --test tests/browser/*.test.mjs` command, screenshot evidence,15-minute bound, five CI jobs and aggregate dependencies are preserved. Test-process time is explicitly UTC. Init-process handling and1GB of private shared memory support browser-process cleanup; host IPC/networking and extra capabilities are not enabled. No network policy, DNS override, certificate check or test assertion is changed.

A new regression compares the immutable image version with the lockfile and rejects reintroducing package installation into this job. It fails against the pre-repair source and passes against the candidate. Future Playwright upgrades require reviewing the matching official image/digest as well as the dependency update.

This repair applies to the one required isolated browser job on PRs and main. Production-QA runtimes remain outside this repair under the owner's instruction to keep production QA paused. Their existing BF-14 Action/checkout hardening is retained.

## Provenance and verification

The five official Action pins resolve to their version tags and GitHub-verified commits:

| Action | Version | Commit | References |
| --- | --- | --- | --- |
| actions/checkout | v4.4.0 | `11d5960a326750d5838078e36cf38b85af677262` |26|
| actions/setup-node | v4.4.0 | `49933ea5288caeca8642d1e84afbd3f7d6820020` |25|
| actions/setup-python | v5.6.0 | `a26af69be951a213d495a4c3e4e4022e16d87065` |2|
| actions/upload-artifact | v4.6.2 | `ea165f8d65b6e75b540449e92b4886f43607fa02` |22|
| actions/download-artifact | v4.3.0 | `d3f86a106a0bac45b974a628896c90dbdf5c8093` |3|

This is upstream provenance/interface checking, not an independent audit of every bundled vendor dependency. Full URLs and registry proofs are in the [sanitized evidence](../evidence/repository-security-20261111.json).

Parsed workflow comparisons retain every other setting after accounting for SHA pins, checkout persistence, CI permission, main-only credential safeguards and the isolated CI environment. All16 owner-pause conditions and20 shared fixture serialization groups remain intact. Application source, compiled browser files, archive, backend, package versions/lockfile and deployment configuration are unchanged.

Verification and retained history:
- All13 focused cases pass, including the new runtime/lockfile contract and all-consumer credential guard. Both new security/runtime regressions fail against their respective previous sources.
- Prior revised head51839301 passed1795/1795 hosted unit/integration cases, PostgreSQL/concurrency jobs and630/630 local native cases with synthetic services. Those results are separately scoped; fresh full CI is required on this revision.
- Original local run1792/1794 failed because two existing guards required the old floating artifact tag. Only those assertions were updated to require full commit references; all their other guards are unchanged. The subsequent1794-case local run passed on initial pinned candidatee39b176e.
- Source/build/type/email/QA-trigger checks and Dependabot schema validation pass. Actionlint1.7.12 passes apart from its exact pre-existing queue:max diagnostic, which GitHub documents and accepts; all queue settings are preserved. External shellcheck/pyflakes integrations are disabled.
- Required revised CI must execute all1796 expected root cases and630 native cases successfully. No local result replaces that gate.

Affected production QA: the existing BF-14 change hardens all21 non-CI workflows and makes Sprint15A.3 main-only. The additional browser-runtime repair affects required CI only. Production QA not run (paused by owner); no production workflow is dispatched or account signed in.

## Settings completion and limits

The supplied screenshot shows dependency graph, Dependabot alerts/security updates and Copilot Autofix already on. The owner then confirms completion of private vulnerability reporting, malware alerts, grouped security updates, default CodeQL and Secret Protection/push protection. Administrative switches are owner-confirmed: the connected tool omits security-and-analysis readback and no agent operates those switches.

Independently verified [CodeQL Setup43054358412](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43054358412) succeeds on current main0c9577f79d4ec8901954042452035b2f639b3df2. JavaScript/TypeScript, Actions and Python analysis jobs pass; the configuration helper is skipped. Dependency graph update43047578103 also succeeds. Successful analysis is not a claim of zero findings. Settings enablement is complete under this recorded evidence; no repeated enablement request is required.

Main ruleset26520838 is active for main, requires strict Platform release checks, blocks force pushes/deletion, has no bypass actors and reports owner bypass as never. Required human approvals remain zero and code-owner review is off: BF-01 independent reviewer availability remains separate. Automatic merged-branch deletion is false; no branch is pruned or deletion policy changed.

## Release boundary

After all five exact-head jobs pass, [AGENTS.md](../../AGENTS.md) requires specific PR466 approval and a fresh confirmation that no other agent is merging/releasing. After an approved merge, verify main CI and both canonical source identities and align merged delivery records. Production QA remains paused.
