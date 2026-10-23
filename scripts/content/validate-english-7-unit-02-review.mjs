// Offline evaluation of the existing reviewer QA against the complete Unit 2 draft import.
// Run from repository root; this script never connects to production.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {resolve} from 'node:path';
import ts from '../../node_modules/typescript/lib/typescript.js';
import {validateTypedKey} from '../../supabase/functions/_shared/typed-fields.mjs';
import {validateArrangementKey} from '../../supabase/functions/_shared/arrangement-responses.mjs';
assert.ok(process.argv[2],'Supply a private directory containing import-manifest.json and live-bank.json');
const root=resolve(process.argv[2])+'/';
const m=JSON.parse(readFileSync(root+'import-manifest.json'));
const source=readFileSync('supabase/functions/manage-content-quality/index.ts','utf8');
const context={validateTypedKey,validateArrangementKey,Deno:{serve(){}},Response};
vm.createContext(context);
vm.runInContext(ts.transpile(source.replace(/^import[\s\S]*?;\n/gm,'')+'\nglobalThis.evaluateQa=evaluateQa;', {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}),context);
const live={items:JSON.parse(readFileSync(root+'live-bank.json')).flatMap(s=>s.items.map(x=>x.item))};
const rows={...m.rows,items:[...live.items,...m.rows.items],item_misconception_mappings:[],learning_task_set_versions:[],item_versions:m.snapshots.map(s=>({item_id:s.itemId,version_no:1,snapshot:{authoringReview:s.context}}))};
const admin={from(table){assert.ok(table in rows,table);let filters=[],single=false;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},neq(k,v){filters.push(r=>r[k]!==v);return q},is(k,v){assert.equal(v,null);filters.push(r=>r[k]==null);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},maybeSingle(){single=true;return q},then(resolve,reject){const result=rows[table].filter(r=>filters.every(f=>f(r)));return Promise.resolve({data:single?(result[0]??null):result,error:null}).then(resolve,reject)}};return q}};
m.rows.item_qa_runs=[];
for(const item of m.rows.items){const q=JSON.parse(JSON.stringify(await context.evaluateQa(admin,item)));assert.deepEqual(q.errors,m.snapshots.find(s=>s.itemId===item.id).context.source?['authoring_source_registration_pending']:[],item.code);m.rows.item_qa_runs.push({item_id:item.id,version_no:1,run_by:null,...q,details:{...q.details,automatedImportQa:{checkpoint:'16.1C.29',handlerSha256:createHash('sha256').update(source).digest('hex'),execution:'actual evaluateQa with a read-only materialized-row adapter; no Auth/MFA or human approval claim'}}});}
assert.equal(m.rows.item_qa_runs.filter(q=>q.passed).length,132);
writeFileSync(root+'materialized-manifest.json',JSON.stringify(m));
console.log(JSON.stringify({items:m.rows.items.length,passed:m.rows.item_qa_runs.filter(q=>q.passed).length,sourceHeld:m.rows.item_qa_runs.filter(q=>!q.passed).length,warnings:[...new Set(m.rows.item_qa_runs.flatMap(q=>q.warnings))]}));
