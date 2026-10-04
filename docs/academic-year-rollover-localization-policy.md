# HaiEdu Academic-Year Rollover, Continuity and Localization Policy

**Policy status:** Approved design standard for future implementation  
**Responsibility correction approved:** 2026-10-05 — teacher-created subject classrooms; implementation pending  
**Final workflow decisions:** 2026-10-05 — activation before teacher creation, fixed A–E selectors, Headmaster conflict page, safe migration and enrollment contract; implementation and QA pending  
**Primary implementation sprint:** Sprint 18.5 — Academic-Year Lifecycle, Rollover & Continuity  
**Related foundations:** Sprint 14 academic identity, tenant isolation and school-scoped evidence  
**Localization implementation:** Immediate cross-platform release policy; centralized localization architecture in Sprint 18  
**Related later work:** Sprint 23 longitudinal learner profile; Sprint 24 advanced analytics

## Responsibility correction — 2026-10-05

The Headmaster/School Admin authorizes teaching subjects and approves student progression. Teachers create their own subject classrooms, including new-year subject classrooms, within their authorized school, subject and academic-year context. The system records the corresponding teacher-to-classroom assignment during authorized creation. A `teacher_assignments` record does not imply that the Headmaster manually allocated that teacher to a grade/class.

This approved correction supersedes the earlier prospective requirement that the school admin assign every teacher to particular new-year classes. Routine grade/class allocation by the Headmaster is not a prerequisite to teacher classroom creation. The Headmaster retains academic-year and student-rollover authority, homeroom appointments, conflict resolution and exceptional handover controls. Historical decisions and completed implementation evidence are not reclassified. This is a documentation decision, not a production deployment or sprint-closure claim.

The final timing decision is **activation first, teacher subject-classroom creation second**. A setup year is not open to teacher creation. Successful School Admin activation closes/archives outgoing-year academic records into read-only history and switches the affected school's current-year context. It does not create teacher classrooms or archive user accounts. Competing ordinary same-subject classroom claims are rejected and referred to a dedicated Headmaster page; co-teaching and split-group support are outside this slice. The new creation form uses fixed uppercase Latin A–E designations, not free text or letter-alias conversion. Sections 4, 5, 6 and 13 specify the associated lifecycle, conflict, enrollment and migration requirements.

## 1. Purpose

This policy defines how HaiEdu must move schools, teachers, classes and students from one academic year to the next without recreating user accounts, overwriting historical evidence, confusing roles or disrupting existing functionality.

It also establishes a platform-wide localization policy requiring natural, consistent Armenian throughout every user-facing interface.

The policy governs:

- academic-year creation, setup, activation, closure and archiving;
- teacher-created subject classrooms, teaching-assignment records and exceptional handover;
- student grade progression and class enrollment;
- historical classrooms and learning evidence;
- year-scoped analytics;
- student account recovery;
- safe migration from existing class ownership behaviour;
- Armenian interface terminology and language quality.

## 2. Non-negotiable invariants

1. **Accounts persist.** Teachers and students keep the same Auth identity, profile, login history and permanent internal account ID across academic years.
2. **Academic structures change.** A new year creates year-specific school-class records and student placements. After activation, teachers create the associated new-year subject classrooms; the system records their teaching assignments and validated subject enrollments. Continuing class-group identity and annual records are distinct.
3. **History is never overwritten.** Previous classes, assignments, enrollments, assessments, mastery evidence, interventions, curriculum versions and audit records remain attached to their original academic year.
4. **Normal annual progression uses no invitation.** Existing students are not asked to register again or redeem invitations for ordinary grade progression. Eligible subject enrollments are fulfilled from approved placements once the subject classroom and its authorized teacher exist.
5. **The school admin is the sole rollover authority.** Teachers and students cannot approve, execute or alter official progression decisions. Teacher creation of a subject classroom is not a student promotion decision.
6. **The system automates processing, not institutional judgment.** It may propose normal promotion and detect errors, but it cannot independently decide repetition, transfer, departure or an unresolved placement.
7. **Every protected action is school-scoped and server-authorized.** A user’s general role is insufficient; the system must verify the exact school, academic year, class, programme and effective assignment or membership.
8. **Historical years are read-only.** Successful activation of the replacement year makes the outgoing year's academic records read-only and places its classrooms in history automatically. No per-teacher archival action is required.
9. **Unavailable delivery cannot receive active learner enrollments.** An unpublished programme, missing subject classroom, invalid teaching assignment or unresolved classroom claim produces an explicit pending or blocked state. Approved school placement and active subject delivery are different states.
10. **User-facing language is natural Armenian.** Terminology must be consistent across all roles and pages.
11. **Teacher workflow is preserved.** The Headmaster grants subject authorization; primary subject is a label/default. Teachers use controlled subject, grade and class-designation dropdowns to create their own subject classrooms. Names are generated, with no optional custom-title field. Designations are uppercase Latin A, B, C, D or E only; no Armenian-letter alternative or alias/transliteration algorithm is required. Creation reuses the correct year-specific school class rather than duplicating it.
12. **Activation enables teacher creation, not the reverse.** Teachers cannot create next-year classrooms during setup. Activation must not require those classrooms to exist, because that would make activation and creation block one another. Missing subject classrooms remain pending after activation.
13. **Competing classroom creation is not shared teaching.** A conflicting ordinary same-subject claim is rejected without granting roster access and referred to the Headmaster. Co-teaching and split-group features are not introduced now.

