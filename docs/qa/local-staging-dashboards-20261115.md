# BF-21 — real dashboards in owned local staging

The owner authorized the next bounded BF-21 slice: real student, teacher and school-admin dashboards with fictional schools, correct data separation and sign-out checks. This extends [stage 1](local-staging-20261115.md); assessment/file journeys and hosted adoption remain separate. Local qualification passed on 15 November 2026; exact-head CI and merge approval remain pending.

## What changes

The runner now serves the actual compiled dashboard documents instead of the stage-1 handoff placeholder. One browser context visits School A then School B for each of the three roles, using the existing sign-in and sign-out controls. It checks student course/unit selection, teacher class navigation and roster, and administrator teacher/class counts and analytics refresh. Foreign-school profiles, classes and selected dashboard contexts must be refused or absent.

For one account per role, a second real tab signs out while an actual successful dashboard response is held. Releasing that original response must not restore private content. Reopening the former private page must remain signed out, and a request with the retained old local token must be refused by the server. Tokens remain private in memory and are never included in receipts.

The disposable fixture contains two fictional schools, six accounts and two subjects/grades. Its navigation-only curriculum includes synthetic source and gate records so it can exercise the normal draft-to-pilot constraints without disabling triggers. These records are explicitly fictional; they do not approve any actual source, curriculum or learner release. There are no questions, scoring/model bindings, assessment attempts or learner sessions. The dashboard shows the existing unavailable-assessment state.

## Local runtime and target controls

Eleven reviewed repository services are bundled offline, using the fixed [registry](../../tests/fixtures/staging-services.json). The gateway permits only `list` for the academic-year and staff-invitation management services. One digest-pinned Edge Runtime creates separate workers for the registered function directories; callers cannot select arbitrary paths or upstreams. The gateway inspects a clone and forwards the original unread request, preserving the pinned runtime's required transport metadata.

Application function source is unchanged. Explicit SDK 2.57.4 imports retain that exact version through a development-only npm alias; bare major-2 and explicit 2.118.0 imports use the existing 2.118.0 pin. Every bundle/input and runner file is hashed. These local adapters do not certify hosted runtime parity or close BF-36.

The browser gets a separate generated local configuration. Teacher entry bundles are rebuilt after that rewrite, then all pages are compiled and their served asset hashes verified before sign-in. Browser requests permit only the exact owned frontend/backend origins, refuse redirects and block service workers/WebSockets. Function fetches remain restricted to the owned gateway. The existing ownership, loopback and cleanup checks remain intact. These are controls for reviewed code, not an operating-system sandbox for untrusted code.

Production source behavior is unchanged. The additional development dependency updates the browser build identity because the manifest hashes both package files; all 127 browser asset byte hashes remain identical. The new current/archive manifests are committed according to the existing build policy.

## Verification

The [sanitized local receipt](../evidence/local-staging-dashboards-20261115.json) records **28 passing browser/service check groups across all six accounts**, including three cross-tab delayed-response checks. All **1,853 code tests** pass with zero failures/skips/cancellations, including six target/gateway controls. The setup-redirect control, type checking, core/teacher bundle parity, web asset/archive checks, favicon/font checks and production QA dependency audit pass. The receipt's runner hashes match the tested files; it identifies the base commit, not an already committed release.

Nine rendered views were inspected: each role's Home at desktop width, phone width and 200% root text size. This is a bounded visual observation of synthetic data, not a redesign or complete accessibility/usability certification. Private screenshots and runtime troubleshooting logs stay outside Git. The known empty/unconfigured assessment and marking states are covered; populated work belongs to later slices.

The existing required PostgreSQL CI job runs the expanded journey. All five required jobs remain in the release aggregate. The fresh-baseline and forward-update controls remain unchanged. The run finished with zero open auth sessions, zero rate-budget rows, zero learner sessions/attempts and confirmed removal of its owned containers/network and temporary credentials.

Production QA not run (paused by owner). Affected production QA: none. Application behavior, production QA scripts and their pause guards are unchanged. Owner usability acceptance: not given.

## Remaining boundaries

This slice does not test assessment completion, file upload/download, populated marking queues, every dashboard filter or master/content-admin workflows. It does not migrate the 21 credential-bearing QA workflows or prove exclusion of synthetic rows from hosted reports. No hosted project is converted/reset; `haiedu-bf16-test` is preserved. Production databases, functions, settings and Cloudflare are untouched. BF-21 remains open; BF-02 recovery is deferred, BF-22 is on hold, BF-16 limits stay off and paid stolen-password protection remains declined.
