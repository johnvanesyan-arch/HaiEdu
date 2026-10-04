# HaiEdu Academic-Year Rollover, Continuity and Localization Policy

**Policy status:** Approved design standard for future implementation  
**Responsibility correction approved:** 2026-10-05 — teacher-created subject classrooms; implementation pending  
**Primary implementation sprint:** Sprint 18.5 — Academic-Year Lifecycle, Rollover & Continuity  
**Related foundations:** Sprint 14 academic identity, tenant isolation and school-scoped evidence  
**Localization implementation:** Immediate cross-platform release policy; centralized localization architecture in Sprint 18  
**Related later work:** Sprint 23 longitudinal learner profile; Sprint 24 advanced analytics

## Responsibility correction — 2026-10-05

The Headmaster/School Admin authorizes teaching subjects and approves student progression. Teachers create their own subject classrooms, including new-year subject classrooms, within their authorized school, subject and academic-year context. The system records the corresponding teacher-to-classroom assignment during authorized creation. A `teacher_assignments` record does not imply that the Headmaster manually allocated that teacher to a grade/class.

This approved correction supersedes the earlier prospective requirement that the school admin assign every teacher to particular new-year classes. Routine grade/class allocation by the Headmaster is not a prerequisite to teacher classroom creation. The Headmaster retains academic-year and student-rollover authority, homeroom appointments, conflict resolution and exceptional handover controls. Historical decisions and completed implementation evidence are not reclassified. This is a documentation decision, not a production deployment or sprint-closure claim.

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
2. **Academic structures change.** A new year creates year-specific school-class records and student placements. Teachers create the associated new-year subject classrooms; the system records their teaching assignments and validated subject enrollments. Continuing class-group identity and annual records are distinct.
3. **History is never overwritten.** Previous classes, assignments, enrollments, assessments, mastery evidence, interventions, curriculum versions and audit records remain attached to their original academic year.
4. **Normal annual progression uses no invitation.** Existing students are not asked to register again or redeem invitations for ordinary grade progression. Eligible subject enrollments are fulfilled from approved placements once the subject classroom and its authorized teacher exist.
5. **The school admin is the sole rollover authority.** Teachers and students cannot approve, execute or alter official progression decisions. Teacher creation of a subject classroom is not a student promotion decision.
6. **The system automates processing, not institutional judgment.** It may propose normal promotion and detect errors, but it cannot independently decide repetition, transfer, departure or an unresolved placement.
7. **Every protected action is school-scoped and server-authorized.** A user’s general role is insufficient; the system must verify the exact school, academic year, class, programme and effective assignment or membership.
8. **Historical years are read-only.** Closing or archiving a year prevents new learning evidence from being written into it.
9. **Unavailable delivery cannot receive active learner enrollments.** An unpublished programme, missing subject classroom, invalid teaching assignment or unresolved classroom claim produces an explicit pending or blocked state. Approved school placement and active subject delivery are different states.
10. **User-facing language is natural Armenian.** Terminology must be consistent across all roles and pages.
11. **Teacher workflow is preserved.** The Headmaster grants primary/additional subject authorization; teachers use controlled subject, grade and class-designation dropdowns to create their own subject classrooms. Names are generated, with no optional custom-title field in the new workflow. Creation must reuse the correct year-specific school class rather than duplicate it.

## 3. Authority and responsibilities

| Actor | Permitted responsibility |
|---|---|
| School admin | Create and manage academic years; authorize teacher subjects; approve school-class continuations and student progression; validate and confirm rollover; appoint/replace homeroom teachers; resolve placement or teaching-claim conflicts and exceptional handovers; initiate verified school-assisted recovery. Routine teacher-to-grade/class allocation is not required. |
| Teacher | Create subject classrooms within current school/subject/year authorization using the controlled selectors; receive system-recorded teaching responsibility for those classrooms; invite genuinely new learners; view eligible resulting rosters and authorized history; no student-rollover authority. |
| Student | Continue using the same account; view the resulting current placement and personal historical learning record; no rollover action. |
| Master admin | Platform support, security and audited troubleshooting only; no routine school rollover. |
| System | Generate progression proposals; validate dependencies; execute confirmed placement batches; create teaching-assignment records during authorized teacher classroom creation; fulfill eligible subject enrollments from approved placements; prevent duplication; preserve history; produce audit/reconciliation reports. |

Teachers may discuss a learner’s situation with school leadership through the school’s normal administrative process, but HaiEdu does not give teachers a promotion/repetition decision control.

