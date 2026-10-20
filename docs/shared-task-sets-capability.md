# Shared reading/listening task sets

**16.1B.5 — implementation in progress, 2026-10-20.** This is a subject-neutral, opt-in capability. It does not author or approve English content, approve a listening policy, or activate a curriculum release.

An immutable `haiedu-task-set-v1` version binds an explicit locale, one plain-text passage or protected audio version, one source-family UUID, and an ordered list of question IDs, versions and skill mappings. A reviewed source does not approve its questions. Each question retains its existing content QA, review, score and declared skill. New wording, membership or order requires a new version. Revocation is irreversible.

Governed delivery keeps all members together in their declared order. Practice may select a set containing the target skill and records each member against its own skill. It completes the selected set before applying early-completion rules. A set cannot be partially selected to fill an assessment or review budget. Diagnostic and registered Mastery forms must contain every member of any included set. Mastery sets require the existing explicit form-selection contract. Unchanged standalone questions retain their current selection and scoring behaviour.

Exposure and reservations follow the source family across question versions, task sets, modalities and curriculum releases. Reading a registered text version of an audio source therefore prevents later unseen use of that family. Any prior exposure or assignment rejects a new Diagnostic/Mastery family; members in the same session share one source. Concurrent starts and exposure use the existing learner serialization fence. Practice cannot expose a family reserved by another active assessment. Historical source bindings are retained when an item is revised.

The learner sees the source and position within the set, with one question at a time. The response evidence names the immutable set, source family, member position and stimulus modality. These are linked observations, not independent source samples. Existing audio completion evidence remains per question; replay is available for every listening question. Transcript reveal remains disabled, and audio remains restricted to Practice/Chapter Review.

Source registration is service-only and requires a recorded source review and permission reference. The content workspace offers only versions containing the selected question; choosing one still requires saving, QA and ordinary question review. Learners cannot browse the source registry, member list or other questions. Sessionless and legacy shared-source delivery fails closed.

Verification and deployment evidence will be added before delivery closure. Whole-bank comparison, audio audition/permissions, final English content/scoring decisions and learner release gates remain open. Speaking stays classroom-assessed.
