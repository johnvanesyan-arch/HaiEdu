# Supplementary materials implementation — S45 / 16.5B.3

Implementation candidate, 2026-10-27. Release and final acceptance evidence are recorded separately after required checks and production readback. This document makes the approved S45 direction concrete; it does not close the four-subject 16.5C gate.

## Product and audience

`materials.html` is the student library, directly below My work in desktop/mobile navigation, with entry points from My work and the selected course. `resource-library.html` lets teachers and the platform content team author, preview, QA, publish, revise and withdraw optional resources. Teachers also have a selected-class/unit shortcut. All subjects use the same service and interface; no subject, grade, release or unit counts are hardcoded.

Students select an authorized course/unit and see purpose cards (Վարժանք / Ընթերցանություն), goal with description fallback, topic, provider, format, version, publication date and PDF size. Search covers title, goal, description and topic; purpose chips and disclosed topic/provider/format filters show an active count and reset control. Filtering retains search focus. Context changes reset filters and discard stale responses. Duration appears only when an author explicitly supplies 1–240 whole minutes; it is approximate. Teacher recommendation is an explicit boolean limited to that teacher's selected class. No completion, grades, activity tracking, rewards or autoplay are added.

## Delivery contract

- Formats: PDF up to **5 MiB (5,242,880 bytes)** and external HTTPS links. Links reject credentials, nonstandard ports, IP/internal destinations and HaiEdu/Supabase hosts. The server does not fetch external sites.
- PDFs use a new private `supplementary-materials` bucket with PDF MIME/size restrictions and no direct anonymous/authenticated object policies. Existing `learning-audio` and all assessment source tables remain separate.
- Authenticated multipart upload checks the actor/context before file inspection, bounds the request, verifies MIME and PDF header/EOF envelope, computes SHA-256, writes an immutable random object key and atomically attaches it after rechecking current permission and version. Failed attachment removes only the newly created object. No signed upload URLs or public file URLs are minted.
- Authenticated download checks current enrollment/class/programme/release/unit and publication before and after storage retrieval, verifies the stored digest/length, and returns `attachment`, `no-store`, `nosniff` and sandbox CSP. PDFs are downloaded, never embedded as active documents. Envelope validation is **not malware scanning**. Previously downloaded files cannot be recalled; withdrawal prevents subsequent authorized delivery.
- External links open through an explicit destination dialog with `noopener noreferrer`. No protected bank answers, stimuli, recordings or source registrations are selectable. Providers must confirm both usage rights and assessment-safe content; the platform reviewer checks the actual material.

## Authorization and lifecycle

The new service reuses the existing live-session, student-learning-context and teacher-written-context authorization checks, without modifying shared helpers. A teacher can manage only their own active assignment's resources in a current class/year/release. The student's exact current teacher assignment scopes teacher resources. Platform resources are scoped to a declared programme/release/unit and visible to all its authorized learners; only active admin/content_admin accounts can manage these. School administrators gain no content authority. Platform publication and withdrawal require the existing MFA/AAL2 flow. Teacher sharing is clearly labelled as teacher-provided and is not represented as platform-reviewed.

Metadata versions are immutable. QA is bound to the exact definition/file fingerprint. A new draft leaves the previous published version available; publication atomically supersedes it. Withdrawal removes the logical resource including a published predecessor while a draft is pending. Advisory/row locks serialize competing revisions/publications and repeat publication is idempotent. Audit events retain actor, assurance, timestamp, version and reason. RLS-enabled tables have no client privileges; only the authenticated Edge service can invoke the guarded RPC. There are no historical writes, student uploads or automatic approvals.

## Verification and limitations

Isolated tests exercise actual SQL and Edge code for teacher/platform lifecycle, MFA, cross-class/school denial, revocation, PDF digest delivery, orphan cleanup, revision conflicts, withdrawal during delivery and wall-clock expiry after lock waits. Native Chromium tests exercise the actual author/student pages, uploads/downloads, filters, stale-account response suppression, Armenian responsive layouts, enlarged text and reduced motion. The existing required platform CI and release checks remain mandatory.

The final dashboard review must trace all 45 capability mappings and preserve the dependencies of S31–S44. The available Physics/English flows can be accepted technically; **the original four-subject 16.5C criterion remains open** until the other subjects are genuinely available. English content remains paused after C47.