## 3. Authority and responsibilities

| Actor | Permitted responsibility |
|---|---|
| School admin | Create and manage academic years; authorize teacher subjects; approve school-class continuations and student progression; validate and confirm activation; appoint/replace homeroom teachers; resolve placement or teaching-claim conflicts and exceptional handovers; initiate verified school-assisted recovery. Routine teacher-to-grade/class allocation is not required. |
| Teacher | Create subject classrooms only in an activated current year within school/subject authorization using the controlled selectors; receive system-recorded teaching responsibility; invite genuinely new learners; view eligible resulting rosters and authorized history; no student-rollover authority. |
| Student | Continue using the same account; view the resulting current placement and personal historical learning record; no rollover action. |
| Master admin | Platform support, security and audited troubleshooting only; no routine school rollover. |
| System | Generate progression proposals; stage and validate approved placement batches; execute the school-year cutover; record assignments during authorized teacher creation; fulfill eligible subject enrollments; prevent duplication; preserve history; produce audit/reconciliation reports. |

Teachers may discuss a learner’s situation with school leadership through the school’s normal administrative process, but HaiEdu does not give teachers a promotion/repetition decision control.

A subject authorization grants eligibility to teach that subject, not access to every existing classroom or learner in it. Selecting an occupied teaching context must not silently transfer another teacher’s class or grant its roster. A primary subject is a label/default selected from authorized subjects, not a separate privilege escalation path.

## 4. Academic-year lifecycle and mandatory order

The new academic-year record must exist before target school classes or student placements can reference it. Creating that record is not activation.

### Required sequence

1. The school admin creates the next academic year in **setup** status. The current year continues operating. Teachers cannot create subject classrooms in the setup year through either the interface or backend.
2. The system proposes target year-specific school classes and explicit continuation relationships. The school admin resolves grade repetition, incoming groups, class reorganization and other placement exceptions. One school/year/grade/A–E designation identifies one ordinary school class; different years and different incoming groups remain distinct. This is not a co-teaching or split-subject-group feature.
3. The system generates student progression proposals from stored school-class placements, not from a temporary union of current subject rosters. Proposal generation changes no active learner records.
4. The school admin resolves placement exceptions, reviews a versioned before/after preview and confirms validated outcomes. The system stages them through resumable, idempotent batches, preserving source placements and history. A source-roster or target-structure change requires revalidation before the affected result is published.
5. The school admin confirms **Activate academic year** after placement preparation and cutover checks. The system makes the new year current for this school and closes/archives the outgoing year's academic structures into read-only history. Other schools are unaffected. The previous current year remains operational if activation validation fails; a failed attempt must not leave a half-switched school.
6. Only after successful activation can teachers create their new-year subject classrooms through the subject/grade/A–E workflow. Creation links to the prepared school class and records the creating teacher's authorized assignment. The Headmaster does not routinely choose the teacher's grade/class. The teacher account is unchanged.
7. The system fulfills only eligible approved current-year subject enrollments when a subject classroom, valid teaching assignment and published programme/release exist. Existing students do not need new accounts or routine invitations. Genuinely new learners retain the authorized invitation path.
8. Missing subject classrooms, unpublished programmes, inactive memberships and unresolved teaching claims remain explicitly pending or blocked. Completing a prerequisite retries only affected items. The system never invents a classroom, silently inherits last year's teacher or reuses the previous grade's curriculum.

