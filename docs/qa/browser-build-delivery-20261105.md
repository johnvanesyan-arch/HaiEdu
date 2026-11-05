# BF-06 — verified browser delivery and retained QA findings

Date: 5 November 2026. Functional main: `e25cebe257054041e1aaa82d7367f03b453d9d6f` ([PR414](https://github.com/johnvanesyan-arch/HaiEdu/pull/414)). This documentation-only record closes the bounded BF-06 implementation and technical verification; its own final PR/main checks and canonical documentation commit are recorded in the delivery PR and Notion sync. Owner usability, independent review and the separate transport investigation are not closed.

## Delivered behavior

PR409 pins all 33 former floating-CDN imports to the existing local SDK version and reuses the intended page client. PR410 compiles all 29 pages to content-hashed JS/CSS/fonts, preserves lazy role loading and retains 119 archived assets (about 1.63MB). HTML revalidates, metadata is no-store, and only hashed assets receive immutable caching. The current build is `1b2a2a8183caa8e581c44bc4f642ce797f4d3511cae944c67c31aedd7a58ed57`. PR411 corrects two supplemental QA checks that had compared compiled HTML with raw templates. PR414 adds privacy-safe resource-request diagnostics; it does not change application code, database, Edge, Auth settings or grading.

All five PR414/main CI jobs pass: **1,740 unit/integration and 455 native browser tests**, zero failures/skips/cancellations. The native suite includes actual compiled entrypoints and isolated signed-in clients, HTTP cache checks and two-version delayed imports with unsaved input across forward deployment and a newly deployed rollback. [PR CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42011524917) · [Main CI](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42012852929).

Canonical release identity brackets exact readback of the manifest and compiled Home/Admin/privacy pages with expected cache headers. Full production preflight checks the manifest, all 29 pages and 119 hashed assets, including both font binaries. The earlier complete byte readback and unchanged runtime/archive/build configuration are reused explicitly; a Vercel READY state alone is not the release criterion.

## Production acceptance and provenance

All five automatic PR414 production suites completed successfully on unchanged main. The selected coverage below contains **13 suite scopes, 2,024 main assertions and 864 isolation controls**. Five executions are fresh on e25cebe2; eight reuse verified unchanged source (seven from 80d05455, teacher feedback from c9c1632). This is not represented as one fresh thirteen-suite run on e25cebe2. Prior repeated passing mobile/English executions are retained but not double-counted. Application, archive, backend, build configuration and common isolation/preflight sources are byte-identical across these checkpoints; the changed resource/feedback runners each have their own successful corrected execution.

| Scope | Run | Actual source | Main | Isolation |
| --- | --- | --- | ---: | ---: |
| Chapter II pilot authenticated read-only production acceptance | [41994612270](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41994612270) | `80d05455` | 91 | 54 |
| Chapter V pilot authenticated read-only production acceptance | [41994612285](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41994612285) | `80d05455` | 191 | 54 |
| Chapter IV pilot authenticated read-only production acceptance | [41994612304](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41994612304) | `80d05455` | 155 | 54 |
| Sprint 14D authenticated production analytics acceptance | [41994612333](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41994612333) | `80d05455` | 10 | 0 |
| Chapter VI pilot authenticated read-only production acceptance | [41994612389](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41994612389) | `80d05455` | 324 | 54 |
| Sprint 14 authenticated actions | [41994612446](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41994612446) | `80d05455` | 206 | 108 |
| Chapter III pilot authenticated read-only production acceptance | [41994612465](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/41994612465) | `80d05455` | 123 | 54 |
| 16.5B.11 teacher feedback production read acceptance | [42003567595](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42003567595) | `c9c1632d` | 87 | 108 |
| mobile-read-acceptance | [42012852728](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42012852728) | `e25cebe2` | 84 | 108 |
| English Unit 2 provisional pilot authenticated read acceptance | [42012852806](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42012852806) | `e25cebe2` | 142 | 54 |
| English Unit 3 provisional pilot authenticated read acceptance | [42012852807](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42012852807) | `e25cebe2` | 154 | 54 |
| 16.5B.12.3 cross-role usability and recipient delivery verification | [42012852861](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42012852861) | `e25cebe2` | 327 | 108 |
| English Unit 1 provisional pilot authenticated read acceptance | [42012852866](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42012852866) | `e25cebe2` | 130 | 54 |

The fresh resource run passes 327/327 plus 54 before/54 after isolation. All run-owned cleanup is acknowledged: 2 resources withdrawn, 4 resource assignments cancelled, 2 writing assignments cancelled and 2 custom deliveries cancelled. All six main Auth sessions close with 204. Private teacher drafts, pinned PDF sources and immutable audit remain under the established retention contract. No existing learner answer/session recovery write is repeated.

The new request diagnostics contain 149 unique trace records, 149 validated provider IDs and the unchanged 25,000ms deadline. Metadata fields/actor/endpoint allowlists were checked; credentials, bodies, account/session identities and raw errors are not included in the sanitized receipt. The original one-request behavior and response/cleanup semantics remain unchanged. Failure-category counts in this successful execution: `{}`.

## Failures remain failures

The original compiled-build resource run 41994612320 (5/6) and feedback 41994612346 (4/5) stopped before sign-in at supplemental raw-template expectations. PR411 fixes their QA-only cause. Resource 42003567660 attempt 1 remains failed 254/255: provider evidence confirms a separate browser's global logout revoked the same designated QA account; five sessions closed 204, and the sixth was confirmed absent after its cleanup 403. Attempt 2 remains failed 110/111 at HTTP0 with all owned cleanup and six 204 session closures. That old wrapper discarded the error, so its exact transport cause remains unconfirmed. A later pass does not close QA-TRANSPORT-01/BF-37 or retroactively execute missing assertions. [Retained investigation](resource-qa-diagnostics-20261105.md) · [Sanitized receipt](../evidence/browser-build-delivery-20261105.json).

## Limits and next item

The isolated Home comparison measured cold requests 55→44 and compressed bodies 243,648→219,106 bytes; warm requests 55→2 with zero response-body bytes in both variants. This is synthetic browser-cache evidence, not WAN/CDN latency or all-role usability. [Measurement](../evidence/browser-build-cache-20261105.json).

On the current Hobby plan, open-tab continuity depends on the append-only archive. Rollback means a new tested deployment preserving the archive union; Instant Rollback to an older deployment is not covered. [Build and rollback procedure](browser-build-20261105.md). No paid feature or database recovery is implied.

BF-07 is next: measure learner read duplication and teacher navigation, then coalesce only overlapping equivalent requests with account/context invalidation and fresh server authorization. It is not implemented by this delivery. BF-02 remains explicitly deferred; BF-01 independent review, BF-03 replacement-account/evidence decisions, BF-04/BF-05 owner usability/coverage and other content/security gates retain their scope.