A subject authorization grants eligibility to teach that subject, not access to every existing classroom or learner in it. Selecting an occupied teaching context must not silently transfer another teacher’s class or grant its roster; conflicting claims require a controlled administrative resolution. A primary subject is a label/default selected from authorized subjects, not a separate privilege escalation path.

## 4. Academic-year lifecycle and mandatory order

The policy does not require a school to create its next academic year months in advance. The new academic-year record must nevertheless exist before new classes, assignments or placements can reference it.

“Created” and “visible as the active year” must be separate states. School-class placement and subject-classroom readiness must also be separate.

### Required sequence

1. The school admin creates the new academic year in **setup** status. The current year continues operating.
2. The system proposes target year-specific school classes and their explicit continuation relationships. The school admin resolves splits, merges, grade repetition, incoming groups and other exceptions. One school/year/grade/standardized designation identifies one ordinary school class; different years and distinct incoming groups remain distinct.
3. The system generates student progression proposals from the stored school-class placements, not from a temporary union of current subject rosters. No student data changes during proposal generation.
4. The school admin resolves placement exceptions, reviews the before/after preview and confirms validated outcomes. The system applies them through resumable, idempotent batches, preserving source placements and history.
5. Teachers create their new-year subject classrooms through the same subject/grade/class-designation workflow when the target year permits creation. These classrooms link to the prepared school classes. The system records the creating teacher’s authorized assignment; the Headmaster does not routinely choose each teacher’s grade/class.
6. The system creates or reuses eligible subject enrollments from approved current-year placements only when the subject classroom, teacher authorization/assignment, programme and release pass validation. Existing students do not need new accounts or routine invitations. Genuinely new learners retain the invitation path.
7. Missing subject classrooms, unpublished programmes and unresolved teaching claims remain visibly pending. Completing a missing prerequisite retries only the affected pending enrollments; it never invents a classroom, silently assigns last year’s teacher or reuses the previous grade’s curriculum.
8. The school admin activates the year according to explicit placement and delivery-readiness checks. A permitted pending subject must be shown as pending, never as an empty but ready course. The implementation contract must specify when teacher creation is enabled for setup versus active years before rollout; no current endpoint may be opened implicitly by this policy.
9. The outgoing year becomes **closed** and subsequently **archived** according to school policy. Its unused invitations cannot reopen historical enrollment or learning activity.

A roster or target structure change after preview requires revalidation before the affected rollover is applied. Academic-year activation must not make unresolved placements or unavailable subject delivery appear complete. Teacher creation and pending-enrollment fulfillment may happen at different times, but student progression remains a school-admin decision.

## 5. Teacher continuity and assignment procedure

Teacher accounts are not rolled over. Teachers create new year-specific subject classrooms within their existing, valid school and subject authorizations. A teacher may teach Grade 7 again with a different student group; the system must not assume that the teacher follows last year’s students into Grade 8.

### Preconditions

Before creating a subject classroom and its assignment, the system must verify that:

- the acting teacher has an active account, live session and active teacher membership in the exact school;
- the academic year permits the requested creation operation;
- the school-class record belongs to the target school, academic year, grade and standardized designation;
- the teacher is authorized for the selected subject/programme;
- the programme and curriculum release satisfy publication and delivery gates;
- assignment dates are valid;
- no prohibited duplicate classroom, conflicting teaching claim or overlapping assignment is created.

During initial onboarding, authorized subject-classroom creation may create a missing school-class record under the approved standardized-identifier rules. During continuation/rollover, it must reuse the target school-class record or route a conflict for resolution rather than create a competing class. Arbitrary classroom titles, student names and present-day membership must not be used to infer historical institutional identity.

### Result

The system creates a time-bounded `teacher_assignments` record for the creating teacher and the new subject classroom in the authorized creation operation. It does not create or modify the teacher’s Auth account, password or permanent profile. It may fulfill eligible, approved student subject placements without further invitations; permission to teach a subject alone never exposes unrelated classrooms.

### Additional subject authorization

The school admin manages authorized subjects on the existing teacher’s page: select an available additional subject, confirm and record the grant. No new teacher account or registration invitation is required. The teacher’s classroom-creation subject selector then includes the newly authorized subject. Primary-subject selection remains a label/default; adding, removing or changing it must not silently alter unrelated subject grants or historical assignments. Revocation requires an impact preview for affected assignments and an audited, fail-closed access change.

### Exceptional teacher handover

Handover is a separate controlled administrative workflow, not a prerequisite to ordinary teacher classroom creation. When a teacher changes during the year:

