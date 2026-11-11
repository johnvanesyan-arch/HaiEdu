# BF-13 — browser protection is live

11 November2026 · Asia/Yerevan. **The reviewed browser rules now enforce on both `haiedu.am` and `www.haiedu.am`.** John approved the release after the bounded preview and protected-audio limit were explained. [PR464](https://github.com/johnvanesyan-arch/HaiEdu/pull/464) released at `0bca046a076a6f7613b8871b7a666c1283904556`.

The browser now refuses scripts/connections/framing outside the existing reviewed policy. Only the policy header name and its shared release-preflight requirement change. Allowed origins, inline-style allowance, other headers and cache rules are preserved. Browser application modules, the build manifest/assets, backend, roles, scoring, curriculum/content and dependencies are unchanged. Build `b61ab8c323b12fd50507502d2137d5f9fa4a0b749a867e8c96f142eab10ecaf8` stays29 pages/124 assets.

## Verification and the retained failed attempt

The up-to-date approved PR head `e9e52dc9` passes all five [CI42964151513](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42964151513) jobs:1,794 unit/integration and630 Chromium cases, including55 security cases, zero failures/skips/cancellations. Its hosted static/17 unsigned-browser checks pass. Earlier ordinary student/teacher/school-administrator preview walks pass41 checks; a further ordinary teacher walk passes18, including a real4,798,188-byte protected PDF downloaded through its library UI with saved hash/length/signature matching. All four new sessions were locally revoked/cleared, preserving other devices; temporary credentials/access/downloaded bytes were removed.

**The first merged-main run remains failed:629/630 browser cases.** [Attempt1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42965476918/attempts/1) failed the resource-library `200% text at360` overflow assertion; other checks passed. The merged tree matches the passing PR tree exactly. That isolated fixture does not serve CSP headers. The unchanged focused test failed locally once; the unchanged complete resource file passed4/4. Failure-only instrumentation retained the identical predicate and captured another failure whose immediate next measurement was360/360px with fonts loaded and no overflowing element. The precise browser event ordering remains unproven; no new product/CSP defect is claimed from that result.

One transparent unchanged-source rerun was requested through the CI failed-jobs tool. [Attempt2](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42965476918/attempts/2) passes all five required jobs,1,794 unit/integration and630 Chromium cases, zero failures/skips/cancellations. This does not erase or relabel attempt1. Both domains stayed on the previous `b2df2041` warning-only release while the check was failing, then switched to the approved enforcing source after the retry passed. The separately recorded persistent release-gate attestation is reused; no gate setting was changed.

This closing change also repairs that isolated test's sampling: it waits for fonts and two native animation frames after viewport/text mutations, then executes each original assertion once. Widths360/768/1280 at normal text and360/640/768/1280 at200%, the original one-pixel overflow limit, privacy/reduced-motion checks and assertion count are preserved. No polling, retries, timeout increases, screenshot tolerance, CSS or application change is added. The repaired case passes10/10 local focused runs and the complete resource file passes4/4. Required CI for the closing revision is tracked on its PR.

## Canonical readback

Both canonical domains return the exact functional source `0bca046a` with enforcing CSP present and report-only absent. Full canonical verification matches manifest bytes, all29 pages/124 immutable assets, every SHA-256, all five security headers, cache rules and MIME types; HSTS is present. A further17 unsigned live browser checks pass with zero Supabase calls or sign-ins. They cover compiled login/recovery form validation, real blocking and generated sample PDF/audio. These generated samples are separate from the earlier actual protected-PDF walk.

For hosted browser checks, Node verified HTTPS through the supplied proxy/CA fetches real unmodified bodies/security headers for Chromium; certificate bypass is disabled and no API is mocked. Reviewed same-origin static redirects are followed by Node. Native browser TLS/redirect handling is not covered. This closing evidence/test-only change preserves all runtime/build/configuration bytes; final closing-commit CI and canonical readback are recorded on the closing PR and Notion.

## Scope limits and production QA

Real protected audio remains unexercised. Staff preview requires content-admin/Master Admin permission absent from the approved test roles; learner loads create/update playback state. No role, account or playback was changed to obtain access. Earlier controlled WAV/blob tests pass, and John approved this release after that coverage limit was disclosed. No fresh signed-in production, Master Admin/MFA, other-tenant, recovery-email, learner submission or full mobile-usability acceptance is claimed. There is no centralized policy-warning collector or ongoing monitoring promise.

**Production QA not run (paused by owner).** All13 acceptance runs triggered by the functional merge skipped; no workflow was manually dispatched. The functional preflight affects16 workflows: Mobile; teacher feedback; resource assignments; English Units1–3 pilot reads; English Units1–2 learner acceptance; ChaptersII–VI pilot reads; Sprint14 actions; Sprint14D analytics; live answer recovery. All16 pause conditions/20 fixture-serialization guards remain unchanged. When John requests targeted production QA, start with Mobile, resource assignments and teacher feedback; the remaining affected suites stay paused until requested. This closing revision changes only records and an isolated test; **Affected production QA: none** for its application/script behavior.

Owner usability acceptance: not given.

B.12.3/B.12 and independent content/SME/security/URL/Master gates remain open. BF-02 stays deferred; subject work stays paused. No learner attempt, answer, assignment, invitation, password, account setting or content was changed.

[Machine-readable release evidence](../evidence/browser-security-enforcement-release-20261111.json) · [Three-account receipt](../evidence/browser-security-enforcement-preview-20261110.json) · [Actual protected-PDF receipt](../evidence/browser-security-protected-pdf-20261111.json).