### Activation readiness is not subject-delivery readiness

Activation cannot depend on teacher-created target subject classrooms or their assignments already existing: they are deliberately created after activation. Validate source/target school identity, the approved placement plan, canonical school-class records, unresolved-case dispositions, source versions and the outgoing-year cutover. A valid year can activate with zero target subject classrooms; those subjects are shown as not ready until created. This does not bypass programme-publication rules or turn a pending student-placement decision into an approved placement.

A target grade with no published programme remains pending under section 8. The new year can still be current for the school while affected students see placement pending. Missing delivery must not be represented as an empty but ready course.

### Automatic cross-role cutover and archival

The activation boundary must make the new current-year identity and the outgoing-year write fence effective together. A school cannot expose two competing current-year contexts. Repeated activation returns the existing recorded result; it does not repeat promotion or archival. Child archive status bookkeeping may be reconciled in batches, but old-year writes must already be denied by the year state and all previous classes must resolve to history.

- Teacher dashboards switch to the activated year, initially showing an honest empty/create-classroom state if no new classrooms exist. Old subject classrooms leave the ordinary list and remain available in authorized, searchable, year-filtered history.
- Student dashboards show approved new-year placement and ready subjects or explicit pending states, plus personal previous-year history. They never show an old classroom as current merely to fill an empty screen.
- The School Admin's current school-class, teaching-relationship and default year-based analytics views switch to the new year. Valid homeroom views follow the approved continuing group, not a different incoming group reusing its old label.
- Master Admin selected-school views use that school's current year. Central Content Reviewer content, programme versions and question banks are not archived by a school's rollover.
- No student or teacher account, password, role or unrelated subject authorization is archived, recreated or implicitly upgraded.

Users should not need to sign out or manually select the new year. Open dashboards revalidate on change detection, navigation, focus or refresh. An offline or stale tab is not guaranteed an instant visual update, but its old-year write or invitation redemption must be denied on reconnect. Discard responses that belong to a superseded user/year context.

Do not dispose of unfinished assessments silently. Activation preflight must show ongoing work and require a recorded resolution before cutover. Already committed answers and history remain intact; no completion or score is fabricated. A transaction finishing before the cutover retains its old-year provenance; one attempting an old-year write after the cutover is rejected.

## 5. Teacher continuity and assignment procedure

Teacher accounts are not rolled over. Teachers create new year-specific subject classrooms after activation, within valid school and subject authorizations. A teacher may teach Grade 7 again with a different student group; the system must not assume that the teacher follows last year’s students into Grade 8.

### Preconditions

Before creating a subject classroom and its assignment, the system must verify that:

- the acting teacher has an active account, live session and active teacher membership in the exact school;
- the requested academic year is the activated current year for that school, not setup, closed or archived;
- the school-class record belongs to that school/year and the selected grade and uppercase A–E designation;
- the teacher is authorized for the selected subject/programme;
- the programme and curriculum release satisfy publication and delivery gates;
- assignment dates are valid;
- no prohibited duplicate classroom, competing teaching claim or overlapping assignment is created.

During initial onboarding in an active year, authorized subject-classroom creation may create a missing school-class record. During continuation/rollover, it must reuse the target school-class record or route a conflict for resolution. Merely selecting a dropdown does not create a record; final submission does. Do not pre-create all A–E groups. Arbitrary classroom titles, student names and present-day membership must not be used to infer historical institutional identity. No alias-conversion algorithm is introduced for the new fixed-selector flow.

### Result

The authorized creation operation creates the subject classroom and its time-bounded `teacher_assignments` record. It does not create or modify the teacher’s Auth account, password or permanent profile. Eligible enrollment fulfillment is recorded durably and may use bounded batches; the classroom must not falsely report a complete roster while fulfillment is pending.

### Duplicate creation and dedicated Headmaster conflict page

Different subjects for one school/year/grade/designation share one school-class record. The ordinary subject-classroom conflict key is the same school/year/school-class/subject context, not teacher name, display title or curriculum-release spelling. A curriculum revision must not allow a competing teacher to evade an occupied subject context.

