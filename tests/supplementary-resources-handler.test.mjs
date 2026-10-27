import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,context,id} from './fixtures/supplementary-resources-api.mjs';
import {call,definition} from './fixtures/supplementary-resources-db.mjs';
const bytes=new TextEncoder().encode('%PDF-1.7\nSynthetic envelope fixture\n%%EOF\n');
const key=m=>({id:m.id,fingerprint:m.fingerprint});
const upload=(m,data=bytes)=>{const f=new FormData();f.append('request',JSON.stringify({action:'upload',context:context(0,true),payload:key(m)}));f.append('file',new Blob([data],{type:'application/pdf'}),'fixture.pdf');return f;};
async function draft(f){const d={...definition,format:'pdf'};delete d.url;return(await call(f.db,'create',{definition:d})).material;}
test('authenticated PDF proxy uploads, binds exact digest, downloads bytes, and blocks withdrawal during delivery',async t=>{
 const f=await fixture();t.after(()=>f.db.close());let m=await draft(f);
 let response=await f.request(upload(m));assert.equal(response.status,200);m=(await response.json()).material;
 await call(f.db,'qa',key(m));await call(f.db,'publish',key(m));
 response=await f.request({action:'open',context:context(),payload:{id:m.id}},10);
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.match(response.headers.get('Content-Disposition'),/^attachment/);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
 f.setDownloadHook(()=>call(f.db,'withdraw',{...key(m),reason:'Withdraw during storage read'}));
 response=await f.request({action:'open',context:context(),payload:{id:m.id}},10);assert.equal(response.status,404);assert.equal((await response.json()).error,'resource_unavailable');
});
test('failed/expired attachment removes only the new object; tampering and direct attach are rejected',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const m=await draft(f);
 assert.equal((await f.request(upload(m,new TextEncoder().encode('<html>not PDF</html>')))).status,400);assert.equal(f.objects.size,0);
 assert.equal((await f.request({action:'attach',context:context(0,true),payload:{...key(m),objectPath:'evil'}})).status,400);
 f.setUploadHook(()=>f.db.query("update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=$1",[id(420)]));
 assert.equal((await f.request(upload(m))).status,403);assert.equal(f.objects.size,0);
 assert.equal((await f.db.query('select object_path from supplementary_resource_versions where id=$1',[m.id])).rows[0].object_path,null);
});
test('signed-in actor cannot mint arbitrary scopes, upload links, or forge review assurance',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 let r=await f.request({action:'create',context:context(0,true),payload:{definition:{...definition,url:'https://x.supabase.co/storage/v1/object/public/learning-audio/a.mp3'}}});assert.equal(r.status,400);
 r=await f.request({action:'create',context:{...context(0,true),actorId:id(30)},payload:{definition}});assert.equal(r.status,400);
 r=await f.request({action:'contexts',context:{},payload:{}},10);assert.equal((await r.json()).role,'student');
 r=await f.handle(new Request('https://fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}));assert.equal(r.status,401);
});
