# Sprint 14 authenticated action acceptance

Status (2026-09-28): **authenticated production acceptance passed** for the bounded class/staff mutation, teacher workspace and offboarding contracts below. Sprint 14 and 14D remain open.

## Verified result

[Run 36354453046](https://github.com/johnvanesyan-arch/armenian-mastery-platform/actions/runs/36354453046) passed **141/141 action-run checks**, plus **54/54 read-isolation checks before and after**, against production at revision `7787ed62e861ef6d42dad785a420e1501d2b4a6f`. Execution was 2026-09-28 02:12:51–02:20:12 Asia/Yerevan (UTC timestamps are in the report). The [redacted report](evidence/sprint-14-actions-20260928.json) is retained in Git beyond Actions artifact expiry.

Both schools passed teacher rename/reload, home and sidebar navigation, archive/reactivate, mobile cancellation and overflow checks. Both school admins used the actual confirmation UI to cancel and then confirm offboarding of a new temporary guest membership. Original teacher contexts, class identities/rosters and student enrolments remained unchanged. All six QA sessions closed locally.

[Read-only database verification](evidence/sprint-14-actions-cleanup-20260928.json) confirmed four archived empty QA classrooms, two ended guest memberships/assignments, no active guest subject grants, two revoked invitations, two revoked join codes, zero QA enrolments and both original teacher memberships still active. Fixtures retain audit history.

## Defects found and deployed

- [PR #53](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/53): archived class links were carrying active assignment/release/unit parameters, so reload could request a context the server correctly rejected. The shared teacher workspace now clears inactive context and updates URL/state before reload. Four executable regressions and the two-school live browser actions pass.
- [PR #55](https://github.com/johnvanesyan-arch/armenian-mastery-platform/pull/55): overlapping school-admin roster loads could append duplicate cards, restore old results after A→B→A switching, and clear the current busy state. Only the latest request may render/cache results or clear busy state. Three concurrency regressions fail on the old implementation and pass on the fix; both live offboarding flows now pass.

Both fixes use the shared role pages and apply to every institutional school, grade, subject and class. No API authorization or learning criteria changed. CI passed **562 tests**, typecheck, browser syntax and the institutional database concurrency job; Vercel production deployments succeeded.

Earlier attempts did not count as acceptance: one lost a QA session; subsequent attempts exposed browser-harness assumptions, an overly broad read-request guard, and the roster race. Their disposable records were cleaned up and post-run read isolation passed. The final report above is the clean acceptance result.

`Sprint 14 authenticated action QA` runs manually on reviewed main, or when this runner/workflow changes on main. It shares the read suite concurrency group, uses the existing six dedicated QA identities and fixture variable, and needs no additional credentials. It installs the repository's pinned Playwright dependency and exercises production through actual password sessions and normal authenticated APIs. No service-role key or synthetic identity is used.

## Scope

- Existing 54-check authenticated read isolation before and after the actions.
- Reciprocal foreign teacher class rename/archive/activate/create and invitation-code denials, plus student role denial.
- Actual teacher home/sidebar navigation, persistent rename, archive/reactivate and mobile rename cancellation.
- Token-only temporary teacher membership in the other QA school, using existing teacher identities. No email is sent.
- Reciprocal foreign administrator archive/restore/preview/offboard, membership termination and subject authorization denials against the new membership only.
- Wrong-recipient invitation denial; stale offboarding preview denial; fresh impact counts; real admin UI cancel and confirm.
- Offboarding ends the new membership's assignment and subject grant, removes guest context access, and invalidates an unused learner invitation. Original school context and original class/enrolment identity are checked afterward.

## Safety and evidence

Only new empty `S14-QA-<run>-<attempt>-*` classes are renamed/archived. Only newly created membership IDs absent from the baseline directory can be offboarded. A browser request guard blocks unrelated management mutations and email sending. No enrolment, answer, diagnostic, mastery or exposure is created or modified. Cleanup archives new classes, offboards new memberships, revokes unused pending invitations and signs out only newly created QA sessions. Audit history is retained; there are no permanent deletes.

The redacted JSON artifact contains check labels/statuses, HTTP codes and newly created record IDs. It contains no credentials, sessions, invitation tokens, join codes, emails, learner data, screenshots or traces. Original membership offboarding and final-admin removal are deliberately excluded: production QA must not gamble with existing school access. Existing database last-admin/concurrency evidence remains separate.

Current live fixtures exercise the shared contracts with two Physics 7 Chapter I school contexts. This is not acceptance for a second authorized curriculum release, all future subjects, or school-wide 14D analytics. A successful run alone does not close Sprint 14.
