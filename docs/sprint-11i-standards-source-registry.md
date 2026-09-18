# Sprint 11I — National Standards Baseline & Source Registry

**Status:** Complete  
**Completed:** 2026-09-18  
**Migrations:** `supabase/migrations/0034_sprint_11i_standards_source_registry.sql`, `supabase/migrations/0035_sprint_11i_registry_advisor_hardening.sql`

## Outcome

Sprint 11I establishes a database-backed source registry and a subject-standard applicability matrix. Every implemented `subject_program` now resolves to one of:

- a complete governing source set;
- an explicit architecture-fixture exemption; or
- an unresolved state that cannot be presented as standards-aligned.

The registry preserves the required hierarchy:

```text
National General Education State Standard
  -> Subject Standard
      -> Grade Programme
          -> Implemented Subject Programme
```

## Verified current baseline

The following records were checked against ARLIS on 18 September 2026.

| Layer | Current registered source | Effective/current status | Official source |
|---|---|---|---|
| National framework | Government Decision N 439-Ն, current incorporation amended by N 699-Ն | Current incorporated revision in force from 22 May 2026 | https://www.arlis.am/hy/acts/225446 |
| Physics subject standard, Grades 7–12 | Order N 42-Ն, with the appendix replaced by N 37-Ն | Current replacement appendix effective 14 August 2026 | https://www.arlis.am/hy/acts/229259 |
| Physics programmes, Grades 7–12 | Order N 40-Ն, amended and reissued by N 36-Ն | Current incorporation effective 14 August 2026 | https://www.arlis.am/hy/acts/229331 |

The base identifier and current amendment identifier are stored separately. This avoids presenting an amendment number as if it were the original governing act.

## Schema

### `curriculum_authorities`

Stores issuing authorities independently from documents. Initial authorities:

- Government of the Republic of Armenia;
- Ministry of Education, Science, Culture and Sport of the Republic of Armenia.

### `curriculum_source_documents`

Stores stable source identity and version/provenance metadata:

- source class: normative, instructional or supplementary;
- document type: national framework, subject standard, grade programme, textbook or supplementary reference;
- issuing authority;
- subject/grade applicability;
- base legal identifier and current amendment identifier;
- source URL;
- adoption, current-revision publication and effective dates;
- current/superseded/historical/draft status;
- verification status and timestamp;
- optional supersession relationship.

### `subject_program_source_bindings`

Acts as the subject-standard applicability matrix. A row is required for every implemented subject programme.

| Subject programme | Disposition | Framework | Subject standard | Grade programme |
|---|---|---|---|---|
| Physics 7 | `governing` | Registered | Registered | Registered |
| Mathematics 7 Sprint 11G fixture | `fixture_exempt` | Not claimed | Not claimed | Not claimed |

The Mathematics record is deliberately not dressed up as official curriculum. It remains navigation-only test data until a real Mathematics standard/programme is registered and reviewed.

## Security and integrity

- RLS is enabled on all three registry tables.
- Verified current documents are readable by authenticated users.
- Teachers and curriculum staff may inspect non-current/provisional records.
- Only `admin` and `content_admin` roles may mutate registry records through the Data API.
- Anonymous privileges are revoked.
- Foreign-key indexes support authority, applicability and supersession lookups.
- Constraints prevent incomplete `governing` bindings and require a reason for fixture exemptions.
- The migration fails if any existing subject programme lacks a binding.
- The post-migration Supabase advisor pass reports no security or actionable performance finding on the new registry tables; fresh indexes appear only in the expected unused-index informational list.

## Source classification rule

Normative authority follows this order:

1. current national framework;
2. applicable current subject standard;
3. applicable current grade programme.

Textbooks are instructional/navigation sources. SME knowledge and other references are supplementary. Neither may override a normative source.

## Source-review procedure

Run a review both event-first and periodically:

1. Monitor the official authority/ARLIS record for amendments, replacements or repeals.
2. Register the new document/version without overwriting historical source identity.
3. Record base and amendment identifiers, authority, official URL, publication/effective dates and revision status.
4. Link the new record to its predecessor where the legal relationship is a true supersession.
5. Compare affected subject/grade programmes and classify implementation impact.
6. Keep the active binding unchanged until curriculum/content review approves the replacement.
7. Update the binding and create a new curriculum release when semantics change materially.
8. Retain prior records so historical learner evidence remains interpretable.

Minimum periodic cadence: once per academic term and before every curriculum/content production release. Event-driven review takes precedence whenever an official amendment is published.

## Exit-criterion evidence

The registry can now answer which official source set governs every current subject-programme row:

- Physics 7 resolves to a complete, verified national framework → Physics standard → Grade 7 programme chain.
- Mathematics 7 resolves to an explicit fixture exemption and therefore cannot be mistaken for implemented, standards-aligned curriculum.

Sprint 11J may now perform the detailed Physics 7 outcome/skill/item reconciliation against this baseline.
