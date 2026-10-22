// Offline materialization of the existing reviewer QA and a guarded insert-only transaction.
// Run from repository root; this script never connects to production.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {resolve} from 'node:path';
import ts from '../../node_modules/typescript/lib/typescript.js';
import {validateTypedKey} from '../../supabase/functions/_shared/typed-fields.mjs';
import {validateArrangementKey} from '../../supabase/functions/_shared/arrangement-responses.mjs';
assert.ok(process.argv[2],'Supply a private directory containing import-manifest.json, live-corpus.json and pre-guards.json');
const root=resolve(process.argv[2])+'/';
const m=JSON.parse(readFileSync(root+'import-manifest.json'));
const source=readFileSync('supabase/functions/manage-content-quality/index.ts','utf8');
const context={validateTypedKey,validateArrangementKey,Deno:{serve(){}},Response};
vm.createContext(context);
vm.runInContext(ts.transpile(source.replace(/^import[\s\S]*?;\n/gm,'')+'\nglobalThis.evaluateQa=evaluateQa;', {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}),context);
const live=JSON.parse(readFileSync(root+'live-corpus.json')).snapshot;
const rows={...m.rows,items:[...live.items,...m.rows.items],item_misconception_mappings:[],learning_task_set_versions:[],item_versions:m.snapshots.map(s=>({item_id:s.itemId,version_no:1,snapshot:{authoringReview:s.context}}))};
const admin={from(table){assert.ok(table in rows,table);let filters=[],single=false;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},neq(k,v){filters.push(r=>r[k]!==v);return q},is(k,v){assert.equal(v,null);filters.push(r=>r[k]==null);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},maybeSingle(){single=true;return q},then(resolve,reject){const result=rows[table].filter(r=>filters.every(f=>f(r)));return Promise.resolve({data:single?(result[0]??null):result,error:null}).then(resolve,reject)}};return q}};
m.rows.item_qa_runs=[];
for(const item of m.rows.items){const q=JSON.parse(JSON.stringify(await context.evaluateQa(admin,item)));assert.deepEqual(q.errors,m.snapshots.find(s=>s.itemId===item.id).context.source?['authoring_source_registration_pending']:[],item.code);m.rows.item_qa_runs.push({item_id:item.id,version_no:1,run_by:null,...q,details:{...q.details,automatedImportQa:{checkpoint:'16.1C.13',handlerSha256:createHash('sha256').update(source).digest('hex'),execution:'actual evaluateQa with a read-only materialized-row adapter; no Auth/MFA or human approval claim'}}});}
assert.equal(m.rows.item_qa_runs.filter(q=>q.passed).length,60);
writeFileSync(root+'materialized-manifest.json',JSON.stringify(m));
const guards=JSON.parse(readFileSync(root+'pre-guards.json'));
const tables=guards.map(g=>g.table_name).sort();
assert.equal(tables.length,71);
const delta=Object.fromEntries(Object.entries(m.rows).filter(([k,v])=>v.length).map(([k,v])=>[k,v.length]));delta.item_versions=84;
for(const k of Object.keys(delta))assert.ok(tables.includes(k),k);
const lit=o=>"'"+JSON.stringify(o).replaceAll("'","''")+"'::jsonb";
const sql=[];
sql.push('begin;',"set local lock_timeout='5s';","set local statement_timeout='60s';",'lock table '+tables.map(t=>'public.'+t).join(', ')+' in share row exclusive mode;');
sql.push(`do $import$ declare g jsonb; actual_count bigint; actual_hash text; missing_count bigint; originals jsonb := '{}'::jsonb; r jsonb; columns_sql text; begin`);
sql.push(`for g in select value from jsonb_array_elements(${lit(guards)}) loop
execute format($q$select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text),'')) from public.%I t$q$,g->>'table_name') into actual_count,actual_hash;
if actual_count<>(g->>'row_count')::bigint or actual_hash<>g->>'fingerprint' then raise exception 'C13 stale precondition %',g->>'table_name'; end if;
execute format($q$select coalesce(jsonb_agg(md5(to_jsonb(t)::text)),'[]'::jsonb) from public.%I t$q$,g->>'table_name') into r;
originals:=originals||jsonb_build_object(g->>'table_name',r);
end loop;`);
for(const [table,items] of Object.entries(m.rows)){if(!items.length)continue;const cols=Object.keys(items[0]);for(const r of items)assert.deepEqual(Object.keys(r),cols);const columns=cols.join(',');sql.push(`insert into public.${table}(${columns}) select ${columns} from jsonb_populate_recordset(null::public.${table},${lit(items)});`);}
sql.push(`insert into public.item_versions(item_id,version_no,snapshot,change_summary,created_by)
select i.id,1,jsonb_build_object('item',to_jsonb(i),'options',coalesce((select jsonb_agg(jsonb_build_object('option_key',o.option_key,'content_hy',o.content_hy,'content_en',o.content_en,'display_order',o.display_order) order by o.display_order) from public.item_options o where o.item_id=i.id),'[]'::jsonb),'answerKey',(select to_jsonb(k)-'item_id' from public.item_answer_keys k where k.item_id=i.id),'misconceptions','[]'::jsonb,'authoringReview',s->'context'),'16.1C.13 automated unchanged-draft import; human review pending',null
from jsonb_array_elements(${lit(m.snapshots)}) s join public.items i on i.id=(s->>'itemId')::uuid;`);
sql.push(`set constraints all immediate;
for g in select value from jsonb_array_elements(${lit(guards)}) loop
execute format('select count(*) from public.%I',g->>'table_name') into actual_count;
if actual_count<>(g->>'row_count')::bigint+coalesce((${lit(delta)}->>(g->>'table_name'))::int,0) then raise exception 'C13 unexpected delta %',g->>'table_name'; end if;
execute format('select count(*) from (select value from jsonb_array_elements_text($1) except all select md5(to_jsonb(t)::text) from public.%I t) missing',g->>'table_name') into missing_count using originals->(g->>'table_name');
if missing_count<>0 then raise exception 'C13 changed prior row %',g->>'table_name'; end if;
end loop;
if (select count(*) from public.items where code ~ '^ENG7-U01-(DB|MB|MC)-' and status='draft' and review_status='needs_review' and validation_state='provisional_no_sme_review')<>84 then raise exception 'C13 incomplete draft import'; end if;
if exists(select 1 from public.curriculum_releases where id='${m.identities.release}' and (status<>'draft' or activated_at is not null)) then raise exception 'C13 activation forbidden'; end if;
end $import$;
select jsonb_build_object('checkpoint','16.1C.13','observedAt',now(),'items',84,'sourceHeld',24,'standaloneQaPassed',60,'priorRowsPreserved',true,'guardedTables',71,'allowedDeltas',${lit(delta)}) as evidence;`);
writeFileSync(root+'rollback.sql',sql.join('\n')+'\nrollback;\n');
writeFileSync(root+'commit.sql',sql.join('\n')+'\ncommit;\n');
writeFileSync(root+'expected-deltas.json',JSON.stringify(delta,null,2));
console.log(JSON.stringify({counts:m.counts,qaPassed:60,qaHeld:24,sqlBytes:Buffer.byteLength(sql.join('\n')),deltas:delta}));
