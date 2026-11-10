# BF-12 — teacher skill names and invitation-counter contrast

10 November 2026 · Asia/Yerevan · implementation candidate based on verified
main `00b93e9d04460bf4bea8125c867727a91d4d0ef1`. This record covers isolated verification;
merge, production acceptance and owner usability are separate gates.

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
| Candidate normal count | RGB 88,105,95 | RGB 238,241,235 | 5.115:1 |
| Candidate over-limit count | RGB 158,54,54 | RGB 238,241,235 | 6.069:1 |

Empty, 20-email, 21-email and recovered input states preserve the same counting
and invitation limits. Both candidate colors exceed the required **4.5:1**.

## Verification

All **1,789 local unit/integration tests** and **575 native Chromium tests**
pass with no failures, skips or cancellations. Those full runs precede the final
legend spacing adjustment and personal-teacher fixture-shape refinement.
The final **9/9 focused native cases** pass after those changes; their coverage
is recorded in the [receipt](../evidence/teacher-matrix-accessibility-20261110.json).
The focused cases overlap the full suite and are not nine additional journeys.
Required PR CI verifies the exact submitted candidate separately.

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
retained; the candidate archive contains 31 releases and 330 assets. An untracked,
unreleased pre-spacing build from this worktree was removed before generating
the final candidate; no base tracked asset was removed.

## Delivery boundaries

This is subject-neutral browser presentation, using current class/unit metadata.
All identities and API responses in the native fixtures are synthetic. These
checks do not establish a fresh signed-in live check, physical-device or
assistive-technology certification, personal usability acceptance or a new
curriculum release. No production credentials, real teacher/learner actions,
backend/schema/Auth configuration or scoring changes are involved.

Merge and applicable guarded production acceptance remain separate from this
candidate. B.12.3/B.12 and owner usability stay open; BF-02 remains deferred and
independent content/security gates and paused subject work retain their scope.
