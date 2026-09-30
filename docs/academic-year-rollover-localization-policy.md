# HaiEdu Academic-Year Rollover, Continuity and Localization Policy

**Policy status:** Approved design standard for future implementation  
**Primary implementation sprint:** Sprint 18.5 — Academic-Year Lifecycle, Rollover & Continuity  
**Related foundations:** Sprint 14 academic identity, tenant isolation and school-scoped evidence  
**Localization implementation:** Immediate cross-platform release policy; centralized localization architecture in Sprint 18  
**Related later work:** Sprint 23 longitudinal learner profile; Sprint 24 advanced analytics

## 1. Purpose

This policy defines how HaiEdu must move schools, teachers, classes and students from one academic year to the next without recreating user accounts, overwriting historical evidence, confusing roles or disrupting existing functionality.

It also establishes a platform-wide localization policy requiring natural, consistent Armenian throughout every user-facing interface.

The policy governs:

- academic-year creation, setup, activation, closure and archiving;
- teacher assignment and teacher handover;
- student grade progression and class enrollment;
- historical classrooms and learning evidence;
- year-scoped analytics;
- student account recovery;
- safe migration from existing class ownership behaviour;
- Armenian interface terminology and language quality.

## 2. Non-negotiable invariants

1. **Accounts persist.** Teachers and students keep the same Auth identity, profile, login history and permanent internal account ID across academic years.
2. **Academic structures change.** A new year creates new class instances, teacher assignments, student placements and class enrollments.
3. **History is never overwritten.** Previous classes, assignments, enrollments, assessments, mastery evidence, interventions, curriculum versions and audit records remain attached to their original academic year.
4. **Normal annual progression uses no invitation.** Existing students are not asked to register again or redeem invitations for ordinary grade progression.
5. **The school admin is the sole rollover authority.** Teachers and students cannot approve, execute or alter official progression decisions.
6. **The system automates processing, not institutional judgment.** It may propose normal promotion and detect errors, but it cannot independently decide repetition, transfer, departure or an unresolved placement.
7. **Every protected action is school-scoped and server-authorized.** A user’s general role is insufficient; the system must verify the exact school, academic year, class, programme and effective assignment or membership.
8. **Historical years are read-only.** Closing or archiving a year prevents new learning evidence from being written into it.
9. **Unpublished programmes cannot receive active learner enrollments.** Missing curriculum readiness produces a clear pending or blocked state.
10. **User-facing language is natural Armenian.** Terminology must be consistent across all roles and pages.

## 3. Authority and responsibilities

| Actor | Permitted responsibility |
|---|---|
| School admin | Create and manage the school’s academic years; configure new-year classes; assign existing teachers; decide progression outcomes; validate and confirm rollover; manage exceptions; initiate verified school-assisted recovery |
| Teacher | View current assignments and resulting rosters; use current classes; view authorized historical classes; no rollover authority |
| Student | Continue using the same account; view the resulting current placement and personal historical learning record; no rollover action |
| Master admin | Platform support, security and audited troubleshooting only; no routine school rollover |
| System | Generate proposals, validate dependencies, execute confirmed batches, prevent duplication, preserve history and produce audit/reconciliation reports |

Teachers may discuss a learner’s situation with school leadership through the school’s normal administrative process, but HaiEdu does not give teachers a promotion/repetition decision control.

## 4. Academic-year lifecycle and mandatory order

The policy does not require a school to create its next academic year months in advance. The new academic-year record must nevertheless exist before new classes, assignments or placements can reference it.

“Created” and “visible as the active year” must be separate states.

### Required sequence

1. The school admin creates the new academic year.
2. The new year enters **setup** status and is not yet presented to ordinary users as their active year.
3. The school configures new class instances and confirms that required subject programmes and curriculum releases are published.
4. The school admin assigns existing teachers to the appropriate new-year classes.
5. The system generates proposed student progression and enrollment records.
6. The school admin resolves exceptions and validation failures.
7. The school admin reviews a before/after summary and confirms the rollover.
8. The system applies validated teacher assignments, student placements and enrollments through resumable, idempotent batches.
9. The new academic year becomes **active**.
10. The outgoing year becomes **closed** and subsequently **archived** according to school policy.

Students must never be shown a partially configured new year containing empty classes, missing teachers or unpublished programmes.

## 5. Teacher continuity and assignment procedure

Teacher accounts are not rolled over. The school admin assigns an existing teacher identity to a new year-specific class.

### Preconditions

Before creating an assignment, the system must verify that:

- the acting school admin has an active membership in the exact school;
- the teacher has an active teacher membership in that school;
- the class belongs to the target school and academic year;
- the teacher is authorized for the required subject/programme;
- the programme and curriculum release are published;
- assignment dates are valid;
- no prohibited overlapping assignment exists.

### Result

The system creates a time-bounded `teacher_assignments` record. It does not create or modify the teacher’s Auth account, password or permanent profile.

### Teacher handover

When a teacher changes during the year:

1. end the previous assignment at an exact effective time;
2. create the replacement assignment from that time;
3. preserve the class, roster, evidence and previous teacher’s authorship;
4. remove the former teacher’s write access immediately;
5. give the replacement teacher only the learner context authorized for the current assignment.

The new teacher may receive current class evidence and relevant prerequisite summaries. They must not automatically receive unrelated classes, unrelated subjects, another teacher’s private drafts or activity occurring outside their assignment period.

