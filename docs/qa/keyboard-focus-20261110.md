# BF-11 — learning and teacher-drawer keyboard focus

10 November 2026 · Asia/Yerevan. [PR454](https://github.com/johnvanesyan-arch/HaiEdu/pull/454)
is merged at `25377cf09e795ed65cc0305fcc167476fa510d77` with John's explicit
release approval. The canonical site serves the verified build. All 13 production
compatibility suites pass; owner usability acceptance is not given.
The implementation was based on `75ceb79322e26706fdc485c55b34750cb5504434`.

Source requirements: imported Claude QA findings **P2:X1 / P4:W1**, consolidated
as BF-11 in the [sequential register](https://app.notion.com/p/40d355a472bf8155a838c145acd61419).

## Reproduction

Two new native Chromium regressions failed against the original application:

- An accepted answer left the shared player's Next button unfocused after the
  answer controls were disabled.
- Opening the teacher's student drawer left the underlying workspace interactive.

Those regressions verify the complete keyboard journey after the fix.

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
the receipt. Both the corrected PR and merged-main GitHub CI runs pass the
complete suite, as recorded below.

Typecheck, five-module core parity, teacher bundles, pinned browser SDK, hashed
build/archive, favicon/font provenance, all browser-QA dependency paths, public
email scan, browser syntax and whitespace checks pass. The candidate build is
`863e37a5527e99b027c2436b1fe8a4becd603c98935264e8e6de2bd12b22effc`:
29 pages / 123 immutable assets. All 30 retained releases and 328 archived files
pass integrity checks.

Exact run counts and build identity are recorded in the
[verification receipt](../evidence/keyboard-focus-20261110.json).

Six explicit workflow path lists now include the new shared module. The complete
dependency checker retains main-only production workflows, exact-source and
designated-fixture guards, shared serialization and `queue: max`. The hashed
browser archive retains all earlier assets.

## Release and production verification

All five required jobs pass on candidate `423f0dd9d142264e57cf35dd6d2b43f9b4dd63d0`
([CI42762898750](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42762898750))
and merged main `25377cf09e795ed65cc0305fcc167476fa510d77`
([CI42764335673](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335673)):
**1,789/1,789 unit/integration and 566/566 native Chromium tests**, with no
failures, skips or cancellations. PostgreSQL 17, institutional concurrency and
the aggregate `Platform release checks` also pass. The merged tree is identical
to the approved candidate tree.

Vercel deployment `dpl_GnE3AWcSNzKP6rBDm3Xc23poP7z9` was built from that main
commit. It became READY before the required main checks finished; the custom
domains still served the previous release while those checks were pending.
After they passed, the custom domains moved automatically. No production configuration
or manual promotion was changed. The canonical `release.json` brackets exact
readback of the manifest, all **29 pages and 123 immutable assets**, including
their SHA-256 digests and expected cache policies. The browser build ID remains
`863e37a5527e99b027c2436b1fe8a4becd603c98935264e8e6de2bd12b22effc`.

All **13 automatic production compatibility suites pass**, freshly on the
functional merge: **2,052/2,052 main assertions and 864 isolation controls**. Their
main-only, exact-source, designated two-school fixture and shared-serialization
guards remain in place. Analytics run 42764335606 attempt 1 stopped in the
pre-authentication build check at 05:54:43 UTC: `assessment.html` differed just
after the release marker switched. It did not run signed-in acceptance or make
fixture writes, and uploaded no acceptance artifact. A later full canonical
readback passed; attempt 2 of the unchanged suite passes **10/10**. The initial failure
is retained separately from that rerun. The observation occurred during the
deployment switch; its exact propagation mechanism is not established.

Chapter IV run 42764335751 attempt 1 retained **105/106**, with its existing
read-isolation controls passing **54/54**. Its failed anonymous learner-dashboard
authentication probe recorded HTTP0 (no HTTP response). This is not an observed
authorization grant; the exact transport cause remains unconfirmed. The
artifact digest matches GitHub metadata. Attempt 2 of the unchanged suite passes
**155/155**, retaining its guards, deadlines and assertions.

| Production suite | Main assertions | Successful attempt |
| --- | ---: | --- |
| Chapter II pilot read acceptance | 91/91 | [run 42764335549, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335549/attempts/1) |
| Chapter III pilot read acceptance | 123/123 | [run 42764335564, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335564/attempts/1) |
| Chapter IV pilot read acceptance | 155/155 | [run 42764335751, attempt 2](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335751/attempts/2) |
| Chapter V pilot read acceptance | 191/191 | [run 42764335586, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335586/attempts/1) |
| Chapter VI pilot read acceptance | 324/324 | [run 42764336210, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764336210/attempts/1) |
| English Unit 1 pilot read acceptance | 130/130 | [run 42764336022, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764336022/attempts/1) |
| English Unit 2 pilot read acceptance | 142/142 | [run 42764335798, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335798/attempts/1) |
| English Unit 3 pilot read acceptance | 154/154 | [run 42764335913, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335913/attempts/1) |
| Sprint 14 authenticated action QA | 206/206 | [run 42764335686, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335686/attempts/1) |
| Sprint 14D authenticated analytics QA | 10/10 | [run 42764335606, attempt 2](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335606/attempts/2) |
| Teacher feedback production acceptance | 87/87 | [run 42764335745, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335745/attempts/1) |
| Mobile browser QA | 110/110 | [run 42764335838, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335838/attempts/1) |
| Resource assignment production acceptance | 329/329 | [run 42764335756, attempt 1](https://github.com/johnvanesyan-arch/HaiEdu/actions/runs/42764335756/attempts/1) |

All applicable tenant-isolation and run-owned cleanup checks pass. The receipts
enumerate 756 isolation assertions; Mobile preserves passing before/after
summaries of 54 each, for a further 108 controls. Resource acceptance confirms two
owned resource withdrawals, four assignment cancellations, two writing-delivery
cancellations, two custom-task cancellations and six main session closures with HTTP 204.
Mobile confirms four session closures with HTTP 204. These scoped QA results do not confer
owner usability acceptance.

The cloud workspace became unavailable after the first three signed-in suites
passed. GitHub metadata and decoded logs remained available. Short-lived,
one-vCPU, nonpersistent Vercel scratch sessions read only the redacted artifacts
from allowlisted file-service hosts, without production credentials or exposed
ports. All four sessions were stopped. A truncated response required compact
output; Mobile required its session-cleanup schema instead of a generic
resource-withdrawal assumption. These reader corrections repeated no production
suite. After the workspace recovered, Mobile's archive digest, both 54-control
summaries and four session closures with HTTP 204 were read back directly.

This documentation closure retains the functional runtime, browser build/archive,
backend, scripts, dependencies, workflows and production configuration. Its
signed-in evidence belongs to `25377cf09e795ed65cc0305fcc167476fa510d77` and is reused
only after Git comparison confirms identical runtime trees. The release marker
identifies the resulting documentation commit separately.

## Remaining boundaries

The new keyboard journeys are isolated native-browser evidence using synthetic
services. Production compatibility suites do not constitute a new manual
keyboard-only grading session or assistive-technology/physical-device
certification. Controlled production QA can create its own fixture records and
must retain run-owned cleanup; it does not authorize changes to learner records
outside those existing guards. No backend code, database schema, authentication
settings, scoring or curriculum release was changed for BF-11.

John's final usability acceptance, B.12.3/B.12, BF-02's deferral, BF-37's retained
transport investigation and independent content/security gates remain open.
