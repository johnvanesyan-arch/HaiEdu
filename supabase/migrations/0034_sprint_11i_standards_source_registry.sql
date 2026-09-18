-- Sprint 11I: National Standards Baseline & Source Registry
-- Registers authoritative curriculum sources and binds every implemented
-- subject-grade programme to a governing source set or an explicit fixture exemption.

create table if not exists public.curriculum_authorities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_hy text not null,
  name_en text,
  country_code text not null default 'AM',
  authority_type text not null,
  official_url text,
  lifecycle_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_authorities_code_check
    check (code = lower(code) and code ~ '^[a-z0-9][a-z0-9_]*$'),
  constraint curriculum_authorities_type_check
    check (authority_type in ('government','ministry','agency','publisher','other')),
  constraint curriculum_authorities_lifecycle_check
    check (lifecycle_status in ('active','inactive'))
);

create table if not exists public.curriculum_source_documents (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  authority_id uuid not null references public.curriculum_authorities(id) on delete restrict,
  source_class text not null,
  document_type text not null,
  subject_id uuid references public.subjects(id) on delete restrict,
  grade_id uuid references public.grades(id) on delete restrict,
  title_hy text not null,
  title_en text,
  legal_identifier text,
  current_amendment_identifier text,
  version_label text not null,
  official_url text not null,
  adopted_on date,
  current_revision_published_on date,
  effective_from date,
  effective_to date,
  revision_status text not null default 'unverified',
  verification_status text not null default 'provisional',
  supersedes_document_id uuid references public.curriculum_source_documents(id) on delete restrict,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_source_documents_key_check
    check (source_key = lower(source_key) and source_key ~ '^[a-z0-9][a-z0-9_]*$'),
  constraint curriculum_source_documents_class_check
    check (source_class in ('normative','instructional','supplementary')),
  constraint curriculum_source_documents_type_check
    check (document_type in ('national_framework','subject_standard','grade_programme','textbook','supplementary_reference')),
  constraint curriculum_source_documents_revision_check
    check (revision_status in ('current','superseded','historical','draft','unverified')),
  constraint curriculum_source_documents_verification_check
    check (verification_status in ('verified','provisional','rejected')),
  constraint curriculum_source_documents_dates_check
    check (effective_to is null or effective_from is null or effective_to >= effective_from),
  constraint curriculum_source_documents_not_self_superseding_check
    check (supersedes_document_id is null or supersedes_document_id <> id),
  constraint curriculum_source_documents_scope_check
    check (
      (document_type = 'national_framework' and subject_id is null and grade_id is null)
      or (document_type = 'subject_standard' and subject_id is not null and grade_id is null)
      or (document_type = 'grade_programme' and subject_id is not null and grade_id is not null)
      or document_type in ('textbook','supplementary_reference')
    )
);

create table if not exists public.subject_program_source_bindings (
  subject_program_id uuid primary key references public.subject_programs(id) on delete cascade,
  framework_document_id uuid references public.curriculum_source_documents(id) on delete restrict,
  subject_standard_document_id uuid references public.curriculum_source_documents(id) on delete restrict,
  programme_document_id uuid references public.curriculum_source_documents(id) on delete restrict,
  applicability_status text not null,
  fixture_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_program_source_bindings_status_check
    check (applicability_status in ('governing','fixture_exempt','unresolved')),
  constraint subject_program_source_bindings_completeness_check
    check (
      (
        applicability_status = 'governing'
        and framework_document_id is not null
        and subject_standard_document_id is not null
        and programme_document_id is not null
        and fixture_reason is null
      )
      or (
        applicability_status = 'fixture_exempt'
        and framework_document_id is null
        and subject_standard_document_id is null
        and programme_document_id is null
        and nullif(trim(fixture_reason), '') is not null
      )
      or applicability_status = 'unresolved'
    )
);

create index if not exists curriculum_source_documents_authority_idx
  on public.curriculum_source_documents(authority_id);
create index if not exists curriculum_source_documents_subject_grade_idx
  on public.curriculum_source_documents(subject_id, grade_id, document_type, revision_status);
create index if not exists curriculum_source_documents_supersedes_idx
  on public.curriculum_source_documents(supersedes_document_id)
  where supersedes_document_id is not null;
