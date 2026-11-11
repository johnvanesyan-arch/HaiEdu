# BF-14 — verified release, 11 November 2026

Owner-approved [PR466](https://github.com/johnvanesyan-arch/HaiEdu/pull/466) is merged and verified live at `1df8f590f1dbfb99eeff96460c00e00486dab349`. Its source tree equals the approved PR head `28f73964db707e749381d337f75542aae2fb27ff`. This record aligns the delivery/status documents; it changes no application, build, backend, dependency version, workflow or deployment configuration.

Owner usability acceptance: not given.

## Delivered behavior

Automation tools are fixed to reviewed commits, workflow permissions are explicit, checkout credentials are not saved, and execution configuration follows the project rules. The required browser job uses the official Playwright1.63.0 Ubuntu26.04 environment with browsers/system libraries already installed, pinned to `sha256:b022639ae9197f864040f92eef7b57c6d4b47db2190f77c909d8a5d902dd4b7e`. Its version is checked against the lockfile. Node22, all630 browser cases, screenshot evidence, the15-minute bound and all five required jobs/dependencies are preserved.

The supplied screenshot and subsequent owner confirmation record completion of the recommended repository protections. These administrative switch states are owner-confirmed; no agent operated them. Weekly reviewed dependency-update proposals are active. The first npm and Actions update checks succeed and produce PR467–470 for separate review; no update proposal is automatically merged.

## Verification

| Check | Evidence |
| --- | --- |
| Approved PR CI | [43071703134](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43071703134), all five jobs pass on attempt1 |
| Merged-source CI | [43074972754](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43074972754), all five jobs pass on attempt1 |
| Unit/integration and native Chromium |1,796/1,796 and630/630 in each CI run; zero failures/skips/cancellations |
| CodeQL | [PR analysis](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43071697089) and [merged analysis](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43074972674) succeed for JavaScript/TypeScript, Python and Actions |
| Canonical source | Both `haiedu.am` and `www.haiedu.am` serve the exact merged source, bracketed before/after manifest reads |
| Browser build |Unchanged build `b61ab8c323b12fd50507502d2137d5f9fa4a0b749a867e8c96f142eab10ecaf8`, manifest29 pages/124 immutable assets |
| Hosted metadata |Manifest bytes, five reviewed security headers, enforcing browser policy, HTTPS protection header and no-store metadata match |
| Deployment |Production deployment `dpl_3yVGz7CuApXUPqCFR4eXsC789vmp` is READY at the merged source; both domain aliases point to it automatically |

The hosted verification reads only public release metadata and the manifest: nine GETs including apex redirects, no page-script execution, sign-in or backend request. The29/124 counts describe the unchanged manifest; this release does not claim a fresh download of every page/file. Source comparison preserves application assets, archive, backend, packages and deployment configuration. No manual promotion, domain assignment or hosting-setting change was made.

Successful CodeQL execution confirms analysis completed, not that no findings exist. Owner usability and independent review retain their separate scope. The branch-deletion policy is not changed and no branches are pruned.

## Retained failures and scope

The first local root run passed1,792/1,794: two old guard assertions required a movable artifact tag. They were corrected to require full commit references while preserving their other guards; a subsequent1,794-case local run passed. Later hosted source included the new workflow-context and browser-runtime guards; current full CI passes1,796 cases.

Hosted [43038458520](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43038458520) and revised [43040332107 attempt1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43040332107/attempts/1)/[attempt2](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43040332107/attempts/2) fail while downloading Ubuntu browser dependencies; no native cases execute. Those failures remain failures. The official preinstalled environment removes that per-run installation dependency; no DNS/proxy rule, certificate check, assertion or timeout is weakened. All13 focused guards pass and the new regressions fail against their respective previous sources.

Production QA not run (paused by owner):16 automatic acceptance runs skip and no manual production workflow is dispatched. No production account is signed in and no learning/content data is written. The browser-runtime repair affects required isolated CI only; earlier BF-14 automation metadata changes remain included.

BF-14 technical delivery is verified within this scope. BF-01 independent reviewer availability, owner usability/content gates and branch-deletion decisions are not silently closed. BF-02 remains deferred and subject expansion remains paused.

[Sanitized release evidence](../evidence/repository-security-release-20261111.json) · [Prepared-stage history and provenance](repository-security-20261111.md).
