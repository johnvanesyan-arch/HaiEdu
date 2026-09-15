# Sprint 10.5B → 10.5C Handoff

Phase C should consume the new shell/design system rather than creating a parallel visual layer.

## Enable in 10.5C

- Create `web/physics-7.html` and its page logic.
- Change the Physics 7 destination in `web/student-shell.js` from `enabled: false` to `enabled: true`.
- Redesign `index.html` Home content around active-session/recommended-action priority.
- Move detailed skill discovery out of Home and into Physics 7.

## Preserve

- `tokens.css`, `base.css`, `components.css`, `student-shell.css`
- `student-shell.js` as presentation/navigation only
- current backend recommendation as next-action authority
- existing practice, diagnostic, mastery, security and role semantics
