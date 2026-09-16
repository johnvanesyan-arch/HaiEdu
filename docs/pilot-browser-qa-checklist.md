# Sprint 11F Live Browser / Production Smoke Checklist

This checklist was originally the final operational gate for Sprint 10.5F. By product-owner decision, Sprint 10.5F is closed without executing this live authenticated matrix. The checklist is retained as a **Sprint 11F production/pilot smoke requirement** rather than a blocker to beginning Sprint 11.

Unchecked items mean **not yet executed in the relevant phase**, not failed.

## 11F.2 rendered-QA execution record — 2026-09-16

Sprint 11F.2 has been dispositioned as **complete via executed rendered QA plus explicit accepted tool-coverage limitations**.

Executed in a real rendered production browser:

- public landing/login and role-entry surfaces;
- public desktop, tablet-width and phone-width responsive layouts;
- public 200% zoom/text scaling and long-Armenian wrapping;
- public keyboard-accessibility surface checks;
- authenticated student Home, Physics 7, Progress, Practice, Diagnostic, Mastery and Privacy surfaces;
- authenticated teacher dashboard, class list, populated/empty class details, authorized student detail/progress, skill matrix and intervention signals;
- active Practice -> Diagnostic collision guard, with the existing Practice session preserved;
- rendered authenticated desktop SVG/progress/matrix elements inspected for legibility.

The following four authenticated repetitions were not executable with the available browser-automation controls. The product owner explicitly accepted them on 2026-09-16 as QA limitations/workarounds:

1. authenticated tablet/phone viewport run;
2. authenticated keyboard-only focus traversal;
3. authenticated 200% zoom/text-scaling run;
4. authenticated Firefox/Safari-class browser run.

These four entries are **accepted deferrals, not PASS results**. Their public/non-authenticated counterparts were exercised where applicable.

State-changing checks below — answer submission, hint/remediation progression, full Diagnostic/Mastery completion and other disposable-account workflow assertions — remain for **11F.3** and are intentionally not implied by 11F.2 completion.

## Desktop Chromium

- [x] Sign in and land on Home.
- [x] Left navigation shows Home / Physics 7 / Assessment / Progress.
- [ ] Home recommendation opens the correct active/recommended task. *(State-changing navigation/action to be covered in 11F.3 where needed.)*
- [x] Physics 7 Chapter I renders all 10 skills without confirmed Armenian clipping.
- [x] Start or resume one Practice question. *(An existing active Practice surface was rendered without answering.)*
- [ ] Keyboard focus is visible on answer controls, Help, Submit and Next. *(Accepted authenticated keyboard limitation for 11F.2.)*
- [ ] Hint 1 -> Hint 2 -> Worked Example remains functional. *(11F.3.)*
- [ ] Practice session remains bounded and does not freeze. *(11F.3.)*
- [x] Assessment hub clearly separates Diagnostic and Mastery Check.
- [ ] Diagnostic shows no per-item correctness feedback. *(11F.3 full Diagnostic workflow.)*
- [x] Progress page distinguishes Diagnostic / mastery-progress / Verified state.

## Desktop Firefox / Safari-class browser

**11F.2 disposition:** authenticated Firefox/Safari-class repetition explicitly accepted as a tool-coverage limitation; items below are not marked PASS.

- [ ] Home and all four primary navigation destinations load.
- [ ] One Practice question submits successfully.
- [ ] One assessment state loads correctly.
- [ ] Progress skill rows wrap correctly.
- [ ] SVG/scale stimuli remain legible.

## Tablet width (approximately 768–1024 px)

**11F.2 disposition:** public tablet rendering passed; authenticated tablet repetition explicitly accepted as a tool-coverage limitation.

- [x] Navigation does not overlap content. *(Public rendered pass.)*
- [x] Home cards do not clip. *(Public rendered pass.)*
- [x] Physics 7 skill rows remain readable. *(Public rendered pass.)*
- [x] Assessment cards stack/wrap correctly. *(Public rendered pass.)*
- [x] Progress summary and skill rows collapse correctly. *(Public rendered pass.)*

## Phone width (approximately 320–430 px)

**11F.2 disposition:** public phone rendering passed; authenticated phone repetition explicitly accepted as a tool-coverage limitation.

- [x] Four-item bottom navigation is readable and tappable. *(Public rendered pass.)*
- [x] Bottom navigation does not cover page content. *(Public rendered pass.)*
- [x] Device safe-area does not cover navigation/actions. *(Public rendered inspection; no blocking overlap observed.)*
- [x] No horizontal scrolling for Home, Assessment, Progress or question cards. *(Public rendered pass for available surfaces.)*
- [x] Practice question and answer controls fit in one column. *(Public rendered pass.)*
- [x] Diagnostic question fits in one column. *(Public rendered pass.)*
- [x] Long Armenian skill names wrap without overlap. *(Public rendered pass.)*

## Keyboard-only

**11F.2 disposition:** public keyboard-accessibility surface checks passed; full authenticated keyboard-only traversal was explicitly accepted as a tool-coverage limitation and is not represented as a PASS below.

- [x] Skip link appears on focus and moves to main content. *(Public rendered check.)*
- [x] Primary navigation is reachable in logical order. *(Public rendered check.)*
- [ ] Focus indicator is always visible. *(Authenticated traversal not executed.)*
- [ ] Radio answers can be selected by keyboard. *(Authenticated traversal not executed.)*
- [ ] Numeric/unit fields have accessible labels. *(Authenticated traversal not executed.)*
- [ ] Submit and Next are reachable and state changes are announced. *(Authenticated traversal not executed.)*
- [ ] No keyboard trap in focused Practice/Assessment routes. *(Authenticated traversal not executed.)*

## Armenian overflow stress strings

Check at 320–390 px and 200% text zoom:

- `Բնության ուսումնասիրության ֆիզիկական մեթոդները`
- `Ֆիզիկական մեծություններ, միավորներ և չափիչ սարքեր`
- `Չափման փորձի պլանավորում և անկանոն մարմնի ծավալի որոշում`
- `Գաղտնիություն և հաշիվ`
- `Աջակցություն է պետք`

Public 200% zoom / text-scaling and Armenian wrapping checks passed. Authenticated 200% repetition was explicitly accepted as a tool-coverage limitation.

- [x] No overlap. *(Public rendered pass.)*
- [x] No inaccessible truncation. *(Public rendered pass.)*
- [x] Buttons remain at least approximately 44 px high. *(Public rendered pass.)*

## Session collision regression

- [x] Active Practice is not replaced by Diagnostic. *(Rendered authenticated student check.)*
- [ ] Active Diagnostic is not replaced by Practice. *(Backend/source regression coverage exists; browser state not created during 11F.2.)*
- [ ] Active Mastery Check is not replaced by Practice or Diagnostic. *(Backend/source regression coverage exists; browser state not created during 11F.2.)*
- [x] Resume returns to the existing session. *(Existing Practice session remained available/preserved.)*

## Sprint 11F completion gate

Before the closed Chapter I pilot is treated as fully completed, every blocking item must either pass, have a documented accepted defect/workaround, or be executed in the later disposable-account workflow phase when it necessarily requires state changes.

**11F.2 gate:** complete. The four missing authenticated browser-control repetitions have explicit product-owner acceptance and are not represented as passing tests.

**Next gate:** 11F.3 disposable-account end-to-end production workflow smoke, including the remaining state-changing items above.
