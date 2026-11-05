# BF-06 — pinned browser dependency foundation

Date: 5 November 2026, Asia/Dubai.
Base: main `76ee6e14b0cc6333017752a33a553a1dd24c2bc5`.

## Scope and status

This changeset implements the dependency foundation of BF-06. BF-06 remains open: content-hashed JS/CSS, immutable caching, verified old-tab/lazy-asset loading across deployments, and measured cold/warm performance are not delivered here. Existing stable asset URLs and cache policy are preserved. This is a shared, subject-neutral browser change; no database, Edge Function, API, grading, content-release or account configuration changes are included.

All 33 browser files that imported the floating `https://esm.sh/@supabase/supabase-js@2` now import the same locally served `supabase-browser.bundle.mjs`. The canonical `supabase-browser.mjs` exports only `createClient`; the bundle uses the existing exact `@supabase/supabase-js` 2.118.0, esbuild 0.28.2 and committed transitive lockfile. There is no SDK version upgrade relative to the existing teacher pin.

The teacher dependency bundle re-exports this local SDK as an external module instead of embedding a second copy. Its startup/read optimization and lazy teacher actions remain intact. The SDK contains no teacher, learner, subject or application configuration modules. Fifteen additional module initializers now reuse `window.__haieduSupabaseClient`, including practice/help, legacy home and course gates. Existing shared-client consumers and Auth defaults are preserved.

The build stamps the existing exact-commit schema1 release marker after building both SDK and teacher artifacts. Required CI checks canonical bundle parity and parsed static/literal dynamic dependency imports. Bare package imports are allowed only at the canonical SDK boundary; remote imports are rejected. Comment URLs and API fetch URLs are not mistaken for dependency imports. Computed URLs still require consumer review; no computed external dependency was introduced.

## Verification and limits

- All 109 browser modules pass JavaScript syntax checks; TypeScript and teacher/SDK bundle parity checks pass locally.
- All 12 browser-QA dependency targets and all 20 designated-fixture workflow concurrency checks pass. Seven explicit trigger lists gained the SDK source, bundle and build script; broader existing path patterns already cover the other targets. Reviewed-main, exact release-source, fixture, cleanup and serial non-cancelling queue guards are retained.
- Existing isolated browser fixtures now intercept the local SDK boundary. Their assertions remain intact. The teacher fixtures load the real local SDK and retain existing mocked application clients. VM fixtures gain the browser `window` object required by shared-client reuse; original sign-out, stale-help and outage assertions are unchanged.
- Three focused dependency regressions pass: remote static/lazy import rejection, exact pinned artifact provenance, and learner/resource/school/teacher dependency graph coverage. Added native checks cover the real built SDK's synthetic sign-in/session/own sign-out and one-client Home startup without teacher rendering. Native execution and full release gates are reported in the PR, not inferred from static checks.
- Local compressed size measurements: the shared SDK is 222,783 bytes / 58,331 gzip bytes; the teacher rendering bundle is 70,203 bytes / 21,157 gzip bytes, compared with 293,181 bytes / 79,128 gzip bytes previously. These are artifact sizes, not measured network transfer or speed improvements. The combined split is slightly larger compressed; reuse removes duplicate SDK loading across modules and permits independent caching later.
- No fresh signed-in production QA, deployment, cache behaviour, or user usability acceptance is claimed by this preparation record. PR/main check results and production source must be verified before delivery is reported.

## Remaining BF-06 build work

1. Build page-specific hashed JS/CSS with shared SDK chunks, preserving execution order, tiny early teacher startup and lazy role-only modules. Audit all 29 HTML entrypoints, dynamic imports, injected styles, fonts and resource consumers.
2. Verify protection for a page left open during a new deployment, including delayed lazy imports. Vercel's project snapshot did not expose current skew-protection enablement or maximum age; neither was verified or changed. Do not assume retention merely from a READY deployment. Evaluate supported deployment pinning/retention before changing asset URLs.
3. Revalidate HTML and release metadata; assign immutable caching only to content-addressed assets. Keep source verification pointed at the artifacts actually executed, not unused source copies. Extend production dependency/source checks accordingly.
4. Exercise built output in native browsers with external dependency requests blocked, one client per page, independent role graphs, and two-deployment old-tab recovery. Measure cold/warm request counts and cache headers before describing performance gains. Keep all five PR/main gates and applicable production acceptance.

Reference: [Vercel Skew Protection](https://vercel.com/docs/skew-protection), [esbuild splitting](https://esbuild.github.io/api/#splitting), [Supabase browser initialization](https://supabase.com/docs/reference/javascript/initializing), retrieved 5 November 2026. Esbuild documents a cross-chunk import ordering limitation; test the actual built application rather than assuming bundling preserves every startup order.

## Retained decisions

John has no replacement QA email yet. BF-03's login change and operational-evidence publication decision remain open; preserve the current account and CI secrets. BF-01 lacks an independent reviewer and PR407 remains draft. BF-02 stays explicitly deferred. BF-04/BF-05 usability and documented evidence limits, B.12.3/B.12, content/SME/security and subject-release gates remain open.
