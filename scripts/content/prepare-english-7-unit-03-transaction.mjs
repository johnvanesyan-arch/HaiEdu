// Offline, insert-only Unit 3 draft onboarding. Never connects to a service.
// Protected SQL output belongs in the restricted input directory, never public Git.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
assert.ok(process.argv[2],'Supply the restricted directory');const root=resolve(process.argv[2])+'/';
const m=JSON.parse(readFileSync(root+'materialized-manifest.json')),guards=JSON.parse(readFileSync(root+'pre-guards.json'));
assert.equal(m.checkpoint,'16.1C.39');assert.equal(guards.length,117);assert.equal(m.rows.items.length,160);
const allowed=['units','curriculum_releases','curriculum_release_units','curriculum_release_gate_checks','skills','curriculum_release_skills','item_families','item_templates','items','item_options','item_answer_keys','item_curriculum_scopes','unit_material_versions','item_qa_runs'];
assert.deepEqual(Object.keys(m.rows).sort(),[...allowed].sort());
assert.equal(m.rows.item_qa_runs.filter(x=>x.passed).length,87);
assert.ok(m.rows.items.every(x=>x.status==='draft'&&x.review_status==='needs_review'&&x.version_no===1));
assert.ok(m.rows.unit_material_versions.every(x=>x.status==='draft'&&x.created_by===null));
const delta=Object.fromEntries(Object.entries(m.rows).map(([t,rows])=>['public.'+t,rows.length]));delta['public.item_versions']=160;delta['public.unit_material_events']=18;
const lit=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const preserve=`
for g in select value from jsonb_array_elements(${lit(guards)}) loop
 execute format('select count(*),md5(coalesce(string_agg(md5(to_jsonb(x)::text), %L order by md5(to_jsonb(x)::text)),%L)) from %I.%I x','','',g->>'schema_name',g->>'table_name') into n,h;
 if n<>(g->>'row_count')::bigint or h<>g->>'fingerprint' then raise exception 'C39 stale guard %.%',g->>'schema_name',g->>'table_name';end if;
 execute format('select coalesce(jsonb_agg(md5(to_jsonb(x)::text)),%L::jsonb) from %I.%I x','[]',g->>'schema_name',g->>'table_name') into prior;
 originals:=originals||jsonb_build_object((g->>'schema_name')||'.'||(g->>'table_name'),prior);
end loop;`;
const sql=[`begin isolation level read committed;\nset local lock_timeout='5s';\nset local statement_timeout='60s';`,
'lock table '+guards.map(g=>`${g.schema_name}.${g.table_name}`).join(', ')+' in share row exclusive mode;',
`do $draft$ declare payload jsonb:=${lit({rows:m.rows,snapshots:m.snapshots})}; originals jsonb:='{}'; g jsonb; prior jsonb; t text; cols text; n bigint; h text; missing bigint; scope text; mat public.unit_material_versions%rowtype; issues jsonb; begin`,preserve,
`if exists(select 1 from public.items where code like 'ENG7-U03-%') or exists(select 1 from public.skills where code like 'ENG7-U03-%') then raise exception 'C39 already staged';end if;
if exists(select 1 from public.units where code='ENG7-U03') or exists(select 1 from public.curriculum_releases where id='${m.identities.release}' or (subject_program_id='${m.identities.programme}' and release_number=3)) then raise exception 'C39 catalogue collision';end if;`];
for(const table of allowed){
 const rows=m.rows[table];if(!rows.length)continue;const keys=Object.keys(rows[0]);for(const r of rows)assert.deepEqual(Object.keys(r),keys);assert.ok(keys.every(k=>/^[a-z_]+$/.test(k)));const cols=keys.join(',');
 sql.push(`insert into public.${table}(${cols}) select ${cols} from jsonb_populate_recordset(null::public.${table},payload->'rows'->'${table}');`);
}
sql.push(`insert into public.item_versions(item_id,version_no,snapshot,change_summary,created_by)
 select i.id,1,jsonb_build_object('item',to_jsonb(i),'options',coalesce((select jsonb_agg(jsonb_build_object('option_key',o.option_key,'content_hy',o.content_hy,'content_en',o.content_en,'display_order',o.display_order) order by o.display_order) from public.item_options o where o.item_id=i.id),'[]'::jsonb),'answerKey',(select to_jsonb(k)-'item_id' from public.item_answer_keys k where k.item_id=i.id),'misconceptions','[]'::jsonb,'authoringReview',s->'context'),'16.1C.39 automated inactive Unit 3 draft onboarding; human review pending',null
 from jsonb_array_elements(payload->'snapshots') s join public.items i on i.id=(s->>'itemId')::uuid;
 for mat in select * from public.unit_material_versions where curriculum_release_id='${m.identities.release}' order by sequence_order loop
  insert into public.unit_material_events(material_version_id,event,actor_id,aal,detail) values(mat.id,'staged',null,null,jsonb_build_object('checkpoint','16.1C.39','provenance','automated inactive draft onboarding; no human approval'));
  issues:=private.unit_material_issues(mat);
  if issues<>'[]'::jsonb then raise exception 'C39 material QA %: %',mat.material_key,issues;end if;
  update public.unit_material_versions set qa=jsonb_build_object('passed',true,'issues',issues,'fingerprint',mat.fingerprint,'checkedAt',clock_timestamp(),'checkVersion','unit-material-qa-v1','automatedOnboarding',true) where id=mat.id;
  insert into public.unit_material_events(material_version_id,event,actor_id,aal,detail) select id,'qa',null,null,qa from public.unit_material_versions where id=mat.id;
 end loop;
 set constraints all immediate;
 for g in select value from jsonb_array_elements(${lit(guards)}) loop
  scope:=(g->>'schema_name')||'.'||(g->>'table_name');
  execute format('select count(*) from %I.%I',g->>'schema_name',g->>'table_name') into n;
  if n<>(g->>'row_count')::bigint+coalesce((${lit(delta)}->>scope)::int,0) then raise exception 'C39 unexpected delta %',scope;end if;
  execute format('select count(*) from (select value from jsonb_array_elements_text($1) except all select md5(to_jsonb(x)::text) from %I.%I x) missing',g->>'schema_name',g->>'table_name') into missing using originals->scope;
  if missing<>0 then raise exception 'C39 changed prior rows %',scope;end if;
 end loop;
 if (select count(*) from public.items where code like 'ENG7-U03-%' and status='draft' and review_status='needs_review')<>160 then raise exception 'C39 incomplete reviewer catalogue';end if;
 if (select count(*) from public.curriculum_release_gate_checks where curriculum_release_id='${m.identities.release}' and status='pending' and checked_at is null)<>7 then raise exception 'C39 gates not pending';end if;
 if exists(select 1 from public.written_task_versions where curriculum_release_id='${m.identities.release}') then raise exception 'C39 writing publication forbidden';end if;
end $draft$;
select jsonb_build_object('checkpoint','16.1C.39','observedAt',clock_timestamp(),'items',160,'standaloneQaPassed',87,'sourceHeld',73,'materials',9,'materialQaPassed',9,'allPriorRowsPreserved',true,'guardedTables',117,'allowedDeltas',${lit(delta)}) evidence;`);
const body=sql.join('\n');writeFileSync(root+'rollback.sql',body+'\nrollback;\n');writeFileSync(root+'commit.sql',body+'\ncommit;\n');writeFileSync(root+'expected-deltas.json',JSON.stringify(delta,null,2)+'\n');console.log(JSON.stringify({bytes:Buffer.byteLength(body),deltas:delta}));
