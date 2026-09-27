import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {getPracticeDiagnosticBlock} from '../supabase/functions/_shared/practice-diagnostic-gate.ts';

function handler(name,mode='practice',historyError=false){
 let serve;const tables=[];
 const saved={id:'saved',student_id:'learner',unit_code:'MATH8-U02',mode,status:'active'};
 const admin={auth:{getUser:async()=>({data:{user:{id:'learner'}}})},from(table){
  tables.push(table);
  const chain={select(){return this},eq(){return this},limit(){return this},
   maybeSingle:async()=>({data:null,error:historyError?new Error('offline'):null}),
   single:async()=>({data:table==='learning_sessions'?saved:{id:'si',item_id:'item',answered_at:null}})};
  return chain;
 }};
 const source=readFileSync(new URL(`../supabase/functions/${name}/index.ts`,import.meta.url),'utf8').replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 vm.runInNewContext(js,{Deno:{env:{get:()=> 'test'},serve:fn=>serve=fn},createClient:()=>admin,
  hasActiveLiveSession:async()=>true,hasPhysics7Access:async()=>true,getPracticeDiagnosticBlock,Response,console});
 return {serve,tables};
}
for(const name of ['start-learning-session','get-session-item','submit-answer','get-remediation-help']){
 for(const mode of ['practice','chapter_review']) test(`${name} denies ${mode} before content or answer processing`,async()=>{
  const {serve,tables}=handler(name,mode);
  const response=await serve(new Request('https://test/',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({mode,sessionId:'saved',sessionItemId:'si',itemId:'item',response:{value:'A'}})}));
  assert.equal(response.status,403);assert.equal((await response.json()).error,'chapter_diagnostic_required');
  assert.ok(!tables.includes('items'));assert.ok(!tables.includes('attempts'));
 });
}
test('history outages cannot unlock practice',async()=>{
 const {serve}=handler('start-learning-session','practice',true);
 const response=await serve(new Request('https://test/',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({mode:'practice'})}));
 assert.equal(response.status,503);
});
