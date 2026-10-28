# B.12.1 — Student-safe sharing previews

2026-10-29 Asia/Yerevan · Implementation/verification in progress. B.12 remains open.

## Bounded sequence

B.12.1 delivers the learner-view material/assignment preview and restrained disclosure/receipt motion. B.12.2 profiles and repairs PERF-02, then remeasures Home/detail/unit and paired response-opening budgets without weakening authorization. B.12.3 completes cross-role/recipient journeys and final owner usability acceptance. All 45 mappings, DEMO-01, WRITE-CREATE, RESOURCE-SUBMIT, English C47 pause and full four-subject 16.5C gates remain. These are delivery subdivisions of the already accepted B.12 scope; no subject work resumes before the workspace exit.

## Preview contract and teacher procedure

- A teacher selects the authorized class/unit and a **published, QA-passed** material. `Աշակերտի տեսքի նախադիտում` performs the existing teacher-authorized `get` read, rechecks current publication/fingerprint and opens a labelled dialog. It shows the same learner material card used by the student library. Draft/withdrawn/superseded versions cannot claim this preview. An unsaved teacher edit is retained without a discard prompt; the dialog explicitly shows the published saved version. Existing teacher file inspection is separate; this preview shows the student-facing card, not embedded PDF bytes or assessed content.
- In the recipient composer, expand `Նախադիտում․ ինչ կտեսնի աշակերտը`. The shared learner assignment card reflects the exact material version and current instructions, with the same visible class/subject/unit/school fields the learner receives. It does not show the recipient list/count, editorial source/rights/QA/storage details or protected answers. The teacher's name and assignment time are explicitly deferred until actual sending; no receipt/date/assignment status is invented.
- Preview buttons for opening/downloading are visibly inactive and carry no delivery selectors. There is no learner impersonation, enrollment selector, new session, send, content mutation, file request, read/completion marker or grading action. The ordinary explicit recipient-confirmed send and protected learner delivery remain unchanged.
- The allowlisted `resource-learner-view.mjs` display projection and rendering are reused by the actual student library and My-work cards. Raw teacher/editor metadata is not serialized into the card. Display text is escaped. This shared presentation is subject/grade neutral; existing services remain the authority.
- Dialog Escape/close, initial heading focus and return to the invoking control are native. Context/account changes remove dialogs and ignore late results through existing lifetime/request guards. Assignment instructions update only the preview content, leaving the focused input and selected recipients intact. No preview is stored in browser storage.
- A brief reveal runs only for real disclosures, saved receipts and the preview dialog. Hover emphasis carries no progress claim. Reduced-motion preferences remove transitions/reveals; all status information stays in text. There are no fabricated completion counts, streaks or rankings.

## Shared consumers, API and validation

Affected consumers are the actual student optional library and My-work assignment cards; teacher library cards/editor, recipient composer and receipts; the shared resource page and their imported course/home consumers. School/master/reviewer capabilities and publication/MFA controls remain unchanged; the learner-view preview entry is teacher-specific. No SQL/Edge/schema/grant/privacy or scoring change is introduced. Current resource and assignment services retain final session/context checks, immutable receipts/version pinning, cancellation, withdrawal and private PDF delivery.

Focused unit tests check allowlist exclusions, escaped display text, equivalent material markup and absence of fabricated assignment receipt/open actions. Native actual-SQL/handler journeys cover published material preview, live instruction preview, zero mutation, current student receipt, Escape/focus, late context/account changes and 360/768/1280 px with 200% text and reduced motion. Dependency routing retains reviewed-main, designated-fixture, source-stamp and serialized cleanup controls. The existing resource acceptance is extended to check both previews before real run-owned sends and exact student PDF delivery; it preserves original resources and records cleanup.

Required PR/main CI, current-source production acceptance and source-byte evidence are pending. B.11's unchanged backend/content/audio evidence is reused. Native browser emulation does not claim actual-device or assistive-technology acceptance. Final B.12 owner usability and PERF-02 remain open.
