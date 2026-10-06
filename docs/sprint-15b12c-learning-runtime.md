# Sprint 15B.12C — governed learning API consumers

Implementation and isolated validation are complete; CI and production closure remain pending.

The learning APIs now support explicitly selected institutional enrollment, programme, release, immutable chapter identity and published blueprint policy. The authenticated Edge router derives student and live Auth-session identity from Auth-verified credentials. Explicit invalid contexts cannot fall back to the legacy path. Database transactions revalidate current authorization after context, assignment, content and evidence lock waits, including time-based expiry. No prospective policy or curriculum is activated by this deployment.

## Shared runtime and registered extensions

Start, item delivery, answer submission, mastery answers, authored help, readiness/lifecycle status and recommendation events use the same governed context. Counts, per-skill allocation, required pass minima, hints, model and lifecycle references come from the immutable binding. The registered selected-response-v1 scorer owns canonical answers and option presentation. Active diagnostic/mastery responses hide interim correctness; final results retain their exact policy and evidence provenance.

The runtime recognizes explicit linear-beta, recent-recovery, 11B exposure selection and authored three-stage help capabilities with frozen configuration values. Unsupported shapes deny before learner creation. The existing three-attempt lifecycle is a versioned supported extension; another lifecycle shape needs its own implementation rather than implicit defaults. The existing lifecycle storage key is injective to the immutable unit within a release because release-unit snapshots enforce UNIQUE(release, frozen unit code). Governing selection and authorization still use UUID identities. Reused labels across subjects/releases do not mix evidence.

Practice assigns adaptively on delivery, then preserves that assignment and its private option permutation. It supports configured early mastery/recovery completion. Review retains failed-skill and recent-evidence weighting, prioritizing every unused question across the chapter before exact repeats. Review cycles retain selection-time history, including questions assigned but not answered; this is an explicit existing limitation. No targeted skill review or scheduled retention feature is added.

Mastery allocation, final scoring, lifecycle advancement, mandatory review qualification and retry linkage commit atomically with answers and evidence. Supporting skills are scored but receive a mandatory pass minimum only when declared. Auth-session origin is immutable audit provenance; a later valid login can resume without rewriting it. Recommendation telemetry is scoped to the issued context and matching active action, with server-owned snapshots and duplicate suppression.

## Legacy compatibility and consumers

The immutable legacy mapping explicitly registers the seven existing Physics 7 Chapter I blueprints and their frozen programme/unit identity under legacy-physics7-u01-v1. The older API's implicit code selection only resolves these mappings. Existing unbound sessions retain their inference/model/runtime provenance; mapped completed diagnostics can satisfy the governed chapter baseline without restamping history or creating another lifetime baseline. New unconfigured chapters require an explicit selector and compatible prospective policy. Unknown legacy session mappings deny safely.

Affected deployed bundles: start-learning-session, get-session-item, submit-answer, submit-mastery-answer, get-remediation-help, get-mastery-check-status, get-chapter-mastery-lifecycle, record-recommendation-event, get-student-dashboard, get-teacher-dashboard and get-teacher-student. The dashboard entrypoints are deployed because they import the changed legacy curriculum resolver; new navigation and analytics behavior remains 15B.12D. get-teacher-student retains its existing manual authentication and verify_jwt=false flag; all other affected bundles retain verify_jwt=true.

The initial bundle audit found an older curriculum-release helper in get-session-item and an older auth helper in get-chapter-mastery-lifecycle. The rollout replaces each affected bundle with the complete intended dependency graph and requires exact file readback. get-learning-context's dependencies are unchanged.

## Verification and release boundaries

The complete local Node suite passes 1,164 checks, including 39 governed-runtime checks. Fixtures execute the actual SQL functions and critical production lifecycle, identity, option-presentation, provenance, guide-snapshot and help/exposure triggers. Synthetic coverage includes three chapters across two programmes, reciprocal school ownership, unequal allocations, supporting scoring, original-binding resume, low-score diagnostic completion, adaptive early completion, whole-chapter review rotations, three failures/reviews/retries, permissions and revocation denials. These fixtures are isolated acceptance, not authenticated production learner acceptance.

PostgreSQL 17 CI adds independent-connection runtime races for adaptive delivery, duplicate/rolled-back answers, live authorization revocation, expiry during content lock waits, mastery allocation/finalization and linked review retry gates. Existing native Chromium and both PostgreSQL jobs remain required by the aggregate Platform release checks. Local Chromium is unavailable because its download was truncated; the native browser CI result must pass before release.

Production closure requires reviewed PR/main CI, migration body/RLS/privilege readback, all eleven exact deployed bundles, boot/auth probes, before/after history inventories, advisor comparison, immutable runtime-build provenance, final frontend revision and separate persistent Production / Blocking deployment-check verification. The active runtime's build identity will be appended without changing immutable model parameters or old session runtime IDs.

Chapter II remains learner-inactive. Its 16-question/192-question proposal and supporting/readiness/pass decisions remain unapproved. A second authorized release still gates live multi-context acceptance in 15B.12E. Full platform migration is not claimed until 15B.12D and 15B.12E complete.
