# Sprint 14D — School-scoped performance analytics

## Status

Implementation is in [PR #62](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/62). GitHub CI #954 passed the full repository suite, TypeScript, browser syntax and institutional concurrency checks. The JWT-protected `get-school-performance-analytics` Edge Function v1 is active and its three deployed files exactly match the reviewed source. Authenticated production browser acceptance remains open and is not claimed by this checkpoint.

## Purpose

Activate the School Admin analytics area using real institutional evidence without changing the teacher analytics contract or introducing cross-school, cross-subject or legacy-evidence leakage.

## Authorization boundary

- The endpoint requires a valid user JWT and a live Auth session.
- An active School Admin can request only a school covered by their current `school_admin` institutional membership.
- A platform admin requires AAL2 and must select an existing school.
- Requested academic year, subject programme and class identifiers are validated inside the authorized school before any evidence is loaded.
- The response contains aggregate counts and rates only. It returns no student names, email addresses or identifiers.

## Evidence boundary

Only `learning_sessions` rows that satisfy all of the following enter the aggregate:

- `school_id` matches the authorized school;
- `academic_year_id` matches the selected year;
- `institutional_class_enrollment_id` belongs to a current enrollment in the selected scope;
- `academic_context_status = 'exact'`;
- optional subject-programme and class filters match the stored session context.

`unbound_legacy` sessions are excluded. No evidence is inferred from a profile role, subject label, class name, code prefix or client-controlled identifier.

## Metric definitions

| Metric | Numerator | Denominator | Empty-state rule |
| --- | --- | --- | --- |
| Participation | Distinct enrolled students with at least one exact-context session | Distinct enrolled students in scope | `null` rate when no students are enrolled |
| Diagnostic completion | Distinct enrollment contexts with a completed diagnostic | Active enrollment contexts in scope | `null` rate when no enrollment contexts exist |
| Diagnostic answer accuracy | Correct answers across completed diagnostic sessions | Answered questions across those sessions | `null` when no diagnostic answer exists |
| Mastery pass rate | Distinct enrollment/release/unit contexts with a passed completed Mastery Check | Distinct contexts with any completed Mastery Check | `null` when no Mastery Check context has completed |
| Chapter Review | Completed Chapter Review session records tied to exact-context learning sessions | Count only; qualifying and learner counts are shown separately | Zero is shown as a count, not a fabricated percentage |

Duplicate rows are de-duplicated by stable row ID before aggregation. A Mastery Check context is keyed by enrollment, curriculum release and unit so retries do not inflate the denominator.

## School Admin interface

The existing overview location now contains:

- academic-year filter;
- subject-programme/grade filter;
- class filter;
- participation, diagnostic, mastery and Chapter Review cards;
- responsive progress indicators;
- explicit empty/no-evidence messages in natural Armenian;
- a manual refresh control.

The board does not render demonstration percentages. A missing denominator is shown as unavailable rather than `0%`.

## Verification gates

- Pure aggregation tests cover deduplication, honest denominators, weighted diagnostic accuracy, Mastery context rates, Chapter Review linkage and empty states.
- Endpoint tests cover authorized-school success, cross-school denial and AAL2 enforcement for platform admins.
- Static contract tests require exact school/year/enrollment evidence filters and reject Physics-specific coupling.
- Existing school overview tests require the activated analytics board and its three filters.
- Full repository CI, Supabase deployment readback, unauthenticated denial and authenticated production browser QA must pass before 14D is called complete.

## Exclusions

- No cross-school benchmarking.
- No cross-subject ability score.
- No historical-year rollover semantics beyond explicit year scoping; those belong to Sprint 18.5.
- No teacher recommendation or intervention workflow changes.
- No curriculum release, learning threshold or assessment-rule change.