A retry by the same currently assigned, authorized teacher returns the existing classroom. A competing creation by another teacher is rejected without creating a second subject classroom, transferring access or returning the existing roster. Concurrent requests serialize through an authoritative uniqueness/claim rule. One successful operation creates the classroom; a conflicting operation records or reuses an open referral case without becoming an enrollment grant. Do not rely on a browser pre-check alone.

Provide a dedicated School Admin conflict-resolution page, working Armenian label **Դասարանների խնդիրներ**. It shows the year, subject, grade, designation, existing classroom and teacher, requesting teacher, timestamps, reason, case status and audit history. Support search/filtering and focused case details with a before/after impact preview. The requesting teacher sees only a scoped conflict message and case reference, never the other classroom's learners or evidence. Case creation and resolution must be idempotent; repeated attempts cannot flood the Headmaster with duplicate open cases.

The Headmaster can retain the current arrangement and reject the competing claim, request correction of an incorrect selection, or explicitly confirm a justified exceptional teacher handover. The existing legitimate classroom remains operational during review. A conflict alone does not establish that its teacher is unauthorized. Do not silently merge classrooms, promote students, add subject grants or delete evidence. Verify the case's current version and the acting administrator's exact school scope before resolution. Stale decisions must not overwrite a later assignment change. No co-teaching, parallel-subject-group or split-group functionality is included now.

### Additional subject authorization

The school admin manages authorized subjects on the existing teacher’s page: select an available additional subject, confirm and record the grant. No new teacher account or registration invitation is required. The teacher’s classroom-creation subject selector then includes the newly authorized subject. Primary-subject selection remains a label/default; adding, removing or changing it must not silently alter unrelated subject grants or historical assignments. Revocation requires an impact preview for affected assignments and an audited, fail-closed access change.

### Exceptional teacher handover

Handover is a separate controlled administrative workflow, not a prerequisite to ordinary teacher classroom creation. When a teacher changes during the year:

1. end the previous assignment at an exact effective time;
2. create the replacement assignment from that time after verifying school membership and subject authorization;
3. preserve the class, roster, evidence and previous teacher’s authorship;
4. remove the former teacher’s write access immediately and revalidate or revoke outstanding assignment-bound invitations;
5. give the replacement teacher only the learner context authorized for the current assignment;
6. record the actor, case/reason, effective time and before/after assignment state.

The new teacher may receive current class evidence and relevant prerequisite summaries. They must not automatically receive unrelated classes, unrelated subjects, another teacher’s private drafts or activity occurring outside their assignment period.

Homeroom appointment is distinct from subject assignment. The Headmaster selects an eligible active teacher for the school class; confirmed replacement ends the old appointment, creates the new dated appointment and transfers only explicit homeroom permissions. It does not transfer subject classrooms or permit student progression decisions.

## 6. Student progression and automatic enrollment

The approved model is **school-admin-controlled, supervised bulk rollover**, separate from teacher-created subject-classroom setup.

### 6.1 Proposal generation

The system loads active school-class placements from the outgoing year and proposes the ordinary next-grade outcome for eligible students.

Each student receives one proposed institutional outcome:

- promote to the next grade;
- remain in the same grade;
- transfer to another class within the school;
- leave the institution or graduate;
- decision pending.

No active data changes occur during proposal generation. Removing a student from one subject classroom does not, by itself, remove their school-class placement or exclude them from progression.

### 6.2 School-admin review

The school admin works from a dedicated rollover workspace with:

- search and filters by grade, class and status;
- bulk selection for ordinary promotion;
- individual controls for exceptional outcomes;
- a consolidated count of each outcome;
- missing school-class, subject-delivery and programme warnings;
- duplicate and conflicting placement warnings;
- source-version and unfinished-assessment warnings before activation.

The school admin reviews exceptions rather than manually recreating every learner enrollment or allocating every teacher to a grade/class. A missing teacher-created target classroom is expected before activation and is not a blocking requirement to activate.

### 6.3 Validation

Before confirming and staging progression, verify that:

- the source and target years belong to the same school;
- each student has no more than one active primary school-class placement at a time within that school and academic year;
- each target school class belongs to the correct school and year;
- no duplicate placement or subject-enrollment intent will be created;
- leaving/graduating students receive no ordinary new placement;
- unresolved progression decisions remain explicitly pending;
- previewed source and target records have not changed without revalidation;
- subject requirements/eligibility come from governed programme and approved placement data;
- no cross-school records are read or modified.

