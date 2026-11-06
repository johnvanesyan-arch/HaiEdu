// My work as one list: teacher tasks, writing assignments and material assignments
// from the read-only get-student-work endpoint, newest first, with exact counts.
// Opening an item reuses each source's own flow (the teacher-task workspace,
// the writing open→navigate request, the material download/link dialog).
// Presentation only: no scoring, submission or authorization logic here.
import {escapeHtml as esc} from './learning-navigation.mjs';
import {workBucket,workFilters,initialWorkFilter} from './student-work-hub.mjs';
import {mountStudentTeacherTasks} from './student-teacher-tasks.mjs';
import {createStudentWritingOpener} from './writing-assignments.mjs';
import {createStudentMaterialOpener} from './resource-assignments.mjs';

const taskStates={not_started:'Չի սկսվել',draft:'Սևագիր',submitted:'Ստուգման է սպասում',returned:'Վերադարձված է շտկման',reviewed:'Ստուգված է'};
const writingStates={not_started:'Չի սկսվել',draft:'Սևագիր',submitted:'Սպասում է ստուգման',changes_requested:'Վերանայման կարիք ունի',reviewed:'Ստուգված է'};
const sourceLabels={task:'Ուսուցչից',writing:'Գրավոր առաջադրանք',material:'Նյութ'};

export function describeWorkItem({source,row},history=false){
 const subject=row.subjectNameHy??row.subjectName,unit=row.unitTitleHy??row.unitTitle;
 const course={key:row.context?.enrollmentId??'',label:[subject,row.className].filter(Boolean).join(' · ')};
 const scope=[subject,row.className,unit].filter(Boolean).join(' · ');
 if(source==='task')return {source,course,scope,title:row.title,locale:null,teacher:row.teacherName,
  state:row.cancelled?'Չեղարկված է':taskStates[row.state]??'Հանձնարարված է',bucket:history||row.cancelled?null:workBucket('task',row.state),
  action:row.state==='submitted'||row.state==='reviewed'||row.cancelled?'Տեսնել աշխատանքը':row.state==='draft'?'Շարունակել աշխատանքը':'Բացել աշխատանքը'};
 if(source==='writing'){const d=row.task?.definition??{};return {source,course,scope,title:d.title,locale:d.locale,teacher:row.teacherName,instructions:row.instructions,
  state:history?'Չեղարկված է':writingStates[row.workState]??'Հանձնարարված է',bucket:history?null:workBucket('writing',row.workState),
  action:history||!row.available?null:row.workState==='reviewed'?'Տեսնել արդյունքը':row.workState==='submitted'?'Տեսնել ներկայացումը':row.workState==='changes_requested'?'Վերանայել աշխատանքը':row.workState==='draft'?'Շարունակել գրելը':'Սկսել գրելը',
  note:history?'Աշխատանքի նախկին տարբերակներն ու մեկնաբանությունները պահպանվում են դասընթացի գրավոր բաժնում։':!row.available?'Առաջադրանքն այլևս հասանելի չէ կատարման համար։':null};}
 const d=row.material?.definition??{};
 return {source,course,scope,title:d.title,locale:d.locale,teacher:row.teacherName,instructions:row.instructions,
  state:history||row.status==='canceled'?'Չեղարկված է':row.available?'Հանձնարարված է':'Նյութը հասանելի չէ',bucket:history||row.status==='canceled'?null:workBucket('material'),
  action:history||!row.available?null:d.format==='pdf'?'Ներբեռնել PDF':'Բացել նյութը',note:row.cancelReason??null};
}

// The per-source open attributes stay on list buttons so production acceptance
// selectors work in both the list and the fallback sections.
const compat=({source,row})=>source==='task'?'data-task-open=""':source==='writing'?`data-wa-open="${esc(row.id)}"`:`data-assignment-open="${esc(row.id)}"`;
function card(item,index,history){
 const v=describeWorkItem(item,history);
 return `<article class="student-work-item"${v.bucket?` data-work-state="${v.bucket}"`:''} data-work-source="${v.source}" data-work-course="${esc(v.course.key)}">
<p class="student-work-context">${esc(sourceLabels[v.source])}${v.scope?` · ${esc(v.scope)}`:''}</p>
<h3${v.locale?` lang="${esc(v.locale)}"`:''}>${esc(v.title??'')}</h3>
<p class="student-work-meta"><span class="student-work-chip"${v.bucket?` data-work-chip="${v.bucket}"`:''}>${esc(v.state)}</span>${v.teacher?` <span>${esc(v.teacher)}</span>`:''}</p>
${v.instructions?`<p class="student-work-instructions">${esc(v.instructions)}</p>`:''}${v.note?`<p class="subtle">${esc(v.note)}</p>`:''}
${v.action?`<button type="button" class="${v.bucket==='todo'?'':'secondary'}" data-work-open="${history?'h':'c'}${index}" ${compat(item)}>${esc(v.action)}</button>`:''}</article>`;
}

