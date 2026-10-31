import {mountTeacherTaskSend} from './teacher-task-send.mjs';
import {escapeHtml as esc} from './learning-navigation.mjs';
import {mountTeacherTaskEditor} from './teacher-task-editor.mjs';

// Copies are private saved drafts. Reuse never copies learner work or feedback.
export function mountTeacherTaskDraftWorkspace({root,client,context,actorId,onClose=()=>{},isCurrent=()=>true}){
 let alive=true,invalid=false,epoch=0,busy=false,editor=null,rows=[],offset=0,retry=null,pendingCopy=null;
 const ctx=Object.fromEntries(['assignmentId','curriculumReleaseId','unitId'].map(k=>[k,context[k]]));
 const current=()=>alive&&!invalid&&isCurrent()&&root.isConnected,$=s=>root.querySelector(s);
 const canLeave=()=>{if(pendingCopy){message('Նախ ստուգեք պատճենի պահպանման հաստատումը։',true);return false;}return editor?.canLeave?.()??true;};
 function shell(){root.innerHTML='<section class="card wa-panel"><div class="wa-heading"><h2>Իմ սևագրերը</h2><button type="button" class="ghost" data-drafts-close>Դասընթացի գրավորները</button></div><p>Սևագրերը տեսնում եք միայն դուք։ Պահպանումը առաջադրանք չի ուղարկում աշակերտներին։</p><p data-drafts-status role="status" aria-live="polite" tabindex="-1"></p><div data-drafts-list></div></section><div data-drafts-editor></div>';}
 const message=(v,bad=false)=>{if(current()){$('[data-drafts-status]').textContent=v;$('[data-drafts-status]').classList.toggle('bad',bad);}};
 const lock=()=>{if(current()){if(busy)root.setAttribute('aria-busy','true');else root.removeAttribute('aria-busy');root.querySelectorAll('button').forEach(b=>{b.disabled=busy||Boolean(pendingCopy)&&!b.hasAttribute('data-drafts-retry');});}};
 async function read(action,payload,done){
  if(busy||!current())return;const version=++epoch;busy=true;retry=()=>read(action,payload,done);lock();message(action==='copy'?'Պատճենը պահպանվում է…':'Սևագրերը բեռնվում են…');
  try{
   const session=await client.auth.getSession();if(!current()||epoch!==version)return;if(session.data?.session?.user?.id!==actorId)throw Error('unauthorized');
   const {data,error}=await client.functions.invoke('manage-teacher-task-drafts',{body:{action,context:ctx,payload}});
   const after=await client.auth.getSession();if(after.data?.session?.user?.id!==actorId)throw Error('unauthorized');
   if(!current()||epoch!==version)return;
   if(error||data?.error){let code=data?.error;try{code||=(await error.context?.json())?.error;}catch{}throw Error(code??'unavailable');}
   if(data?.version!=='teacher-task-drafts-v1')throw Error('unavailable');
   retry=null;pendingCopy=null;message('');done(data);
  }catch(e){if(current()&&epoch===version){const forbidden=['unauthorized','assignment_forbidden'].includes(e.message),known=['task_draft_invalid','task_draft_conflict','task_draft_unavailable'].includes(e.message);if(forbidden||known){pendingCopy=null;retry=null;}
   message(forbidden?'Այս դասարանի հասանելիությունը պետք է նորից ստուգել։ Վերադառնալով՝ ընտրեք հասանելի դասարան։':e.message==='task_draft_conflict'?'Սևագիրը փոխվել է այլ պատուհանում։ Թարմացրեք ցանկը և կրկին ընտրեք պատճենը։':pendingCopy?'Պատճենի հաստատումը չի ստացվել։ Կրկնեք նույն գործողությունը։':'Սևագիրը չբեռնվեց։ Ձեր պահպանված տարբերակը չի փոխվել։ Փորձեք կրկին։',true);
   if(forbidden)$('[data-drafts-list]').replaceChildren();else if(retry&&!$('[data-drafts-retry]'))$('[data-drafts-list]').insertAdjacentHTML('beforeend','<button type="button" data-drafts-retry>Փորձել կրկին</button>');}}
  finally{if(current()&&epoch===version){busy=false;lock();}}
 }
 function list(more=false,leaveChecked=false){
  if(!leaveChecked&&!canLeave())return;editor?.dispose();editor=null;$('[data-drafts-editor]').replaceChildren();if(!more){rows=[];offset=0;}
  void read('list',{offset},data=>{rows=more?[...new Map([...rows,...data.drafts].map(d=>[d.id,d])).values()]:data.drafts;offset=data.nextOffset;
   $('[data-drafts-list]').innerHTML=`${data.readOnly?'<p>Արխիվացված դասարանում սևագրերը միայն դիտման համար են։</p>':'<button type="button" data-drafts-new>Ստեղծել նոր առաջադրանք</button>'}<div class="wa-tasks">${rows.map(d=>`<article><h3>${esc(d.title||'Առանց վերնագրի սևագիր')}</h3><p>Սևագիր · տարբերակ ${esc(String(d.revision))}</p>${data.readOnly?'':`<div class="wa-actions"><button type="button" class="secondary" data-drafts-open="${esc(d.id)}">Շարունակել խմբագրումը</button><button type="button" class="ghost" data-drafts-copy="${esc(d.id)}">Ստեղծել պատճեն</button></div>`}</article>`).join('')||'<p>Դեռ պահպանված սևագիր չկա։</p>'}</div>${data.hasMore?'<button type="button" class="ghost" data-drafts-more>Բեռնել ավելին</button>':''}<button type="button" class="ghost" data-drafts-refresh>Թարմացնել ցանկը</button>`;
  });
 }
 function edit(draft=null,initialNote=''){
  editor?.dispose();editor=null;$('[data-drafts-list]').replaceChildren();message('');
  editor=mountTeacherTaskEditor({root:$('[data-drafts-editor]'),client,context:ctx,actorId,draft,initialNote,isCurrent:current,onPrepare:record=>{editor?.dispose();editor=mountTeacherTaskSend({root:$('[data-drafts-editor]'),client,context:ctx,actorId,draft:record,isCurrent:current,onClose:()=>list(false,true)});},onClose:()=>list(false,true),onReload:record=>{void read('get',{id:record.id},data=>{if(!data.readOnly)edit(data.draft);else{editor?.dispose();editor=null;queueMicrotask(()=>list());}});}});
 }
 const click=e=>{if(!current()||busy)return;const b=e.target.closest('button');if(!b||pendingCopy&&!b.hasAttribute('data-drafts-retry'))return;
  if(b.hasAttribute('data-drafts-close')){if(canLeave())onClose();}
  else if(b.hasAttribute('data-drafts-new')){if(canLeave())edit();}
  else if(b.hasAttribute('data-drafts-refresh'))list();
  else if(b.hasAttribute('data-drafts-more'))list(true);
  else if(b.hasAttribute('data-drafts-retry'))void retry?.();
  else if(b.dataset.draftsCopy){const row=rows.find(r=>r.id===b.dataset.draftsCopy);if(row&&canLeave()){pendingCopy={id:row.id,expectedRevision:row.revision,requestId:crypto.randomUUID()};void read('copy',pendingCopy,data=>edit(data.draft,'Սա նոր սևագիր է։ Բնօրինակ առաջադրանքը չի փոխվել։'+(data.draft.definition.source.kind==='pdf'?' PDF-ն արդեն կցված է։':'')));}}
  else if(b.dataset.draftsOpen){if(canLeave())void read('get',{id:b.dataset.draftsOpen},data=>{if(data.readOnly)message('Դասարանն այժմ հասանելի է միայն դիտման համար։ Թարմացրեք սևագրերի ցանկը։');else edit(data.draft);});}
 };
 const sub=client.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'||s?.user?.id!==actorId){invalid=true;epoch++;editor?.dispose();editor=null;root.removeAttribute('aria-busy');root.innerHTML='<p role="status">Հաշիվը փոխվել է։ Նորից բացեք ձեր աշխատանքային էջը։</p>';}});
 const unload=e=>{if(current()&&pendingCopy){e.preventDefault();e.returnValue='';}};
 const signout=e=>{if(current()&&pendingCopy)e.preventDefault();};
 const navigate=e=>{const a=e.target.closest?.('a[href]');if(current()&&pendingCopy&&a&&!e.defaultPrevented&&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&a.target!=='_blank'){e.preventDefault();e.stopImmediatePropagation();message('Նախ ստուգեք պատճենի պահպանման հաստատումը։',true);}};
 root.classList.add('writing-assignment-workspace');shell();root.addEventListener('click',click);window.addEventListener('beforeunload',unload);document.addEventListener('haiedu-before-signout',signout);document.addEventListener('click',navigate,true);list();
 return{canLeave,hasUnsaved:()=>Boolean(pendingCopy)||Boolean(editor?.hasUnsaved?.()),dispose(){alive=false;epoch++;editor?.dispose();sub.data.subscription.unsubscribe();root.removeEventListener('click',click);window.removeEventListener('beforeunload',unload);document.removeEventListener('haiedu-before-signout',signout);document.removeEventListener('click',navigate,true);root.removeAttribute('aria-busy');root.replaceChildren();}};
}
