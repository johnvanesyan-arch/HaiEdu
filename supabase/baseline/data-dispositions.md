# Structure, technical defaults and data are separate

| Material | Fresh baseline treatment |
| --- | --- |
| Application table/function/view/security structure | Recreated and compared with the reviewed catalogue. |
| Four subject-neutral actor-rate policy rows | Installed by `technical-seed.sql` from the unchanged reviewed BF-16 defaults, also confirmed by a read-only lookup. This does not enable middleware enforcement. |
| Auth users, identities and sessions | Empty. Actual local GoTrue migrations create provider tables; qualification creates only synthetic accounts through Auth. |
| Schools, memberships, classes and enrollments | Empty. Creating a real school or first privileged operator requires its existing governed provisioning process. |
| Subjects, grades, question banks, templates, textbooks and releases | Empty. Historic content migrations are not replayed; no learner release or source-rights approval is inferred. |
| Learning models, policies, calibration contracts and runtime bindings | Empty. These are versioned governed records, not generic setup defaults. Production binding timestamps, release IDs and deployed-function manifests must not be copied to another environment. |
| Learner work, assessment evidence, attempts, reviews and audit history | Empty. Rebuilding structure does not restore these records. |
| Storage buckets and objects | No production buckets or files copied. The actual Storage service creates its provider schema. Qualification uses one temporary private bucket/object. |
| Secrets, SMTP, bot protection and provider administrative settings | No live values copied. Isolated tests use generated credentials and a local mail catcher; they do not test Cloudflare or Gmail capacity. |
| Scheduled counter maintenance | Function and health view present; no job scheduled. Explicit installation and observation are a separate environment operation. |
| Original 218 production migration records | Preserved in production. The source/history crosswalk is evidence only; no ledger insertion, rename, repair or mark-applied action. |
| Future database updates | Add separately reviewed entries to `supabase/updates/plan.json`; preserve the baseline and historical directory. The local bridge checks exact starting/resulting structure, required data and existing rows. Its current list is empty. Any future baseline replacement or hosted adoption needs a separate reviewed plan. Automatic production push remains disabled. |

The 208 historical source files and one archived production-only operation are fingerprinted in `manifest.json`. CI refuses their alteration or unlisted additions. New update files use the separate forward list; both the starting reconstruction and committed future-update plan are exercised in owned local databases. The static [historical inventory](../updates/historical-data-inventory.json) identifies review targets without executing SQL or proving data-effect completeness.

This package provides a reproducible starting structure and local acceptance fixture. It does not produce a populated school, restore student records/files, prove every historical data effect, or close the separately deferred BF-02 recovery requirement.
