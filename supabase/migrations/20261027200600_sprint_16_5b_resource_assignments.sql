-- Sprint 16.5B.8: governed supplementary-resource assignments.
-- Created with Supabase CLI 2.122.0; no curriculum, assessment or content activation.
create table public.resource_assignments (
 id uuid primary key default gen_random_uuid(),
 material_version_id uuid not null references public.supplementary_resource_versions(id),
 teacher_assignment_id uuid not null references public.teacher_assignments(id),
 school_id uuid not null references public.schools(id),
 academic_year_id uuid not null references public.academic_years(id),
 class_id uuid not null references public.classes(id),
 subject_program_id uuid not null references public.subject_programs(id),
 curriculum_release_id uuid not null, unit_id uuid not null,
 created_by uuid references public.profiles(id) on delete set null,
 request_id uuid not null, request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 recipient_mode text not null check(recipient_mode in ('class','selected')),
 recipient_count integer not null check(recipient_count between 1 and 500),
 instructions text not null default '' check(length(instructions)<=2000),
 status text not null default 'assigned' check(status in ('assigned','canceled')),
 revision integer not null default 1 check(revision in (1,2)),
 created_at timestamptz not null default clock_timestamp(),
 canceled_at timestamptz, cancel_reason text,
 unique(created_by,request_id),
 foreign key(curriculum_release_id,unit_id) references public.curriculum_release_units(curriculum_release_id,unit_id),
 check((status='assigned' and revision=1 and canceled_at is null and cancel_reason is null) or
       (status='canceled' and revision=2 and canceled_at is not null and length(btrim(cancel_reason)) between 1 and 1000))
);
create index resource_assignments_context on public.resource_assignments(teacher_assignment_id,curriculum_release_id,unit_id,created_at desc,id);
create index resource_assignments_material on public.resource_assignments(material_version_id);
create index resource_assignments_school on public.resource_assignments(school_id);
create index resource_assignments_year on public.resource_assignments(academic_year_id);
create index resource_assignments_class on public.resource_assignments(class_id);
create index resource_assignments_programme on public.resource_assignments(subject_program_id);
create index resource_assignments_release_unit on public.resource_assignments(curriculum_release_id,unit_id);
create table public.resource_assignment_recipients (
 assignment_id uuid not null references public.resource_assignments(id),
 enrollment_id uuid not null references public.institutional_class_enrollments(id) on delete cascade,
 student_id uuid not null references public.profiles(id) on delete cascade,
 primary key(assignment_id,enrollment_id)
);
create index resource_recipients_student on public.resource_assignment_recipients(student_id,assignment_id);
create index resource_recipients_enrollment on public.resource_assignment_recipients(enrollment_id);
create table public.resource_assignment_events (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.resource_assignments(id),
 actor_id uuid references public.profiles(id) on delete set null,
 event text not null check(event in ('assigned','canceled')),
 detail jsonb not null default '{}',
 created_at timestamptz not null default clock_timestamp()
);
create index resource_assignment_events_assignment on public.resource_assignment_events(assignment_id,created_at);
create index resource_assignment_events_actor on public.resource_assignment_events(actor_id);
alter table public.resource_assignments enable row level security;
alter table public.resource_assignment_recipients enable row level security;
alter table public.resource_assignment_events enable row level security;
revoke all on public.resource_assignments,public.resource_assignment_recipients,public.resource_assignment_events from public,anon,authenticated,service_role;

create function private.resource_assignment_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'assignment_immutable';end if;
 if (to_jsonb(new)-array['status','revision','canceled_at','cancel_reason','created_by']) is distinct from
    (to_jsonb(old)-array['status','revision','canceled_at','cancel_reason','created_by']) then raise exception 'assignment_immutable';end if;
 if new.created_by is distinct from old.created_by and not(new.created_by is null and not exists(select 1 from public.profiles where id=old.created_by)) then raise exception 'assignment_immutable';end if;
 if new.status is distinct from old.status and not(old.status='assigned' and new.status='canceled' and new.revision=old.revision+1) then raise exception 'assignment_immutable';end if;
 if old.status='canceled' and (to_jsonb(new)-'created_by') is distinct from (to_jsonb(old)-'created_by') then raise exception 'assignment_immutable';end if;
 return new;
