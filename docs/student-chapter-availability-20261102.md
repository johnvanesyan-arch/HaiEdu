# Student chapter availability — 2026-11-02

Status: UX-STUDENT-CHAPTERS-01 technically corrected, deployed and source verified. UX-STUDENT-ACCESS-01 remains open after an intermittent availability failure; reload recovery is not a root-cause fix. B.12.3/B.12 remain open for owner usability acceptance; subject expansion remains paused.

## Confirmed cause and account scope

The owner reported Physics 7 chapters visible in some student areas and blocked in others. Read-only Supabase metadata confirmed active pilot releases for all six units, PHY7-U01 through PHY7-U06, with all four activity blueprints. The superseded Chapter I legacy release remains inactive. The live `service_student_learning_navigation` definition iterates authorized pilot/production release units and rechecks each student context; it has no two-chapter limit.

Baseline main `d556270e84fcce0e1677f8f03851dc310da645e8` rendered five static, non-clickable “Հետագայում” cards in `physics-7.html` and incorrectly said Chapters II–VI were not activated. Home and the governed workspace already rendered all six authorized contexts. The owner-supplied signed-in student session reproduced that contradiction through the Chapter I topics link.

The bounded live review also distinguished legitimate activity gates. Chapter I has a completed Diagnostic and incomplete Mastery readiness. Chapter II has an existing unfinished Diagnostic. Chapters III–VI expose Diagnostic while Practice/Mastery/Review require that chapter's baseline. Guides wait during an existing Diagnostic; an empty chapter writing list does not establish an access fault. Home, Courses, My Work and Materials expose all six released chapters. This chapter review is not whole-account usability acceptance.

## Delivered behavior and consumer audit

The shared selector uses the authorized enrollment/programme group, curriculum order and exact enrollment/release/unit IDs. It contains no Physics-specific count or inferred release. Repeated same-state refreshes preserve disclosure state and keyboard focus; revoked access clears old links. Existing focused-task state hides the selector during tasks.

| Consumer | Correction and preserved behavior |
| --- | --- |
| `physics-7.html` | Keep Chapter I topics, skills and provisional notice; replace the five future cards with authorized chapter links and clear Chapter I scope. |
| `assessment.html` | Identify Chapter I and link other released chapters through the shared selector. |
| `progress.html` | Keep Chapter I evidence and link each other unit to its own progress tab. |
| `diagnostic.html`, `mastery.html` | Keep Chapter I results, entry rules and task focus; show chapter navigation outside focused tasks. |
| `practice.html` | Mount through its existing header; retain selected enrollment/release/unit when a session starts. Preserve every supplied value, including malformed duplicates, so the existing gate still fails closed. |
| Home and all five `course.html` tabs | Preserve existing authorized context lists and replace stale inactive fallback text with neutral loading text. |
| Shared student shell and Physics extension | Style the selector consistently and keep Armenian headings, topic/skill labels and summary content readable within the page at narrow widths and enlarged text. The subject-specific topic layout remains in the Physics stylesheet. |

A released chapter is distinct from an unlocked activity. Diagnostic, Practice, Mastery, readiness/retry conditions, authorization and release gates are preserved. No question content, scoring, threshold, activation, backend function, migration or dependency change is included.

## Verification

