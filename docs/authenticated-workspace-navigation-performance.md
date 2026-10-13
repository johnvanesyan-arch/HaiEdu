# Authenticated Workspace Navigation Performance

**Date:** 2026-10-01  
**Status:** Deployed first-paint/navigation correction; protected authorization semantics unchanged.

**2026-10-13 amendment:** the automatic cross-document animation described below caused reproducible Chromium page errors during full-shell course switching. The shared opt-in is removed by the [navigation repair](evidence/shared-navigation-transition-repair-20261013.json); native navigation, loading shells, prefetching and user-scoped caching remain. A full Home/course navigation regression replaces the old source assertion that required the animation. Production acceptance of this repair passed; see the linked evidence for exact revision, CI and all affected live QA suites.

## Observed production problem

Authenticated role pages were full document navigations. Their static header painted immediately, but protected panels stayed hidden until session/role checks and dashboard reads completed. On Content Reviewer pages this produced a conspicuous blank page between navigation and usable content.

Production Supabase logs for the observed period showed:
- `get-content-quality-dashboard`: approximately **2.3 s average execution time**;
- observed maximum above **7 s**;
- repeated bursts of identical requests for the same authenticated user within fractions of a second.

The duplicate bursts were consistent with pages combining an initial `getSession()` bootstrap, `onAuthStateChange` callbacks, and independent global auth-health checks.

## Deployed corrections

### Stable first paint
- `web/role-layout.js` now creates a neutral loading sidebar and workspace skeleton while protected role/data checks run.
- `web/role-layout.css` provides the loading skeleton/shimmer and responsive fallback.
- The loading shell contains no protected records and is replaced only after the page's existing authorization gate resolves.

### Faster navigation
- Role-sidebar links prefetch likely next same-origin documents on hover/idle.
- The original `web/styles.css` opted same-origin pages into cross-document View Transitions; the 2026-10-13 amendment above supersedes that detail.

### Auth/bootstrap de-duplication
- `web/ux.js`: the supplemental remote terminal-auth health check runs during browser idle rather than competing with first paint.
- `web/teacher.js`: one initial dashboard bootstrap uses the already-resolved session and ignores normal token refresh as a reload trigger.
- `web/admin.js` and `web/admin-security.js`: concurrent initial auth callbacks coalesce into one entry request.
- `web/school-admin.js`: initial identity uses local `getSession()`; year, subject, roster and analytics reads begin in parallel.
- `web/role-router.js`: simultaneous student routing checks for the same user coalesce.
- `web/app.js`: the Student dashboard keeps one in-flight request and reuses already-rendered dashboard data unless the user explicitly refreshes.

### Content Reviewer cross-page cache
- `web/content-workspace.js` stores the shared Content Reviewer dashboard payload in `sessionStorage` for 20 seconds, keyed by authenticated user.
- Consecutive dedicated reviewer pages can render from the same recently authorized payload instead of re-running the heavy dashboard endpoint on every click.
- `web/content.js` invalidates that cache after content mutations and forces an authoritative refresh.
- The cache is an optimization only; server-side authorization/RLS remains authoritative.

## Security invariants

- No protected data is placed in the loading shell.
- The Content Reviewer cache is user-scoped and short-lived.
- Mutating workflows invalidate cached reviewer state.
- Existing server-side session validation, role checks, MFA requirements, RLS and tenant boundaries are unchanged.
- Navigation visibility is not treated as an authorization boundary.

## Verification

Implementation commits include:
- `c757a34c800aa0859704fd8e5d3d78341ab6d24b`
- `a6ccaec552a9007557a0cf1635416070c77772bf`
- `ac4f0671978c81b613b39d28f57e570e709c4cb7`
- `cb954965e561fa3aa0bf07c1d75f4200e093e440`
- `5a444b09de501d050c02e7968c92fc79d42460e3`
- `8125d4bb7181f55a138339a679e9fce52ca4bbef`
- `50fcc0b6b3d418eaef5ac1a168deb43b31e3cda9`
- `55d0dce341de1294d48978ff8c2b0198ea3cbdf9`
- `5af934090fb03348e3eb683f94b15e55722588e7`
- `93bfaed25735e28fe3a25630552371b1c7315899`
- `5d7506ba95518d332cd56a5f31ec6786e6207e06`
- `8936770cd25209f08201916cb190d2c12aa4f778`

CI #1047 passed **648/648 tests**, typecheck, browser-JavaScript syntax checks and institutional concurrency. Production `haiedu.am` was verified serving the new Content Reviewer cache, loading-shell/prefetch logic, deferred auth-health check and Student dashboard de-duplication.

## Follow-up measurement

This change addresses the observed navigation pathology first. After product-owner use, compare:
1. reviewer page-to-page perceived latency;
2. duplicate `get-content-quality-dashboard` request bursts;
3. first-entry latency after a cold browser load.

If cold first-entry remains too slow, split the Content Reviewer dashboard API into purpose-specific reads rather than increasing cache duration.