1. end the previous assignment at an exact effective time;
2. create the replacement assignment from that time;
3. preserve the class, roster, evidence and previous teacher’s authorship;
4. remove the former teacher’s write access immediately;
5. give the replacement teacher only the learner context authorized for the current assignment.

The new teacher may receive current class evidence and relevant prerequisite summaries. They must not automatically receive unrelated classes, unrelated subjects, another teacher’s private drafts or activity occurring outside their assignment period.

Homeroom appointment is distinct from subject assignment. The Headmaster selects an eligible active teacher for the school class; confirmed replacement ends the old appointment, creates the new dated appointment and transfers only explicit homeroom permissions. It does not transfer subject classrooms or permit student progression decisions.

## 6. Student progression procedure

The approved model is **school-admin-controlled, supervised bulk rollover**, separate from teacher-created subject-classroom setup.

### 6.1 Proposal generation

The system loads active school-class placements from the outgoing year and proposes the ordinary next-grade outcome for eligible students.

Each student receives one proposed institutional outcome:

- promote to the next grade;
- remain in the same grade;
- transfer to another class within the school;
- leave the institution;
- decision pending.

No data changes occur during proposal generation. Removing a student from one subject classroom does not, by itself, remove their school-class placement or exclude them from progression.

### 6.2 School-admin review

The school admin works from a dedicated rollover workspace with:

- search and filters by grade, class and status;
- bulk selection for ordinary promotion;
- individual controls for exceptional outcomes;
- a consolidated count of each outcome;
- missing school-class, subject-classroom, authorized-teacher and programme warnings;
- duplicate and conflicting placement warnings.

The school admin reviews exceptions rather than manually recreating every learner enrollment or allocating every teacher to a grade/class.

### 6.3 Validation

Before confirmation, the system must verify that:

- the source and target years belong to the same school;
- each student has no more than one active primary school-class placement at a time within that school and academic year;
- every target school class belongs to the correct school and academic year;
- no duplicate active placement or subject enrollment will be created;
- every subject enrollment activated now has an existing subject classroom and a valid teacher assignment;
- required programmes and curriculum releases are published before active subject delivery;
- missing delivery dependencies leave the affected subject enrollment pending rather than silently selecting a teacher or class;
- leaving students receive no new placements;
- pending student progression decisions remain visibly unresolved;
- previewed source and target records have not changed without revalidation;
- cross-school data is never read or written.

### 6.4 Confirmation and processing

The school admin receives a before/after preview and explicitly confirms the rollover.

For each validated student, the system creates:

- a new year-specific school-class placement;
- the corresponding validated subject enrollments where classrooms and authorized assignments already exist, or explicit pending subject-enrollment intents where dependencies remain missing;
- links to the source placement and rollover operation;
- an audit record containing the actor, school, source year, target year, outcome and timestamp.

The outgoing placement and learning evidence remain unchanged.

Large rollovers must not use one enormous database transaction. Processing must be resumable and idempotent, with each student’s change atomic and each batch reconciled. Retrying a completed item must return the existing result rather than create duplicates.

Unresolved student progression remains pending and is excluded from accidental active placement. Separately, an approved school-class placement may have a pending subject where the agreed readiness policy permits it. When the teacher creates the missing subject classroom, the system revalidates and fulfills only eligible pending enrollments, without requiring ordinary rollover invitations. Concurrent fulfillment, teacher creation and membership termination must not duplicate enrollment or revive ended access.

## 7. Canonical student placement

The student’s current grade must not be inferred from interface text such as `Ֆիզիկա 7` or from whichever subject card happens to load first.

HaiEdu should maintain a canonical year-specific student placement containing at least:

- school;
- academic year;
- student membership;
- current grade and standardized school-class identity;
- progression outcome;
- placement status;
- source placement;
- rollover operation;
- effective and audit information.

The student dashboard resolves its year and grade from this canonical placement. Subject cards are then loaded from the student’s authorized class enrollments.

One student account may have several subject-classroom enrollments but appears once in its school-class roster. Deduplication uses the permanent student identity, never first/last name matching. A new year-specific 7A for a different incoming group is not a duplicate of last year’s 7A. Group continuation is explicit and does not overwrite annual records.

## 8. Missing classrooms or unpublished programmes

The system must not silently enroll a student in an unpublished programme or reuse the previous grade’s programme. A teacher must not be selected automatically merely because they taught the same subject or students last year.

If the entire target grade is unavailable, the student’s placement remains pending.

If the target grade exists but one required subject programme or subject classroom is unavailable, the grade placement may activate only when the approved readiness policy allows it, while the affected subject enrollment remains pending and unavailable. A missing teacher-created classroom does not authorize replacing teacher creation with compulsory Headmaster grade/class allocation.

