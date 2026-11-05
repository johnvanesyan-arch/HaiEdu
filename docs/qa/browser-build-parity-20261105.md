# BF-06 — production HTML parity correction

Date: 5 November 2026, Asia/Dubai. Base: PR410/main `80d05455f34553c2645399cb881d8e3b58fbeef3`.

## Observed failure

[Resource acceptance run41994612320](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41994612320) passes the exact-commit compiled-build preflight, including all 29 HTML pages, 119 hashed assets and cache policies. Its subsequent supplemental comparisons pass four stable JS/CSS files, then fail `admin.html`: **5/6 total checks**. The runner compared the compiled page against `web/admin.html`, whose URLs intentionally differ. This is a QA expectation mismatch, not evidence of different deployed browser bytes.

The failure occurred before sign-in, isolation probes, fixture writes or learner actions. Its recorded resource, assignment and Auth cleanup lists are empty; no cleanup success or unreached acceptance is fabricated. Keep the failed receipt. Corrected acceptance must run afresh through the normal reviewed-main workflow.

The broader PR410 delivery passed all five final PR checks in CI41993649630 and all five main checks in CI41994612271: 1,732 unit/integration and 455 native tests, zero failures/skips/cancellations. Canonical `release.json` matches the merged commit before and after all 29 compiled pages, 117 text assets and the manifest were compared exactly; all returned the expected cache headers. The workflow preflight separately checks both font binaries. Its cold/warm measurements reproduce the earlier 55→44 cold and 55→2 warm HTTP request comparison. Those isolated measurements do not establish WAN latency or owner usability.

## Correction and consumer audit

The source-parity audit found two supplemental runners that hash raw HTML templates: resource assignment acceptance and teacher feedback acceptance. Both now use `expectedBrowserDigest`. For HTML, the expected hash comes from the committed compiled manifest; absent/malformed records fail closed. Stable source-file comparisons continue to hash their existing compatibility copies. The prior whole-build preflight still verifies exact compiled HTML, chunks, font bytes, cache policy and release identity. No assertion is removed, no release check is bypassed and no source mismatch is accepted.

The regression reproduces raw HTML differing from its deployed build, verifies the compiled hash, retains stable-file checks and rejects absent HTML records, traversal and unsupported manifest versions. Teacher feedback explicitly includes the new helper in its trigger paths; resource and mobile workflows already cover `scripts/**`. The dependency guard remains required. The correct whole-build preflight is unchanged. Main-only, designated-fixture, cleanup and shared serial/non-cancelling queue guards are unchanged.

No application, SDK, browser archive, database, Edge Function, account, grading or content-release bytes change. The build ID remains `1b2a2a8183caa8e581c44bc4f642ce797f4d3511cae944c67c31aedd7a58ed57`. Main release identity will change with this QA-only commit. Fresh source checks must use that actual merged commit; do not substitute old-source evidence for a newly executed run.

## Remaining verification

Record final PR/main CI, production identity and fresh production acceptance on the corrected source. Preserve all original run results. BF-07 follows this BF-06 verification. BF-02 remains owner-deferred; BF-01 independent review, BF-03 replacement-account/evidence decisions and BF-04/BF-05 usability/coverage limits retain their separate status.
