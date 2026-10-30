# Private task reuse and formatted instructions

2026-10-30 Asia/Yerevan · B.12.3.2 working branch only; not deployed.

Create copy saves a separately editable private draft immediately. The service derives the definition from the same teacher's saved draft in the exact assignment/release/unit context; it accepts no client-supplied definition, owner or storage path. A source revision check prevents copying a stale list preview. The stable request ID returns the same copy even after either draft is subsequently edited. Copy provenance records the source draft/revision; no learner work, recipient, feedback or mark is copied. Archived/ended contexts remain read-only.

A copy retains its ready private PDF reference. Source metadata and bytes remain immutable, downloads keep their existing live authorization/hash checks, and replacing a PDF on either draft creates a new immutable asset. References cannot cross owners or assignment/release/unit contexts; pending uploads cannot be attached. Reuse adds no storage upload, public URL or broad browser policy. Retention/erasure must account for every draft and frozen-version reference before deleting shared bytes; the feature remains blocked from production until that reconciliation is implemented.

Teacher text controls provide heading, bullet/numbered list and HTTPS-link insertion alongside the existing textarea and student preview. Formatting uses optional `instructionsFormat: task-text-v1` and text-source `format: task-text-v1`. The bounded grammar supports paragraphs, hard line breaks, `#`/`##` headings, one-level `-`/numbered lists, `**bold**`, explicit `[label](https://...)` links and backslash escapes. It never accepts raw HTML, images, embedded media, credentials, localhost links or unsafe schemes. Links open separately with `noopener noreferrer`; the server never fetches them.

Old definitions without the format marker stay literal. Opening/copying one does not reinterpret its text. Using a formatting tool on a literal field escapes its previous symbols before applying the selected operation; a new saved revision carries the format. Sent definitions retain their complete format/version snapshot. This is shared core behavior, with no subject, grade, assessment-content or mastery assumption.

| Consumer | Change |
| --- | --- |
| Private draft workspace | Server copy, exact retry, stale-preview recovery, navigation/logout/account fences |
| Teacher editor and student preview | Conditional field tools, selection preservation, versioned shared text renderer |
| Recipient preview | Folded preview of the exact saved instructions/source |
| Student task and teacher review | Same escaped renderer over the immutable assigned definition |
| Draft Edge/SQL | Owner/context-scoped copy with nonce/CAS and provenance |
| Source attachment SQL | Ready immutable references restricted to the same owner/context |
| Definition helper | Explicit optional format validation; legacy shape preserved |
| Draft/source/delivery/student/review Edge consumers | Staged dependency changes require complete deployment/readback at release; not deployed by a source merge |
| Existing curriculum writing, bank and mastery | No format, permission, scoring or evidence changes |

Verification uses actual isolated SQL/Edge handlers, existing real FunctionsClient document regressions, native form/selection/recovery/account tests, student/teacher render parity and two independent PostgreSQL copy races. The three authoring widths retain 200% text and keyboard controls. [Local preflight evidence](evidence/teacher-task-reuse-format-local-20261030.json); current full CI/artifacts are linked from [draft PR365](https://github.com/johnvanesyan-arch/HaiEdu/pull/365). No production learner response or grade is fabricated. B.12.3/B.12 stay open and subject expansion stays paused.