end;$$;
create trigger resource_assignment_guard before update or delete on public.resource_assignments for each row execute function private.resource_assignment_guard();
create function private.resource_assignment_event_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.actor_id is null and old.actor_id is not null and not exists(select 1 from public.profiles where id=old.actor_id)
 and (to_jsonb(new)-'actor_id')=(to_jsonb(old)-'actor_id') then return new;end if;
 raise exception 'assignment_event_immutable';
end;$$;
create trigger resource_assignment_event_guard before update or delete on public.resource_assignment_events for each row execute function private.resource_assignment_event_guard();
create function private.resource_recipient_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then raise exception 'assignment_recipients_immutable';end if;
 if not exists(select 1 from public.resource_assignments a join public.institutional_class_enrollments e
 on e.id=new.enrollment_id and e.student_id=new.student_id and e.school_id=a.school_id and e.academic_year_id=a.academic_year_id
 and e.class_id=a.class_id and e.subject_program_id=a.subject_program_id and e.teacher_assignment_id=a.teacher_assignment_id
 where a.id=new.assignment_id) then raise exception 'assignment_recipients_invalid';end if;
 return new;
end;$$;
create trigger resource_recipient_guard before insert or update on public.resource_assignment_recipients for each row execute function private.resource_recipient_guard();

-- Metadata only; locked against concurrent enrollment/profile changes. A class
-- snapshot is bounded to 500 recipients. No learner evidence or email is read.
create function private.resource_assignment_roster(p_assignment uuid,p_ctx jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare result jsonb:='[]';r record;t timestamptz;
begin
 for r in select e.id enrollment_id,e.student_id,e.status,e.valid_from,e.valid_to,
   m.status membership_status,m.valid_from membership_from,m.valid_to membership_to,
   p.role,p.account_status,p.display_name,u.deleted_at,u.banned_until
  from public.institutional_class_enrollments e
  join public.institutional_memberships m on m.id=e.student_membership_id and m.person_id=e.student_id and m.school_id=e.school_id and m.role='student'
  join public.profiles p on p.id=e.student_id join auth.users u on u.id=p.id
  where e.teacher_assignment_id=p_assignment and e.school_id=(p_ctx->>'schoolId')::uuid
   and e.academic_year_id=(p_ctx->>'academicYearId')::uuid and e.class_id=(p_ctx->>'classId')::uuid
   and e.subject_program_id=(p_ctx->>'subjectProgramId')::uuid
   and e.status='active' and m.status='active' and p.role='student' and p.account_status='active'
  order by e.id for share of e,m,p,u
 loop
  t:=clock_timestamp();
  if r.valid_from>t or r.valid_to<=t or r.membership_from>t or r.membership_to<=t or r.deleted_at is not null or r.banned_until>t then continue;end if;
  result:=result||jsonb_build_array(jsonb_build_object('enrollmentId',r.enrollment_id,'studentId',r.student_id,'studentName',coalesce(nullif(btrim(r.display_name),''),'Աշակերտ')));
  if jsonb_array_length(result)>500 then raise exception 'assignment_recipient_limit';end if;
 end loop;
 return result;
end;$$;
create function private.resource_assignment_available(a public.resource_assignments,m public.supplementary_resource_versions) returns boolean
language sql stable set search_path='' as $$
 select a.status='assigned' and m.status in ('published','superseded') and m.qa->>'passed'='true' and m.qa->>'fingerprint'=m.fingerprint
 and not exists(select 1 from public.supplementary_resource_events ev join public.supplementary_resource_versions v on v.id=ev.version_id
  where v.resource_id=m.resource_id and ev.event='withdrawn' and ev.created_at>=a.created_at);
$$;
create function private.resource_assignment_public(a public.resource_assignments,m public.supplementary_resource_versions) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',a.id,'material',private.supplementary_public(m),'context',jsonb_build_object('assignmentId',a.teacher_assignment_id,'curriculumReleaseId',a.curriculum_release_id,'unitId',a.unit_id),
 'recipientMode',a.recipient_mode,'recipientCount',a.recipient_count,'instructions',a.instructions,'status',a.status,'revision',a.revision,
 'assignedAt',a.created_at,'canceledAt',a.canceled_at,'cancelReason',a.cancel_reason,'available',coalesce(private.resource_assignment_available(a,m),false),
 'className',(select name from public.classes where id=a.class_id),
 'schoolName',(select name from public.schools where id=a.school_id),
 'subjectName',(select s.name_hy from public.subject_programs sp join public.subjects s on s.id=sp.subject_id where sp.id=a.subject_program_id),
 'unitTitle',(select title_hy_snapshot from public.curriculum_release_units where curriculum_release_id=a.curriculum_release_id and unit_id=a.unit_id),
 'teacherName',(select display_name from public.profiles where id=a.created_by));