create index if not exists subject_program_source_bindings_framework_idx
  on public.subject_program_source_bindings(framework_document_id)
  where framework_document_id is not null;
create index if not exists subject_program_source_bindings_standard_idx
  on public.subject_program_source_bindings(subject_standard_document_id)
  where subject_standard_document_id is not null;
create index if not exists subject_program_source_bindings_programme_idx
  on public.subject_program_source_bindings(programme_document_id)
  where programme_document_id is not null;

create or replace function private.set_row_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_curriculum_authorities_updated_at on public.curriculum_authorities;
create trigger trg_curriculum_authorities_updated_at
before update on public.curriculum_authorities
for each row execute function private.set_row_updated_at();

drop trigger if exists trg_curriculum_source_documents_updated_at on public.curriculum_source_documents;
create trigger trg_curriculum_source_documents_updated_at
before update on public.curriculum_source_documents
for each row execute function private.set_row_updated_at();

drop trigger if exists trg_subject_program_source_bindings_updated_at on public.subject_program_source_bindings;
create trigger trg_subject_program_source_bindings_updated_at
before update on public.subject_program_source_bindings
for each row execute function private.set_row_updated_at();

alter table public.curriculum_authorities enable row level security;
alter table public.curriculum_source_documents enable row level security;
alter table public.subject_program_source_bindings enable row level security;

drop policy if exists curriculum_authorities_read on public.curriculum_authorities;
create policy curriculum_authorities_read on public.curriculum_authorities
for select to authenticated
using (
  lifecycle_status = 'active'
  or private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role])
);

drop policy if exists curriculum_authorities_write on public.curriculum_authorities;
create policy curriculum_authorities_write on public.curriculum_authorities
for all to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));

drop policy if exists curriculum_source_documents_read on public.curriculum_source_documents;
create policy curriculum_source_documents_read on public.curriculum_source_documents
for select to authenticated
using (
  (verification_status = 'verified' and revision_status = 'current')
  or private.current_user_role() = any (array['teacher'::public.user_role,'admin'::public.user_role,'content_admin'::public.user_role])
);

drop policy if exists curriculum_source_documents_write on public.curriculum_source_documents;
create policy curriculum_source_documents_write on public.curriculum_source_documents
for all to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));

drop policy if exists subject_program_source_bindings_read on public.subject_program_source_bindings;
create policy subject_program_source_bindings_read on public.subject_program_source_bindings
for select to authenticated
using (
  exists (
    select 1
    from public.subject_programs sp
    where sp.id = subject_program_id
      and (
        sp.status = 'published'::public.content_status
        or private.current_user_role() = any (array['teacher'::public.user_role,'admin'::public.user_role,'content_admin'::public.user_role])
      )
  )
);

drop policy if exists subject_program_source_bindings_write on public.subject_program_source_bindings;
create policy subject_program_source_bindings_write on public.subject_program_source_bindings
for all to authenticated
using (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]))
with check (private.current_user_role() = any (array['admin'::public.user_role,'content_admin'::public.user_role]));

revoke all on public.curriculum_authorities from public, anon;
revoke all on public.curriculum_source_documents from public, anon;
revoke all on public.subject_program_source_bindings from public, anon;
grant select, insert, update, delete on public.curriculum_authorities to authenticated;
grant select, insert, update, delete on public.curriculum_source_documents to authenticated;
grant select, insert, update, delete on public.subject_program_source_bindings to authenticated;
grant all on public.curriculum_authorities to service_role;
grant all on public.curriculum_source_documents to service_role;
grant all on public.subject_program_source_bindings to service_role;

insert into public.curriculum_authorities (
  code, name_hy, name_en, authority_type, official_url, lifecycle_status
)
values
  (
    'ra_government',
    'Հայաստանի Հանրապետության կառավարություն',
    'Government of the Republic of Armenia',
    'government',
    'https://www.gov.am/',
    'active'
  ),
  (
    'ra_mescs',
    'Հայաստանի Հանրապետության կրթության, գիտության, մշակույթի և սպորտի նախարարություն',
    'Ministry of Education, Science, Culture and Sport of the Republic of Armenia',
    'ministry',
    'https://escs.am/',
    'active'
  )