Active subject access is checked separately after year activation and subject-classroom creation. Pending delivery never bypasses publication, account status, membership or assignment checks.

### 6.4 Confirmation and processing

The school admin reviews a before/after preview and explicitly confirms the progression plan.

For each validated student, stage:

- the new year-specific school-class placement;
- required eligible subject-enrollment intents with explicit pending reasons until delivery exists;
- links to the source placement and rollover operation;
- an audit record with actor, school, source year, target year, outcome and timestamp.

The source placement's historical content and all learning evidence remain intact. Effective closure is recorded separately; history is not rewritten to look like a new-year placement.

Large rollovers use resumable, idempotent batches with each student's change atomic and every batch reconciled, not one enormous transaction. The final school-year visibility/write-fence cutover is a small serialized operation over the prepared state. A completed retry returns the existing result. A changed source record requires revalidation rather than blind replay.

Unresolved student progression remains pending and is excluded from accidental active placement. An approved placement may have a pending subject. After activation, creating the missing subject classroom triggers fulfillment of only eligible approved intents without ordinary rollover invitations.

### 6.5 Enrollment eligibility and concurrency contract

For every proposed active enrollment, revalidate the following at commit, not only when a queue is built:

- exact school and active academic-year identity;
- permanent student account ID and effective approved school-class placement;
- active student account status and valid school membership;
- current subject eligibility or approved enrollment intent; school-class membership alone is not blanket access to all subjects;
- exact active subject classroom and its link to the school class;
- teacher account, school membership, subject authorization and effective assignment;
- published programme/release and any relevant delivery gates;
- absence of a conflicting teaching claim, conflicting primary placement or explicit enrollment termination that would be improperly revived.

Create each eligible subject enrollment once using an authoritative database uniqueness rule and atomic check-and-write operation. Serialize this operation against membership termination, placement transfer, teacher revocation and year closure using a consistent locking/version-check contract. If a departure wins first, do not insert; if an insertion wins first, the departure must close the relevant active access. No completed interleaving may leave active access rooted in an ended placement or revoked assignment.

Use bounded resumable processing, durable fulfillment/reconciliation triggers and source revisions. Creation of a classroom and relevant approved placement/membership changes trigger reconciliation. Late approved joiners are picked up; stale jobs do not move a student back, recreate an ended enrollment or override an administrator's newer decision. An explicit new placement or re-enrollment authorization is required to restore intentionally ended access. Missing dependencies receive machine-readable reasons and natural Armenian messages.

Initial invitation acceptance remains scoped to the invited subject classroom. Sending or accepting one invitation must not fulfill unrelated subjects without separate authority. Pending invitation recipients are not included in enrolled-roster counts. Deduplication uses permanent identity, never names, display labels or name/email similarity.

Rollover placement does not require student login or knowledge of their password. A suspended account must remain suspended; progression must not create active subject access for it. Account recovery, placement approval and active enrollment are separate operations.

## 7. Canonical student placement

The student’s current grade must not be inferred from interface text such as `Ֆիզիկա 7` or from whichever subject card happens to load first.

HaiEdu should maintain a canonical year-specific student placement containing at least:

- school;
- academic year;
- student membership;
- current grade and school-class identity with an A–E designation;
- progression outcome;
- placement status;
- source placement;
- rollover operation;
- effective and audit information.

The student dashboard resolves its year and grade from this placement. Subject cards are then loaded from authorized class enrollments or explicitly shown as pending.

One student account may have several subject-classroom enrollments but appears once in its school-class roster. Deduplication uses the permanent student identity, never first/last name matching. A new year-specific 7A for a different incoming group is not a duplicate of last year’s 7A. Group continuation is explicit and does not overwrite annual records.

## 8. Missing classrooms or unpublished programmes

The system must not silently enroll a student in an unpublished programme or reuse the previous grade’s programme. A teacher must not be selected automatically merely because they taught the same subject or students last year.

If the entire target grade is unavailable, the affected student's placement remains pending. This is distinct from the school's current-year identity.