Every blocked item must include a machine-readable reason and a natural Armenian explanation. A school admin cannot override the publication requirement. Once the missing programme is published or the authorized teacher creates the missing classroom, the system revalidates and retries only the unresolved items.

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

- academic-year management;
- primary/additional teacher subject authorization and oversight of teacher-created classrooms;
- school-class rosters and homeroom appointment/replacement;
- exceptional teaching-claim resolution and handover, not mandatory allocation of every teacher to grades/classes;
- student progression and rollover;
- unresolved placements and delivery-readiness failures;
- previous academic years and year-specific analytics;
- controlled student account-recovery cases.

The rollover workspace may use steps or tabs for proposal, review, validation, confirmation and completion. These stages do not each require an independent page.

### Teacher dashboard

The teacher dashboard should contain:

- subject-classroom creation through side-by-side subject, grade and class-designation dropdowns where width permits, stacked accessibly on narrow screens;
- clearly displayed school/year context and system-generated classroom titles, with no optional custom-title field in the new flow;
- current teaching assignments, active subject classrooms and validated resulting rosters;
- previous-year or archived classes;
- year-specific historical analytics within authorized assignments;
- the existing account and access section;
- a homeroom area only for current authorized homeroom appointments.

It must not contain controls for creating academic years, assigning other teachers, confirming school-wide rollover or deciding official student progression. A homeroom appointment does not grant those powers. Existing custom titles and rename behavior are legacy migration concerns; this policy must not cause unreviewed bulk changes to existing classrooms.

### Student dashboard

The student dashboard requires:

- a prominent active academic-year and current-grade indicator;
- current-year subjects and classes;
- a clear placement-pending message when necessary;
- explicit subject-not-ready messages for missing classroom/programme dependencies, distinguished from unresolved student progression;
- one dedicated previous-years/learning-history page;
- the existing account and access section.

Students do not need a rollover page because they do not perform the operation.

## 11. Historical classrooms and analytics

Previous-year classes must be available through a dedicated read-only history area.

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

Rollover must not be introduced through a disruptive, system-wide replacement. The approved responsibility correction is not authority to deploy code or silently change live classroom-creation rules.

Required release sequence:

1. specify the bounded school-class, teacher-creation, pending-enrollment and year-readiness contract; add schema, constraints and server-authorized operations without changing current user behaviour;
2. generate a read-only mapping preview and reconciliation reports; backfill only verified existing relationships;
3. verify Test School data;
4. run two-school tenant-isolation tests;
5. enable the new read path behind a school-level feature flag;
6. compare old and new outputs;
7. introduce new writes while maintaining temporary compatibility;
8. run a complete rollback-only rollover simulation;
9. run authenticated browser tests for every affected role;
10. enable the workflow for one controlled school;
11. retire replaced paths only after production parity is demonstrated.

Every privileged operation must be:

- authenticated with a live session;
- authorized against the exact school and academic context;
- idempotent;
- audited;
- protected from concurrent duplicate execution;
- recoverable through resumable processing;
- tested for cross-school denial;
- corrected through new compensating records rather than deletion of history once learner activity exists.

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

- an existing teacher creates a new-year subject classroom and receives the correct assignment without a new account or routine Headmaster grade/class allocation;
- controlled subject, grade and designation selections generate the classroom title without free-text naming;
- multiple teachers creating different subjects for the same school/year/grade/designation reuse one school-class record, including concurrent creation;
- occupied subject-classroom claims do not silently grant another teacher’s learner access;
- a teacher who teaches Grade 7 again receives the incoming Grade 7 group rather than automatically following the outgoing group to Grade 8;
- a replacement teacher can take over without rewriting historical authorship;
- a school admin can process a large rollover through proposal, validation and confirmation;
- ordinary students progress without invitations or new accounts;
- approved student placements fulfill subject enrollments when eligible teacher-created classrooms exist, while missing classrooms remain explicitly pending;
- repeat, transfer, leaving and pending outcomes behave correctly;
- a student with lost credentials can still be progressed and later recover the same account;
- unpublished programmes create a visible pending/blocked state;
- the student dashboard shows the canonical active year and grade;
- previous years remain accessible and read-only;
- analytics never mix years by default;
- two-school tests prove mutual denial of private records and actions;
- retries create no duplicate school classes, placements, enrollments or assignments;
- every privileged action has a complete audit trail;
- old workflows remain functional during the controlled migration;
- all affected interfaces use approved, natural and consistent Armenian.
