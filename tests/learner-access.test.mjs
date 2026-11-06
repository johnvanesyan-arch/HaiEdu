import test from 'node:test';
import assert from 'node:assert/strict';
import {learnerAccess} from '../web/learner-access.mjs';
function fixture(){
 let session={user:{id:'learner-a'},access_token:'a1'},listener,subscriptions=0;
 const reads=[],events=new EventTarget();
 const client={auth:{getSession:async()=>({data:{session}}),onAuthStateChange(fn){listener=fn;subscriptions++;}},functions:{invoke(){return new Promise(resolve=>reads.push(resolve));}}};
 return {client,reads,events,store:learnerAccess(client,events),get subscriptions(){return subscriptions;},emit(event,next=session){session=next;listener(event,session);}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('only concurrent reads share work; settlement and failure require fresh authorization next time',async()=>{
 const f=fixture();assert.equal(learnerAccess(f.client,f.events),f.store);assert.equal(f.subscriptions,1);
 const a=f.store.read(),b=f.store.read();assert.equal(a,b);await tick();assert.equal(f.reads.length,1);
 f.reads[0]({data:{contexts:['a']}});assert.deepEqual(await a,await b);
 const c=f.store.read();await tick();assert.equal(f.reads.length,2);f.reads[1]({error:new Error('unavailable')});assert.ok((await c).error);
 const d=f.store.read();await tick();assert.equal(f.reads.length,3);f.reads[2]({data:{contexts:[]}});assert.deepEqual((await d).data.contexts,[]);
});
for(const reason of ['SIGNED_OUT','SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED','join','access','pagehide','restore'])test('pending access is fenced across '+reason+'; old finally cannot remove the replacement',async()=>{
 const f=fixture(),a=f.store.read();await tick();
 if(reason==='SIGNED_OUT')f.emit(reason,null);
 else if(reason==='SIGNED_IN')f.emit(reason,{user:{id:'learner-b'},access_token:'b1'});
 else if(['TOKEN_REFRESHED','USER_UPDATED'].includes(reason))f.emit(reason);
 else f.store.invalidate(reason);
 if(reason==='SIGNED_OUT'){f.reads[0]({data:{contexts:['old']}});assert.equal((await a).stale,true);assert.equal((await f.store.read()).data.accessStatus,'signed_out');assert.equal(f.reads.length,1);return;}
 const b=f.store.read();await tick();assert.equal(f.reads.length,2);
 f.reads[0]({data:{contexts:['old']}});assert.equal((await a).stale,true);assert.equal(f.store.read(),b);
 f.reads[1]({data:{contexts:['new']}});assert.deepEqual((await b).data.contexts,['new']);
});
test('delayed initial session cannot authorize an old account after a newer auth event',async()=>{
 const f=fixture();let resolve;f.client.auth.getSession=()=>new Promise(r=>resolve=r);
 const old=f.store.read();f.emit('SIGNED_IN',{user:{id:'learner-a'},access_token:'a1'});f.emit('SIGNED_IN',{user:{id:'learner-b'},access_token:'b1'});
 resolve({data:{session:{user:{id:'learner-a'},access_token:'a1'}}});assert.equal((await old).stale,true);assert.equal(f.reads.length,0);
});
test('clients never share reads and only persisted page restoration invalidates startup',async()=>{
 const a=fixture(),b=fixture();const pa=a.store.read(),pb=b.store.read();await tick();assert.equal(a.reads.length,1);assert.equal(b.reads.length,1);
 a.events.dispatchEvent(new Event('pageshow'));assert.equal(a.store.read(),pa);
 const event=new Event('pageshow');Object.defineProperty(event,'persisted',{value:true});a.events.dispatchEvent(event);
 a.reads[0]({data:{contexts:['a']}});b.reads[0]({data:{contexts:['b']}});assert.equal((await pa).stale,true);assert.deepEqual((await pb).data.contexts,['b']);
});
test('an already-delivered new auth event wins over a stale getSession snapshot',async()=>{
 const f=fixture();f.emit('INITIAL_SESSION');f.emit('SIGNED_IN',{user:{id:'learner-b'},access_token:'b1'});
 f.client.auth.getSession=async()=>({data:{session:{user:{id:'learner-a'},access_token:'a1'}}});
 assert.equal((await f.store.read()).stale,true);assert.equal(f.reads.length,0);
 f.emit('SIGNED_OUT',null);assert.equal((await f.store.read()).data.accessStatus,'signed_out');assert.equal(f.reads.length,0);
});