After activation, missing teacher-created subject classrooms are expected pending-delivery states. They do not authorize compulsory Headmaster grade/class allocation or returning old classrooms to the current list. If a subject programme is unpublished, active delivery remains blocked even when its classroom is otherwise ready. Displaying all grades in a selector does not authorize unpublished content.

Each blocked item includes a machine-readable reason and natural Armenian explanation. School admins cannot override publication requirements. Once the relevant prerequisite changes, the system revalidates current eligibility and retries only unresolved authorized items. Resolved or intentionally ended enrollments are not recreated by stale work.

## 9. Account access and recovery

Rollover operates on the student’s permanent internal identity and does not require the student to sign in. A forgotten password or inaccessible email does not prevent progression.

### Accessible email

The student uses the ordinary password-reset process.

### Inaccessible email

The school-assisted recovery procedure is:

1. the student or guardian contacts the school;
2. the school verifies identity outside HaiEdu using its authorized institutional process;
3. the school admin opens an audited recovery case for the existing account;
4. the platform issues a short-lived, single-use recovery mechanism;
5. the student sets a new email and password on the same account identity;
6. previous sessions and unused recovery tokens are revoked;
7. the recovery is audited and the previous email is notified when technically possible.

School admins, teachers and master admins must never be able to view an existing password. The normal recovery workflow must not create a second student account or detach historical evidence.

## 10. Role-specific interface policy

Administrative functionality must be placed in role-appropriate pages. The same controls must not be copied into every dashboard.

### School-admin dashboard

The school-admin dashboard should contain dedicated areas for:

- academic-year setup, activation and historical-year management;
- primary/additional teacher subject authorization and oversight of teacher-created classrooms;
- school-class rosters and homeroom appointment/replacement;
- the dedicated classroom-conflict page described in section 5, not mandatory allocation of every teacher to grades/classes;
- student progression and rollover;
- unresolved placements and delivery-readiness failures;
- previous academic years and year-specific analytics;
- controlled student account-recovery cases.

The rollover workspace may use steps or tabs for proposal, review, validation, confirmation and completion. These stages do not each require an independent page. The Headmaster's classroom-conflict page is a dedicated exception-management surface.

### Teacher dashboard

The teacher dashboard should contain:

- subject-classroom creation enabled only after the school admin activates the target current year;
- side-by-side subject, grade and A–E designation dropdowns where width permits, stacked accessibly on narrow screens;
- clearly displayed school/year context and generated classroom titles, with no custom-title field;
- current teaching assignments, active subject classrooms and validated resulting rosters, or a truthful new-year empty/create state;
- previous-year or archived classes automatically separated into authorized history;
- year-specific historical analytics within authorized assignments;
- the existing account and access section;
- a homeroom area only for current authorized homeroom appointments;
- scoped conflict feedback and case status without another teacher's roster.

It must not contain controls for creating academic years, assigning other teachers, confirming school-wide rollover or deciding official student progression. A homeroom appointment does not grant those powers. Existing custom titles and rename behavior are legacy migration concerns; this policy must not cause unreviewed bulk changes to existing classrooms.

### Student dashboard

The student dashboard requires:

- a prominent active academic-year and current-grade indicator;
- current-year subjects and classes;
- a clear placement-pending message when necessary;
- explicit subject-not-ready messages for missing classroom/programme dependencies, distinguished from unresolved progression;
- one dedicated previous-years/learning-history page;
- the existing account and access section.

Students do not need a rollover page because they do not perform the operation. They are not required to log out, recreate an account, accept routine rollover invitations or manually archive their previous classrooms.

## 11. Historical classrooms and analytics

Previous-year classes must be available through a dedicated read-only history area. Activation places outgoing-year classrooms there automatically for all affected role views.

Historical records retain their original:

- school and academic year;
- class and teacher assignment;
- grade and subject programme;
- curriculum release/version;
- assessments and attempts;
- mastery evidence and interventions;
- authorship and audit events.

Every analytics request must carry or resolve an explicit context including school, academic year, class, subject programme, curriculum release and unit/chapter where applicable.

Rules:

- current-year totals exclude previous-year evidence;
- historical analytics are selected explicitly;
- cross-year comparison uses a dedicated comparison model;
- teachers see only assigned or explicitly authorized class history;
- students see only their own history;
- school admins see only their school;
- prior-year evidence may inform prerequisite context but never automatically satisfies new-year mastery.