## 6. Student progression procedure

The approved model is **school-admin-controlled, supervised bulk rollover**.

### 6.1 Proposal generation

The system loads active placements from the outgoing year and proposes the ordinary next-grade outcome for eligible students.

Each student receives one proposed institutional outcome:

- promote to the next grade;
- remain in the same grade;
- transfer to another class within the school;
- leave the institution;
- decision pending.

No data changes occur during proposal generation.

### 6.2 School-admin review

The school admin works from a dedicated rollover workspace with:

- search and filters by grade, class and status;
- bulk selection for ordinary promotion;
- individual controls for exceptional outcomes;
- a consolidated count of each outcome;
- missing-class, missing-teacher and missing-programme warnings;
- duplicate and conflicting placement warnings.

The school admin reviews exceptions rather than manually recreating every learner enrollment.

### 6.3 Validation

Before confirmation, the system must verify that:

- the source and target years belong to the same school;
- each student has no more than one primary target grade placement;
- every target class belongs to the correct school and academic year;
- no duplicate active enrollment will be created;
- required teacher assignments exist;
- required programmes and curriculum releases are published;
- leaving students receive no new placements;
- pending students remain visibly unresolved;
- cross-school data is never read or written.

### 6.4 Confirmation and processing

The school admin receives a before/after preview and explicitly confirms the rollover.

For each validated student, the system creates:

- a new year-specific placement;
- the corresponding new class enrollments;
- links to the source placement and rollover operation;
- an audit record containing the actor, school, source year, target year, outcome and timestamp.

The outgoing placement and learning evidence remain unchanged.

Large rollovers must not use one enormous database transaction. Processing must be resumable and idempotent, with each student’s change atomic and each batch reconciled. Retrying a completed item must return the existing result rather than create duplicates.

Unresolved students remain pending and are excluded from accidental active placement.

## 7. Canonical student placement

The student’s current grade must not be inferred from interface text such as `Ֆիզիկա 7` or from whichever subject card happens to load first.

HaiEdu should maintain a canonical year-specific student placement containing at least:

- school;
- academic year;
- student membership;
- current grade;
- progression outcome;
- placement status;
- source placement;
- rollover operation;
- effective and audit information.

The student dashboard resolves its year and grade from this canonical placement. Subject cards are then loaded from the student’s authorized class enrollments.

## 8. Missing or unpublished programmes

The system must not silently enroll a student in an unpublished programme or reuse the previous grade’s programme.

If the entire target grade is unavailable, the student’s placement remains pending.

If the target grade exists but one required subject programme is unavailable, the grade placement may activate only when school policy allows it, while the affected subject enrollment remains pending and unavailable.

Every blocked item must include a machine-readable reason and a natural Armenian explanation. A school admin cannot override the publication requirement. Once the missing programme is published, the system retries only the unresolved items.

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
- teacher assignment and handover;
- student progression and rollover;
- unresolved placements and validation failures;
- previous academic years and year-specific analytics;
- controlled student account-recovery cases.

The rollover workspace may use steps or tabs for proposal, review, validation, confirmation and completion. These stages do not each require an independent page.

### Teacher dashboard

The teacher dashboard should contain:

- current assignments and active classes;
- previous-year or archived classes;
- year-specific historical analytics within authorized assignments;
- the existing account and access section.

It must not contain controls for creating academic years, assigning other teachers, confirming school-wide rollover or deciding official student progression.

### Student dashboard

The student dashboard requires:

- a prominent active academic-year and current-grade indicator;
- current-year subjects and classes;
- a clear placement-pending message when necessary;
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

Classes must not remain permanently owned by the teacher who originally created them. `teacher_assignments` becomes the authoritative source of teaching responsibility.

This change must be gradual:

1. introduce one canonical assignment resolver while retaining the existing class-level teacher field for compatibility;
2. backfill and verify assignment records for existing institutional classes;
3. temporarily maintain both representations and reject inconsistencies;
4. compare old and new authorization/query results in testing;
5. switch permissions, dashboards and analytics to `teacher_assignments`;
6. retain the legacy field temporarily without using it as authority;
7. remove or repurpose it only after verified production parity.

Reassignment must never rewrite the class creator or previous teacher’s historical authorship.

## 13. Safe implementation and release policy

Rollover must not be introduced through a disruptive, system-wide replacement.

Required release sequence:

1. add the new schema, constraints and server-authorized operations without changing current user behaviour;
2. backfill existing records and generate reconciliation reports;
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

- an existing teacher receives a new-year assignment without a new account;
- a replacement teacher can take over without rewriting historical authorship;
- a school admin can process a large rollover through proposal, validation and confirmation;
- ordinary students progress without invitations or new accounts;
- repeat, transfer, leaving and pending outcomes behave correctly;
- a student with lost credentials can still be progressed and later recover the same account;
- unpublished programmes create a visible pending/blocked state;
- the student dashboard shows the canonical active year and grade;
- previous years remain accessible and read-only;
- analytics never mix years by default;
- two-school tests prove mutual denial of private records and actions;
- retries create no duplicate placements, enrollments or assignments;
- every privileged action has a complete audit trail;
- old workflows remain functional during the controlled migration;
- all affected interfaces use approved, natural and consistent Armenian.
