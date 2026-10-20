-- Reusable written-work extension. No course content, release or mastery rule is activated.
create table public.written_task_versions (
 id uuid primary key default gen_random_uuid(),
 task_key text not null check(length(task_key) between 1 and 160),
 version_no integer not null check(version_no>0),
 subject_program_id uuid not null references public.subject_programs(id),
 curriculum_release_id uuid not null references public.curriculum_releases(id),
 unit_id uuid not null references public.units(id),
 definition jsonb not null,
 status text not null default 'draft' check(status in ('draft','approved','retired')),
 reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz,
 review_evidence jsonb not null default '{}',
 created_at timestamptz not null default now(),
 unique(curriculum_release_id,unit_id,task_key,version_no),
 foreign key(curriculum_release_id,unit_id) references public.curriculum_release_units(curriculum_release_id,unit_id),
 check(status='draft' or (reviewed_at is not null and review_evidence<>'{}'::jsonb))
);
create unique index written_task_current_version on public.written_task_versions(curriculum_release_id,unit_id,task_key) where status='approved';
create index written_task_programme_idx on public.written_task_versions(subject_program_id);
create index written_task_unit_idx on public.written_task_versions(unit_id);
create index written_task_reviewer_idx on public.written_task_versions(reviewed_by);

create table public.written_work (
 id uuid primary key default gen_random_uuid(),
 task_version_id uuid not null references public.written_task_versions(id),
 student_id uuid not null references public.profiles(id) on delete cascade,
 enrollment_id uuid not null references public.institutional_class_enrollments(id) on delete cascade,
 school_id uuid not null references public.schools(id),
 academic_year_id uuid not null references public.academic_years(id),
 class_id uuid not null references public.classes(id),
 subject_program_id uuid not null references public.subject_programs(id),
 curriculum_release_id uuid not null references public.curriculum_releases(id),
 unit_id uuid not null references public.units(id),
 state text not null default 'draft' check(state in ('draft','submitted','changes_requested','reviewed')),
 draft_text text not null default '' check(length(draft_text)<=20000),
 revision integer not null default 0 check(revision>=0),
 current_submission_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(task_version_id,student_id,school_id,academic_year_id,class_id)
);
create index written_work_student_scope_idx on public.written_work(student_id,curriculum_release_id,unit_id);
create index written_work_queue_idx on public.written_work(school_id,academic_year_id,class_id,subject_program_id,curriculum_release_id,unit_id,state,updated_at,id);
create index written_work_enrollment_idx on public.written_work(enrollment_id);
create index written_work_task_idx on public.written_work(task_version_id);
create index written_work_year_idx on public.written_work(academic_year_id);
create index written_work_class_idx on public.written_work(class_id);
create index written_work_programme_idx on public.written_work(subject_program_id);
create index written_work_release_idx on public.written_work(curriculum_release_id);
create index written_work_unit_idx on public.written_work(unit_id);

create table public.written_submissions (
 id uuid primary key default gen_random_uuid(),
 work_id uuid not null references public.written_work(id) on delete cascade,
 version_no integer not null check(version_no>0),
 response_text text not null check(length(response_text) between 1 and 20000),
 word_count integer not null check(word_count>=0),
 assistance_snapshot jsonb not null,
 submitted_at timestamptz not null default now(),
 unique(work_id,version_no)
);
alter table public.written_work add foreign key(current_submission_id) references public.written_submissions(id);
create index written_work_current_submission_idx on public.written_work(current_submission_id);
create table public.written_reviews (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.written_submissions(id) on delete cascade,
 version_no integer not null check(version_no>0),
 decision text not null check(decision in ('assessed','return')),
 criterion_scores jsonb,
 feedback text not null check(length(btrim(feedback)) between 1 and 4000),
 assessor_id uuid references public.profiles(id) on delete set null,
 teacher_assignment_id uuid references public.teacher_assignments(id) on delete set null,
 supersedes_review_id uuid references public.written_reviews(id),
 change_reason text check(change_reason is null or length(btrim(change_reason)) between 3 and 1000),
 created_at timestamptz not null default now(),
 unique(submission_id,version_no),
 check((decision='return' and criterion_scores is null) or (decision='assessed' and jsonb_typeof(criterion_scores)='object')),
 check(supersedes_review_id is null or change_reason is not null)
);
create index written_review_assessor_idx on public.written_reviews(assessor_id);
create index written_review_assignment_idx on public.written_reviews(teacher_assignment_id);
create index written_review_supersedes_idx on public.written_reviews(supersedes_review_id);

