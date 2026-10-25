// Offline QA of an exact transaction readback; no credentials or production writes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import {validateTypedKey} from '../../supabase/functions/_shared/typed-fields.mjs';
import {validateArrangementKey} from '../../supabase/functions/_shared/arrangement-responses.mjs';

const work=process.argv[2];assert.ok(work,'Pass the private registration evidence directory.');
const read=name=>JSON.parse(readFileSync(join(work,name),'utf8'));
const manifest=read('registration.json'),baseline=read('baseline.json');
const contract={'16.1C.41':{questions:25,audio:12,sets:12},'16.1C.42':{questions:48,audio:4,sets:15}}[manifest.checkpoint];
assert.ok(contract,'Unsupported source-registration checkpoint.');
const expectedCount=contract.questions;
assert.equal(manifest.audioVersions.length,contract.audio);
assert.equal(manifest.taskSets.length,contract.sets);
const projection=read(process.argv[3]??'transaction-readback.json').projection;
const wrapper=read('deployed-qa.json');
const deployed=wrapper.files?wrapper:JSON.parse(wrapper.content[0].text);
const source=readFileSync('supabase/functions/manage-content-quality/index.ts','utf8');
assert.equal(deployed.files.find(f=>f.name==='manage-content-quality/index.ts').content,source);
const rows={...baseline};
for(const [table,values] of Object.entries(projection)){
  const key=table==='item_answer_keys'?'item_id':'id';
  const ids=new Set(manifest.revisions.map(r=>r.itemId));
  rows[table]=['item_options','item_answer_keys','item_versions','item_qa_runs'].includes(table)
    ? [...(baseline[table]??[]).filter(r=>!ids.has(r.item_id)),...values]
    : [...(baseline[table]??[]).filter(r=>!values.some(v=>v[key]===r[key])),...values];
}
const context={validateTypedKey,validateArrangementKey,Deno:{serve(){}},Response};
vm.createContext(context);
vm.runInContext(ts.transpile(source.replace(/^import[\s\S]*?;\n/gm,'')+'\nglobalThis.evaluateQa=evaluateQa; globalThis.authoringSourceRegistered=authoringSourceRegistered;', {target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}),context);
const admin={from(table){assert.ok(table in rows,table);const filters=[];let single=false;const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},neq(k,v){filters.push(r=>r[k]!==v);return q},is(k,v){assert.equal(v,null);filters.push(r=>r[k]==null);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},order(){return q},maybeSingle(){single=true;return q},then(resolve,reject){const found=rows[table].filter(r=>filters.every(f=>f(r)));return Promise.resolve({data:single?(found[0]??null):found,error:null}).then(resolve,reject)}};return q}};
const qa=[];
for(const revision of manifest.revisions){
  const item=rows.items.find(i=>i.id===revision.itemId);assert.equal(item.version_no,2);
  const result=JSON.parse(JSON.stringify(await context.evaluateQa(admin,item)));
  assert.deepEqual(result.errors,[],revision.code);assert.equal(result.passed,true,revision.code);
  const contextSnapshot=rows.item_versions.find(v=>v.item_id===item.id&&v.version_no===item.config.authoringReview.snapshotVersion).snapshot.authoringReview;
  assert.equal(await context.authoringSourceRegistered(admin,item,contextSnapshot),true,revision.code);
  qa.push({item_id:item.id,version_no:2,run_by:null,...result,details:{...result.details,automatedSourceRegistrationQa:{checkpoint:manifest.checkpoint,handlerVersion:deployed.version,handlerSha256:createHash('sha256').update(source).digest('hex'),execution:'Actual deployed evaluateQa over exact transaction rows; no HTTP/Auth/MFA or human question-approval claim',acceptanceReference:manifest.ownerAcceptanceReference}}});
}
assert.equal(qa.length,expectedCount);
writeFileSync(join(work,'qa.json'),JSON.stringify(qa,null,2)+'\n');
console.log(JSON.stringify({passed:qa.length,registeredSourceChecks:qa.length,warnings:[...new Set(qa.flatMap(q=>q.warnings))]}));

