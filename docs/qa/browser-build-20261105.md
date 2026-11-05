# BF-06 — hashed browser assets and deployment continuity

Date: 5 November 2026, Asia/Dubai. Base: PR409/main `e79ea71940705005db13b476963660bd9b42d782`.

## Delivery scope

This is shared subject-neutral browser infrastructure. All 29 HTML pages use locally built, content-hashed module, stylesheet and font URLs. Canonical sources remain under `web/`; `dist-web/` is generated deployment output. The existing pinned SDK and teacher artifacts remain parity-checked, while the page build consumes their canonical sources. Static imports share chunks; dynamic imports remain lazy. The early teacher startup graph excludes the SDK, and student startup excludes teacher review/authoring modules.

The build rewrites the three literal injected stylesheet consumers along with HTML links, font preloads and module preloads. Build manifests record exact source/input and executed-output hashes. Stable source copies remain for compatibility with pages opened before this first hashed deployment. Only `/_assets/` receives a one-year immutable cache policy. HTML and stable files revalidate, while release and build metadata use `no-store`.

`npm run build:web-assets` generates the new archive entries and current manifest; commit those alongside canonical edits. `npm run check:web-assets` reproduces the build and verifies every archived asset's bytes. CI compares archive history against the preceding main tree and rejects modifications/deletions. Vercel builds `dist-web/` only after parity and archive verification and stamps the existing schema1 exact-commit release marker there.

## Open tabs and rollback

The authenticated deployment context reports the existing team plan as **Hobby**. Vercel's documented Skew Protection requires Pro or Enterprise; no upgrade or paid feature was enabled. Instead, `web-build/assets/` and `web-build/releases/` are append-only. Every deployment includes all previously committed hashed assets, so an older tab can load its delayed imports without reloading or losing unsaved input. The initial archive has 119 assets, approximately 1.63 MB uncompressed, including fonts. Identical assets deduplicate by content-derived filename. Storage/build transfer grows with changes; it is not silently pruned.

**Rollback procedure:** create a new branch from current main; restore the intended earlier canonical frontend/configuration while retaining the union of `web-build/assets/` and `web-build/releases/`; run `npm run build:web-assets`; commit the new current manifest and any new assets; pass all five PR checks; merge through normal protection; verify all five main checks, exact production commit, compiled bytes/cache headers and applicable production QA. This supports tabs opened on both the previous and rolled-back versions.

Vercel Instant Rollback points at an older deployment that lacks newer archived assets. It does **not** provide this open-tab guarantee on the current plan and is not the tested rollback method. An urgent security withdrawal of historical JavaScript or any future retention purge requires an explicit bounded decision and an updated continuity policy; do not delete archived assets incidentally. This browser rollback does not cover database/Edge changes or substitute for deferred BF-02 recovery verification.

## Verification

The new required production preflight checks the expected release commit before and after fetching the exact compiled manifest, all 29 rendered HTML pages and current hashed artifacts. It checks byte hashes and cache headers. Existing raw-source assertions remain additional evidence. Every active production browser workflow includes the shared build inputs and archive in its path triggers, preserving reviewed-main, designated fixtures, cleanup and serial non-cancelling queue guards.

New unit/integration checks cover immutable retention/tampering, stale source rejection, safe output directories, output-directory independence, dynamic stylesheet hash propagation, deletion of a whole historical release, compiled-output substitution despite matching source copies, and separate teacher/student startup graphs.

Native tests run actual compiled output over HTTP, including all 29 signed-out entrypoints, signed-in Home and teacher class tools with synthetic clients, and a real isolated SDK client. A separate two-version fixture reproduces delayed lazy imports with unsaved input across forward deployment and a newly deployed rollback. A local gzip server records cold/warm Home requests and body bytes; no Playwright route interception is used because it disables browser caching. The artifact `bf06-build-cache.json` records measurements. These are isolated fixture/browser-cache measurements, not production WAN/CDN latency, full signed-in usability or owner acceptance. The existing source-browser suite remains required alongside compiled-output coverage.

Release evidence, native measurements and PR/main/live results must be attached before calling this build delivered. Local Chromium is unavailable in the current workspace; CI runs the native checks with its pinned browser installation. A successful local build or Vercel READY alone is insufficient.

## Retained decisions and next item

BF-07 follows verified BF-06 delivery: coalesce duplicate class/course reads with account/context invalidation, retaining server authorization and teacher read-mode contracts. No BF-07 runtime changes are bundled here. BF-01 lacks an independent reviewer; BF-02 remains explicitly deferred; BF-03 account/evidence decisions remain open with no replacement email; BF-04/BF-05 owner usability and documented coverage limits remain. No database, Edge Function, grading, account or content-release changes are included.

References: [Vercel Skew Protection](https://vercel.com/docs/skew-protection), [Vercel headers](https://vercel.com/docs/project-configuration/vercel-json), [esbuild splitting](https://esbuild.github.io/api/#splitting), checked 5 November 2026. Esbuild documents cross-chunk import-order limitations; native execution of actual built output is required.