export function mountStudentWorkList({root,client,actorId,onFallback,onClean=()=>{}}){
 let alive=true,generation=0,filter=initialWorkFilter(),course='',current=null,historyData=null,taskView=null,busy=false,openers=null;
 const $=s=>root.querySelector(s);
 root.innerHTML=`<section class="student-work-toolbar" aria-label="Աշխատանքների ցուցակի կառավարում"><div class="student-work-filter" role="group" aria-label="Ցույց տալ ըստ վիճակի">${workFilters.map(([key,label],i)=>`<button type="button" data-work-filter="${key}" aria-pressed="${key===filter}"><span>${label}</span><span class="student-work-count" data-work-count="${key}"></span></button>`).join('')}</div><label class="student-work-course" hidden><span>Դասընթաց</span><select data-work-course-filter><option value="">Բոլոր դասընթացները</option></select></label><button type="button" class="ghost student-work-refresh" data-work-refresh>Թարմացնել</button></section>
<section class="student-work-list" aria-labelledby="studentWorkListTitle"><h2 id="studentWorkListTitle">Ուսուցչի առաջադրանքները</h2><p data-work-message role="status" aria-live="polite"></p><div data-work-items data-task-body></div><details data-work-history><summary>Չեղարկված աշխատանքներ</summary><div data-work-history-items></div></details></section>
<div class="student-work-focus" data-work-focus hidden></div>`;
 const message=(text,bad=false)=>{const m=$('[data-work-message]');if(m){m.textContent=text;m.classList.toggle('bad',bad);}};
 function opener(kind){
  openers??={};
  if(!openers[kind]){const holder=document.createElement('div');holder.hidden=kind!=='material';root.append(holder);openers[kind]=kind==='writing'?createStudentWritingOpener(holder,client):createStudentMaterialOpener(holder,client);}
  return openers[kind];
 }
 async function request(state){
  const {data,error}=await client.functions.invoke('get-student-work',{body:{action:'inbox',payload:{state}}});
  if(error||!data||data.error||data.version!=='student-work-v1'){let code=data?.error,status=Number(error?.context?.status??0);try{code||=(await error?.context?.json())?.error;}catch{}throw Object.assign(Error(code||'service_unavailable'),{status});}
  return data;
 }
 function counts(){
  const sources=Object.values(current?.sources??{}),exact=sources.length===3&&sources.every(s=>s.status==='ok'),more=sources.some(s=>s.status==='ok'&&s.complete===false);
  for(const [key]of workFilters){
   const n=(current?.items??[]).filter(i=>(!course||describeWorkItem(i).course.key===course)&&describeWorkItem(i).bucket===key).length;
   $(`[data-work-count="${key}"]`).textContent=exact?` · ${n}${more?'+':''}`:'';
  }
 }
 function draw(){
  if(!alive||!current)return;
  for(const b of root.querySelectorAll('[data-work-filter]'))b.setAttribute('aria-pressed',String(b.dataset.workFilter===filter));
  const courses=new Map();for(const i of current.items){const c=describeWorkItem(i).course;if(c.key&&!courses.has(c.key))courses.set(c.key,c.label);}
  const select=$('[data-work-course-filter]');if(course&&!courses.has(course))course='';
  select.innerHTML='<option value="">Բոլոր դասընթացները</option>'+[...courses].map(([k,l])=>`<option value="${esc(k)}"${k===course?' selected':''}>${esc(l)}</option>`).join('');
  select.closest('label').hidden=courses.size<2;
  const shown=current.items.map((item,index)=>({item,index})).filter(({item})=>{const v=describeWorkItem(item);return (!course||v.course.key===course)&&v.bucket===filter;});
  const missing=Object.entries(current.sources).filter(([,s])=>s.status!=='ok').map(([k])=>sourceLabels[k]);
  $('[data-work-items]').innerHTML=(missing.length?`<p class="student-work-unavailable" role="alert">Չհաջողվեց բեռնել՝ ${esc(missing.join(', '))}։ Սեղմեք «Թարմացնել»։</p>`:'')+
   (shown.map(({item,index})=>card(item,index,false)).join('')||`<p class="student-work-none">${current.items.length?'Այս վիճակով աշխատանք չկա։':'Ուսուցիչը դեռ աշխատանք չի ուղարկել։ Երբ ուղարկի, այն կհայտնվի այստեղ։'}</p>`);
  counts();
 }
 async function load(){
  if(!alive)return;const ticket=++generation;busy=true;root.setAttribute('aria-busy','true');message('Աշխատանքները բեռնվում են…');
  try{
   const data=await request('current');if(!alive||ticket!==generation)return;
   current=data;message('');draw();
   if($('[data-work-history]').open)void loadHistory();
  }catch(e){
   if(!alive||ticket!==generation)return;
   if(e.message==='student_work_forbidden'||e.status===401||e.status===403){message('Մուտք գործեք ձեր հաշիվ՝ աշխատանքները տեսնելու համար։',true);return;}
   // The combined list is an enhancement: without it, show the three source sections.
   // Never while a teacher task is open: falling back would discard its unsaved work.
   if(!current&&!taskView){dispose();onFallback();return;}
   message('Չհաջողվեց թարմացնել։ Ցուցադրվում է վերջին բեռնված ցուցակը։',true);
  }finally{if(alive&&ticket===generation){busy=false;root.removeAttribute('aria-busy');}}
 }
 async function loadHistory(){
  const ticket=generation,target=$('[data-work-history-items]');target.innerHTML='<p>Բեռնվում է…</p>';
  try{const data=await request('history');if(!alive||ticket!==generation)return;historyData=data;target.innerHTML=data.items.map((item,index)=>card(item,index,true)).join('')||'<p>Չեղարկված աշխատանք չկա։</p>';}
  catch{if(alive&&ticket===generation)target.innerHTML='<p class="bad">Պատմությունը չբեռնվեց։ Փորձեք կրկին։</p>';}
 }
 function focus(){
  // The teacher-task workspace keeps its own unsaved-work, recovery and submission rules.
  $('.student-work-toolbar').hidden=true;$('.student-work-list').hidden=true;const target=$('[data-work-focus]');target.hidden=false;
  taskView=mountStudentTeacherTasks({root:target,client,actorId,onClean,onExit:()=>{taskView?.dispose();taskView=null;target.hidden=true;target.replaceChildren();$('.student-work-toolbar').hidden=false;$('.student-work-list').hidden=false;void load();}});
 }
 async function open(key){
  const item=(key[0]==='h'?historyData:current)?.items?.[Number(key.slice(1))];if(!item||busy)return;
  if(item.source==='task'){const u=new URL(location.href);u.searchParams.set('teacherTask',item.row.id);u.searchParams.set('taskEnrollment',item.row.context.enrollmentId);u.searchParams.set('taskRelease',item.row.context.curriculumReleaseId);u.searchParams.set('taskUnit',item.row.context.unitId);window.history.replaceState({},'',u);focus();return;}
  const kind=item.source==='writing'?'writing':'material',o=opener(kind);busy=true;
  const button=root.querySelector(`[data-work-open="${key}"]`);if(button)button.disabled=true;
  try{await o.ready;await o.open(item.row,text=>message(text));}
  catch(e){if(alive&&!/stale/.test(e.message))message(o.message(e),true);}
  finally{busy=false;if(button?.isConnected)button.disabled=false;}
 }
 const click=e=>{
  const f=e.target.closest('[data-work-filter]');if(f){filter=f.dataset.workFilter;draw();return;}
  if(e.target.closest('[data-work-refresh]')){if(!busy)void load();return;}
  const o=e.target.closest('[data-work-open]');if(o)void open(o.dataset.workOpen);
 };
 const change=e=>{if(e.target.matches('[data-work-course-filter]')){course=e.target.value;draw();}};
 const toggle=e=>{if(e.target.matches('[data-work-history]')&&e.target.open)void loadHistory();};
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('toggle',toggle,true);
 if(new URLSearchParams(location.search).get('teacherTask'))focus();
 void load();
 function dispose(){
  if(!alive)return;alive=false;generation++;root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('toggle',toggle,true);
  taskView?.dispose();taskView=null;for(const o of Object.values(openers??{}))o.dispose();openers=null;root.removeAttribute('aria-busy');root.replaceChildren();
 }
 return {hasUnsaved:()=>Boolean(taskView?.hasUnsaved()),refresh:()=>{if(!taskView&&!busy)void load();},dispose};
}