$$;

create function private.service_resource_assignments(p_actor_id uuid,p_auth_session_id uuid,p_action text,p_context jsonb default '{}',p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
#variable_conflict use_column
declare role_name text;ctx jsonb;roster jsonb;stamp text;entries jsonb:='[]';result jsonb;entry jsonb;r record;
 a public.resource_assignments%rowtype;m public.supplementary_resource_versions%rowtype;e public.institutional_class_enrollments%rowtype;
 rel uuid;unt uuid;ta uuid;enr uuid;off integer;state_filter text;search_text text;rows_n integer;selected_ids uuid[];request_hash text;reason text;material_id uuid;
begin
 if jsonb_typeof(p_context) is distinct from 'object' or jsonb_typeof(p_payload) is distinct from 'object'
 or exists(select 1 from jsonb_object_keys(p_context) k where k not in ('assignmentId','enrollmentId','curriculumReleaseId','unitId'))
 or p_action not in ('catalog','preview','assign','list','inbox','get','cancel','open') then raise exception 'assignment_request_invalid';end if;
 role_name:=private.supplementary_session(p_actor_id,p_auth_session_id);
 if role_name not in ('teacher','student') then raise exception 'assignment_forbidden';end if;
 off:=coalesce((p_payload->>'offset')::integer,0);state_filter:=coalesce(p_payload->>'state','current');
 if off not between 0 and 100000 or state_filter not in ('current','history') then raise exception 'assignment_request_invalid';end if;
 if p_action='inbox' then
  if role_name<>'student' or p_context<>'{}' or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('offset','state')) then raise exception 'assignment_forbidden';end if;
  rows_n:=0;
  for r in select a.id,rp.enrollment_id from public.resource_assignment_recipients rp join public.resource_assignments a on a.id=rp.assignment_id
   join public.institutional_class_enrollments ie on ie.id=rp.enrollment_id and ie.student_id=p_actor_id
   where rp.student_id=p_actor_id and (case when state_filter='current' then a.status='assigned' else a.status='canceled' end)
   order by a.created_at desc,a.id,rp.enrollment_id offset off limit 51
  loop
   rows_n:=rows_n+1;if rows_n=51 then exit;end if;
   select * into strict a from public.resource_assignments where id=r.id;
   begin
    e:=private.lock_student_learning_context(p_actor_id,p_auth_session_id,r.enrollment_id,a.curriculum_release_id,a.unit_id);
   exception when raise_exception then if sqlerrm<>'learning_context_unavailable' then raise;end if;continue;end;
   if e.teacher_assignment_id<>a.teacher_assignment_id or e.school_id<>a.school_id or e.academic_year_id<>a.academic_year_id or e.class_id<>a.class_id or e.subject_program_id<>a.subject_program_id then continue;end if;
   select * into strict m from public.supplementary_resource_versions where id=a.material_version_id;
   entry:=private.resource_assignment_public(a,m);
   entry:=entry-'recipientCount'||jsonb_build_object('context',jsonb_build_object('enrollmentId',r.enrollment_id,'curriculumReleaseId',a.curriculum_release_id,'unitId',a.unit_id));
   entries:=entries||jsonb_build_array(entry);
  end loop;
  -- Recheck clocks/session/context after the bounded list, not only its first row.
  for entry in select value from jsonb_array_elements(entries) loop
   perform private.lock_student_learning_context(p_actor_id,p_auth_session_id,(entry->'context'->>'enrollmentId')::uuid,(entry->'context'->>'curriculumReleaseId')::uuid,(entry->'context'->>'unitId')::uuid);
  end loop;
  perform private.supplementary_session(p_actor_id,p_auth_session_id);
  return jsonb_build_object('assignments',entries,'hasMore',rows_n>50,'nextOffset',off+50);
 end if;
 rel:=(p_context->>'curriculumReleaseId')::uuid;unt:=(p_context->>'unitId')::uuid;ta:=(p_context->>'assignmentId')::uuid;enr:=(p_context->>'enrollmentId')::uuid;
 if rel is null or unt is null then raise exception 'assignment_request_invalid';end if;
 if role_name='teacher' then
  if ta is null or enr is not null then raise exception 'assignment_forbidden';end if;
  ctx:=private.lock_written_teacher_context(p_actor_id,p_auth_session_id,ta,rel,unt,p_action in ('preview','assign','cancel'));
 else
  if enr is null or ta is not null or p_action not in ('get','open') then raise exception 'assignment_forbidden';end if;
  e:=private.lock_student_learning_context(p_actor_id,p_auth_session_id,enr,rel,unt);ta:=e.teacher_assignment_id;
  ctx:=jsonb_build_object('schoolId',e.school_id,'academicYearId',e.academic_year_id,'classId',e.class_id,'subjectProgramId',e.subject_program_id,'readOnly',false);
 end if;
 if p_action='catalog' then
  if role_name<>'teacher' or exists(select 1 from jsonb_object_keys(p_payload) k where k<>'offset') then raise exception 'assignment_request_invalid';end if;
  rows_n:=0;
  for m in select * from public.supplementary_resource_versions where provider='platform' and status='published'
   and subject_program_id=(ctx->>'subjectProgramId')::uuid and curriculum_release_id=rel and unit_id=unt
   and qa->>'passed'='true' and qa->>'fingerprint'=fingerprint order by published_at desc,id offset off limit 51
  loop
   rows_n:=rows_n+1;if rows_n>50 then exit;end if;entries:=entries||jsonb_build_array(private.supplementary_public(m));
  end loop;
  result:=jsonb_build_object('materials',entries,'hasMore',rows_n>50,'nextOffset',off+50);
 elsif p_action in ('preview','assign') then
  if role_name<>'teacher' then raise exception 'assignment_forbidden';end if;
  if p_action='assign' then
   if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('materialId','fingerprint','requestId','rosterFingerprint','mode','enrollmentIds','instructions'))
    or p_payload->>'mode' not in ('class','selected') or p_payload->>'mode' is null
    or jsonb_typeof(coalesce(p_payload->'enrollmentIds','[]'))<>'array' or jsonb_array_length(coalesce(p_payload->'enrollmentIds','[]'))>500
    or (p_payload ? 'instructions' and jsonb_typeof(p_payload->'instructions')<>'string')
    or length(coalesce(p_payload->>'instructions',''))>2000 or p_payload->>'requestId' is null then raise exception 'assignment_request_invalid';end if;
   select coalesce(array_agg(v::uuid order by v::uuid),array[]::uuid[]) into selected_ids from jsonb_array_elements_text(coalesce(p_payload->'enrollmentIds','[]')) v;
   if cardinality(selected_ids)<>(select count(distinct v) from unnest(selected_ids) v) or
    (p_payload->>'mode'='selected' and cardinality(selected_ids)=0) or (p_payload->>'mode'='class' and cardinality(selected_ids)>0) then raise exception 'assignment_recipients_invalid';end if;
   request_hash:=encode(sha256(convert_to(jsonb_build_array(p_context,p_payload-'enrollmentIds',to_jsonb(selected_ids))::text,'UTF8')),'hex');
   perform pg_advisory_xact_lock(hashtextextended('resource-assignment-request:'||p_actor_id::text||':'||(p_payload->>'requestId')::uuid::text,0));
   select * into a from public.resource_assignments where created_by=p_actor_id and request_id=(p_payload->>'requestId')::uuid;
   if found then
    if a.request_hash<>request_hash then raise exception 'assignment_conflict';end if;
    select * into strict m from public.supplementary_resource_versions where id=a.material_version_id;
    result:=jsonb_build_object('assignment',private.resource_assignment_public(a,m),'replayed',true);
   end if;
  else
   if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('materialId','offset','search')) then raise exception 'assignment_request_invalid';end if;
  end if;
  if result is null then
   select * into m from public.supplementary_resource_versions where id=(p_payload->>'materialId')::uuid and curriculum_release_id=rel and unit_id=unt
    and subject_program_id=(ctx->>'subjectProgramId')::uuid and (provider='platform' or (assignment_id=ta and created_by=p_actor_id));
   if not found then raise exception 'assignment_unavailable';end if;
   perform pg_advisory_xact_lock(hashtextextended('supplementary:'||m.resource_id::text,0));
   select * into strict m from public.supplementary_resource_versions where id=m.id for share;
   if m.status<>'published' or m.qa->>'passed' is distinct from 'true' or m.qa->>'fingerprint' is distinct from m.fingerprint then raise exception 'assignment_unavailable';end if;
   roster:=private.resource_assignment_roster(ta,ctx);
   stamp:=encode(sha256(convert_to(roster::text,'UTF8')),'hex');
   if p_action='preview' then
    search_text:=btrim(coalesce(p_payload->>'search',''));if length(search_text)>120 then raise exception 'assignment_request_invalid';end if;
    select count(*) into rows_n from jsonb_array_elements(roster) v where position(lower(search_text) in lower(v->>'studentName'))>0;
    select coalesce(jsonb_agg(v order by v->>'enrollmentId'),'[]') into entries from
     (select v from jsonb_array_elements(roster) v where position(lower(search_text) in lower(v->>'studentName'))>0 order by v->>'enrollmentId' offset off limit 50) q;
    result:=jsonb_build_object('material',private.supplementary_public(m),'roster',entries,'rosterFingerprint',stamp,'total',jsonb_array_length(roster),'matched',rows_n,'hasMore',rows_n>off+50,'nextOffset',off+50);
   else
    if p_payload->>'fingerprint' is distinct from m.fingerprint or p_payload->>'rosterFingerprint' is distinct from stamp then raise exception 'assignment_preview_stale';end if;
    if p_payload->>'mode'='class' then select coalesce(array_agg((v->>'enrollmentId')::uuid order by v->>'enrollmentId'),array[]::uuid[]) into selected_ids from jsonb_array_elements(roster) v;end if;
    if cardinality(selected_ids)=0 or exists(select 1 from unnest(selected_ids) id where not exists(select 1 from jsonb_array_elements(roster) v where (v->>'enrollmentId')::uuid=id)) then raise exception 'assignment_recipients_invalid';end if;
    insert into public.resource_assignments(material_version_id,teacher_assignment_id,school_id,academic_year_id,class_id,subject_program_id,curriculum_release_id,unit_id,created_by,request_id,request_hash,recipient_mode,recipient_count,instructions)
     values(m.id,ta,(ctx->>'schoolId')::uuid,(ctx->>'academicYearId')::uuid,(ctx->>'classId')::uuid,(ctx->>'subjectProgramId')::uuid,rel,unt,p_actor_id,(p_payload->>'requestId')::uuid,request_hash,p_payload->>'mode',cardinality(selected_ids),btrim(coalesce(p_payload->>'instructions',''))) returning * into a;
    insert into public.resource_assignment_recipients(assignment_id,enrollment_id,student_id)
     select a.id,(v->>'enrollmentId')::uuid,(v->>'studentId')::uuid from jsonb_array_elements(roster) v where (v->>'enrollmentId')::uuid=any(selected_ids);
    insert into public.resource_assignment_events(assignment_id,actor_id,event,detail)
     values(a.id,p_actor_id,'assigned',jsonb_build_object('mode',a.recipient_mode,'recipientCount',a.recipient_count,'materialVersionId',m.id,'fingerprint',m.fingerprint));
    if stamp<>encode(sha256(convert_to(private.resource_assignment_roster(ta,ctx)::text,'UTF8')),'hex') then raise exception 'assignment_preview_stale';end if;
    result:=jsonb_build_object('assignment',private.resource_assignment_public(a,m),'replayed',false);
   end if;
  end if;
 elsif p_action='list' then
  if role_name<>'teacher' or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('offset','state')) then raise exception 'assignment_request_invalid';end if;
  select coalesce(jsonb_agg(entry order by created_at desc,id),'[]') into entries from (
   select a.created_at,a.id,private.resource_assignment_public(a,m) entry from public.resource_assignments a
   join public.supplementary_resource_versions m on m.id=a.material_version_id
   where a.teacher_assignment_id=ta and a.curriculum_release_id=rel and a.unit_id=unt and a.created_by=p_actor_id
   and (case when state_filter='current' then a.status='assigned' else a.status='canceled' end)
   order by a.created_at desc,a.id offset off limit 51) q;
  result:=jsonb_build_object('assignments',case when jsonb_array_length(entries)>50 then entries-50 else entries end,'hasMore',jsonb_array_length(entries)>50,'nextOffset',off+50,'readOnly',ctx->'readOnly');
 else
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('id','revision','reason')) or p_payload->>'id' is null then raise exception 'assignment_request_invalid';end if;
  select * into a from public.resource_assignments where id=(p_payload->>'id')::uuid and teacher_assignment_id=ta and curriculum_release_id=rel and unit_id=unt
   and school_id=(ctx->>'schoolId')::uuid and class_id=(ctx->>'classId')::uuid
   and (case when role_name='teacher' then created_by=p_actor_id else exists(select 1 from public.resource_assignment_recipients rp where rp.assignment_id=resource_assignments.id and rp.enrollment_id=enr and rp.student_id=p_actor_id) end);
  if not found then raise exception 'assignment_unavailable';end if;
  select * into strict m from public.supplementary_resource_versions where id=a.material_version_id;
  -- Same order as resource publication and withdrawal; re-read state after lock waits.
  perform pg_advisory_xact_lock(hashtextextended('supplementary:'||m.resource_id::text,0));
  select * into strict m from public.supplementary_resource_versions where id=m.id for share;
  select * into strict a from public.resource_assignments where id=a.id for update;
  if p_action='cancel' then
   if role_name<>'teacher' then raise exception 'assignment_forbidden';end if;
   reason:=btrim(coalesce(p_payload->>'reason',''));
   if length(reason) not between 1 and 1000 then raise exception 'assignment_reason_required';end if;
   if (p_payload->>'revision')::integer is null then raise exception 'assignment_request_invalid';end if;
   if a.status='canceled' then
    if a.cancel_reason<>reason or (p_payload->>'revision')::integer not in (a.revision,a.revision-1) then raise exception 'assignment_conflict';end if;
   else
    if (p_payload->>'revision')::integer is distinct from a.revision then raise exception 'assignment_conflict';end if;
    update public.resource_assignments set status='canceled',revision=revision+1,canceled_at=clock_timestamp(),cancel_reason=reason where id=a.id returning * into a;
    insert into public.resource_assignment_events(assignment_id,actor_id,event,detail) values(a.id,p_actor_id,'canceled',jsonb_build_object('reason',reason));
   end if;
  end if;
  entry:=private.resource_assignment_public(a,m);
  if role_name='student' then entry:=entry-'recipientCount'||jsonb_build_object('context',p_context);end if;
  result:=jsonb_build_object('assignment',entry,'readOnly',ctx->'readOnly');
  if p_action in ('get','cancel') and role_name='teacher' then
   result:=result||jsonb_build_object('recipients',(select coalesce(jsonb_agg(jsonb_build_object('enrollmentId',rp.enrollment_id,'studentName',coalesce(nullif(btrim(p.display_name),''),'Աշակերտ')) order by rp.enrollment_id),'[]')
    from public.resource_assignment_recipients rp join public.profiles p on p.id=rp.student_id where rp.assignment_id=a.id),
    'events',(select coalesce(jsonb_agg(jsonb_build_object('event',event,'at',created_at,'detail',detail) order by created_at,id),'[]') from public.resource_assignment_events where assignment_id=a.id));
  end if;
  if p_action='open' then
   if not coalesce(private.resource_assignment_available(a,m),false) or (m.definition->>'format'='pdf' and m.object_path is null) then raise exception 'assignment_unavailable';end if;
   result:=result||jsonb_build_object('delivery',jsonb_build_object('path',m.object_path,'sha256',m.file_sha256,'bytes',m.file_bytes,'url',m.definition->>'url'));
  end if;
 end if;
 if role_name='teacher' then
  perform private.lock_written_teacher_context(p_actor_id,p_auth_session_id,ta,rel,unt,p_action in ('preview','assign','cancel'));
 else perform private.lock_student_learning_context(p_actor_id,p_auth_session_id,enr,rel,unt);end if;
 perform private.supplementary_session(p_actor_id,p_auth_session_id);
 return result;
