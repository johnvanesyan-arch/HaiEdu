# BF-13 — preparing browser blocking

Opened 10 November 2026 · Asia/Yerevan. **Prepared for testing; not released.** The live site still uses the warning-only rules delivered in PR461/PR462. BF-13 stays open.

## What is prepared

This candidate changes the browser rule header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. The same rules would then block unapproved code and connections. The allowed sources, inline-style allowance, HTTPS learning images, microphone policy and all cache rules stay as reviewed in the first stage. This is shared browser protection for all roles and subjects. No application modules, backend, schema, account permissions, scoring or learning releases change.

The existing release checker now requires the blocking header on every file it already fetches. It keeps the exact commit check before/after, manifest comparison, file hashes, cache checks, six-request batching and 20-second limits. It makes no additional requests.

## What passed locally

All **1,794 unit/integration tests** and **630 Chromium tests** pass, with zero failures, skips or cancellations. The browser count includes **55 security cases**, three more than the first stage. The eight build/release-check tests also pass. Typecheck and the QA dependency/serialization checks pass.

Before changing the header, the three new blocking checks fail as expected: warning mode permits the tested code, foreign connections and framing when the separate framing header is deliberately removed. With blocking enabled, normal page scripts demonstrate that inline code, attribute handlers and string evaluation are stopped; foreign code/API requests never reach their local test server; and the browser refuses a foreign frame using CSP alone. A separate warning-only fixture still allows the same code and records warnings, providing a positive control.

The first focused run passed 54 of 55 cases. Its evaluation probe used browser debugging commands, which can bypass the document's evaluation restriction. Moving the probe into a normal, self-served page module corrected the test. The original failure is retained. The final focused run passes 55 of 55.

Compatibility checks use all 29 compiled signed-out pages, compiled synthetic student/teacher/master-admin views, controlled task links, HTTPS images, blob downloads/audio and recovery. The SDK transport response is intercepted and synthetic. These results do not establish a real account sign-in.

Browser build `b61ab8c323b12fd50507502d2137d5f9fa4a0b749a867e8c96f142eab10ecaf8` remains **29 pages / 124 assets**. No browser bundle, manifest or archived file changes.

## What still needs doing

The owner approved a small preview check with the existing designated accounts. The current project files provide the School A test setup, and one bounded, read-only lookup confirmed the account email addresses at the owner's request. The addresses were given privately. No passwords were retrieved or changed. The three passwords still need to be supplied through private settings; no preview sign-in or Supabase API request has been performed.

The cloud browser initially rejected the managed proxy certificate. Verified Node HTTPS successfully delivered a public static file to Chromium while browser certificate bypass stayed disabled. Preview observations must describe this transport accurately and use real, unmodified responses. No credentials or learner data belong in public evidence.

Vercel's optional preview feedback toolbar uses an outside source. Review its expected blocking separately from HaiEdu's required sources, and account for future BF-15 services before they are introduced. No extra source is allowed merely to silence a warning. There is no central warning collector.

Before release: inspect warnings during the approved account journeys, fix any legitimate blocked feature, verify the hosted blocking preview, pass all five required CI jobs, then obtain owner release approval. **No production release or completion of BF-13 is claimed here.**

**Affected production QA:** Mobile; teacher feedback; resource assignments; English Units 1–3 pilot reads; Chapters II–VI pilot reads; Sprint 14 actions; Sprint 14D analytics. The existing production release preflight changes in this same candidate. No production locators or fixture expectations change. All 16 owner pause conditions and 20 fixture-serialization guards remain intact.

**Production QA not run (paused by owner).** No workflow was dispatched. Owner usability, B.12.3/B.12 and independent gates remain open; BF-02 remains deferred and subject work stays paused.

[Machine-readable evidence](../evidence/browser-security-enforcement-20261110.json)