## 12. Making `teacher_assignments` authoritative

Classes must not remain permanently owned by the teacher who originally created them. `teacher_assignments` becomes the authoritative source of teaching responsibility. The initial assignment is created by the system during authorized teacher classroom creation; this does not require routine Headmaster grade/class allocation. Exceptional handover changes the effective assignment while preserving original authorship.

This change must be gradual:

1. introduce one canonical assignment resolver while retaining the existing class-level teacher field for compatibility;
2. backfill and verify assignment records for existing institutional classes only where authoritative relationships are established;
3. temporarily maintain both representations and reject inconsistencies;
4. compare old and new authorization/query results in testing;
5. switch permissions, dashboards and analytics to `teacher_assignments`;
6. retain the legacy field temporarily without using it as authority;
7. remove or repurpose it only after verified production parity.

Reassignment must never rewrite the class creator or previous teacher’s historical authorship. Ambiguous legacy school-class mappings require review rather than inference from display names.

## 13. Safe implementation and release policy

Rollover must not be introduced through a disruptive, system-wide replacement. The approved decisions authorize specification and safe preparation, not an unreviewed production migration or deployment.

### Migration procedure

1. Inventory account IDs, school/year context, subject programmes, classrooms, teacher assignments, enrollments, legacy names and evidence provenance through read-only queries. Record counts and source revisions; do not copy personal data into public repository fixtures.
2. Generate a proposed school-class mapping with exact source/target identifiers, authoritative supporting evidence and explicit unmapped/conflicting states. Do not fabricate a school for unbound records, group by similar display names, run class-letter alias conversion, auto-split student names or merge student accounts by name/email.
3. Add schema and nullable compatibility links without modifying current authorization or learning behavior. Existing historical IDs and evidence links remain intact.
4. Have the appropriate school administrator review their own ambiguous current mappings. Unbound or unresolved records remain explicitly legacy under their existing authorized paths until adjudicated. Never backfill historical session context from today's roster.
5. Apply only approved mappings in bounded, resumable, idempotent and audited batches with source-version checks. Changed records return to reconciliation, not forced mapping.
6. Compare student identity and membership sets, teacher assignments, permissions, school/year totals, assessment counts and provenance before and after. Any lost record, duplicate, unexpected permission or cross-tenant exposure blocks cutover.
7. Rehearse rollback and new enrollment/cutover operations with isolated fixtures, including concurrent creation, transfers, revocations and stale previews. No live archival, enrollment rebuild or cleanup is performed merely to test the design.
8. Enable a new read path behind a school-level flag and compare old/new outputs. Introduce controlled writes only after parity, failure recovery and cross-role browser evidence are reviewed.
9. Enable one authorized school, retain rollback/reconciliation records and retire replaced paths only after demonstrated parity. After real new activity exists, correction uses compensating records rather than deleting or relabeling historical evidence.

Every privileged operation must be authenticated with a live session where human-initiated, authorized against exact school/context, idempotent, audited, concurrency-protected, recoverable and tested for cross-school denial. Background fulfillment must have a recorded authorized intent and revalidate current eligibility; it is not an unrestricted service-role bypass.

No migration or race test is marked passed until executed with recorded evidence. The written procedure and acceptance matrix are preparation, not completion of those tests.

## 14. Platform-wide Armenian localization policy

The policy applies immediately to every new or modified interface. Sprint 18 owns the centralized technical localization architecture, hard-coded-string removal and platform-wide localization regression gate; Sprint 18.5 applies that architecture to all rollover surfaces.

### 14.1 Scope

Natural Armenian is mandatory for every user-facing part of HaiEdu, including:

- navigation and page titles;
- buttons, forms and field labels;
- instructions, empty states and confirmation dialogs;
- validation, warning and error messages;
- account access, invitation and recovery flows;
- emails and notifications;
- analytics labels and explanations;
- student, teacher, school-admin, master-admin and content-reviewer interfaces.

### 14.2 Terminology standard

The same concept must always use the same approved Armenian term. Labels must come from a centralized localization/terminology dictionary rather than being independently written into individual pages.

Literal machine-style translation is not acceptable. Wording must be understandable in Armenian educational and administrative usage.

Technical identifiers, email addresses, curriculum/item codes and necessary international abbreviations may remain unchanged when translating them would reduce accuracy.