end;$$;
create function public.service_resource_assignments(p_actor_id uuid,p_auth_session_id uuid,p_action text,p_context jsonb default '{}',p_payload jsonb default '{}')
returns jsonb language sql set search_path='' as $$select private.service_resource_assignments(p_actor_id,p_auth_session_id,p_action,p_context,p_payload);$$;
create function private.resource_assignment_privacy_counts(p_user_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('materialAssignmentsReceived',(select count(*) from public.resource_assignment_recipients where student_id=p_user_id),'materialAssignmentsSent',(select count(*) from public.resource_assignments where created_by=p_user_id));
$$;
create function public.service_resource_assignment_privacy_counts(p_user_id uuid) returns jsonb language sql stable set search_path='' as $$select private.resource_assignment_privacy_counts(p_user_id);$$;
revoke all on function private.resource_assignment_guard(),private.resource_assignment_event_guard(),private.resource_recipient_guard(),private.resource_assignment_roster(uuid,jsonb),private.resource_assignment_available(public.resource_assignments,public.supplementary_resource_versions),private.resource_assignment_public(public.resource_assignments,public.supplementary_resource_versions),private.service_resource_assignments(uuid,uuid,text,jsonb,jsonb),public.service_resource_assignments(uuid,uuid,text,jsonb,jsonb),private.resource_assignment_privacy_counts(uuid),public.service_resource_assignment_privacy_counts(uuid) from public,anon,authenticated,service_role;
grant execute on function private.service_resource_assignments(uuid,uuid,text,jsonb,jsonb),public.service_resource_assignments(uuid,uuid,text,jsonb,jsonb),private.resource_assignment_privacy_counts(uuid),public.service_resource_assignment_privacy_counts(uuid) to service_role;
