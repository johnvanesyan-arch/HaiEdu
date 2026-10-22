-- Shared, opt-in teaching-material review. No learner release or assessment policy changes.
create table public.unit_material_versions (
 id uuid primary key default gen_random_uuid(),
 subject_program_id uuid not null references public.subject_programs(id),
 curriculum_release_id uuid not null references public.curriculum_releases(id),
 unit_id uuid not null references public.units(id),
 material_key text not null check(length(material_key) between 1 and 160),
 kind text not null check(kind in ('guide','writing')),
 version_no integer not null check(version_no>0),
 sequence_order integer not null check(sequence_order>0),
 definition jsonb not null check(jsonb_typeof(definition)='object'),
 review_package jsonb not null check(jsonb_typeof(review_package)='object'),
 fingerprint text not null,
 status text not null default 'draft' check(status in ('draft','approved','retired')),
 qa jsonb not null default '{}',
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz,
 unique(curriculum_release_id,unit_id,material_key,version_no),
 foreign key(curriculum_release_id,unit_id) references public.curriculum_release_units(curriculum_release_id,unit_id),
 check(status<>'approved' or reviewed_at is not null)
);
create unique index unit_material_one_approved on public.unit_material_versions(curriculum_release_id,unit_id,material_key) where status='approved';
create index unit_material_programme on public.unit_material_versions(subject_program_id);
create index unit_material_unit on public.unit_material_versions(unit_id);
create index unit_material_creator on public.unit_material_versions(created_by);
create index unit_material_reviewer on public.unit_material_versions(reviewed_by);
create table public.unit_material_events (
 id uuid primary key default gen_random_uuid(),
 material_version_id uuid not null references public.unit_material_versions(id),
 event text not null check(event in ('staged','revised','qa','approved','retired')),
 actor_id uuid references public.profiles(id) on delete set null,
 aal text check(aal in ('aal1','aal2')),
 detail jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index unit_material_event_version on public.unit_material_events(material_version_id,created_at);
create index unit_material_event_actor on public.unit_material_events(actor_id);
alter table public.unit_material_versions enable row level security;
alter table public.unit_material_events enable row level security;
revoke all on public.unit_material_versions,public.unit_material_events from public,anon,authenticated,service_role;

create function private.unit_material_fingerprint(m public.unit_material_versions) returns text
language sql immutable set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_array(m.subject_program_id,m.curriculum_release_id,m.unit_id,m.material_key,m.kind,m.version_no,m.sequence_order,m.definition,m.review_package)::text,'UTF8')),'hex');
$$;
create function private.guard_unit_material() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='DELETE' then raise exception 'material_immutable';end if;
 if TG_OP='UPDATE' then
  -- Preserve historical evidence when a profile is actually deleted.
  if (to_jsonb(new)-array['created_by','reviewed_by'])=(to_jsonb(old)-array['created_by','reviewed_by']) and
   (new.created_by is not distinct from old.created_by or (new.created_by is null and not exists(select 1 from public.profiles where id=old.created_by))) and
   (new.reviewed_by is not distinct from old.reviewed_by or (new.reviewed_by is null and not exists(select 1 from public.profiles where id=old.reviewed_by))) then return new;end if;
  if (to_jsonb(new)-array['qa','status','reviewed_by','reviewed_at']) is distinct from (to_jsonb(old)-array['qa','status','reviewed_by','reviewed_at'])
   or (old.status<>'draft' and (new.qa is distinct from old.qa or new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at))
   or (old.status='retired' and new.status<>'retired') or (old.status='approved' and new.status not in ('approved','retired'))
   then raise exception 'material_immutable';end if;
 end if;
 if not exists(select 1 from public.curriculum_releases r join public.units u on u.subject_program_id=r.subject_program_id where r.id=new.curriculum_release_id and u.id=new.unit_id and r.subject_program_id=new.subject_program_id) then raise exception 'material_scope_invalid';end if;
 new.fingerprint:=private.unit_material_fingerprint(new);
 if new.status='approved' and (TG_OP='INSERT' or old.status='draft') and
  (not exists(select 1 from public.profiles where id=new.reviewed_by and role::text in ('admin','content_admin') and account_status='active') or
   new.qa->'passed' is distinct from 'true'::jsonb or new.qa->>'fingerprint' is distinct from new.fingerprint)
 then raise exception 'material_qa_required';end if;
 return new;
