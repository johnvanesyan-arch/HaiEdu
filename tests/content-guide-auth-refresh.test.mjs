import test from 'node:test';
import assert from 'node:assert/strict';
import {guideHarness} from './fixtures/content-session-harness.mjs';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
const session={user:{id:'QA-user'}};
const response=(guides=[],role='content_admin')=>({data:{guides,actor:{role,aal:'aal1'}},error:null});
async function signedIn(h){const pending=h.api.showForSession(session);h.calls[0].resolve(response());await pending;}
async function event(h,event,who=session){h.authEvent(event,who);if(h.timers.length)h.timers.shift()();await flush();}

for(const scope of ['skill','template'])for(const role of ['content_admin','admin']){
  test(`P3-22: same-user sign-in revalidates access without replacing the dirty ${scope} guide for ${role}`,async()=>{
    const h=await guideHarness({deferTimers:true});await signedIn(h);
    h.api.prepare({dirty:true,scope});h.get('gTitleHy').value='Unsaved synthetic title';
    const before=h.api.snapshot().detail;
    await event(h,'SIGNED_IN');h.calls[1].resolve(response([{guideScope:scope,guideSourceId:'QA-guide'}],role));await flush();
    // Finish the obsolete forced detail read on the unfixed baseline to expose its effect.
    if(h.calls[2]){h.calls[2].resolve({data:{guide:{guideScope:scope,guideSourceId:'QA-guide',content:{titleHy:'Saved synthetic title'}},variants:[],history:[]},error:null});await flush();}
    assert.equal(h.api.snapshot().editorDirty,true);assert.equal(h.api.snapshot().detail,before);
    assert.equal(h.get('gTitleHy').value,'Unsaved synthetic title');assert.equal(h.calls.length,2,'one authoritative access/catalogue read; no editor detail reload');
    assert.equal(h.get('guideConsole').classList.contains('hidden'),false);
    await event(h,'TOKEN_REFRESHED');assert.equal(h.calls.length,2);assert.equal(h.api.snapshot().editorDirty,true);
  });
}

test('same-user sign-in during bootstrap coalesces the authoritative access read',async()=>{
  const h=await guideHarness({deferTimers:true});const initial=h.api.showForSession(session);
  await event(h,'SIGNED_IN');const count=h.calls.length;
  for(const call of h.calls)call.resolve(response());await initial;await flush();
  assert.equal(count,1);assert.equal(h.get('guideConsole').classList.contains('hidden'),false);
});

test('a user change clears protected dirty guide state before the new role check',async()=>{
  const h=await guideHarness({deferTimers:true});await signedIn(h);h.api.prepare({dirty:true});h.get('guideEditor').innerHTML='Old synthetic protected editor';
  await event(h,'SIGNED_IN',{user:{id:'QA-other-user'}});
  assert.equal(h.api.snapshot().detail,null);assert.equal(h.api.snapshot().selectedId,null);assert.equal(h.api.snapshot().catalog.length,0);assert.equal(h.api.snapshot().editorDirty,false);
  assert.equal(h.get('guideEditor').innerHTML,'');assert.equal(h.get('guideConsole').classList.contains('hidden'),true);
  h.calls[1].resolve({data:null,error:{message:'content_authoring_role_required'}});await flush();assert.equal(h.get('guideConsole').classList.contains('hidden'),true);
});

test('same-user access denial still hides the protected console and permits access recovery',async()=>{
  const h=await guideHarness({deferTimers:true});await signedIn(h);h.api.prepare({dirty:true});
  await event(h,'SIGNED_IN');h.calls[1].resolve({data:null,error:{message:'account_or_session_inactive'}});await flush();
  assert.equal(h.get('guideConsole').classList.contains('hidden'),true);assert.equal(h.get('authPanel').classList.contains('hidden'),false);
  await event(h,'SIGNED_IN');h.calls[2].resolve(response([{guideScope:'skill',guideSourceId:'QA-guide'}]));await flush();
  if(h.calls[3]){h.calls[3].resolve({data:{guide:{guideScope:'skill',guideSourceId:'QA-guide'},variants:[],history:[]},error:null});await flush();}
  assert.equal(h.get('guideConsole').classList.contains('hidden'),false);
});

test('same-user access revalidation does not cancel a pending guide save completion',async()=>{
  const h=await guideHarness({deferTimers:true});await signedIn(h);h.api.prepare({dirty:true});h.get('changeRationale').value='Synthetic QA rationale';
  const save=h.api.runWorkflow('save_draft');assert.equal(h.calls[1].body.action,'save_draft');
  await event(h,'SIGNED_IN');h.calls[2].resolve(response([{guideScope:'skill',guideSourceId:'QA-guide'}]));await flush();
  assert.equal(h.api.snapshot().editorDirty,true);
  h.calls[1].resolve({data:{result:{authoringVersion:2}},error:null});await flush();
  assert.equal(h.calls[3].body.action,'list');h.calls[3].resolve(response([{guideScope:'skill',guideSourceId:'QA-guide'}]));await flush();
  h.calls[4].resolve({data:{guide:{guideScope:'skill',guideSourceId:'QA-guide',authoringVersion:2},variants:[],history:[]},error:null});await save;
  assert.equal(h.api.snapshot().editorDirty,false);assert.match(h.get('guideMessage').textContent,/հաջողությամբ/);
});
