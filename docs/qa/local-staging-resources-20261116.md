# BF-21 — local material assignments and recipient isolation

John requested this test on 16 November 2026. The new owned local journey passes 41 browser/service groups and eight independent private-storage checks. The change is merged and verified in owner-approved [PR504](https://github.com/johnvanesyan-arch/HaiEdu/pull/504) at `72d0ec60eb0af17c06e62f76299d3b8e2ebec324`; exact release evidence is below. No application implementation, production service or hosted setting is changed.

## What was exercised

Ten fictional accounts span two schools and two distinct subjects/programmes. Each school has a teacher, school administrator, selected student, unselected classmate and student in another class. Real local Auth, PostgreSQL, PostgREST, Storage and the pinned Edge Runtime serve the original compiled pages and unchanged repository handlers. The fixture adds memberships, invitations and enrollments through intact constraints; it does not disable triggers or copy live data.

Teachers use the actual class page and resource library to upload a synthetic PDF, pass the material checks and publish it. Publication creates no assignment. Teachers then send selected-student and whole-class assignments. The recipient preview contains exactly the two eligible students in that class. Two immediate clicks emit one request; two concurrent identical retries return the same saved assignment, while changed instructions under the same request ID are refused. Reloading retains the saved assignment.

Selected students see their task and instructions in My work, download exact PDF bytes and retain access after reload. Unselected classmates cannot read or open that selected assignment. Whole-class assignments reach both eligible classmates, while another-class and another-school accounts cannot access them. The combined My work response agrees with the assignment-specific inbox. Incorrect roles, forged enrollment/context identifiers, direct privileged RPC calls and missing, malformed or revoked sessions are refused.

The class library and assignments are deliberately distinct: publishing a teacher material makes it optional reading for the teacher's class. An unselected classmate can still see and download that class-library material, but cannot see the selected assignment or its instructions. Selected delivery does not turn an already published class-library file into a private one-student file. Students from another class or school remain excluded.

Teachers cancel the selected assignment through the original page; repeating cancellation does not add another event. The student retains its history, cannot download the canceled assignment, and can still use the separate whole-class assignment. Teachers then withdraw the material through the original page. The remaining task displays that the material is unavailable, and both assignment and library download routes refuse it. Downloading a material does not create a submission or completion result.

## Independent checks and cleanup

Database inspection verifies four assignments, six exact student/enrollment recipient bindings, two cancellations, two withdrawn material versions, two private objects, and the expected creation/publication/cancellation events without duplicates. Every row retains the intended teacher, class, school, programme, release and unit.

The parent reads the exact private object paths and first proves both files exist with the expected bytes and hashes. Anonymous public downloads and direct authenticated student downloads of those existing objects are then refused. These eight checks use only the owned local provider. Their temporary sign-in sessions are closed.

All ten browser accounts sign out; zero Auth sessions, learning sessions, assessment attempts and rate-budget counters remain before teardown. The runner verifies browser shutdown and removes its own containers, network and temporary credentials. Screenshots of the unavailable-material state at 390px and 1365px were inspected; this is a narrow visual check, not general responsive or owner usability acceptance.

The initial exploratory run passed teacher publication and selected delivery, then stopped because the new test tried to use a sign-out button on the library page. The test now returns to the real role dashboard before signing out and opens the material-management disclosure before withdrawal. Product code is unchanged. The corrected complete resource run passed. After adding direct foreign-library checks, a later run alongside another local test stack stopped near its end: Edge Runtime reported OS error 28, `No space left on device`, while creating a temporary worker directory, producing HTTP 502. The additional boundary assertions had passed. Both environments were removed; the unchanged strengthened resource test is qualified separately on its own. The failures are retained privately and identified by hash in the receipt; no failure is ignored or changed into a pass. Concurrent local-stack capacity is not qualified.

## Running and integration

```sh
python scripts/run-local-staging.py --journey resource-assignments --evidence-dir /tmp/haiedu-resource-assignments-evidence
```

Use the prerequisites in [the local staging guide](local-staging-20261115.md). The `two-school-resources-v6` fixture remains bound to the parent-owned origins, source and browser build. The fixed service registry now bundles 31 unchanged repository functions, adding the two resource services. The local gateway allows only the reviewed private PDF path shape, retains caller authorization and refuses redirects; the private server key is never passed to the browser. Existing ownership, method, body-size and destination checks remain in place. The new journey is added to the required PostgreSQL CI job, retaining the five-job release aggregate.

All **1,857 code tests** pass with no failures, skips or cancellations. The 41 resource groups and all 109 retained groups (28 dashboards, 25 assessment/files, 21 Mastery and 35 writing/audio) pass: **150 local browser/service groups and five verified cleanups**, plus eight independent private-storage checks. Ten gateway/target controls, the setup-redirect control, typecheck, teacher-bundle parity, web asset/archive integrity and production-QA dependency coverage pass. The [sanitized receipt](../evidence/local-staging-resources-20261116.json) preserves source hashes, component pins, assertions, cleanup and the distinction between exploratory failure and passing qualification. Earlier retained runs differ only in an unused resource-journey helper before its final direct-library assertions; their executed journeys and all 31 service bundles are unchanged. Exact PR-head and merged-source CI also pass, as recorded below.

## Boundaries

This is a fresh local browser/service test using fictional data. It does not establish hosted acceptance, classroom capacity, curriculum quality, owner usability acceptance or complete migration of existing QA workflows. This slice covers PDF material creation and assignment; external-link resource delivery, further formats/multi-skill boundaries, hosted adoption, migration of 21 credential-bearing QA workflows and synthetic-report exclusion remain open.

No product/browser implementation, schema migration, package pin, hosted test project or production setting changes. Production QA not run (paused by owner). Affected production QA: none. BF-16 stays off, BF-02 recovery stays deferred, BF-22 stays on hold and paid stolen-password protection stays declined.

Owner usability acceptance: not given. Wider BF-21 remains open. The owner approved publication and merge of this delivery.

## Release verification

The owner approved publishing and merging the 17 reviewed files, explicitly sanctioned publication of the roadmap with its existing public history, and confirmed merge coordination. Approved head `5bcf8923b987702bf10b38daf88c371e8e739df8` and merged commit `72d0ec60eb0af17c06e62f76299d3b8e2ebec324` preserve tree `d8ef6f3742c3903dd0a6f649aa52e145f3f7177c`. All five required jobs pass in [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43872336017) and [merged-source CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/43874007734). Both runs contain 1,857 passing code tests, 702 passing browser checks, all 150 expected local journey-group labels, five owned cleanups and the independent private-storage verification. Code/browser suites have zero failures, skips or cancellations. Run attempts and exact job identities are preserved in the receipt.

Twelve fresh public static checks at `2026-11-16T13:27:05.196Z` verify the merged source, exact asset manifest, representative account-access HTML/JavaScript hashes, MIME, cache rules and enforcing security headers on `haiedu.am`, `www.haiedu.am` and `armenian-mastery-platform.vercel.app`. The unchanged 29-page/127-asset product build retains identity `c3ae02a735bcb7cf7acc1cf3176dca72b5c85c61009ab855c9b965b647c0740a`. Normal Git integration updated the site. Only static files were requested; no page scripts, sign-in, Supabase requests or production QA ran. No manual promotion or hosted setting change occurred.

This is local PDF workflow qualification, not hosted student acceptance, parallel-stack capacity certification or closure of wider BF-21. Earlier manual production-QA access-precheck failures remain separately recorded in [the Mastery delivery](local-staging-mastery-20261116.md#earlier-production-qa-failures). This task does not investigate or claim to resolve those failures.