on conflict (code) do update
set name_hy = excluded.name_hy,
    name_en = excluded.name_en,
    authority_type = excluded.authority_type,
    official_url = excluded.official_url,
    lifecycle_status = excluded.lifecycle_status;

insert into public.curriculum_source_documents (
  source_key, authority_id, source_class, document_type, title_hy, title_en,
  legal_identifier, current_amendment_identifier, version_label, official_url,
  adopted_on, current_revision_published_on, effective_from, revision_status,
  verification_status, verified_at, notes
)
select
  'am_general_education_standard_439n_699n', a.id, 'normative', 'national_framework',
  'Հանրակրթության պետական չափորոշիչ',
  'Armenian General Education State Standard',
  'N 439-Ն', 'N 699-Ն',
  'Current official incorporation, amended 21 May 2026 by N 699-Ն',
  'https://www.arlis.am/hy/acts/225446',
  date '2010-04-08', date '2026-05-21', date '2026-05-22',
  'current', 'verified', now(),
  'ARLIS official incorporation. The current incorporated revision is in force from 22 May 2026.'
from public.curriculum_authorities a
where a.code = 'ra_government'
on conflict (source_key) do update
set authority_id = excluded.authority_id,
    title_hy = excluded.title_hy,
    title_en = excluded.title_en,
    legal_identifier = excluded.legal_identifier,
    current_amendment_identifier = excluded.current_amendment_identifier,
    version_label = excluded.version_label,
    official_url = excluded.official_url,
    adopted_on = excluded.adopted_on,
    current_revision_published_on = excluded.current_revision_published_on,
    effective_from = excluded.effective_from,
    revision_status = excluded.revision_status,
    verification_status = excluded.verification_status,
    verified_at = excluded.verified_at,
    notes = excluded.notes;

insert into public.curriculum_source_documents (
  source_key, authority_id, source_class, document_type, subject_id,
  title_hy, title_en, legal_identifier, current_amendment_identifier,
  version_label, official_url, adopted_on, current_revision_published_on,
  effective_from, revision_status, verification_status, verified_at, notes
)
select
  'am_physics_standard_42n_37n', a.id, 'normative', 'subject_standard', s.id,
  '«Ֆիզիկա» առարկայի 7-12-րդ դասարանների առարկայական չափորոշիչ',
  'Physics subject standard for Grades 7-12',
  'N 42-Ն', 'N 37-Ն',
  'N 42-Ն with the appendix replaced by N 37-Ն, effective 14 August 2026',
  'https://www.arlis.am/hy/acts/229259',
  date '2023-03-30', date '2026-08-13', date '2026-08-14',
  'current', 'verified', now(),
  'ARLIS amendment record containing the current full appendix. The base order is N 42-Ն; N 37-Ն replaces its appendix.'
from public.curriculum_authorities a
join public.subjects s on s.code = 'physics'
where a.code = 'ra_mescs'
on conflict (source_key) do update
set authority_id = excluded.authority_id,
    subject_id = excluded.subject_id,
    title_hy = excluded.title_hy,
    title_en = excluded.title_en,
    legal_identifier = excluded.legal_identifier,
    current_amendment_identifier = excluded.current_amendment_identifier,
    version_label = excluded.version_label,
    official_url = excluded.official_url,
    adopted_on = excluded.adopted_on,
    current_revision_published_on = excluded.current_revision_published_on,
    effective_from = excluded.effective_from,
    revision_status = excluded.revision_status,
    verification_status = excluded.verification_status,
    verified_at = excluded.verified_at,
    notes = excluded.notes;

insert into public.curriculum_source_documents (
  source_key, authority_id, source_class, document_type, subject_id, grade_id,
  title_hy, title_en, legal_identifier, current_amendment_identifier,
  version_label, official_url, adopted_on, current_revision_published_on,
  effective_from, revision_status, verification_status, verified_at, notes
)
select
  'am_physics_grade7_programme_40n_36n', a.id, 'normative', 'grade_programme', s.id, g.id,
  '«Ֆիզիկա» առարկայի 7-րդ դասարանի ծրագիր',
  'Grade 7 Physics programme',
  'N 40-Ն', 'N 36-Ն',
  'N 40-Ն as amended and reissued by N 36-Ն, effective 14 August 2026',
  'https://www.arlis.am/hy/acts/229331',
  date '2024-05-07', date '2026-08-13', date '2026-08-14',
  'current', 'verified', now(),
  'ARLIS official incorporation for the Grades 7-12 Physics programmes; this row records the Grade 7 applicability.'
