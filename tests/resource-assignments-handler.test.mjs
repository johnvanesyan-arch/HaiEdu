import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,token,context,id} from './fixtures/supplementary-resources-api.mjs';
import {published,prepared,call,materialCall,definition,addLearner} from './fixtures/resource-assignments-db.mjs';
const request=(f,action,payload={},actor=20,ctx=action==='inbox'?{}:context(0,actor===20))=>f.handleAssignments(new Request('https://fixture.invalid/assignments',{method:'POST',headers:{Authorization:'Bearer '+token(actor),'Content-Type':'application/json'},body:JSON.stringify({action,context:ctx,payload})}));
async function pdf(f){
 const d={...definition,format:'pdf'};delete d.url;let m=(await materialCall(f.db,'create',{definition:d})).material;
 const bytes=new TextEncoder().encode('%PDF-1.7\nSynthetic fixture\n%%EOF\n'),body=new FormData();body.append('request',JSON.stringify({action:'upload',context:context(0,true),payload:{id:m.id,fingerprint:m.fingerprint}}));body.append('file',new Blob([bytes],{type:'application/pdf'}),'fixture.pdf');
 const r=await f.request(body);assert.equal(r.status,200);m=(await r.json()).material;
 await materialCall(f.db,'qa',{id:m.id,fingerprint:m.fingerprint});await materialCall(f.db,'publish',{id:m.id,fingerprint:m.fingerprint});
 return{m,bytes};
}
test('verified HTTP identity, exact selected enrollment and idempotent receipt; no recipient leak to learners',async t=>{
 const f=await fixture();t.after(()=>f.db.close());await addLearner(f.db);const m=await published(f.db),p=await prepared(f.db,m,{mode:'selected',enrollmentIds:[id(371)]});
 const first=await request(f,'assign',p);assert.equal(first.status,200);const a=(await first.json()).assignment;
 const replay=await request(f,'assign',p);assert.equal((await replay.json()).assignment.id,a.id);
 const inbox=await(await request(f,'inbox',{},10)).json();assert.equal(inbox.assignments.length,1);assert.equal(inbox.assignments[0].recipientCount,undefined);assert.equal(inbox.recipients,undefined);
 assert.equal((await request(f,'open',{id:a.id},12,{...context(),enrollmentId:id(9112)})).status,404);
 const open=await request(f,'open',{id:a.id},10);assert.equal(open.headers.get('Cache-Control'),'no-store');assert.equal((await open.json()).url,definition.url);
 const deny=await request(f,'assign',p,10,context());assert.equal(deny.status,403);
});
test('private PDF assignment delivery checks exact bytes and rechecks cancellation after storage',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const {m,bytes}=await pdf(f),a=(await call(f.db,'assign',await prepared(f.db,m))).assignment;
 let r=await request(f,'open',{id:a.id},10);assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'application/pdf');assert.match(r.headers.get('Content-Disposition'),/^attachment/);assert.match(r.headers.get('Content-Security-Policy'),/sandbox/);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes);
 f.setDownloadHook(()=>call(f.db,'cancel',{id:a.id,revision:1,reason:'Synthetic cancellation during download'}));
 r=await request(f,'open',{id:a.id},10);assert.equal(r.status,404);assert.equal((await r.json()).error,'assignment_unavailable');
});
test('PDF corruption and session revocation after storage never return bytes',async t=>{
 const f=await fixture();t.after(()=>f.db.close());const {m}=await pdf(f),a=(await call(f.db,'assign',await prepared(f.db,m))).assignment;
 const [path,blob]=[...f.objects][0];f.objects.set(path,new Blob(['tampered'],{type:'application/pdf'}));
 let r=await request(f,'open',{id:a.id},10);assert.equal(r.status,503);assert.equal((await r.json()).error,'assignment_file_invalid');
 f.objects.set(path,blob);f.setDownloadHook(()=>f.db.query("update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=$1",[id(401)]));
 assert.equal((await request(f,'open',{id:a.id},10)).status,403);
});
test('strict request envelope, bounded body, expired sessions and hidden internal errors',async t=>{
 const f=await fixture();t.after(()=>f.db.close());
 assert.equal((await f.handleAssignments(new Request('https://fixture.invalid',{method:'GET'}))).status,405);
 assert.equal((await f.handleAssignments(new Request('https://fixture.invalid',{method:'POST',body:'{}'}))).status,401);
 for(const [action,payload,ctx] of [['inbox',{actorId:id(10)},{}],['inbox',{}, {actorId:id(10)}],['cancel',{id:id(9),revision:1,reason:''},context(0,true)],['assign',{materialId:id(1),enrollmentIds:[]},context(0,true)],['preview',{materialId:id(1),search:'x'.repeat(33000)},context(0,true)]])assert.equal((await request(f,action,payload,20,ctx)).status,400);
 f.admin.rpc=async()=>({error:{message:'private internal database details'}});const r=await request(f,'inbox',{},10);assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/private internal/);
});