end;
$$;
create trigger unit_material_guard before insert or update or delete on public.unit_material_versions for each row execute function private.guard_unit_material();
create function private.guard_unit_material_event() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.actor_id is null and old.actor_id is not null and not exists(select 1 from public.profiles where id=old.actor_id) and (to_jsonb(new)-'actor_id')=(to_jsonb(old)-'actor_id') then return new;end if;
 raise exception 'material_event_immutable';
end;
$$;
create trigger unit_material_event_guard before update or delete on public.unit_material_events for each row execute function private.guard_unit_material_event();

-- Structural QA is evidence for this exact saved version, not human content acceptance.
create function private.unit_material_issues(m public.unit_material_versions) returns jsonb
language plpgsql stable set search_path='' as $$
declare d jsonb:=m.definition; p jsonb:=m.review_package; issues jsonb:='[]'; c jsonb;
begin
 if jsonb_typeof(d->'title') is distinct from 'string' or coalesce(length(btrim(d->>'title')),0) not between 1 and 200
 or coalesce(d->>'locale','')!~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then issues:=issues||'"title_or_locale"'::jsonb;end if;
 if jsonb_typeof(d->'source') is distinct from 'object' or coalesce(d->'source','{}')='{}'::jsonb
 or coalesce(length(btrim(p->>'sourceReference')),0)=0 or coalesce(length(btrim(p->>'comparisonReference')),0)=0
 then issues:=issues||'"source_or_comparison"'::jsonb;end if;
 if jsonb_typeof(d->'outcomes') is distinct from 'array' then issues:=issues||'"outcomes"'::jsonb;
 elsif jsonb_array_length(d->'outcomes')=0 or exists(select 1 from jsonb_array_elements(d->'outcomes') x where jsonb_typeof(x)<>'string' or not exists(select 1 from public.curriculum_release_skills s where s.curriculum_release_id=m.curriculum_release_id and s.skill_code_snapshot=x#>>'{}')) then issues:=issues||'"outcomes"'::jsonb;end if;
 if m.kind='guide' then
  if d->>'schemaVersion' is distinct from 'teaching-guide-v1' or jsonb_typeof(d->'text') is distinct from 'string'
   or coalesce(length(btrim(d->>'text')),0) not between 1 and 12000 or jsonb_typeof(d->'workedExample') is distinct from 'string'
   or coalesce(length(btrim(d->>'workedExample')),0) not between 1 and 4000 then issues:=issues||'"guide_definition"'::jsonb;end if;
 else
  if d->>'schemaVersion' is distinct from 'extended-text-v1' or jsonb_typeof(d->'prompt') is distinct from 'string'
   or coalesce(length(btrim(d->>'prompt')),0) not between 1 and 8000 or d->>'wordCountConvention' is distinct from 'unicode-whitespace-v1'
   or jsonb_typeof(d->'baselineRequired') is distinct from 'boolean' or jsonb_typeof(d->'assistance') is distinct from 'object'
   or exists(select 1 from jsonb_object_keys(d) k where k not in ('schemaVersion','title','prompt','locale','minWords','maxWords','wordCountConvention','baselineRequired','assistance','source','outcomes','criteria'))
   then issues:=issues||'"writing_definition"'::jsonb;end if;
  if coalesce(d->>'minWords','')!~ '^[0-9]{1,4}$' or coalesce(d->>'maxWords','')!~ '^[1-9][0-9]{0,3}$' then issues:=issues||'"word_range"'::jsonb;
  elsif (d->>'minWords')::integer>(d->>'maxWords')::integer or (d->>'maxWords')::integer>4000 then issues:=issues||'"word_range"'::jsonb;end if;
  if jsonb_typeof(d->'criteria') is distinct from 'array' then issues:=issues||'"rubric"'::jsonb;
  else
   if jsonb_array_length(d->'criteria') not between 1 and 12 or (select count(distinct v->>'key') from jsonb_array_elements(d->'criteria') v)<>jsonb_array_length(d->'criteria') then issues:=issues||'"rubric"'::jsonb;end if;
   for c in select value from jsonb_array_elements(d->'criteria') loop
    if coalesce(c->>'key','')!~ '^[a-z][a-z0-9_]{0,39}$' or jsonb_typeof(c->'label') is distinct from 'string' or coalesce(length(btrim(c->>'label')),0) not between 1 and 160 or jsonb_typeof(c->'descriptors') is distinct from 'array' then issues:=issues||'"rubric"'::jsonb;
    elsif jsonb_array_length(c->'descriptors') not between 2 and 11 or exists(select 1 from jsonb_array_elements(c->'descriptors') v where jsonb_typeof(v)<>'string' or length(btrim(v#>>'{}')) not between 1 and 1000) then issues:=issues||'"rubric"'::jsonb;end if;
   end loop;
  end if;
 end if;
 return issues;
end;
$$;

create function private.service_unit_materials(p_actor_id uuid,p_auth_session_id uuid,p_aal text,p_action text,p_payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare m public.unit_material_versions%rowtype; prior public.unit_material_versions%rowtype; result jsonb; issues jsonb; new_id uuid; off_n integer;
begin
 if p_action is null or p_action not in ('list','get','revise','qa','approve','retire') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>100000 then raise exception 'material_request_invalid';end if;
 -- Lock identities before content locks, and evaluate wall-clock expiry after waits.
 perform 1 from public.profiles p join auth.users u on u.id=p.id join auth.sessions s on s.user_id=p.id
  where p.id=p_actor_id and s.id=p_auth_session_id for share of p,u,s;
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id join auth.sessions s on s.user_id=p.id
  where p.id=p_actor_id and p.role::text in ('admin','content_admin') and p.account_status='active' and s.id=p_auth_session_id
  and (s.not_after is null or s.not_after>clock_timestamp()) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp()))
 then raise exception 'material_forbidden';end if;
 if p_aal is null or p_aal not in ('aal1','aal2') then raise exception 'material_forbidden';end if;
 if p_action in ('approve','retire') and p_aal<>'aal2' then raise exception 'material_mfa_required';end if;
 if p_action='list' then
  if coalesce(p_payload->>'offset','0')!~ '^[0-9]{1,6}$' then raise exception 'material_request_invalid';end if;
  off_n:=coalesce((p_payload->>'offset')::integer,0);
  with latest as (
   select distinct on (curriculum_release_id,unit_id,material_key) * from public.unit_material_versions order by curriculum_release_id,unit_id,material_key,version_no desc
  ), page as (
   select m.id,m.material_key,m.kind,m.version_no,m.sequence_order,m.status,m.qa,m.definition->>'title' title,
    m.subject_program_id,m.curriculum_release_id,m.unit_id,s.name_hy subject_name,g.label_hy grade_label,ru.title_hy_snapshot unit_title
   from latest m join public.subject_programs sp on sp.id=m.subject_program_id join public.subjects s on s.id=sp.subject_id
   join public.grades g on g.id=sp.grade_id join public.curriculum_release_units ru on ru.curriculum_release_id=m.curriculum_release_id and ru.unit_id=m.unit_id
   order by s.name_hy,g.grade_number,m.curriculum_release_id,ru.sequence_order_snapshot,m.sequence_order,m.material_key offset off_n limit 201
  ) select jsonb_build_object('materials',coalesce((select jsonb_agg(to_jsonb(q)) from (select * from page limit 200) q),'[]'::jsonb),'hasMore',(select count(*)>200 from page)) into result;
 else
  select * into m from public.unit_material_versions where id=(p_payload->>'id')::uuid;
  if not found then raise exception 'material_unavailable';end if;
  perform pg_advisory_xact_lock(hashtextextended('unit-material:'||m.curriculum_release_id::text||':'||m.unit_id::text||':'||m.material_key,0));
  select * into m from public.unit_material_versions where id=m.id for update;
  if p_action<>'get' then
   if p_payload->>'fingerprint' is distinct from m.fingerprint or exists(select 1 from public.unit_material_versions v where v.curriculum_release_id=m.curriculum_release_id and v.unit_id=m.unit_id and v.material_key=m.material_key and v.version_no>m.version_no) then raise exception 'material_conflict';end if;
  end if;
  if p_action='revise' then
   if jsonb_typeof(p_payload->'definition') is distinct from 'object' or jsonb_typeof(p_payload->'reviewPackage') is distinct from 'object' or coalesce(length(btrim(p_payload->>'reason')),0) not between 1 and 2000 then raise exception 'material_request_invalid';end if;
   -- A material's outcomes/source/assessment policy are governed onboarding data, not silently moved by text editing.
   if ((p_payload->'definition')-array['title','text','workedExample','prompt','minWords','maxWords','criteria']) is distinct from (m.definition-array['title','text','workedExample','prompt','minWords','maxWords','criteria']) or p_payload->'reviewPackage' is distinct from m.review_package then raise exception 'material_scope_invalid';end if;
   insert into public.unit_material_versions(subject_program_id,curriculum_release_id,unit_id,material_key,kind,version_no,sequence_order,definition,review_package,fingerprint,created_by)
    values(m.subject_program_id,m.curriculum_release_id,m.unit_id,m.material_key,m.kind,m.version_no+1,m.sequence_order,p_payload->'definition',m.review_package,'',p_actor_id) returning id into new_id;
   insert into public.unit_material_events(material_version_id,event,actor_id,aal,detail) values(new_id,'revised',p_actor_id,p_aal,jsonb_build_object('fromVersion',m.id,'reason',p_payload->>'reason'));
   select * into m from public.unit_material_versions where id=new_id;
  elsif p_action='qa' then
   if m.status<>'draft' then raise exception 'material_read_only';end if;
   issues:=private.unit_material_issues(m);
   update public.unit_material_versions set qa=jsonb_build_object('passed',jsonb_array_length(issues)=0,'issues',issues,'fingerprint',m.fingerprint,'checkedAt',clock_timestamp(),'checkVersion','unit-material-qa-v1') where id=m.id returning * into m;
   insert into public.unit_material_events(material_version_id,event,actor_id,aal,detail) values(m.id,'qa',p_actor_id,p_aal,m.qa);
  elsif p_action='approve' and m.status<>'approved' then
   if m.status<>'draft' then raise exception 'material_read_only';end if;
   if m.qa->'passed' is distinct from 'true'::jsonb or m.qa->>'fingerprint' is distinct from m.fingerprint or private.unit_material_issues(m)<>'[]'::jsonb then raise exception 'material_qa_required';end if;
   for prior in select * from public.unit_material_versions v where v.curriculum_release_id=m.curriculum_release_id and v.unit_id=m.unit_id and v.material_key=m.material_key and v.status='approved' for update loop
    update public.unit_material_versions set status='retired' where id=prior.id;
    insert into public.unit_material_events(material_version_id,event,actor_id,aal,detail) values(prior.id,'retired',p_actor_id,p_aal,jsonb_build_object('supersededBy',m.id));
   end loop;
   if m.kind='writing' then
    -- Never overwrite an independently registered task, even if its textual key matches.
    if exists(select 1 from public.written_task_versions w where w.curriculum_release_id=m.curriculum_release_id and w.unit_id=m.unit_id and w.task_key=m.material_key and not exists(select 1 from public.unit_material_versions v where v.id=w.id)) then raise exception 'material_conflict';end if;
    update public.written_task_versions set status='retired' where curriculum_release_id=m.curriculum_release_id and unit_id=m.unit_id and task_key=m.material_key and status='approved';
    insert into public.written_task_versions(id,task_key,version_no,subject_program_id,curriculum_release_id,unit_id,definition,status,reviewed_by,reviewed_at,review_evidence)
     values(m.id,m.material_key,m.version_no,m.subject_program_id,m.curriculum_release_id,m.unit_id,m.definition,'approved',p_actor_id,clock_timestamp(),jsonb_build_object('qaPassed',true,'reviewReference','unit-material:'||m.id::text,'sourceComparisonReference',m.review_package->>'comparisonReference','fingerprint',m.fingerprint));
   end if;
   update public.unit_material_versions set status='approved',reviewed_by=p_actor_id,reviewed_at=clock_timestamp() where id=m.id returning * into m;
   insert into public.unit_material_events(material_version_id,event,actor_id,aal,detail) values(m.id,'approved',p_actor_id,p_aal,jsonb_build_object('fingerprint',m.fingerprint,'scope','content-rubric-and-review-package; no curriculum activation'));
  elsif p_action='retire' and m.status<>'retired' then
   if coalesce(length(btrim(p_payload->>'reason')),0) not between 1 and 2000 then raise exception 'material_request_invalid';end if;
   update public.unit_material_versions set status='retired' where id=m.id returning * into m;
   if m.kind='writing' then update public.written_task_versions set status='retired' where id=m.id and status='approved';end if;
   insert into public.unit_material_events(material_version_id,event,actor_id,aal,detail) values(m.id,'retired',p_actor_id,p_aal,jsonb_build_object('reason',p_payload->>'reason'));
  end if;
  select jsonb_build_object('material',to_jsonb(m),'history',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'version_no',v.version_no,'status',v.status,'created_at',v.created_at) order by v.version_no desc) from public.unit_material_versions v where v.curriculum_release_id=m.curriculum_release_id and v.unit_id=m.unit_id and v.material_key=m.material_key),'[]'::jsonb),'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.unit_material_events e where e.material_version_id=m.id),'[]'::jsonb)) into result;
 end if;
 if not exists(select 1 from auth.sessions s join auth.users u on u.id=s.user_id where s.id=p_auth_session_id and s.user_id=p_actor_id and (s.not_after is null or s.not_after>clock_timestamp()) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=clock_timestamp())) then raise exception 'material_forbidden';end if;
 return result;
exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'material_request_invalid';
end;
$$;
create function public.service_unit_materials(p_actor_id uuid,p_auth_session_id uuid,p_aal text,p_action text,p_payload jsonb default '{}')
returns jsonb language sql set search_path='' as $$select private.service_unit_materials(p_actor_id,p_auth_session_id,p_aal,p_action,p_payload);$$;
revoke all on function private.unit_material_fingerprint(public.unit_material_versions),private.guard_unit_material(),private.guard_unit_material_event(),private.unit_material_issues(public.unit_material_versions),private.service_unit_materials(uuid,uuid,text,text,jsonb),public.service_unit_materials(uuid,uuid,text,text,jsonb) from public,anon,authenticated,service_role;
grant usage on schema private to service_role;
grant execute on function private.service_unit_materials(uuid,uuid,text,text,jsonb),public.service_unit_materials(uuid,uuid,text,text,jsonb) to service_role;

-- Existing privacy endpoint passes its verified user ID; expose counts, never staff material contents.
create function private.unit_material_privacy_counts(p_user_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('materialVersions',(select count(*) from public.unit_material_versions where created_by=p_user_id),'materialReviews',(select count(*) from public.unit_material_versions where reviewed_by=p_user_id),'materialEvents',(select count(*) from public.unit_material_events where actor_id=p_user_id));
$$;
create function public.service_unit_material_privacy_counts(p_user_id uuid) returns jsonb language sql set search_path='' as $$select private.unit_material_privacy_counts(p_user_id);$$;
revoke all on function private.unit_material_privacy_counts(uuid),public.service_unit_material_privacy_counts(uuid) from public,anon,authenticated,service_role;
grant execute on function private.unit_material_privacy_counts(uuid),public.service_unit_material_privacy_counts(uuid) to service_role;
