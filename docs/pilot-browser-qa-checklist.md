# Sprint 11F Live Browser / Production Smoke Checklist

This checklist was originally the final operational gate for Sprint 10.5F. By product-owner decision, Sprint 10.5F is closed without executing this live authenticated matrix. The checklist is retained as a **Sprint 11F production/pilot smoke requirement** rather than a blocker to beginning Sprint 11.

The unchecked items below therefore mean **deferred**, not failed.

## Desktop Chromium

- [ ] Sign in and land on Home.
- [ ] Left navigation shows Home / Physics 7 / Assessment / Progress.
- [ ] Home recommendation opens the correct active/recommended task.
- [ ] Physics 7 Chapter I renders all 10 skills without Armenian clipping.
- [ ] Start or resume one Practice question.
- [ ] Keyboard focus is visible on answer controls, Help, Submit and Next.
- [ ] Hint 1 -> Hint 2 -> Worked Example remains functional.
- [ ] Practice session remains bounded and does not freeze.
- [ ] Assessment hub clearly separates Diagnostic and Mastery Check.
- [ ] Diagnostic shows no per-item correctness feedback.
- [ ] Progress page distinguishes Diagnostic / mastery-progress / Verified state.

## Desktop Firefox / Safari-class browser

- [ ] Home and all four primary navigation destinations load.
- [ ] One Practice question submits successfully.
- [ ] One assessment state loads correctly.
- [ ] Progress skill rows wrap correctly.
- [ ] SVG/scale stimuli remain legible.

## Tablet width (approximately 768–1024 px)

- [ ] Navigation does not overlap content.
- [ ] Home cards do not clip.
- [ ] Physics 7 skill rows remain readable.
- [ ] Assessment cards stack/wrap correctly.
- [ ] Progress summary and skill rows collapse correctly.

## Phone width (approximately 320–430 px)

- [ ] Four-item bottom navigation is readable and tappable.
- [ ] Bottom navigation does not cover page content.
- [ ] Device safe-area does not cover navigation/actions.
- [ ] No horizontal scrolling for Home, Assessment, Progress or question cards.
- [ ] Practice question and answer controls fit in one column.
- [ ] Diagnostic question fits in one column.
- [ ] Long Armenian skill names wrap without overlap.

## Keyboard-only

- [ ] Skip link appears on focus and moves to main content.
- [ ] Primary navigation is reachable in logical order.
- [ ] Focus indicator is always visible.
- [ ] Radio answers can be selected by keyboard.
- [ ] Numeric/unit fields have accessible labels.
- [ ] Submit and Next are reachable and state changes are announced.
- [ ] No keyboard trap in focused Practice/Assessment routes.

## Armenian overflow stress strings

Check at 320–390 px and 200% text zoom:

- `Բնության ուսումնասիրության ֆիզիկական մեթոդները`
- `Ֆիզիկական մեծություններ, միավորներ և չափիչ սարքեր`
- `Չափման փորձի պլանավորում և անկանոն մարմնի ծավալի որոշում`
- `Գաղտնիություն և հաշիվ`
- `Աջակցություն է պետք`

- [ ] No overlap.
- [ ] No inaccessible truncation.
- [ ] Buttons remain at least approximately 44 px high.

## Session collision regression

- [ ] Active Practice is not replaced by Diagnostic.
- [ ] Active Diagnostic is not replaced by Practice.
- [ ] Active Mastery Check is not replaced by Practice or Diagnostic.
- [ ] Resume returns to the existing session.

## Sprint 11F completion gate

Before the closed Chapter I pilot is treated as fully completed, every blocking item above must pass or have a documented accepted defect/workaround. This checklist no longer blocks Sprint 11A–11E engineering work from starting.
