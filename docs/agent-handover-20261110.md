# Agent handover — 10 November 2026

Open work handed over from the Claude session that ran the 7 November student design review (Phases 1–5, PR437–PR453). The rules for every agent session are in [AGENTS.md](../AGENTS.md); `docs/project-status.md` remains the authoritative status register. This note lists open items only and is not updated after 10 November.

**State at handover:** `main` at `99bfdbc` (BF-13 recorded). No branch or uncommitted work from this session remains. Automatic production QA is paused by the owner (AGENTS.md, 2026-11-10).

## Waiting for John's decision

| Item | State | What is needed |
|---|---|---|
| **PR #43 — Chapter Review question coverage** (Codex, 27 September) | Open. A learner-facing defect: Chapter Review can repeat questions from exhausted skills and counts abandoned unanswered questions as covered. The PR adds a migration (`20260927094337_chapter_review_answered_coverage.sql`) and changes `start-learning-session` and `_shared/chapter-review-selection.ts`; they must be released together. On 10 November `main` was 951 commits ahead of its head, and BF-08 changed the same area. | Offered: an assessment with no production change (rebase onto `main`, resolve the BF-08 conflicts, run the tests, describe exactly what the migration and deploy would do). Release needs John's explicit schema and deploy approval. |
| **PR #407 — BF-01 code ownership and review template** | Draft by John's decision: no independent reviewer is available. | Nothing until a reviewer exists. |
| **Owner usability acceptance** for the student design phases (PR437, PR439, PR441, PR443, PR445, PR447, PR449, PR451) | Not given for any phase. | John checks the student pages himself with a non-QA student account. The School A QA student was used by hand on 9 November; that broke the Chapter III suite until PR452. |

## Proposed design work (not approved)

1. **First-time and empty-state audit** (about 2–3 hours): what a new student sees with no courses, no work or no results. Example found: My work's fallback empty state shows three separate messages. Audit and propose first.
2. **Account page check** (about 30 minutes): the 7 November review may not have covered it.
3. **Desktop course header back link** (low value): «Դասընթացներ» sits under long unit titles, so that header stays 184 px. The Resource suite clicks this link.
4. **D2 — merge the remaining small text sizes (13 and 15 px)**: deferred.
5. **D4 — merge token families and literal colours in shared stylesheets**: not taken up.

Teacher and staff pages were outside the 7 November review. BF-12 drew on separate imported Claude QA findings (P4:W2, P4:W4) recorded in the Notion sequential register.

## Deferred until real usage

- **Reason for a failed Mastery check.** Students see no reason when they fail at or above the pass percentage. The server already stores `failedSkillIds` and `skillResults` in the session metadata but does not return them to students, so showing a reason needs a server change and approval. On 9 November only four completed Mastery checks existed (all QA), with no failure at or above the pass mark. Revisit once real students take Mastery checks.

## Known operational issues

- **Release wait.** The first production suite after a merge sometimes stops with «Production browser manifest does not match the reviewed source» or «Live QA was not started» while Vercel switches domains, and passes on re-run. Raising the 10-minute wait to 20 minutes was offered and not decided. With QA paused, this matters only for manual runs.
- **Slow domain assignment.** On 9 November Vercel took over 15 minutes to assign the domains to `bd65885`, which was then promoted by hand with John's approval; `77b8b08` took about 7 minutes. «Auto-assign Custom Production Domains» is enabled. The cause is not confirmed.
- **No weekly full production QA run while paused.** The 2026-11-10 QA-currency rule mentions a weekly full run, but the only scheduled workflow is Mobile (Mondays 04:00 UTC), and it skips while `PRODUCTION_QA_AUTORUN` is unset. John should decide whether a weekly run is wanted.
- **Supabase egress.** The organization used 6.65 of 5 GB in the cycle ending 13 November; restriction follows from 7 December if it is over quota again. Production QA runs were most of the traffic.
