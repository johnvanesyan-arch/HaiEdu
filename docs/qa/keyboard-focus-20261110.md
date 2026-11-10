# BF-11 — learning and teacher-drawer keyboard focus

10 November 2026 · Asia/Yerevan · implementation candidate based on main
`75ceb79322e26706fdc485c55b34750cb5504434`. This records isolated candidate
verification, not a merged or deployed release or owner usability acceptance.

Source requirements: imported Claude QA findings **P2:X1 / P4:W1**, consolidated
as BF-11 in the [sequential register](https://app.notion.com/p/40d355a472bf8155a838c145acd61419).

## Reproduction

Two new native Chromium regressions failed against the original application:

- An accepted answer left the shared player's Next button unfocused after the
  answer controls were disabled.
- Opening the teacher's student drawer left the underlying workspace interactive.

The regressions then verify the complete keyboard journey, rather than accepting
the presence of a focus helper as proof of working behavior.

## Implementation and consumer coverage

`web/keyboard-focus.mjs` provides action-scoped focus handoffs and a drawer focus
controller. Both operate on the current document without additional requests or
persistent state.

| Consumer | Behavior |
| --- | --- |
| `learning-player.mjs` | All supported response types and all four learning modes move focus from an accepted answer to Next, then to the next question or completion heading. Initial asynchronous loading does not take focus. |
| `app.js` | The retained Home learning controller transfers focus after accepted answers and explicit Next actions. |
| `practice.js` | Legacy Practice and Chapter Review focus Next, the following prompt, the retry action after a failed read, and the completion heading. |
| `diagnostic.js` | Legacy Diagnostic focuses its next action, following prompt and final results heading. |
| `mastery.js` | Legacy Mastery handles next questions, stored results and the frozen final-answer result without adding a status read. |
| `teacher.js` | Both roster actions and matrix skill actions remember the actual opener. Tab/Shift+Tab stay inside the drawer while loading, after an error and after content loads. Close/Escape restores the opener; a removed or unavailable opener falls back to the page heading. |
| `ux.js` | Prompts are focusable without a competing live-region announcement. Existing feedback status regions remain. The teacher controller owns Escape; the redundant shared-UX Escape listener is removed. |

Focus handoffs stop when the user focuses or clicks elsewhere, the URL changes,
the owning view is detached, or the existing context/request guards reject a
stale response. Action listeners are removed on success, failure and cancellation.
The drawer makes only background siblings inert at each ancestor level; neither
the dialog nor its containing ancestors are made inert. Previous inert states
are restored exactly. Account and teacher-context transitions close without
returning focus to a stale opener.

The existing BF-04 immutable answer requests, unknown-outcome recovery,
duplicate-submission guards and saved results remain in use. This change is in
the subject-neutral browser core; it does not select a subject, grade, scoring
rule or curriculum policy.

## Verification

The dedicated native browser cases cover:

- keyboard-only two-question loops and completion in all four shared-player modes;
- real legacy HTML/controllers for Home, Practice, Chapter Review, Diagnostic and
  Mastery, with the normal role router and explicit synthetic shell setup;
- failed next-question reads and keyboard retry;
- initial-load focus, user focus/pointer choices during pending requests, and
  disposal while grading or loading the next question;
- drawer Tab/Shift+Tab, Close/Escape, repeated opening, retained background inert
  state, loading/errors, removed openers, navigation and account changes.

Identities, service responses and fixture data in these cases are synthetic.
The legacy fixture omits independent navigation-shell startup and supplies its
resolved layout class; it retains the actual role router, learning controller,
HTML, styles and shared UX. This is isolated browser evidence, not signed-in
production acceptance or physical-device/assistive-technology certification.

The full native suite passes **565/565**. The final dedicated BF-11 suite passes
**23/23**, including an additional pointer-choice case added after the full
suite had loaded that file. These counts overlap; they are not 588 distinct
journeys. No native test failed, skipped or was cancelled.

The full local unit/integration run executed **1,789 cases: 1,783 passed and six
failed** in the teacher-role VM because its import-stripping fixture omitted the
new UI-only drawer dependency. The fixture now explicitly stubs that UI boundary
and supports its dialog selector. The subsequent **31/31** teacher-role-boundary
cases pass with all authorization assertions unchanged. Native tests above use
the actual focus implementation. The original full-run failure is retained in
the receipt; required GitHub CI must run the complete corrected suite.

Typecheck, five-module core parity, teacher bundles, pinned browser SDK, hashed
build/archive, favicon/font provenance, all browser-QA dependency paths, public
email scan, browser syntax and whitespace checks pass. The candidate build is
`863e37a5527e99b027c2436b1fe8a4becd603c98935264e8e6de2bd12b22effc`:
29 pages / 123 immutable assets. All 30 retained releases and 328 archived files
pass integrity checks.

Exact run counts and build identity are recorded in the
[candidate receipt](../evidence/keyboard-focus-20261110.json).

Six explicit workflow path lists now include the new shared module. The complete
dependency checker retains main-only production workflows, exact-source and
designated-fixture guards, shared serialization and `queue: max`. The hashed
browser archive retains all earlier assets.

## Release boundary

Required PR checks, merge, canonical deployed-source verification and applicable
guarded production acceptance remain separate from this local candidate record.
No production QA workflow was dispatched for this candidate record. No Vercel
settings, backend runtime, database, account or learner record was changed.
John's final usability acceptance, B.12.3/B.12, BF-02's deferral, BF-37's retained
transport investigation and independent content/security gates remain open.
