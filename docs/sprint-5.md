# Sprint 5 — Adaptive Practice v2

## Objective

Build a pedagogically sensible remediation engine while keeping practice sessions bounded.

## Implemented

- maximum 8-question practice sessions;
- skill targeting from the student dashboard;
- mastery-sensitive difficulty selection;
- difficulty reduction after consecutive incorrect answers;
- unseen-item preference;
- avoidance of immediate exact-item repetition;
- spaced remediation of unresolved mistakes;
- repeat caps while alternatives remain;
- deterministic progressive help: Hint 1 → Hint 2 → Worked Example;
- help before answering and explanatory remediation after incorrect answers;
- server-authoritative tracking of help use;
- reduced positive mastery evidence after assisted correctness;
- independent-answer requirement for recent-recovery completion;
- scheduler selection reasons stored for analytics;
- remediation events stored for analytics;
- one provisional remediation guide for each of the ten Chapter I skills.

## Live regression found during QA

The first live Sprint 5 browser check exposed a resume-session loading defect. The dashboard correctly showed an active S08 practice session at 0/8, but clicking **Շարունակել սեսիան** left the question view on **Հարցը բեռնվում է…**.

Database inspection confirmed that this was not an adaptive-learning loop: the active session had not advanced and contained exactly one pending question. The defect was in the question-retrieval/runtime path.

### Fix

- `get-session-item` v3 now inlines the scheduler logic to remove a fragile runtime-relative shared import;
- backend query/runtime failures are returned explicitly;
- a 12-second browser loading watchdog now exposes a retry action instead of leaving an indefinite loading screen.

Sprint 5 remains open until the resumed S08 session is successfully completed through live browser QA.

## Validation limits

The remediation guides remain provisional, skill-level content. Item-specific misconception classification, empirical validation, and a deeper content-authoring/QA workflow remain future work.
