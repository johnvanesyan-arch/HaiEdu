# BF-12 — teacher skill names and invitation-counter contrast

10 November 2026 · Asia/Yerevan. [PR456](https://github.com/johnvanesyan-arch/HaiEdu/pull/456) is merged at
`4359c21cdf9a894ab1b58fc96cfc394a2e539fac` with John's explicit release approval.
The canonical site serves the verified build. All 13 production compatibility
suites pass; owner usability acceptance is not given. Implementation was based
on `00b93e9d04460bf4bea8125c867727a91d4d0ef1`.

Requirements: imported Claude QA findings **P4:W2 / P4:W4**, consolidated as BF-12
in the [sequential register](https://app.notion.com/p/40d355a472bf8155a838c145acd61419).

## Reproduction and changes

Both initial native regressions fail against the original application. Full
matrix skill names exist only in hover titles, and the invite counter's inline
blue foreground measures **4.422:1** against its actual background.

The matrix now has one native, expandable skill-name legend outside its
horizontal scroll area. Every current skill code is paired with its governed
name. Touch, Enter and Space work without custom toggle handlers; Tab reaches
the existing matrix scroll control. Column headers also expose code and name
to assistive technology. School and retained personal-teacher paths share the
same rendering, including the dashboard-level metadata fallback.

The legend uses the same full skill list as the headers, even when a student
filter has no results. Unit changes replace its names, and context/account reset
clears it. Names use the existing HTML escaping. Opening the legend adds no
service requests. The skill set, classification rules, support counts, matrix
status colors and existing student actions are preserved.

The counter's inline color is removed. Its normal text uses the existing Forest
muted token; over-limit text uses the existing Forest error token. Measured
ordinary-text contrast at **375px and 200% text** is:

| State | Foreground | Background | Contrast |
| --- | --- | --- | ---: |
| Original normal count | RGB 96,112,135 | RGB 238,241,235 | 4.422:1 |
| Released normal count | RGB 88,105,95 | RGB 238,241,235 | 5.115:1 |
| Released over-limit count | RGB 158,54,54 | RGB 238,241,235 | 6.069:1 |

Empty, 20-email, 21-email and recovered input states preserve the same counting
and invitation limits. Both released colors exceed the required **4.5:1**.

## Verification

All **1,789 local unit/integration tests** and **575 native Chromium tests**
pass with no failures, skips or cancellations. Those full runs precede the final
legend spacing adjustment and personal-teacher fixture-shape refinement.
The final **9/9 focused native cases** pass after those changes; their coverage
is recorded in the [receipt](../evidence/teacher-matrix-accessibility-20261110.json).
The focused cases overlap the full suite and are not nine additional journeys.
Required PR and merged-main CI each verify the exact final code and build, as recorded below.

Visual review at 375px/200% caught a split word in the new disclosure heading.
Replacing nested-card padding with the existing divider-style presentation
preserves whole words. The final glyph-range regression covers its heading and
all ordinary skill names. The final rendered preview has no page errors.

The contrast helper's initial zero-alpha blending error was corrected before
the measured two-failure baseline. It is not counted as an application defect.

Typecheck, five-module core parity, pinned SDK/teacher bundles, hashed build and
archive, favicon/font provenance, browser syntax and QA dependency checks pass.
All 20 designated-fixture workflows retain serialization, queue: max, main-only
and exact-source/designated-identity guards. No workflow changes are required.

Final browser build `811c0911eba5d92d1725c6d2ab840165ed6ce1d9120b5f3fca31d24de410c1f4` contains
**29 pages / 123 immutable assets**. All 30 base releases and 328 assets are
retained; the released archive contains 31 releases and 330 assets. An untracked,
unreleased pre-spacing build from this worktree was removed before generating
the final candidate; no base tracked asset was removed.

## Release and production verification

All five required jobs pass on candidate `3a28f842e76d3180f86def470d4ab2032732cfce`
([CI42787364803](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42787364803)) and merged main `4359c21cdf9a894ab1b58fc96cfc394a2e539fac`
([CI42790691338](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691338)): **1,789/1,789 unit/integration
and 575/575 native Chromium tests**, with no failures, skips or cancellations.
All nine BF-12 regressions are included in those 575 cases. PostgreSQL 17,
institutional concurrency and aggregate `Platform release checks` also pass.
The approved candidate and merged source trees are identical.

Vercel deployment `dpl_SZVNEhopcK7wNUS6B5wPuNhmRYwC` was built from the approved
main source. Its READY build initially retained only branch aliases while the
canonical site served the prior source. The custom domains moved automatically
after main checks passed; no production setting or manual promotion changed.
Canonical `release.json` identity brackets exact readback of the manifest, all
**29 pages and 123 immutable assets**, their SHA-256 digests and cache policies.
The browser build is `811c0911eba5d92d1725c6d2ab840165ed6ce1d9120b5f3fca31d24de410c1f4`.

The first direct canonical read observed the new release marker with a
different manifest and stopped before signed-in activity. A subsequent
same-source full read passes. The failed read remains recorded; the exact
deployment propagation mechanism is unconfirmed.

All **13 automatic production compatibility suites pass** freshly on the
functional merge: **2,052/2,052 main assertions and 864 isolation
controls**. Main-only, exact-source, designated two-school fixtures, shared
serialization and run-owned cleanup remain in place.

| Production suite | Main assertions | Successful attempt |
| --- | ---: | --- |
| Chapter II pilot read acceptance | 91/91 | [run 42790691223, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691223/attempts/1) |
| Chapter III pilot read acceptance | 123/123 | [run 42790691185, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691185/attempts/1) |
| Chapter IV pilot read acceptance | 155/155 | [run 42790691169, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691169/attempts/1) |
| Chapter V pilot read acceptance | 191/191 | [run 42790691523, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691523/attempts/1) |
| Chapter VI pilot read acceptance | 324/324 | [run 42790691192, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691192/attempts/1) |
| English Unit 1 pilot read acceptance | 130/130 | [run 42790691435, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691435/attempts/1) |
| English Unit 2 pilot read acceptance | 142/142 | [run 42790691127, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691127/attempts/1) |
| English Unit 3 pilot read acceptance | 154/154 | [run 42790691600, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691600/attempts/1) |
| Mobile browser QA | 110/110 | [run 42790691502, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691502/attempts/1) |
| Resource assignment production acceptance | 329/329 | [run 42790691156, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691156/attempts/1) |
| Sprint 14 authenticated action QA | 206/206 | [run 42790691844, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691844/attempts/1) |
| Sprint 14D authenticated analytics QA | 10/10 | [run 42790691347, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691347/attempts/1) |
| Teacher feedback production acceptance | 87/87 | [run 42790691141, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42790691141/attempts/1) |

No production suite required a retry.

Every downloaded acceptance archive matches its GitHub SHA-256 metadata.
Each main JSON receipt has the functional source revision, passing assertions,
applicable tenant isolation and run-owned cleanup. Mobile records session
closures rather than resource withdrawals. Exact counts and cleanup summaries
are in the verification receipt.

## Delivery boundaries

This is subject-neutral browser presentation, using current class/unit metadata.
All identities and API responses in the new native fixtures are synthetic. Those
cases do not establish a fresh manual signed-in touch/keyboard check, physical-device or
assistive-technology certification, personal usability acceptance or a new
curriculum release. The new native fixtures use no production credentials.
Guarded production compatibility workflows use only designated identities and
run-owned records; no backend/schema/Auth configuration or scoring changed.

Technical delivery and guarded production acceptance are complete. B.12.3/B.12
and owner usability stay open; BF-02 remains deferred and independent
content/security gates and paused subject work retain their scope. The
documentation-only closure preserves the verified runtime, compiled archive,
backend, dependencies, scripts, workflows and production configuration.
