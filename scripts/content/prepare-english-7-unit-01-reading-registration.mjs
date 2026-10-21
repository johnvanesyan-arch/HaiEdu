// Offline preparation only. Emits a guarded rollback/commit transaction; never connects to production.
// The acceptance, live baseline and deployed-runtime readbacks are explicit inputs.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {validateTypedKey} from '../../supabase/functions/_shared/typed-fields.mjs';
import {validateArrangementKey} from '../../supabase/functions/_shared/arrangement-responses.mjs';

const work=process.argv[2];assert.ok(work,'Provide the verified evidence directory.');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const save=(p,v)=>writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const sha=v=>createHash('sha256').update(v).digest('hex');
const lit=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const acceptancePath='docs/evidence/english-7-unit-01-reading-acceptance-20261021.json';
const acceptance=read(acceptancePath),plan=read('docs/content/english-7-unit-01-reading-registration-plan.json');
const deployed=read(join(work,'deployed-edge.json')),runtime=read(join(work,'runtime-match.json'));
const source=readFileSync('supabase/functions/manage-content-quality/index.ts','utf8');
assert.equal(deployed.files.find(f=>f.name==='manage-content-quality/index.ts').content,source);
assert.equal(read(join(work,'owner.json')).id,acceptance.reviewerProfileId);
assert.equal(acceptance.verifiedProfile.accountStatus,'active');
assert.equal(Object.keys(acceptance.acceptedTextSha256).length,7);
const reference=acceptancePath+'#'+sha(readFileSync(acceptancePath));
const sets=plan.taskSets.map(s=>{
 assert.equal(sha(s.proposedRow.stimulus.content),acceptance.acceptedTextSha256[s.sourceCode]);
 return {...s.proposedRow,permission_reference:reference+'; '+acceptance.reuseBasis[s.sourceCode],review_reference:reference+'; owner accepted exact source for MVP; delegated registration',reviewed_by:acceptance.reviewerProfileId,reviewed_at:acceptance.recordedAt};
});
const manifest={schemaVersion:'haiedu-reading-registration-v1',checkpoint:'16.1C.8',reviewedSourceCommit:acceptance.reviewedSourceCommit,acceptanceReference:reference,scope:acceptance.reuseBasis.scope,taskSets:sets,revisions:plan.revisions.map(r=>({...r,payload:{...r.payload,changeSummary:'16.1C.8 owner-accepted MVP source attachment; delegated on John Vanesyan’s explicit acceptance. '+r.payload.changeSummary}})),limits:acceptance.boundaries};
save(join(work,'registration.json'),manifest);