from public.curriculum_authorities a
join public.subjects s on s.code = 'physics'
join public.grades g on g.grade_number = 7
where a.code = 'ra_mescs'
on conflict (source_key) do update
set authority_id = excluded.authority_id,
    subject_id = excluded.subject_id,
    grade_id = excluded.grade_id,
    title_hy = excluded.title_hy,
    title_en = excluded.title_en,
    legal_identifier = excluded.legal_identifier,
    current_amendment_identifier = excluded.current_amendment_identifier,
    version_label = excluded.version_label,
    official_url = excluded.official_url,
    adopted_on = excluded.adopted_on,
    current_revision_published_on = excluded.current_revision_published_on,
    effective_from = excluded.effective_from,
    revision_status = excluded.revision_status,
    verification_status = excluded.verification_status,
    verified_at = excluded.verified_at,
    notes = excluded.notes;

insert into public.subject_program_source_bindings (
  subject_program_id, framework_document_id, subject_standard_document_id,
  programme_document_id, applicability_status, reviewed_at, notes
)
select sp.id, framework.id, standard.id, programme.id, 'governing', now(),
       'Physics 7 is governed by the current national framework, Physics subject standard and Grade 7 programme.'
from public.subject_programs sp
join public.subjects s on s.id = sp.subject_id and s.code = 'physics'
join public.grades g on g.id = sp.grade_id and g.grade_number = 7
join public.curriculum_source_documents framework
  on framework.source_key = 'am_general_education_standard_439n_699n'
join public.curriculum_source_documents standard
  on standard.source_key = 'am_physics_standard_42n_37n'
join public.curriculum_source_documents programme
  on programme.source_key = 'am_physics_grade7_programme_40n_36n'
on conflict (subject_program_id) do update
set framework_document_id = excluded.framework_document_id,
    subject_standard_document_id = excluded.subject_standard_document_id,
    programme_document_id = excluded.programme_document_id,
    applicability_status = excluded.applicability_status,
    fixture_reason = null,
    reviewed_at = excluded.reviewed_at,
    notes = excluded.notes;

insert into public.subject_program_source_bindings (
  subject_program_id, applicability_status, fixture_reason, reviewed_at, notes
)
select sp.id, 'fixture_exempt',
       'Sprint 11G navigation-only Mathematics fixture; it is not implemented curriculum and must not be represented as standards-aligned.',
       now(),
       'An official Mathematics standard/programme must be registered before this fixture can become implementable curriculum.'
from public.subject_programs sp
join public.subjects s on s.id = sp.subject_id and s.code = 'mathematics'
join public.grades g on g.id = sp.grade_id and g.grade_number = 7
where sp.version_label = 'Sprint 11G architecture fixture'
on conflict (subject_program_id) do update
set framework_document_id = null,
    subject_standard_document_id = null,
    programme_document_id = null,
    applicability_status = excluded.applicability_status,
    fixture_reason = excluded.fixture_reason,
    reviewed_at = excluded.reviewed_at,
    notes = excluded.notes;

update public.curriculum_frameworks
set effective_from = date '2026-05-22',
    version_label = '2026 current incorporation (N 439-Ն as amended by N 699-Ն)',
    source_url = 'https://www.arlis.am/hy/acts/225446'
where source_url = 'https://www.arlis.am/hy/acts/225446';

comment on table public.curriculum_authorities is
  'Issuing bodies for normative, instructional and supplementary curriculum sources.';
comment on table public.curriculum_source_documents is
  'Versioned source registry. Normative documents are distinct from textbooks and supplementary references.';
comment on table public.subject_program_source_bindings is
  'Subject-standard applicability matrix: governing source set, fixture exemption or unresolved source state per subject programme.';

do $$
begin
  if exists (
    select 1
    from public.subject_programs sp
    where not exists (
      select 1
      from public.subject_program_source_bindings b
      where b.subject_program_id = sp.id
    )
  ) then
    raise exception 'subject_program_source_binding_backfill_incomplete';
  end if;
end;
$$;
