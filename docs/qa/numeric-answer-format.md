# BF-09 numeric answer formatting

## Decision and scope

The owner selected automatic interpretation. Under `haiedu-decimal-input-v1`, a comma or period marks a decimal fraction. `10,800` means `10.8`, following the existing comma convention. A space separates groups of three digits, so `10 800` means `10800`. Regular, no-break and narrow no-break spaces are accepted. Both minus signs and decimal exponent notation are supported. The grader retains the dash and decimal aliases previously converted in the browser.

The active legacy Physics 7 Chapter I adapter serves numeric and quantity items in Practice, Chapter Review, Diagnostic and Mastery Check. The deployed governed SQL dispatcher and active governed policies have separate response capabilities. This change applies to the legacy adapter and its mirrored grader.

## Reproduction and delivered behavior

The deployed TypeScript source matched the audited repository files. Using the real handlers with isolated SQL and synthetic identities, an input of `10 800` scored zero and advanced the question in all four legacy modes. The quantity fixture reproduced the same problem with `38 880 կմ/ժ`. Entering the ungrouped digits graded the equivalent value normally.

The browser sends the learner’s numeric text without dropping internal spaces or characters. The server checks the numeric syntax before recording new attempts. A malformed number produces a versioned HTTP 422 format response with no score, attempt, progress, mastery evidence or answer receipt. The learner sees formatting guidance associated with the number field and can edit the same question. Legacy Mastery forwards the format response. A known format rejection also resolves an uncertain submission after an identical retry, while a saved receipt continues to take precedence.

Local focused tests cover both graders through source parity, supported and malformed inputs, quantity conversion, the no-write response, recovery after a lost format reply, and an earlier stored response. The Chromium suite covers the four legacy pages at a narrow viewport, including field guidance, editability and saved-answer recovery. Hosted PR and main CI each passed all five release jobs, including 1,785 unit/integration and 511 native Chromium tests. These are isolated checks using synthetic identities and services; they do not establish new signed-in production numeric submissions.

## Deployed source and consumer audit

[PR432](https://github.com/johnvanesyan-arch/HaiEdu/pull/432) merged as `3dcfc5dc2f0885d119448e5ff816e4f93737cfe0`. Its final PR head is `1b11268d6c2579d36f9bae6d95cc579a8ad90c81`. [PR CI42285275430](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42285275430) and [main CI42286738001](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286738001) passed all five jobs, including `Platform release checks`. Core/Edge grader parity and the browser QA dependency-trigger check passed.

The two affected Edge bundles were deployed before the frontend, with JWT verification enabled, and all 22 bundled source-file instances were read back exactly:

| Function | Deployed version | Files | Readback digest |
| --- | --- | --- | --- |
| `submit-answer` | 24 → 25 | 14 | `d38410a6e64ba91cd7f55b3db2e014cc2f22dbbd4bf4dcceba137e0cfb7a9142` |
| `submit-mastery-answer` | 13 → 14 | 8 | `48bfa0d490fa59c361866a6b991affdfcc5e2b5f217d167585ac3a59121dd490` |

The importing-function audit found `submit-answer` as the only direct deployed consumer of this grader; the Mastery endpoint delegates to it over HTTP and forwards the versioned format rejection. Browser consumers are the four legacy answer pages, their shared recovery markup/controller and `ux.js`. The old browser sanitizer was removed because it silently changed malformed grouping and stripped exponent notation before grading. Historical receipts still replay before validating a new format. No SQL migration, schema, content, answer-key or historical-grade edit was made.

Vercel production deployment `dpl_3LNUMHsUQgB6Z4czcpVBCMJgvPYq` serves build `cc12aa7e92bf4ef17e8ea9f625f828ffa898233424a4c3e43576b8e0d5df88be`. Canonical `release.json`, the browser manifest, all 29 pages and 122 asset hashes, and their cache policies matched the reviewed source. The persistent production Deployment Check was separately inspected during the preceding BF-08 release and was retained; this is reused configuration evidence, distinct from this release's fresh CI/build proof.

## Signed-in production compatibility

The serialized, reviewed-main, designated-fixture workflows below exercise the released source. They preserve their existing read-only or explicitly bounded fixture-write scope and owned cleanup. They are compatibility checks; the new numeric grading, score-free rejection and lost-reply behavior are covered by the isolated actual-handler/SQL and native-browser regressions described above.

| Suite | Run | Latest result |
| --- | --- | --- |
| Chapter VI | [42286738346](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286738346) | Passed 324/324 on attempt 2 |
| English Unit 1 | [42286737971](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737971) | Passed 130/130 |
| Mobile browser | [42286737947](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737947) | Passed; both schools, student/teacher, 390/430 px |
| School analytics | [42286737948](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737948) | Passed 10/10 |
| Chapter III | [42286737918](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737918) | Passed 123/123 on attempt 2 |
| Resource assignment | [42286737949](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737949) | Passed 329/329 |
| Teacher feedback | [42286737983](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737983) | Passed 87/87 |
| Chapter V | [42286737993](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737993) | Passed 191/191 |
| Chapter II | [42286737954](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737954) | Passed 91/91 |
| Authenticated actions | [42286737968](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737968) | Passed 206/206 |
| Chapter IV | [42286737927](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737927) | Passed 155/155 |
| English Unit 3 | [42286738003](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286738003) | Passed 154/154 |
| English Unit 2 | [42286737946](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286737946) | Passed 142/142 |

### Preserved failures and retry boundaries

Chapter III attempt 1 failed at the frontend cutover: the release marker had changed while the full browser manifest had not yet matched. It stopped before fixture login. After the canonical build was verified, attempt 2 passed 123/123 without a product change.

Chapter VI attempt 1, job `128165764695`, failed its existing two-school isolation prerequisite. Exactly one read returned no response before the 20,000 ms client deadline: `A: other learner cannot be substituted into own class`, trace `4d08b641dbd44be59f0fc3f0f536cecc`, at 2026-11-06 21:32:21.386 UTC. Its diagnostics report `failurePhase: fetch`, `failureKind: timeout`, `timeoutSource: client_deadline`, HTTP0. The other isolation checks and all six own-session cleanups passed. The Chapter VI browser steps were not reached. [Original failed job](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286738346/job/128165764695) and [artifact13541384645](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286738346/artifacts/13541384645) remain failure evidence. The unchanged-suite retry, [job128320063542](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286738346/job/128320063542), passed 324/324 at 2026-11-07 06:02:17 UTC; [artifact13563376750](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42286738346/artifacts/13563376750) records the successful attempt. No timeout/assertion was relaxed and no product code was altered to obtain a pass. This isolated timeout does not establish its underlying transport cause or close BF-37.

## Limits and remaining gates

All 13 signed-in production suites passed on the released runtime commit. Chapter VI attempt 2 succeeded unchanged on 2026-11-07; this does not erase its original timeout or establish the underlying transport cause. No real learner numeric attempt, grade or mastery state was created to manufacture acceptance. Already-open pages can retain the old input sanitizer until reloaded; the deployed-client proof concerns the new browser build. B.12.3/B.12 remain open for explicit owner usability acceptance, subject expansion remains paused and BF-02 remains deferred. The retained U1 repair, earlier failed runs and independent content/security/account gates are unchanged. BF-10 small-phone bottom navigation is the next planned fix.
