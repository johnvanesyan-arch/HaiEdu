# 15B.12E — connected acceptance and live release gate

This slice connects the actual course workspace, Edge handler bodies, shared context/router code and governed SQL transactions in disposable fixtures. It also fixes the shared student dashboard's malformed UUID validator, which rejected standard enrollment/release/unit UUIDs. The correction applies to every governed subject/grade/class context using that API.

The isolated matrix contains two chapters in each of two programmes, two schools and Grades 7 and 8. Three contexts declare three-question assessments; the fourth declares five questions and a separate lifecycle policy. Assessment lengths and 80%/60% pass thresholds are synthetic fixture contracts, not approved production criteria.

| Acceptance | Connected evidence |
| --- | --- |
| Exact authorized navigation and selection | Four contexts; school, class, grade, programme, release and chapter identities resolved server-side |
| Baseline and practice access | One original form and baseline per chapter; any completed baseline unlocks only that chapter; blocked actions create no evidence |
| Delivery and scoring | Stable served item/options and resume; assessment feedback withheld; practice pool membership, authored help and duplicate-answer atomicity |
| Mastery and review lifecycle | Three failed attempts with intervening required reviews; final voluntary reviews; a separate passed chapter with optional reviews |
| Historical contracts | Original session policy/build/model/release IDs; bound practice resumes after prospective blueprint retirement |
| Tenant and session denial | Foreign ownership, mixed selectors, draft/retired releases, malformed UUIDs, invalid credentials and SQL Auth-session revocation |
| Analytics readback | Actual teacher class analytics loader reads the same SQL evidence and frozen versions; shared School/Master aggregate separates original contracts |
| Native browser | Actual course HTML and workspace/player scripts call the compiled Edge bodies over local HTTP and execute real PGlite transactions |

Node acceptance runs with PGlite locally and with independent PostgreSQL 17.6 in required CI. Native Chromium runs the connected browser journey with PGlite. Edge TypeScript bodies are compiled into Node VM handlers; this is not a deployed Deno-runtime test. Auth.getUser uses a fixed synthetic credential registry; the actual Auth-session helper and SQL session gate run, but Supabase JWT verification, login, MFA and production PostgREST are not reproduced. The fixture substitutes an empty legacy class-label entitlement list; authorized navigation is the actual SQL API. Teacher analytics use the real loader after an authorized context is supplied; existing role authorization/browser and live two-school workflows remain separate evidence. No production credentials or content are used by these tests.

The retained policy/session, runtime and dashboard suites additionally cover baseline identity across releases/years/programmes, immutable bindings, chapter-wide unused-question review coverage, capability rejection, locks and concurrent revocation/answer/finalization. Required CI retains all five jobs, native Chromium, both PostgreSQL jobs and aggregate Platform release checks.

Production currently has one authorized pilot release, one historical legacy release and one draft candidate. The draft has no runtime blueprints. Full 15B.12E remains open until a second authorized release exists and authenticated governed learner switching can be exercised live. No content activation, assessment approval, historical reset or release-gate override is part of this slice.

Implementation/release verification will be appended after required PR/main checks, deployed bundle parity and persistent Production / Blocking verification pass.
