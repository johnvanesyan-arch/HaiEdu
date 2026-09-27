# Sprint 14 authenticated action acceptance

Status: implemented; production acceptance pending. Sprint 14 and 14D remain open.

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
