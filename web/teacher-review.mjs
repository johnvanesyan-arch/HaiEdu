import {escapeHtml as esc} from './learning-navigation.mjs';
import {mountWrittenWork} from './written-work.mjs';
import {rememberTeacherClass} from './teacher-home-request.mjs';
const states=new Set(['submitted','changes_requested','reviewed','all']);

// Discovery only. The existing class and writing services authorize every exact
// assignment/release/unit; a menu choice never confers permission.
export function mountTeacherReview({root,supabase,actorId,initialDirectory=null,isCurrent=()=>true,onRoute=()=>{},assignmentMode=false}){
 let alive=true,ticket=0,directoryTicket=0,writing=()=>{},rows=[],directory=null,chosen=null,context=null;
 const q=new URLSearchParams(location.search);
 let archive=q.get('source')==='archive',state=states.has(q.get('state'))?q.get('state'):'submitted';
 const active=()=>alive&&isCurrent(),$=s=>root.querySelector(s);
 root.innerHTML=`<section class="card teacher-review-picker"><p>Ընտրեք դասարանն ու բաժինը։ Այստեղ կարող եք գտնել նաև արդեն ստուգված և վերանայման վերադարձված աշխատանքները։</p><div class="teacher-review-controls"><label>Դասարանների ցանկը<select data-review-source><option value="active">Ակտիվ դասարաններ</option><option value="archive">Արխիվացված դասարաններ</option></select></label><label>Դասարան<select data-review-class disabled><option value="">Դասարանները բեռնվում են…</option></select></label><label>Բաժին<select data-review-unit disabled><option value="">Նախ ընտրեք դասարանը</option></select></label></div><p data-review-message role="status" aria-live="polite"></p><p data-review-context class="subtle"></p><div class="row"><button type="button" class="ghost hidden" data-review-more>Բեռնել հաջորդ դասարանները</button><button type="button" class="ghost hidden" data-review-retry>Փորձել նորից</button><a href="./teacher-workflows.html#review">Ստուգման ուղեցույց</a></div></section><div data-review-writing></div>`;
 if(assignmentMode){root.querySelector('.teacher-review-picker').classList.add('teacher-writing-picker');$('[data-review-source]').closest('label').hidden=true;root.querySelector('.teacher-review-picker > p').textContent='Ընտրեք դասարանն ու բաժինը, ապա ընտրեք դասընթացի առաջադրանքը կամ պատրաստեք ձեր սևագիրը։';const guide=root.querySelector('a[href]');guide.href='./teacher-workflows.html#assign-writing';guide.textContent='Հանձնարարելու ուղեցույց';}$('[data-review-source]').value=archive?'archive':'active';
 const message=text=>{if(active())$('[data-review-message]').textContent=text;};
 const leave=()=>writing.canLeave?writing.canLeave():!writing.hasUnsaved?.()||window.confirm('Չպահպանված գնահատականը չեղարկե՞լ։');
 function clearWork(){writing();writing=()=>{};context=null;$('[data-review-writing]').replaceChildren();$('[data-review-context]').textContent='';}
 function route(replace=false){
  const u=new URL(location.href);u.searchParams.set('view',assignmentMode?'assign-writing':'review');u.searchParams.set('source',archive?'archive':'classes');if(!assignmentMode)u.searchParams.set('state',state);else u.searchParams.delete('state');
  for(const key of ['class','assignment','release','unit','todayWork','queueAssignment'])u.searchParams.delete(key);
  if(chosen){u.searchParams.set('class',chosen.id);if(chosen.assignmentId)u.searchParams.set('assignment',chosen.assignmentId);}
  if(context){u.searchParams.set('release',context.curriculumReleaseId);u.searchParams.set('unit',context.unitId);}
  u.hash='';const next=u.pathname+u.search;
  if(next!==location.pathname+location.search)history[replace?'replaceState':'pushState']({},'',next);
  onRoute();
 }
 function options(){
  const select=$('[data-review-class]');
  select.innerHTML='<option value="">Ընտրեք դասարանը</option>'+rows.map((c,i)=>`<option value="${i}">${esc([c.name,c.subjectName,c.schoolName,c.academicYear].filter(Boolean).join(' · '))}</option>`).join('');
  const index=rows.findIndex(c=>c.id===chosen?.id&&c.assignmentId===chosen?.assignmentId);select.value=index<0?'':String(index);select.disabled=false;
  $('[data-review-more]').classList.toggle('hidden',!directory?.hasMore);
 }
 let retry=()=>{};
 async function loadDirectory({more=false,initial=false}={}){
  const request=++directoryTicket,offset=more?directory?.nextOffset??0:0;
  $('[data-review-more]').disabled=true;$('[data-review-retry]').classList.add('hidden');message('Դասարանները բեռնվում են…');
  retry=()=>loadDirectory({more,initial});
  try{
   const response=initial&&initialDirectory?.directory?.archive===archive?{data:initialDirectory}:await supabase.functions.invoke('get-teacher-dashboard',{body:{readMode:'directory',archive,offset}});
   if(!active()||request!==directoryTicket)return;
   const {data,error}=response;if(error||!data?.directory||!Array.isArray(data.classes))throw Error('directory_unavailable');
   rows=more?[...new Map([...rows,...data.classes].map(c=>[JSON.stringify([c.id,c.assignmentId]),c])).values()]:data.classes;directory={...data.directory,nextOffset:offset+data.classes.length};options();message(rows.length?'':'Այս ցանկում հասանելի դասարան չկա։');
   if(initial&&q.get('class'))await loadClass({id:q.get('class'),assignmentId:q.get('assignment')},q.get('release')&&q.get('unit')?{assignmentId:q.get('assignment'),curriculumReleaseId:q.get('release'),unitId:q.get('unit')}:null,true);
  }catch{if(active()&&request===directoryTicket){message('Դասարանների ցանկը չբեռնվեց։ Փորձեք կրկին։');$('[data-review-retry]').classList.remove('hidden');}}
  finally{if(active()&&request===directoryTicket)$('[data-review-more]').disabled=false;}
 }
 async function openQueue(klass,unit){
  context={assignmentId:klass.assignmentId,curriculumReleaseId:unit.curriculumReleaseId,unitId:unit.unitId};
  $('[data-review-context]').textContent=[klass.name,klass.subjectName,unit.unitTitleHy,klass.schoolName,klass.academicYear].filter(Boolean).join(' · ');
  const request=ticket,scope=context;
  if(assignmentMode){try{const {mountTeacherAssignmentWorkspace}=await import('./writing-assignments.mjs');if(!active()||request!==ticket||context!==scope)return;const instance=mountTeacherAssignmentWorkspace({root:$('[data-review-writing]'),client:supabase,actorId,context:{...klass,...unit,...scope,classId:klass.id},isCurrent:()=>active()&&request===ticket&&context===scope});writing=()=>instance.dispose();writing.canLeave=instance.canLeave;writing.hasUnsaved=instance.hasUnsaved;}catch{if(active()&&request===ticket&&context===scope){message('Հանձնարարելու գործիքը չբեռնվեց։ Փորձեք կրկին։');$('[data-review-retry]').classList.remove('hidden');}}return;}

  writing=mountWrittenWork({root:$('[data-review-writing]'),supabase,actorId,teacher:true,context:scope,initialState:state,stateButtons:true,
   isCurrent:()=>active()&&request===ticket&&context===scope,
   onStateChange:value=>{state=value;route();}});
 }
 async function loadClass(klass,selection=null,initial=false){
  const request=++ticket;clearWork();chosen=klass;options();
  const unit=$('[data-review-unit]');unit.disabled=true;unit.innerHTML='<option value="">Բաժինները բեռնվում են…</option>';
  $('[data-review-retry]').classList.add('hidden');message('Դասարանի տվյալները բեռնվում են…');if(!initial)route();
  retry=()=>loadClass(klass,selection,initial);
  try{
   const {data,error}=await supabase.functions.invoke('get-teacher-dashboard',{body:{readMode:'class',classId:klass.id,...(klass.assignmentId?{assignmentId:klass.assignmentId}:{}),...(selection?{selection}:{})}});
   if(!active()||request!==ticket)return;
   const detail=data?.classes?.find(c=>c.id===klass.id&&(!klass.assignmentId||c.assignmentId===klass.assignmentId));
   if(error||!detail)throw Error('class_unavailable');
   chosen=detail;if(!rows.some(c=>c.id===detail.id&&c.assignmentId===detail.assignmentId))rows.push(detail);options();
   if(!data.institutionalTeacher||!detail.selectedUnit){unit.innerHTML='<option value="">Հասանելի բաժին չկա</option>';message('Այս դասարանի համար գրավոր աշխատանքների ստուգումը հասանելի չէ։');route(true);return;}
   unit.innerHTML=(detail.unitOptions??[]).map((u,i)=>`<option value="${i}">${esc(`${u.unitSequence}. ${u.unitTitleHy} · Թողարկում ${u.releaseNumber}`)}</option>`).join('');
   const index=detail.unitOptions.findIndex(u=>u.unitId===detail.selectedUnit.unitId&&u.curriculumReleaseId===detail.selectedUnit.curriculumReleaseId);
   if(index<0)throw Error('unit_unavailable');unit.value=String(index);unit.disabled=detail.unitOptions.length<2;
   rememberTeacherClass(actorId,detail.id);message(detail.isActive?'':'Արխիվացված համատեքստում աշխատանքները հասանելի են միայն դիտման համար։');openQueue(detail,detail.selectedUnit);route(true);
  }catch{if(active()&&request===ticket){clearWork();unit.innerHTML='<option value="">Բաժինները հասանելի չեն</option>';message('Դասարանը կամ ընտրված բաժինը չբեռնվեց։ Փորձեք կրկին կամ ընտրեք այլ դասարան։');$('[data-review-retry]').classList.remove('hidden');}}
 }
 const change=e=>{
  if(e.target.matches('[data-review-class]')){
   if(!leave()){options();return;}const row=rows[Number(e.target.value)];
   if(e.target.value!==''&&row)void loadClass(row);
   else{ticket++;clearWork();chosen=null;$('[data-review-unit]').disabled=true;$('[data-review-unit]').innerHTML='<option value="">Նախ ընտրեք դասարանը</option>';message('Ընտրեք դասարանը։');route();}
  }else if(e.target.matches('[data-review-unit]')){
   const index=chosen?.unitOptions?.findIndex(u=>u.unitId===context?.unitId&&u.curriculumReleaseId===context?.curriculumReleaseId);
   if(!leave()){e.target.value=String(index);return;}
   const unit=chosen?.unitOptions?.[Number(e.target.value)];if(unit)void loadClass(chosen,{assignmentId:chosen.assignmentId,curriculumReleaseId:unit.curriculumReleaseId,unitId:unit.unitId});
  }else if(e.target.matches('[data-review-source]')){
   if(!leave()){e.target.value=archive?'archive':'active';return;}
   ticket++;directoryTicket++;clearWork();chosen=null;rows=[];directory=null;archive=e.target.value==='archive';options();$('[data-review-class]').disabled=true;$('[data-review-unit]').disabled=true;$('[data-review-unit]').innerHTML='<option value="">Նախ ընտրեք դասարանը</option>';route();void loadDirectory();
  }
 };
 const click=e=>{if(e.target.closest('[data-review-more]'))void loadDirectory({more:true});else if(e.target.closest('[data-review-retry]'))void retry();};
 root.addEventListener('change',change);root.addEventListener('click',click);void loadDirectory({initial:true});
 const dispose=()=>{if(!alive)return;alive=false;ticket++;directoryTicket++;writing();root.removeEventListener('change',change);root.removeEventListener('click',click);root.replaceChildren();rows=[];chosen=null;context=null;};
 dispose.hasUnsaved=()=>Boolean(writing.hasUnsaved?.());if(assignmentMode)dispose.canLeave=leave;return dispose;
}