alter table public.written_task_versions enable row level security;
alter table public.written_work enable row level security;
alter table public.written_submissions enable row level security;
alter table public.written_reviews enable row level security;
revoke all on public.written_task_versions,public.written_work,public.written_submissions,public.written_reviews from public,anon,authenticated,service_role;
grant select on public.written_task_versions to service_role;
grant select,insert,update on public.written_work to service_role;
grant select,insert on public.written_submissions,public.written_reviews to service_role;
-- Service-only RPCs use caller privileges; browser roles cannot read tables or invoke them.
grant usage on schema private to service_role;

create function private.written_word_count(p_text text) returns integer language sql immutable set search_path='' as $$
 select case when btrim(regexp_replace(p_text,U&'[\0009-\000D\0020\0085\00A0\1680\2000-\200A\2028\2029\202F\205F\3000]+',' ','g'))='' then 0
 else cardinality(string_to_array(btrim(regexp_replace(p_text,U&'[\0009-\000D\0020\0085\00A0\1680\2000-\200A\2028\2029\202F\205F\3000]+',' ','g')),' ')) end;
$$;
create function private.validate_written_task() returns trigger language plpgsql set search_path='' as $$
declare c jsonb; d jsonb:=new.definition;
begin
 if TG_OP='UPDATE' and old.reviewed_by is not null and new.reviewed_by is null and not exists(select 1 from public.profiles where id=old.reviewed_by) and (to_jsonb(new)-'reviewed_by')=(to_jsonb(old)-'reviewed_by') then return new;end if;
 if TG_OP='UPDATE' and (old.status<>'draft' and (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status')) then raise exception 'written_task_immutable';end if;
 if TG_OP='UPDATE' and old.status<>'draft' and new.status not in (old.status,'retired') then raise exception 'written_task_immutable';end if;
 if new.status='approved' and (TG_OP='INSERT' or old.status='draft') and (not exists(select 1 from public.profiles where id=new.reviewed_by and role::text in ('admin','content_admin') and account_status='active') or new.review_evidence->'qaPassed' is distinct from 'true'::jsonb or coalesce(length(btrim(new.review_evidence->>'reviewReference')),0)=0 or coalesce(length(btrim(new.review_evidence->>'sourceComparisonReference')),0)=0) then raise exception 'written_task_review_required';end if;
 if jsonb_typeof(d) is distinct from 'object' or d->>'schemaVersion' is distinct from 'extended-text-v1'
 or coalesce(length(btrim(d->>'title')),0) not between 1 and 200 or coalesce(length(btrim(d->>'prompt')),0) not between 1 and 8000
 or coalesce(d->>'locale','')!~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
 or d->>'wordCountConvention' is distinct from 'unicode-whitespace-v1'
 or jsonb_typeof(d->'baselineRequired') is distinct from 'boolean'
 or jsonb_typeof(d->'assistance') is distinct from 'object'
 or jsonb_typeof(d->'source') is distinct from 'object' or d->'source'='{}'::jsonb
 or jsonb_typeof(d->'outcomes') is distinct from 'array' or jsonb_array_length(d->'outcomes')=0
 or jsonb_typeof(d->'criteria') is distinct from 'array' or jsonb_array_length(d->'criteria') not between 1 and 12
 or jsonb_typeof(d->'title') is distinct from 'string' or jsonb_typeof(d->'prompt') is distinct from 'string'
 or coalesce(d->>'minWords','')!~ '^[0-9]+$' or coalesce(d->>'maxWords','')!~ '^[1-9][0-9]*$'
 or (d->>'minWords')::integer>(d->>'maxWords')::integer or (d->>'maxWords')::integer>4000
 then raise exception 'written_task_invalid';end if;
 if (select count(distinct criterion.value->>'key') from jsonb_array_elements(d->'criteria') criterion(value))<>jsonb_array_length(d->'criteria') then raise exception 'written_task_invalid';end if;
 for c in select value from jsonb_array_elements(d->'criteria') loop
  if coalesce(c->>'key','')!~ '^[a-z][a-z0-9_]{0,39}$' or coalesce(length(btrim(c->>'label')),0) not between 1 and 160
   or jsonb_typeof(c->'descriptors') is distinct from 'array' or jsonb_array_length(c->'descriptors') not between 2 and 11
   or exists(select 1 from jsonb_array_elements(c->'descriptors') v where jsonb_typeof(v)<>'string' or length(btrim(v#>>'{}')) not between 1 and 1000)
   then raise exception 'written_task_invalid';end if;
 end loop;
 if not exists(select 1 from public.curriculum_releases r join public.units u on u.subject_program_id=r.subject_program_id where r.id=new.curriculum_release_id and u.id=new.unit_id and r.subject_program_id=new.subject_program_id) then raise exception 'written_task_scope_invalid';end if;
 return new;
end;
$$;
create trigger written_task_validate before insert or update on public.written_task_versions for each row execute function private.validate_written_task();
create function private.written_evidence_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_TABLE_NAME='written_reviews' then
 if (to_jsonb(new)-array['assessor_id','teacher_assignment_id'])=(to_jsonb(old)-array['assessor_id','teacher_assignment_id']) and
  ((new.assessor_id is not distinct from old.assessor_id) or (new.assessor_id is null and not exists(select 1 from public.profiles where id=old.assessor_id))) and
  ((new.teacher_assignment_id is not distinct from old.teacher_assignment_id) or (new.teacher_assignment_id is null and not exists(select 1 from public.teacher_assignments where id=old.teacher_assignment_id))) then return new;end if;
 end if;
 raise exception 'written_evidence_immutable';end;
$$;
create trigger written_submissions_immutable before update on public.written_submissions for each row execute function private.written_evidence_immutable();
create trigger written_reviews_immutable before update on public.written_reviews for each row execute function private.written_evidence_immutable();

create function private.lock_written_teacher_context(p_actor uuid,p_auth uuid,p_assignment uuid,p_release uuid,p_unit uuid,p_write boolean)
returns jsonb language plpgsql set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare a public.teacher_assignments%rowtype; m public.institutional_memberships%rowtype; x record; t timestamptz; ro boolean;
begin
 select * into a from public.teacher_assignments where id=p_assignment;
 select * into m from public.institutional_memberships where id=a.teacher_membership_id and person_id=p_actor and role='teacher';
 if not found then raise exception 'written_context_unavailable';end if;
 perform 1 from public.profiles where id=p_actor for share;
 perform pg_advisory_xact_lock_shared(hashtextextended('teacher-offboarding:'||m.id::text,0));
 select * into a from public.teacher_assignments where id=p_assignment for share;
 if not found or a.teacher_membership_id<>m.id then raise exception 'written_context_unavailable';end if;
 select p.account_status,au.deleted_at,au.banned_until,ss.not_after,
  m.status m_status,m.valid_from m_from,m.valid_to m_to,a.status a_status,a.valid_from a_from,a.valid_to a_to,
  g.status g_status,g.valid_from g_from,g.valid_to g_to,c.is_active,y.status y_status,y.starts_on,y.ends_on,
  sp.status sp_status,sp.effective_from sp_from,sp.effective_to sp_to,s.status s_status,
  r.status r_status,r.effective_from r_from,r.effective_to r_to
 into x from public.teacher_assignments a
 join public.institutional_memberships m on m.id=a.teacher_membership_id and m.school_id=a.school_id and m.person_id=p_actor and m.role='teacher'
 join public.profiles p on p.id=p_actor and p.role='teacher'
 join auth.users au on au.id=p.id join auth.sessions ss on ss.user_id=p.id and ss.id=p_auth
 join public.classes c on c.id=a.class_id and c.school_id=a.school_id and c.academic_year_id=a.academic_year_id
 join public.academic_years y on y.id=a.academic_year_id and y.school_id=a.school_id
 join public.subject_programs sp on sp.id=a.subject_program_id and sp.subject_id=c.subject_id and sp.grade_id=c.grade_id
 join public.subjects s on s.id=sp.subject_id
 join public.teacher_subject_authorizations g on g.teacher_membership_id=m.id and g.school_id=m.school_id and g.subject_id=sp.subject_id and g.status='active'
 join public.curriculum_releases r on r.id=p_release and r.subject_program_id=sp.id
 join public.units u on u.id=p_unit and u.subject_program_id=sp.id
 join public.curriculum_release_units ru on ru.curriculum_release_id=r.id and ru.unit_id=u.id
 where a.id=p_assignment for share of a,m,p,au,ss,c,y,sp,s,g,r,u,ru;
 if not found then raise exception 'written_context_unavailable';end if;
 t:=clock_timestamp();
 if x.account_status<>'active' or x.deleted_at is not null or x.banned_until>t or x.not_after<=t
 or x.m_status<>'active' or x.m_from>t or x.m_to<=t or x.g_status<>'active' or x.g_from>t or x.g_to<=t
 or x.a_status not in ('active','ended') or x.a_from>t or x.a_from::date>x.ends_on or x.a_to::date<x.starts_on
 or x.sp_status<>'published' or x.s_status<>'published' or x.sp_from>t::date or x.sp_to<t::date
 or x.r_status not in ('pilot','production','retired')
 or (select count(*) from public.teacher_subject_authorizations g join public.subject_programs sp on sp.id=a.subject_program_id where g.teacher_membership_id=m.id and g.school_id=m.school_id and g.subject_id=sp.subject_id and g.status='active')<>1
 then raise exception 'written_context_unavailable';end if;
 ro:=x.a_status<>'active' or coalesce(x.a_to<=t,false) or not x.is_active or x.y_status<>'active' or t::date not between x.starts_on and x.ends_on or x.r_status='retired' or coalesce(x.r_from>t::date,false) or coalesce(x.r_to<t::date,false);
 if p_write and ro then raise exception 'written_read_only';end if;
 return jsonb_build_object('schoolId',a.school_id,'academicYearId',a.academic_year_id,'classId',a.class_id,'subjectProgramId',a.subject_program_id,'readOnly',ro);
end;
$$;

-- Caller supplies only a selector. Role, school, class and owner are derived in this transaction.
create function private.service_written_work(p_actor_id uuid,p_auth_session_id uuid,p_action text,p_context jsonb,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare teacher boolean; ctx jsonb; e public.institutional_class_enrollments%rowtype;
 task public.written_task_versions%rowtype; w public.written_work%rowtype; sub public.written_submissions%rowtype;
 old_review public.written_reviews%rowtype; cr public.written_reviews%rowtype;
 rel uuid:=(p_context->>'curriculumReleaseId')::uuid; unt uuid:=(p_context->>'unitId')::uuid;
 assignment uuid:=(p_context->>'assignmentId')::uuid; enrollment uuid:=(p_context->>'enrollmentId')::uuid;
 mutating boolean:=p_action in ('save','submit','review'); result jsonb; entries jsonb; histories jsonb;
 c jsonb; scores jsonb; decision text; txt text; state_filter text; offset_n integer; revision_n integer;
begin
 if jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object'
 or rel is null or unt is null or (assignment is null)=(enrollment is null)
 or p_action not in ('tasks','open','save','submit','queue','inspect','review') then raise exception 'written_request_invalid';end if;
 teacher:=assignment is not null;
 if teacher then
  if p_action not in ('queue','inspect','review') then raise exception 'written_context_unavailable';end if;
  ctx:=private.lock_written_teacher_context(p_actor_id,p_auth_session_id,assignment,rel,unt,mutating);
 else
  if p_action not in ('tasks','open','save','submit') then raise exception 'written_context_unavailable';end if;
  e:=private.lock_student_learning_context(p_actor_id,p_auth_session_id,enrollment,rel,unt);
  ctx:=jsonb_build_object('schoolId',e.school_id,'academicYearId',e.academic_year_id,'classId',e.class_id,'subjectProgramId',e.subject_program_id,'readOnly',false);
 end if;
 if p_action='tasks' then
  if p_payload<>'{}'::jsonb then raise exception 'written_request_invalid';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.definition->>'title','locale',t.definition->>'locale','version',t.version_no,
   'state',coalesce(w.state,'not_started'),'workId',w.id,'available',t.status='approved',
   'baselineRequired',(t.definition->>'baselineRequired')::boolean,'baselineCompleted',private.scoped_chapter_baseline(p_actor_id,rel,unt) is not null)
   order by t.task_key,t.version_no),'[]') into entries
  from public.written_task_versions t left join public.written_work w on w.task_version_id=t.id and w.student_id=p_actor_id and w.school_id=e.school_id and w.academic_year_id=e.academic_year_id and w.class_id=e.class_id
  where t.curriculum_release_id=rel and t.unit_id=unt and t.subject_program_id=e.subject_program_id and (t.status='approved' or w.id is not null);
  result:=jsonb_build_object('version','written-work-v1','tasks',entries);
 elsif p_action='queue' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('state','offset')) then raise exception 'written_request_invalid';end if;
  state_filter:=coalesce(p_payload->>'state','submitted');offset_n:=coalesce((p_payload->>'offset')::integer,0);
  if state_filter not in ('all','submitted','changes_requested','reviewed') or offset_n not between 0 and 100000 then raise exception 'written_request_invalid';end if;
  select coalesce(jsonb_agg(entry order by updated_at desc,id),'[]') into entries from (
   select w.id,w.updated_at,jsonb_build_object('id',w.id,'studentName',coalesce(p.display_name,'Աշակերտ'),'taskTitle',t.definition->>'title',
    'state',w.state,'updatedAt',w.updated_at,'revision',w.revision,'taskVersion',t.version_no) entry
   from public.written_work w join public.written_task_versions t on t.id=w.task_version_id join public.profiles p on p.id=w.student_id
   where w.school_id=(ctx->>'schoolId')::uuid and w.academic_year_id=(ctx->>'academicYearId')::uuid and w.class_id=(ctx->>'classId')::uuid
   and w.subject_program_id=(ctx->>'subjectProgramId')::uuid and w.curriculum_release_id=rel and w.unit_id=unt and w.current_submission_id is not null
   and (state_filter='all' or w.state=state_filter)
   order by w.updated_at desc,w.id offset offset_n limit 51
  ) q;
  result:=jsonb_build_object('version','written-work-v1','queue',entries,'readOnly',ctx->'readOnly');
 else
  if p_action='open' then
   if exists(select 1 from jsonb_object_keys(p_payload) k where k<>'taskId') then raise exception 'written_request_invalid';end if;
   select * into task from public.written_task_versions where id=(p_payload->>'taskId')::uuid and curriculum_release_id=rel and unit_id=unt and subject_program_id=e.subject_program_id for share;
   if not found then raise exception 'written_task_unavailable';end if;
   select * into w from public.written_work where task_version_id=task.id and student_id=p_actor_id and school_id=e.school_id and academic_year_id=e.academic_year_id and class_id=e.class_id;
   if w.id is null and task.status<>'approved' then raise exception 'written_task_unavailable';end if;
   -- Opening is read-only. First save or submission creates the work record.
  else
   if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('taskId','workId','expectedRevision','text','decision','scores','feedback','changeReason')) then raise exception 'written_request_invalid';end if;
   if teacher then
    select * into w from public.written_work where id=(p_payload->>'workId')::uuid and school_id=(ctx->>'schoolId')::uuid and academic_year_id=(ctx->>'academicYearId')::uuid and class_id=(ctx->>'classId')::uuid and subject_program_id=(ctx->>'subjectProgramId')::uuid and curriculum_release_id=rel and unit_id=unt for update;
    if not found or w.current_submission_id is null then raise exception 'written_work_unavailable';end if;
    select * into task from public.written_task_versions where id=w.task_version_id for share;
   else
    select * into task from public.written_task_versions where id=(p_payload->>'taskId')::uuid and curriculum_release_id=rel and unit_id=unt and subject_program_id=e.subject_program_id for share;
    if not found or task.status<>'approved' then raise exception 'written_task_unavailable';end if;
    if (task.definition->>'baselineRequired')::boolean and private.scoped_chapter_baseline(p_actor_id,rel,unt) is null then raise exception 'chapter_diagnostic_required';end if;
    -- Unique key serializes concurrent first saves; no draft is visible to teachers.
    insert into public.written_work(task_version_id,student_id,enrollment_id,school_id,academic_year_id,class_id,subject_program_id,curriculum_release_id,unit_id)
     values(task.id,p_actor_id,e.id,e.school_id,e.academic_year_id,e.class_id,e.subject_program_id,rel,unt) on conflict do nothing;
    select * into strict w from public.written_work where task_version_id=task.id and student_id=p_actor_id and school_id=e.school_id and academic_year_id=e.academic_year_id and class_id=e.class_id for update;
   end if;
   if mutating then
    if jsonb_typeof(p_payload->'expectedRevision') is distinct from 'number' or coalesce(p_payload->>'expectedRevision','')!~ '^[0-9]+$' or (p_payload->>'expectedRevision')::numeric>2147483646 then raise exception 'written_request_invalid';end if;
    revision_n:=(p_payload->>'expectedRevision')::integer;
    if w.revision<>revision_n then raise exception 'written_conflict';end if;
   end if;
   if p_action in ('save','submit') then
    txt:=p_payload->>'text';
    if jsonb_typeof(p_payload->'text') is distinct from 'string' or length(txt)>20000 or (p_action='submit' and private.written_word_count(txt)=0) then raise exception 'written_text_invalid';end if;
    if w.state not in ('draft','changes_requested') then raise exception 'written_conflict';end if;
    if p_action='submit' then
     insert into public.written_submissions(work_id,version_no,response_text,word_count,assistance_snapshot)
      values(w.id,(select coalesce(max(version_no),0)+1 from public.written_submissions where work_id=w.id),txt,private.written_word_count(txt),task.definition->'assistance') returning * into sub;
    end if;
    update public.written_work set draft_text=txt,enrollment_id=e.id,revision=revision+1,updated_at=clock_timestamp(),
     state=case when p_action='submit' then 'submitted' else state end,current_submission_id=case when p_action='submit' then sub.id else current_submission_id end where id=w.id returning * into w;
   elsif p_action='review' then
    if w.state not in ('submitted','reviewed') then raise exception 'written_conflict';end if;
    decision:=p_payload->>'decision';scores:=p_payload->'scores';
    if decision not in ('assessed','return') or decision is null or jsonb_typeof(p_payload->'feedback') is distinct from 'string' or length(btrim(p_payload->>'feedback')) not between 1 and 4000 then raise exception 'written_review_invalid';end if;
    if decision='assessed' then
     if jsonb_typeof(scores) is distinct from 'object' or (select count(*) from jsonb_object_keys(scores))<>jsonb_array_length(task.definition->'criteria') then raise exception 'written_review_invalid';end if;
     for c in select value from jsonb_array_elements(task.definition->'criteria') loop
      if jsonb_typeof(scores->(c->>'key')) is distinct from 'number' or coalesce(scores->>(c->>'key'),'')!~ '^[0-9]+$' or (scores->>(c->>'key'))::numeric>=jsonb_array_length(c->'descriptors') then raise exception 'written_review_invalid';end if;
     end loop;
    elsif scores is not null and scores<>'null'::jsonb then raise exception 'written_review_invalid';end if;
    select * into old_review from public.written_reviews where submission_id=w.current_submission_id order by version_no desc limit 1;
    if old_review.id is not null and coalesce(length(btrim(p_payload->>'changeReason')),0) not between 3 and 1000 then raise exception 'written_review_invalid';end if;
    insert into public.written_reviews(submission_id,version_no,decision,criterion_scores,feedback,assessor_id,teacher_assignment_id,supersedes_review_id,change_reason)
     values(w.current_submission_id,coalesce(old_review.version_no,0)+1,decision,case when decision='assessed' then scores else null end,btrim(p_payload->>'feedback'),p_actor_id,assignment,old_review.id,case when old_review.id is not null then btrim(p_payload->>'changeReason') end) returning * into cr;
    update public.written_work set state=case when decision='assessed' then 'reviewed' else 'changes_requested' end,revision=revision+1,updated_at=clock_timestamp() where id=w.id returning * into w;
   end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'version',s.version_no,'text',s.response_text,'wordCount',s.word_count,'submittedAt',s.submitted_at,
   'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'version',r.version_no,'decision',r.decision,'scores',r.criterion_scores,'feedback',r.feedback,'createdAt',r.created_at,'changeReason',r.change_reason,'supersedesReviewId',r.supersedes_review_id) order by r.version_no) from public.written_reviews r where r.submission_id=s.id),'[]')) order by s.version_no),'[]') into histories
   from public.written_submissions s where s.work_id=w.id;
  result:=jsonb_build_object('version','written-work-v1','task',jsonb_build_object('id',task.id,'version',task.version_no,'definition',task.definition,'available',task.status='approved'),
   'work',case when w.id is null then null else jsonb_build_object('id',w.id,'state',w.state,'revision',w.revision,'currentSubmissionId',w.current_submission_id,'updatedAt',w.updated_at) end,
   'submissions',histories,'readOnly',case when teacher then (ctx->>'readOnly')::boolean else task.status<>'approved' end);
  if teacher then result:=result||jsonb_build_object('studentName',(select coalesce(display_name,'Աշակերտ') from public.profiles where id=w.student_id));end if;
  if not teacher then result:=result||jsonb_build_object('draftText',coalesce(w.draft_text,''),'baselineCompleted',private.scoped_chapter_baseline(p_actor_id,rel,unt) is not null);end if;
 end if;
 -- Lock waits cannot extend expired authority. Revalidate before returning any evidence.
 if teacher then perform private.lock_written_teacher_context(p_actor_id,p_auth_session_id,assignment,rel,unt,mutating);
 else perform private.lock_student_learning_context(p_actor_id,p_auth_session_id,enrollment,rel,unt);end if;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'written_request_invalid';
end;
$$;
-- The private worker needs Auth session locks, which are not browser-accessible.
-- The public wrapper has no definer privileges and is executable only by the Edge service.
create function public.service_written_work(p_actor_id uuid,p_auth_session_id uuid,p_action text,p_context jsonb,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$
 select private.service_written_work(p_actor_id,p_auth_session_id,p_action,p_context,p_payload);
$$;
revoke all on function private.written_word_count(text),private.validate_written_task(),private.written_evidence_immutable(),private.lock_written_teacher_context(uuid,uuid,uuid,uuid,uuid,boolean),private.service_written_work(uuid,uuid,text,jsonb,jsonb),public.service_written_work(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.service_written_work(uuid,uuid,text,jsonb,jsonb),public.service_written_work(uuid,uuid,text,jsonb,jsonb) to service_role;