### 14.3 Canonical working labels

The following are working labels and must receive final Armenian-language review in their actual interface context:

| Function | Working Armenian label |
|---|---|
| Academic years | Ուսումնական տարիներ |
| Student rollover/progression | Սովորողների փոխադրում |
| Teacher assignments | Ուսուցիչների դասաբաշխում |
| Unresolved cases | Չլուծված դեպքեր |
| Classroom conflicts | Դասարանների խնդիրներ |
| Previous years | Նախորդ ուսումնական տարիներ |
| Account recovery cases | Հաշիվների վերականգնում |
| Current assignments | Իմ դասաբաշխումը |
| Archived/previous classes | Նախորդ տարիների դասարաններ |
| Account and data | Իմ հաշիվն ու տվյալները |

No working label becomes permanent merely because it was used during development. Final wording must be reviewed for naturalness, consistency and role appropriateness.

### 14.4 Localization implementation standard

1. User-facing strings must not be scattered as ad hoc literals across HTML, JavaScript or server functions.
2. A centralized Armenian locale and terminology source must provide approved strings.
3. Dynamic messages must use safe placeholders and Armenian grammar-aware sentence patterns.
4. Layouts must support Armenian word length, normal word wrapping and responsive resizing without breaking words letter by letter.
5. Backend error codes remain stable and language-neutral; the interface maps them to natural Armenian explanations.
6. Email templates and browser interfaces must use the same approved terminology.
7. Every feature must pass Armenian-language UI review before release.
8. QA must detect missing translations, inconsistent terminology, untranslated fallback text and layout overflow.

## 15. Acceptance criteria

The rollover feature is not complete until all of the following are demonstrated:

- teacher creation in a setup year is denied through both UI and backend, without disrupting the outgoing year;
- activation succeeds with valid staged school-class placements and zero teacher-created target classrooms; missing subjects are visibly pending, not an activation deadlock;
- failed activation leaves the current year and access unchanged; concurrent/repeated activation cannot create two current contexts or duplicate outcomes;
- successful activation archives outgoing-year class views automatically for Student and Teacher, switches the affected staff contexts and denies stale-tab/old-invitation writes without affecting another school or central content;
- no account, password, role, unrelated authorization or historical evidence is recreated, archived or deleted by academic cutover;
- an existing teacher creates a new-year subject classroom after activation without a new account or routine Headmaster grade/class allocation;
- fixed subject, grade and uppercase Latin A–E selections generate the title; invalid free text, Armenian designation letters and custom-title payloads are rejected in the new flow;
- different-subject simultaneous creations reuse one school class;
- same-teacher retries return their existing classroom; competing same-subject creation is rejected and produces one deduplicated Headmaster case without another classroom or roster disclosure;
- own-school case review and confirmed handover work; cross-school and stale case resolutions are denied; no co-teaching/split-group feature is introduced;
- a teacher repeating Grade 7 receives the incoming Grade 7 roster rather than following the outgoing students into Grade 8 automatically;
- a replacement teacher preserves classroom/evidence/history and receives only valid current access;
- the school admin processes large progression plans through preview, validation, confirmation and resumable batches;
- ordinary students progress without new accounts or routine invitations;
- enrollment validates exact school/year/placement/subject/account/membership/classroom/teacher/publication context and adds each eligible student once;
- late approved joins are reconciled; concurrent departure, transfer, subject revocation, teacher suspension and closure never revive ended access or create duplicates;
- same-name students remain distinct; an initial subject invitation does not authorize unrelated subject enrollments;
- repeat, transfer, leaving, graduation and pending outcomes behave correctly;
- lost credentials do not prevent progression; suspended status is preserved and active enrollment is blocked until separately authorized;
- unpublished programmes and missing classrooms produce distinct pending reasons without old-grade fallback;
- students see the canonical current year/grade, and previous years remain read-only and searchable;
- analytics never mix years by default; two-school tests prove mutual denial;
- reviewed legacy mapping, before/after identity/membership/evidence parity and rollback tests pass before live enablement;
- audit records cover activation, conflict decisions, mappings, enrollment fulfillment and exceptional handover;
- all affected interfaces use reviewed natural Armenian and responsive layouts.

**Execution status:** Specification recorded; migration scripts, fixture execution, runtime implementation and production acceptance are not completed by this document update.
