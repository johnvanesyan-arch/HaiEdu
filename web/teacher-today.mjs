import {escapeHtml as esc} from './learning-navigation.mjs';
import {subjectArtwork} from './subject-visuals.mjs';
import {mountWrittenWork} from './written-work.mjs';
import {todayRequest,rememberTeacherClass} from './teacher-home-request.mjs';
export {todayRequest,rememberTeacherClass,recentTeacherClasses,clearTeacherRecent} from './teacher-home-request.mjs';
const date=s=>new Date(s).toLocaleString('hy-AM',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
export function mountTeacherToday({root,supabase,actorId,isCurrent=()=>true,initialResponse=null,onRoute=()=>{}}){
 let alive=true,ticket=0,data=null,cursor=null,writing=()=>{},selected=null,loading=false;
 const active=()=>alive&&isCurrent(),$=s=>root.querySelector(s);
 root.innerHTML=`<section class="card today-overview"><div><p class="mode-kicker">Այսօր</p><h2>Շարունակեք աշխատանքը</h2><p class="subtle">Գրավոր աշխատանքներ՝ ձեր ակտիվ դպրոցական դասարանների գործող բաժիններում։</p></div><div class="today-actions"><button type="button" class="ghost" data-today-refresh>Թարմացնել հերթը</button><a href="./teacher-workflows.html#review">Ստուգման ուղեցույց</a></div><p class="today-summary" data-today-summary role="status" aria-live="polite">Հերթը բեռնվում է…</p><p class="subtle" data-today-time></p><div data-today-continue></div></section><section class="card today-queue"><div class="today-heading"><h2>Ստուգման հերթ</h2><button type="button" class="ghost hidden" data-today-all>Բոլոր ակտիվ դասարանները</button></div><p data-today-filter class="subtle"></p><div data-today-list></div><div class="today-actions"><button type="button" class="ghost hidden" data-today-first>Սկզբից</button><button type="button" class="ghost hidden" data-today-more>Հաջորդ էջը</button></div></section><section class="today-review hidden" data-today-review><div class="today-actions"><button type="button" class="ghost" data-today-back>Վերադառնալ հերթին</button><button type="button" class="ghost hidden" data-today-next>Հաջորդ աշխատանքը</button></div><p class="today-context" data-today-context></p><div data-today-writing></div></section><section class="today-classes"><div class="today-heading"><h2>Վերջին և ակտիվ դասարանները</h2><a href="./teacher.html?view=classes">Բոլոր դասարանները</a></div><div class="today-class-grid" data-today-cards></div><p class="subtle" data-today-cards-scope></p></section>`;
 const leave=()=>!writing.hasUnsaved?.()||window.confirm('Չպահպանված գնահատականը չեղարկե՞լ։');
 function route(work=null,assignment=undefined){const u=new URL(location.href);u.searchParams.set('view','home');if(work)u.searchParams.set('todayWork',work);else u.searchParams.delete('todayWork');if(assignment!==undefined){if(assignment)u.searchParams.set('queueAssignment',assignment);else u.searchParams.delete('queueAssignment');}history.pushState({},'',u.pathname+u.search);onRoute();}
 function clearReview(){writing();writing=()=>{};selected=null;$('[data-today-review]').classList.add('hidden');$('[data-today-writing]').replaceChildren();}
 function unknown(text,denied=false){data=null;$('[data-today-summary]').textContent=text;$('[data-today-time]').textContent='Թարմ ամփոփ տվյալները հասանելի չեն։';$('[data-today-continue]').replaceChildren();$('[data-today-list]').replaceChildren();$('[data-today-cards]').replaceChildren();for(const s of ['more','next','first'])$(`[data-today-${s}]`).classList.add('hidden');if(denied)clearReview();$('[data-today-all]').classList.remove('hidden');}
 const entry=r=>`<article class="today-work-row"><div><strong>${esc(r.studentName)}</strong><p>${esc(r.taskTitle)}</p><p class="subtle">${esc(r.className)} · ${esc(r.subjectName)} · ${esc(r.unitTitle)} · ${esc(r.schoolName)}</p><small>Ներկայացվել է՝ ${esc(date(r.submittedAt))}</small></div><button type="button" data-today-open="${esc(r.id)}">Բացել ստուգման համար</button></article>`;
 function draw(){
  const partial=data.coverage!=='active_writable_school_contexts';
  $('[data-today-summary]').textContent=partial?'Այս դասարանների համար գրավորների միասնական հերթ դեռ չկա։':`${data.pendingCount} աշխատանք է սպասում ստուգման${data.assignmentId?'՝ ընտրված դասարանում':'՝ բոլոր ակտիվ դպրոցական դասարաններում'}։`;
  $('[data-today-time]').textContent='Ստուգված է՝ '+date(data.snapshotAt);
  $('[data-today-filter]').textContent=data.assignmentId?[data.filterClass?.className,data.filterClass?.subjectName,data.filterClass?.schoolName,'ամենավաղ ներկայացվածից'].filter(Boolean).join(' · '):'Բոլոր ակտիվ դպրոցական դասարանները՝ ամենավաղ ներկայացվածից։';
  $('[data-today-all]').classList.toggle('hidden',!data.assignmentId);
  $('[data-today-list]').innerHTML=data.queue.map(entry).join('')||'<p>Այս շրջանակում ստուգման սպասող գրավոր աշխատանք չկա։</p>';
  $('[data-today-more]').classList.toggle('hidden',!data.hasMore);$('[data-today-first]').classList.toggle('hidden',!cursor);
  $('[data-today-continue]').innerHTML=data.queue.length?`<button type="button" data-today-open="${esc(data.queue[0].id)}">${cursor?'Բացել այս էջի առաջին աշխատանքը':'Շարունակել ստուգումը'}</button>`:'';
  $('[data-today-next]').classList.toggle('hidden',!data.queue.some(r=>r.id!==selected?.id));
  $('[data-today-cards]').innerHTML=data.cards.map(c=>{
   const u=new URL('./teacher.html',location.href);u.searchParams.set('view','class');u.searchParams.set('class',c.id);if(c.assignmentId)u.searchParams.set('assignment',c.assignmentId);
   return `<article class="card today-class-card">${subjectArtwork(c.subjectCode)}<span class="staff-status">${c.recent?'Վերջերս բացված':'Ակտիվ դասարան'}</span><h3>${esc(c.name)}</h3><p>${esc([c.subjectName,c.gradeNumber?c.gradeNumber+'-րդ դասարան':null,c.academicYear,c.schoolName].filter(Boolean).join(' · '))}</p><div class="today-actions"><a class="ghost button-link" href="${esc(u.pathname+u.search)}">Բացել դասարանը</a>${c.pendingCount!==null?`<button class="ghost" type="button" data-today-filter="${esc(c.assignmentId)}">${c.pendingCount} սպասող գրավոր</button>`:'<span class="subtle">Գրավորների հերթը հասանելի չէ։</span>'}</div></article>`;
  }).join('')||'<p>Ակտիվ դասարան դեռ չկա։ Բացեք «Իմ դասարանները»՝ ձեր հասանելի դասարանները տեսնելու համար։</p>';
  $('[data-today-cards-scope]').textContent=data.cardsPartial?`Ցուցադրվում է ${data.cards.length} դասարան՝ ${data.classCount}-ից։ Վերջին ընտրությունները վերստուգված են։`:'Վերջին ընտրությունները հասանելի են միայն այս հաշվի և այս ներդիրի համար։';
 }
 function openWork(row,navigate=false){
  if(!active()||!row||!leave())return;
  if(navigate)route(row.id);clearReview();selected=row;$('[data-today-review]').classList.remove('hidden');
  $('[data-today-context]').textContent=[row.className,row.subjectName,row.unitTitle,row.schoolName,row.academicYear].filter(Boolean).join(' · ');
  rememberTeacherClass(actorId,row.classId);
  writing=mountWrittenWork({root:$('[data-today-writing]'),supabase,teacher:true,actorId,context:{assignmentId:row.assignmentId,curriculumReleaseId:row.curriculumReleaseId,unitId:row.unitId},initialWorkId:row.id,
   isCurrent:()=>active()&&selected?.id===row.id,
   onBack:()=>{if(!leave())return;clearReview();route();cursor=null;void refresh();},
   onReviewed:()=>{if(active()&&selected?.id===row.id){cursor=null;void refresh({keepReview:true});}}});
  $('[data-today-next]').classList.toggle('hidden',!data?.queue.some(r=>r.id!==row.id));
  $('[data-today-review]').scrollIntoView({block:'start',behavior:'auto'});
 }
 async function refresh({initial=false,keepReview=false}={}){
  const request=++ticket;loading=true;$('[data-today-refresh]').disabled=true;
  if(!keepReview)$('[data-today-summary]').textContent='Հերթը բեռնվում է…';
  try{
   const body=todayRequest(actorId);if(cursor)body.cursor=cursor;
   const response=initial&&initialResponse?await initialResponse:await supabase.functions.invoke('get-teacher-workspace',{body});
   if(!active()||request!==ticket)return;
   let {data:next,error}=response;
   if(error||next?.error){let code=next?.error;if(!code&&error?.context?.json){try{code=(await error.context.json()).error;}catch{}}const e=Error(code||'workspace_unavailable');e.denied=['workspace_context_unavailable','account_or_session_inactive','unauthorized'].includes(code);throw e;}
   if(next?.version!=='teacher-workspace-v1')throw Error('workspace_unavailable');
   data=next;draw();
   if(initial&&next.selectedWork)openWork(next.selectedWork);
  }catch(e){if(active()&&request===ticket)unknown(e.denied?'Այս հերթը կամ աշխատանքն այլևս հասանելի չէ։ Վերադառնալու համար բացեք բոլոր ակտիվ դասարանները։':'Հերթը չբեռնվեց։ Փորձեք «Թարմացնել հերթը»։',Boolean(e.denied));}
  finally{if(active()&&request===ticket){loading=false;$('[data-today-refresh]').disabled=false;}}
 }
 const click=e=>{
  const b=e.target.closest('button');if(!b||!active())return;
  if(b.hasAttribute('data-today-refresh')){if(!loading){cursor=null;void refresh({keepReview:Boolean(selected)});}return;}
  if(loading)return;
  if(b.dataset.todayOpen){const row=data?.queue.find(r=>r.id===b.dataset.todayOpen);if(row)openWork(row,true);return;}
  if(b.hasAttribute('data-today-next')){const row=data?.queue.find(r=>r.id!==selected?.id);if(row)openWork(row,true);return;}
  if(b.hasAttribute('data-today-back')){if(leave()){clearReview();route();cursor=null;void refresh();}return;}
  if(b.hasAttribute('data-today-filter')||b.hasAttribute('data-today-all')){if(!leave())return;clearReview();cursor=null;route(null,b.dataset.todayFilter||null);void refresh();return;}
  if(b.hasAttribute('data-today-more')){cursor=data?.nextCursor;void refresh({keepReview:Boolean(selected)});return;}
  if(b.hasAttribute('data-today-first')){cursor=null;void refresh({keepReview:Boolean(selected)});}
 };
 root.addEventListener('click',click);void refresh({initial:true});
 const dispose=()=>{if(!alive)return;alive=false;ticket++;writing();root.removeEventListener('click',click);root.replaceChildren();data=null;selected=null;};
 dispose.hasUnsaved=()=>Boolean(writing.hasUnsaved?.());return dispose;
}