if(process.argv[3]==='qa'){
 const rows=read(join(work,'transaction-readback.json')).projection;
 const context={validateTypedKey,validateArrangementKey,Deno:{serve(){}},Response};
 vm.createContext(context);
 vm.runInContext(ts.transpile(source.replace(/^import[\s\S]*?;\n/gm,'')+'\nglobalThis.evaluateQa=evaluateQa; globalThis.authoringSourceRegistered=authoringSourceRegistered;', {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}),context);
 const admin={from(table){assert.ok(table in rows,table);const filters=[];let single=false;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},neq(k,v){filters.push(r=>r[k]!==v);return q},is(k,v){assert.equal(v,null);filters.push(r=>r[k]==null);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},maybeSingle(){single=true;return q},then(resolve,reject){const found=rows[table].filter(r=>filters.every(f=>f(r)));return Promise.resolve({data:single?(found[0]??null):found,error:null}).then(resolve,reject)}};return q}};
 const qa=[];
 for(const r of manifest.revisions){
  const item=rows.items.find(i=>i.id===r.itemId);assert.equal(item.version_no,2);
  const result=JSON.parse(JSON.stringify(await context.evaluateQa(admin,item)));
  assert.deepEqual(result.errors,[],r.code);assert.equal(result.passed,true,r.code);
  const attachment=rows.item_versions.find(v=>v.item_id===item.id&&v.version_no===item.config.authoringReview.snapshotVersion).snapshot.authoringReview;
  assert.equal(await context.authoringSourceRegistered(admin,item,attachment),true,r.code);
  qa.push({item_id:item.id,version_no:2,run_by:null,...result,details:{...result.details,automatedSourceRegistrationQa:{checkpoint:'16.1C.8',handlerVersion:deployed.version,handlerSha256:sha(source),execution:'Actual deployed evaluateQa over read-only materialized production transaction rows; no HTTP/Auth/MFA or human question approval claim',acceptanceReference:reference}}});
 }
 assert.equal(qa.length,17);save(join(work,'qa.json'),qa);
 console.log(JSON.stringify({passed:qa.length,registeredSourceChecks:17,warnings:[...new Set(qa.flatMap(q=>q.warnings))]}));
}else{
 const guards=read(join(work,'pre-guards.json'));assert.equal(guards.length,70);
 const ids=manifest.revisions.map(r=>r.itemId),idsSql=ids.map(i=>"'"+i+"'::uuid").join(',');
 const end=process.argv[3]==='commit'?'commit':'rollback';
 const qa=end==='commit'?read(join(work,'qa.json')):[];
 if(end==='commit')assert.equal(qa.length,17);
 const deltas={learning_task_set_versions:7,item_versions:17,item_qa_runs:qa.length};
 const excluded=table=>table==='items'?` where id not in (${idsSql})`:['item_options','item_answer_keys'].includes(table)?` where item_id not in (${idsSql})`:'';
 const allTables=guards.map(g=>g.table_name).sort();
 const sql=['begin;',"set local lock_timeout='5s';","set local statement_timeout='90s';",'lock table '+allTables.map(t=>'public.'+t).join(', ')+' in share row exclusive mode;',
  'create temporary table c8_old_items on commit drop as select * from public.items where id in ('+idsSql+');',
  'create temporary table c8_old_keys on commit drop as select * from public.item_answer_keys where item_id in ('+idsSql+');',
  'create temporary table c8_old_options on commit drop as select * from public.item_options where item_id in ('+idsSql+');',
  "do $c8$ declare g jsonb; r jsonb; originals jsonb:='{}'; actual_count bigint; actual_hash text; missing_count bigint; registered_set public.learning_task_set_versions%rowtype; ordered uuid[]; expected_order uuid[]; begin"];
 sql.push(`if not exists(select 1 from public.profiles where id='${acceptance.reviewerProfileId}' and role='admin' and account_status='active' and master_admin_protected_at is not null) then raise exception 'C8 owner no longer active'; end if;`);
 for(const f of runtime.sqlFunctions)sql.push(`if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='${f.schema}' and p.proname='${f.name}' and md5(p.prosrc)='${f.prosrcMd5}') then raise exception 'C8 runtime drift ${f.name}'; end if;`);
 sql.push(`for g in select value from jsonb_array_elements(${lit(guards)}) loop
 execute format($q$select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public.%I t$q$,g->>'table_name') into actual_count,actual_hash;
 if actual_count<>(g->>'row_count')::bigint or actual_hash<>g->>'fingerprint' then raise exception 'C8 stale baseline %',g->>'table_name'; end if;
 end loop;`);
 for(const table of allTables)sql.push(`select coalesce(jsonb_agg(md5(to_jsonb(t)::text)),'[]') into r from public.${table} t${excluded(table)}; originals:=originals||jsonb_build_object('${table}',r);`);
 for(const r of manifest.revisions)sql.push(`if not exists(select 1 from public.items i where i.id='${r.itemId}' and to_jsonb(i) @> ${lit(r.expectedCurrentItem)} and i.version_no=1 and i.review_status='needs_review') then raise exception 'C8 stale item ${r.code}'; end if;`);
 const columns=Object.keys(sets[0]).join(',');
 sql.push(`insert into public.learning_task_set_versions(${columns}) select ${columns} from jsonb_populate_recordset(null::public.learning_task_set_versions,${lit(sets)});`);
 for(const r of manifest.revisions)sql.push(`r:=public.service_save_item_content_revision('${r.itemId}','${acceptance.reviewerProfileId}',${lit(r.payload)}); if (r->>'versionNo')::int<>2 then raise exception 'C8 incorrect version ${r.code}'; end if;`);
 sql.push('set constraints all immediate;');
 if(qa.length){const columns=Object.keys(qa[0]).join(',');sql.push(`insert into public.item_qa_runs(${columns}) select ${columns} from jsonb_populate_recordset(null::public.item_qa_runs,${lit(qa)});`);}
 sql.push(`if exists(select 1 from c8_old_items old join public.items i on i.id=old.id where (to_jsonb(old)-array['version_no','stimulus','status','updated_at','variant_fingerprint']) is distinct from (to_jsonb(i)-array['version_no','stimulus','status','updated_at','variant_fingerprint'])) then raise exception 'C8 changed question semantics'; end if;
 if exists(select 1 from c8_old_keys old join public.item_answer_keys k on k.item_id=old.item_id where (to_jsonb(old)-'updated_at') is distinct from (to_jsonb(k)-'updated_at')) then raise exception 'C8 changed answer key'; end if;
 if exists((select to_jsonb(old)-'id' from c8_old_options old except all select to_jsonb(o)-'id' from public.item_options o where o.item_id in (${idsSql})) union all (select to_jsonb(o)-'id' from public.item_options o where o.item_id in (${idsSql}) except all select to_jsonb(old)-'id' from c8_old_options old)) then raise exception 'C8 changed option content or order'; end if;
 if (select count(*) from public.items where id in (${idsSql}) and version_no=2 and review_status='needs_review' and status='review' and validation_state='provisional_no_sme_review')<>17 then raise exception 'C8 incorrect review state'; end if;`);
 for(const s of sets)sql.push(`select * into registered_set from public.learning_task_set_versions where id='${s.id}';
 if not to_jsonb(registered_set) @> (${lit(s)}-'reviewed_at') or registered_set.reviewed_at<>'${s.reviewed_at}'::timestamptz then raise exception 'C8 source mismatch'; end if;
 select array_agg((value->>'itemId')::uuid order by ordinality) into expected_order from jsonb_array_elements(registered_set.members) with ordinality;
 select private.order_task_set_items(array_agg((value->>'itemId')::uuid order by ordinality desc),'C8-registration') into ordered from jsonb_array_elements(registered_set.members) with ordinality;
 if ordered<>expected_order then raise exception 'C8 incorrect source order'; end if;
 for r in select value from jsonb_array_elements(registered_set.members) loop
  if private.item_source_family((r->>'itemId')::uuid)<>registered_set.source_family_id or private.task_set_stimulus((select stimulus from public.items where id=(r->>'itemId')::uuid),(r->>'itemId')::uuid,registered_set.curriculum_release_id,registered_set.unit_id)<>registered_set.stimulus then raise exception 'C8 source attachment mismatch'; end if;
 end loop;`);
 for(const table of allTables)sql.push(`select count(*) into actual_count from public.${table}; if actual_count<>${guards.find(g=>g.table_name===table).row_count+(deltas[table]??0)} then raise exception 'C8 unexpected delta ${table}'; end if;
 select count(*) into missing_count from (select value from jsonb_array_elements_text(originals->'${table}') except all select md5(to_jsonb(t)::text) from public.${table} t${excluded(table)}) missing; if missing_count<>0 then raise exception 'C8 changed preserved rows ${table}'; end if;`);
 sql.push(`if exists(select 1 from public.curriculum_releases where id='${plan.identities.release}' and (status<>'draft' or activated_at is not null)) then raise exception 'C8 release activation forbidden'; end if;
 end $c8$;`);
 const selectors={items:"code like 'ENG7-U01-%'",item_options:"item_id in (select id from public.items where code like 'ENG7-U01-%')",item_answer_keys:"item_id in (select id from public.items where code like 'ENG7-U01-%')",item_templates:"id in (select item_template_id from public.items where code like 'ENG7-U01-%')",item_families:"id in (select item_family_id from public.item_templates where id in (select item_template_id from public.items where code like 'ENG7-U01-%'))",item_versions:"item_id in (select id from public.items where code like 'ENG7-U01-%')",item_misconception_mappings:"item_id in (select id from public.items where code like 'ENG7-U01-%')",learning_task_set_versions:`curriculum_release_id='${plan.identities.release}'`};
 const projection=Object.entries(selectors).map(([table,where])=>`'${table}',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from public.${table} t where ${where})`).join(',');
 const readback=`select jsonb_build_object('checkpoint','16.1C.8','observedAt',now(),'sourceSets',7,'revisedItems',17,'guardedTables',70,'priorRowsPreserved',true,'keysAndWordingPreserved',true,'allowedDeltas',${lit(deltas)},'projection',jsonb_build_object(${projection})) as result;`;
 sql.push(readback,end+';');
 writeFileSync(join(work,end+'.sql'),sql.join('\n')+'\n');writeFileSync(join(work,'readback.sql'),readback+'\n');
 console.log(JSON.stringify({mode:end,sets:sets.length,revisions:ids.length,qa:qa.length,guardedTables:allTables.length,sqlBytes:Buffer.byteLength(sql.join('\n'))}));
}