[PR389](https://github.com/johnvanesyan-arch/HaiEdu/pull/389), reviewed head `7b694268d6d64e674c8b6efe2b781aee309ade51`, has tree `34749df438e397bab4587e75f6809a532777009c`. Its final [CI41478454909](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41478454909) passes all five gates: 1,649 unit/integration checks, 397 native browser checks, isolated PostgreSQL17, institutional concurrency and aggregate `Platform release checks`; zero failures/skips/cancellations. Functional main is `a4e7d7096df7f20607ce14ce95156754a4530eb1`. Main [CI41480625003](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41480625003) independently passes the same five gates and1,649/397 checks with zero failures/skips/cancellations.

The four added native regressions load actual student HTML/modules/styles with synthetic Auth/Edge responses. They compare Home → legacy topics → all five course tabs, cover all six legacy routes, a second subject and multiple same-subject enrollments, and test same-state focus, refresh and access revocation. Practice's start/context behavior is exercised only in these isolated fixtures.

Four final synthetic captures at 390/1280px and normal/200% text were freshly inspected. All document widths equal their viewports; checked words remain intact, outside-element lists are empty and root overflow is false. Artifact13158547699 has ZIP SHA256 `6c8312e0eb85a483862a6b64fb4af2d76b799f0639578cc81d37ce2ea414ecac`; individual capture hashes are in the [receipt](evidence/student-chapter-availability-20261102.json). Synthetic readiness values are not the signed-in student's values. Local focused, syntax, typecheck and all eleven browser QA dependency-graph checks passed; unchanged local checks are reused rather than represented as fresh production evidence.

Earlier failed native runs remain failed:

| CI run | Native result | Finding and resolution |
| --- | --- | --- |
| 41470416028 | 396/397 | Practice selector did not mount. Source inspection separately found that session start removed the selection from the URL. Both were corrected. |
| 41473477683 | 395/397 | The header target still missed Practice, and expanded enlarged-text checks exposed word splitting. The shared header mount and scoped word space/wrapping were corrected. |
| 41476102261 | 395/397 | Practice navigation mounted and whole-word checks passed. An ambiguous readiness locator matched both radio options; a higher-specificity shared heading rule caused document overflow. The named radio and scoped rem-based heading rule fixed these remaining failures. |

All three earlier unit suites passed 1,649 checks. Their failures were resolved by fresh source checks, with no gate removal or relabeling.


## Open availability observation and automatic read result

The first post-release topics visit displayed “Չհաջողվեց ստուգել բաժինների հասանելիությունը։”. One normal reload restored the six-link selector. Read-only gateway logs for16:30–16:35UTC include a `get-student-classes` HTTP401 at16:30:37.320 and subsequent HTTP200 responses. Browser request IDs were not captured, so this timing does not prove a request-level correlation or a token/session cause. Multiple Supabase-client warnings were visible, but no causal link was established. UX-STUDENT-ACCESS-01 remains open in the single defect register; no authentication workaround, retry loop or policy change is included.

Automatic [English Unit 3 read41480624659](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41480624659) verified the exact production revision, then failed with3/4 top-level checks passing because existing isolation passed51/54: three denial probes returned401 instead of their required403. All six positive QA identities and positive own-school controls passed; all six run-owned sessions closed with HTTP204. The artifact, failed probe labels, timings and trace/provider request IDs are retained in the receipt. This failed run remains failed and does not confer fresh English Unit 3 or full hosted-read acceptance. Canceled automatic runs are not counted as passing. Existing unchanged source-equivalent acceptance remains bounded historical evidence. The shared frontend correction is verified separately by the required PR/main gates, seven exact assets and the successful live chapter checks above.

## Release and remaining acceptance

The owner explicitly authorized deployment after the verified draft was reported. The existing production candidate is `dpl_DfYQz7j3auMYa39Rk8L9iJQKbJKM`; the canonical alias was observed retaining baseline main while native/aggregate checks were pending. The separately attested Production/Blocking `Platform release checks` configuration is reused from the [2026-10-20 configuration receipt](evidence/vercel-deployment-check-verification-20261020.json); this is not a fresh settings audit or a failure-injection test. No alias or promotion override is used.

Canonical `release.json` names functional main `a4e7d7096df7f20607ce14ce95156754a4530eb1`; the canonical alias points to the candidate above and all seven changed served files exactly match reviewed source. The fresh signed-in topics page has six chapter links and zero future cards; its Chapter VI link opens the exact selected context, with Diagnostic available and Practice/Mastery/Review still waiting for that chapter baseline. No new assessment was intentionally started, answered or submitted in the live walkthrough; no mark, feedback, permission or account-setting change was made. Ordinary page views may emit telemetry. The existing unfinished Diagnostic was preserved. Production Practice was not started to test URL retention; isolated coverage supplies that evidence.

All 45 capability mappings and prior content/audio, classroom-speaking, English C47, four-subject and independent SEC-AAL/URL-P1/MASTER-P2 gates remain. Technical correction does not grant owner usability acceptance. Aligned closure documentation records the delivered scope; the Notion map is synchronized only after the documentation source is merged and verified; B.12.3/B.12 remain open and subjects paused.
