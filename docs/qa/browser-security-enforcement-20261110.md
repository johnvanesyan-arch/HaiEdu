# BF-13 — preparing browser blocking

Opened 10 November 2026 · Asia/Yerevan. **Approved bounded preview checks passed; not released.** The live site still uses the warning-only rules delivered in PR461/PR462. BF-13 stays open.

## What is prepared

This candidate changes the browser rule header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. The same rules would then block unapproved code and connections. The allowed sources, inline-style allowance, HTTPS learning images, microphone policy and all cache rules stay as reviewed in the first stage. This is shared browser protection for all roles and subjects. No application modules, backend, schema, account permissions, scoring or learning releases change.

The existing release checker now requires the blocking header on every file it already fetches. It keeps the exact commit check before/after, manifest comparison, file hashes, cache checks, six-request batching and 20-second limits. It makes no additional requests.

## What passed locally

All **1,794 unit/integration tests** and **630 Chromium tests** pass, with zero failures, skips or cancellations. The browser count includes **55 security cases**, three more than the first stage. The eight build/release-check tests also pass. Typecheck and the QA dependency/serialization checks pass.

Before changing the header, the three new blocking checks fail as expected: warning mode permits the tested code, foreign connections and framing when the separate framing header is deliberately removed. With blocking enabled, normal page scripts demonstrate that inline code, attribute handlers and string evaluation are stopped; foreign code/API requests never reach their local test server; and the browser refuses a foreign frame using CSP alone. A separate warning-only fixture still allows the same code and records warnings, providing a positive control.

The first focused run passed 54 of 55 cases. Its evaluation probe used browser debugging commands, which can bypass the document's evaluation restriction. Moving the probe into a normal, self-served page module corrected the test. The original failure is retained. The final focused run passes 55 of 55.

Compatibility checks use all 29 compiled signed-out pages, compiled synthetic student/teacher/master-admin views, controlled task links, HTTPS images, blob downloads/audio and recovery. The SDK transport response is intercepted and synthetic. These results do not establish a real account sign-in.

Browser build `b61ab8c323b12fd50507502d2137d5f9fa4a0b749a867e8c96f142eab10ecaf8` remains **29 pages / 124 assets**. No browser bundle, manifest or archived file changes.

## What passed on the hosted preview

The exact functional candidate `b88a3a01fd476a8cdd0cbaf1aab4a2cf47360aba` passes all five required jobs in [CI42881081676](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42881081676): 1,794 unit/integration and 630 Chromium tests, zero failures/skips/cancellations. Hosted static verification matches the reviewed commit, manifest, 29 pages, 124 assets, all file hashes, five security headers, cache rules and MIME types. A further 17 hosted browser checks without login pass, including real blocking and generated sample PDF/audio. The initial transport/compatibility-path setup failures are retained separately; no policy was broadened.

The approved small check then used the three existing designated School A accounts with their ordinary password sign-in. All three returned the expected identity and active server-side role. The student and teacher home pages and material-library context controls loaded; the administrator home, School A scope, years, subjects, teacher roster, analytics and pending-invitation reads loaded. All **41 checks pass** (student14, teacher14, school administrator13). There were **zero policy violations, JavaScript errors, console errors, transport errors, refused requests or unsuccessful application/Auth reads**.

The session used **32 API requests /113,378 API response bytes**, including three logins and three local-scope logouts, plus207 preview static GETs /3,898,743 response bytes. The guards permitted only the reviewed preview files, ordinary Auth and explicitly read-only application actions, within75 API requests /3MiB and250 static requests /20MiB. Every newly created session was remotely revoked with local scope and its browser storage cleared; other devices were not signed out. No learner attempt, answer, assignment, invitation, account, password, settings or content was changed. No recovery email or production QA workflow was sent or dispatched.

The chosen student material context returned an empty list. The teacher library returned its permitted context list; no file was selected. **No real protected PDF or learner audio was opened.** Generated non-learner sample download/audio and local controlled security tests remain separate evidence. These limited walks do not provide fresh Master Admin/MFA, other-tenant, recovery-email, submission, mobile-usability or every-role acceptance.

The cloud browser rejects the managed proxy certificate directly. For these checks, Node verified HTTPS fetched the actual deployment and Supabase responses, and Chromium rendered their unmodified bodies/security headers with certificate bypass disabled. Reviewed same-origin static redirects were followed by Node; encoding/length headers were adjusted for already decoded transfer bodies. This verifies actual sign-in/application requests and browser rule enforcement, and does not claim native Chromium TLS/redirect coverage. No API response was mocked. Credentials, sessions and private preview access were held outside the repository and removed when the check ended; none belong in public evidence.

[Sanitized account-check receipt](../evidence/browser-security-enforcement-preview-20261110.json).

## Review and release gates

The reviewed origins/rules remained sufficient for the bounded account walks: no legitimate observed request was blocked, and no source, inline-execution allowance or policy value was broadened. The optional Vercel feedback toolbar was suppressed only for preview-origin requests. It is not a required HaiEdu application source; future BF-15 services still need review. There is no centralized warning collector. Observing zero warnings in this bounded session is not a claim about every future production journey.

The current evidence update changes documentation only; the functional candidate, application modules, build manifest, policy and browser assets are unchanged. Its submitted head must still pass all five required CI jobs; exact-head results are tracked on PR464. Owner approval is still required before any merge/live blocking release. Preserve the unexercised protected-file and wider acceptance limits in that review.

Vercel's optional preview feedback toolbar uses an outside source. Review its expected blocking separately from HaiEdu's required sources, and account for future BF-15 services before they are introduced. No extra source is allowed merely to silence a warning. There is no central warning collector.

Before release: retain the reviewed clean bounded account observations, pass all five required checks on the final head, review unexercised protected-media/wider acceptance limits with the owner, then obtain owner release approval. **No production release or completion of BF-13 is claimed here.**

**Affected production QA:** Mobile; teacher feedback; resource assignments; English Units 1–3 pilot reads; Chapters II–VI pilot reads; Sprint 14 actions; Sprint 14D analytics. The existing production release preflight changes in this same candidate. No production locators or fixture expectations change. All 16 owner pause conditions and 20 fixture-serialization guards remain intact.

**Production QA not run (paused by owner).** No workflow was dispatched. Owner usability, B.12.3/B.12 and independent gates remain open; BF-02 remains deferred and subject work stays paused.

[Machine-readable evidence](../evidence/browser-security-enforcement-20261110.json)
