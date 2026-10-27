import {escapeHtml as esc} from './learning-navigation.mjs';
import {studentIcon} from './student-visuals.mjs';
const errors={
 assignment_forbidden:'Այս դասարանի հասանելիությունն ավարտվել է։ Թարմացրեք էջը։',
 assignment_unavailable:'Առաջադրանքը կամ նյութն այլևս հասանելի չէ։ Թարմացրեք ցանկը։',
 assignment_preview_stale:'Նյութը կամ աշակերտների ցանկը փոխվել է։ Ստուգեք թարմացված նախադիտումը։',
 assignment_conflict:'Գործողության տվյալները փոխվել են։ Ստուգեք ուղարկված առաջադրանքները։',
 assignment_recipients_invalid:'Ընտրեք այս դասարանի առնվազն մեկ ակտիվ աշակերտի։',
 assignment_recipient_limit:'Մեկ առաջադրանքը կարող է ունենալ մինչև 500 ստացող։',
 assignment_reason_required:'Նշեք չեղարկման պատճառը։',
 assignment_request_invalid:'Ստուգեք առաջադրանքի տվյալները։',
 assignment_storage_unavailable:'Ֆայլը հիմա հասանելի չէ։ Փորձեք նորից։',
 assignment_file_invalid:'Ֆայլը ստուգել չհաջողվեց։ Դիմեք ուսուցչին։',
};
const errorText=e=>errors[e.message]||'Կապը խափանվել է։ Փորձեք նորից։';
const scopeText=c=>[c.subjectNameHy??c.subjectName,c.gradeLabelHy,c.unitTitleHy??c.unitTitle,c.className,c.schoolName,c.academicYearLabel].filter(Boolean).join(' · ');
const exactContext=c=>Object.fromEntries(['assignmentId','enrollmentId','curriculumReleaseId','unitId'].filter(k=>c?.[k]).map(k=>[k,c[k]]));
function lifetime(root,client){
 let disposed=false,invalidated=false,epoch=0,actor=null,events=0;
 const urls=new Set();
 const valid=e=>!disposed&&!invalidated&&epoch===e&&root.isConnected;
 const subscription=client.auth.onAuthStateChange((event,s)=>{
  events++;const next=s?.user?.id??null;
  if(actor===null&&!invalidated&&event==='INITIAL_SESSION'){actor=next;return;}
  if(next===actor&&event!=='SIGNED_OUT')return;
  actor=next;invalidated=true;epoch++;root.innerHTML='<p role="status">Հաշիվը փոխվել է։ Թարմացրեք էջը։</p>';
  for(const url of urls)URL.revokeObjectURL(url);urls.clear();
 });
 const initialEvents=events;
 const ready=client.auth.getSession().then(r=>{if(disposed||invalidated)return false;if(initialEvents===events)actor=r.data.session?.user?.id??null;return Boolean(actor);});
 async function invoke(action,payload={},context={}){
  const e=epoch;if(!valid(e))throw Error('assignment_stale');const {data,error}=await client.functions.invoke('manage-resource-assignments',{body:{action,context:exactContext(context),payload}});
  if(!valid(e))throw Error('assignment_stale');
  if(error){let code=data?.error;try{code||=(await error.context?.json())?.error;}catch{}throw Error(code||error.message);}
  return data;
 }
 async function open(assignment,message){
  const data=await invoke('open',{id:assignment.id},assignment.context);
  if(data instanceof Blob){
   const url=URL.createObjectURL(data);urls.add(url);const a=document.createElement('a');a.href=url;a.download='haiedu-assignment-'+assignment.id+'.pdf';a.click();
   setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},1000);message('PDF-ը պատրաստ է ներբեռնման։');return;
  }
  const u=new URL(data.url);if(u.protocol!=='https:')throw Error('assignment_unavailable');
  root.querySelectorAll('dialog').forEach(d=>d.remove());
  const dialog=document.createElement('dialog');dialog.className='assignment-dialog';
  dialog.innerHTML='<h3>Արտաքին նյութ</h3><p>Կբացվի նոր ներդիրում՝ <strong>'+esc(u.hostname)+'</strong></p><a class="button-link" target="_blank" rel="noopener noreferrer" href="'+esc(u.href)+'">Բացել նյութը</a><button type="button" data-assignment-dialog-close>Փակել</button>';
  dialog.querySelector('button').addEventListener('click',()=>dialog.remove());root.append(dialog);dialog.showModal();
 }
 return {ready,invoke,open,current:()=>valid(epoch),dispose(){disposed=true;epoch++;subscription.data.subscription.unsubscribe();for(const u of urls)URL.revokeObjectURL(u);urls.clear();root.querySelectorAll('dialog').forEach(d=>d.remove());root.replaceChildren();}};
}
function assignmentCard(a,teacher=false){
 const m=a.material,d=m.definition;
 return '<article class="assignment-card"><div class="assignment-card-icon" aria-hidden="true">'+studentIcon(d.format==='pdf'?'work':'courses')+'</div><div class="assignment-card-copy"><p class="assignment-context">'+esc(scopeText(a))+'</p><h4 lang="'+esc(d.locale)+'">'+esc(d.title)+'</h4><p class="assignment-meta">v'+m.version+' · '+new Date(a.assignedAt).toLocaleDateString('hy-AM')+(teacher?' · Ստացողներ՝ '+a.recipientCount:a.teacherName?' · '+esc(a.teacherName):'')+'</p>'+(a.instructions?'<p class="assignment-instructions">'+esc(a.instructions)+'</p>':'')+'<p class="assignment-status">'+(a.status==='canceled'?'Չեղարկված է':a.available?'Ուսուցչի առաջադրանք':'Նյութը հասանելի չէ')+'</p>'+(a.cancelReason?'<p>'+esc(a.cancelReason)+'</p>':'')+'</div><div class="assignment-card-actions">'+(teacher?'<button type="button" class="ghost" data-assignment-inspect="'+esc(a.id)+'">Ստացողներ և պատմություն</button>':a.available?'<button type="button" data-assignment-open="'+esc(a.id)+'">'+(d.format==='pdf'?'Ներբեռնել PDF':'Բացել նյութը')+'</button>':'')+'</div></article>';
}
export function mountStudentResourceAssignments({root,client}){
 const life=lifetime(root,client);let generation=0,busy=false,rows=[],offset=0,state='current';
 root.classList.add('resource-assignment-workspace');
 root.innerHTML='<section aria-labelledby="assignedMaterialsTitle"><div class="assignment-heading"><div><h3 id="assignedMaterialsTitle">Ուսուցչի առաջադրանքները</h3><p>Նյութերն ու ուսուցչի հրահանգները՝ ձեր դասարաններից։</p></div><button type="button" class="ghost" data-assignment-refresh>Թարմացնել</button></div><p data-assignment-message role="status" aria-live="polite"></p><div data-assignment-list></div><button type="button" class="ghost" data-assignment-more hidden>Բեռնել ավելին</button><details data-assignment-history><summary>Չեղարկված առաջադրանքների պատմություն</summary><p>Բացելու դեպքում ցանկում կտեսնեք չեղարկված առաջադրանքները։</p></details></section>';
 const $=q=>root.querySelector(q);
 const message=(t,bad=false)=>{const m=$('[data-assignment-message]');if(m){m.textContent=t;m.classList.toggle('bad',bad);}};
 async function load(more=false){
  const token=++generation;if(!more){rows=[];offset=0;}
  busy=true;root.setAttribute('aria-busy','true');message('Առաջադրանքները բեռնվում են…');
  try{
   const data=await life.invoke('inbox',{offset,state});
   if(!life.current()||token!==generation)return;
   rows=more?[...rows,...data.assignments]:data.assignments;offset=data.nextOffset;
   $('[data-assignment-list]').innerHTML=rows.map(a=>assignmentCard(a)).join('')||'<div class="assignment-empty"><p>'+(state==='history'?'Չեղարկված առաջադրանք չկա։':'Ուսուցիչը դեռ առաջադրանք չի ուղարկել։ Երբ ուղարկի, այն կհայտնվի այստեղ։')+'</p></div>';
   $('[data-assignment-more]').hidden=!data.hasMore;message('');
  }catch(e){if(life.current()&&token===generation&&e.message!=='assignment_stale'){message(errorText(e),true);if(!more)$('[data-assignment-list]').innerHTML='<button type="button" class="ghost" data-assignment-refresh>Փորձել նորից</button>';}}
  finally{if(life.current()&&token===generation){busy=false;root.removeAttribute('aria-busy');}}
 }
 const click=e=>{
  if(e.target.closest('[data-assignment-refresh]'))void load();
  if(e.target.closest('[data-assignment-more]')&&!busy)void load(true);
  const b=e.target.closest('[data-assignment-open]');if(!b||busy)return;
  const a=rows.find(x=>x.id===b.dataset.assignmentOpen);if(!a)return;
  busy=true;b.disabled=true;void life.open(a,message).catch(err=>{if(err.message!=='assignment_stale'&&life.current())message(errorText(err),true);}).finally(()=>{busy=false;if(b.isConnected)b.disabled=false;});
 };
 const toggle=e=>{if(e.target.matches('[data-assignment-history]')){state=e.target.open?'history':'current';void load();}};
 root.addEventListener('click',click);root.addEventListener('toggle',toggle,true);
 life.ready.then(ok=>{if(ok&&life.current())void load();else if(life.current())message('Մուտք գործեք առաջադրանքները տեսնելու համար։');}).catch(()=>message('Մուտքը ստուգել չհաջողվեց։ Թարմացրեք էջը։',true));
 return {dispose(){generation++;root.removeEventListener('click',click);root.removeEventListener('toggle',toggle,true);life.dispose();}};
}
export function mountTeacherResourceAssignments({root,client,context,materialId=null}){
 const life=lifetime(root,client);let generation=0,busy=false,preview=null,mode='class',selected=new Set(),offset=0,search='',timer=null,pending=null,listRows=[],listOffset=0,listState='current',currentReceipt=null;
 const ctx=exactContext(context),$=q=>root.querySelector(q);
 root.classList.add('resource-assignment-workspace');root.hidden=false;
 root.innerHTML='<section class="card assignment-teacher-panel"><div class="assignment-heading"><div><h3 tabindex="-1">Ուղարկել առաջադրանք</h3><p class="assignment-context">'+esc(scopeText(context))+'</p></div><button type="button" class="ghost" data-assignment-history-list>Ուղարկված առաջադրանքները</button></div><p data-assignment-message role="status" aria-live="polite"></p><div data-assignment-body></div></section>';
 const message=(t,bad=false)=>{const m=$('[data-assignment-message]');if(m){m.textContent=t;m.classList.toggle('bad',bad);}};
 const locked=()=>busy||Boolean(pending);
 function lockControls(){
  for(const el of root.querySelectorAll('[data-assignment-compose] input,[data-assignment-compose] textarea,[data-assignment-compose] button'))el.disabled=locked()||(el.hasAttribute('data-recipient')&&mode!=='selected');
  const send=$('[data-assignment-send]');if(send)send.disabled=locked()||!preview||!(mode==='class'?preview.total:selected.size);
  const retry=$('[data-assignment-retry-send]');if(retry){retry.hidden=!pending;retry.disabled=busy;}
  root.toggleAttribute('aria-busy',busy);
 }
 function drawCompose(){
  const m=preview.material;
  $('[data-assignment-body]').innerHTML='<div data-assignment-compose><h4 lang="'+esc(m.definition.locale)+'">'+esc(m.definition.title)+' · v'+m.version+'</h4><p class="assignment-audience">Առաջադրանքը կտեսնեն ընտրված ստացողները։ Հրապարակված նյութը շարունակում է հասանելի մնալ '+(m.provider==='teacher'?'դասարանի բոլոր իրավասու աշակերտներին':'այս ծրագրի և բաժնի բոլոր իրավասու աշակերտներին')+' «Հավելյալ նյութեր» բաժնում։</p><fieldset><legend>Ստացողները</legend><label class="assignment-choice"><input type="radio" name="assignmentAudience" value="class" checked>Ամբողջ դասարանը՝ '+preview.total+' աշակերտ</label><label class="assignment-choice"><input type="radio" name="assignmentAudience" value="selected">Ընտրված աշակերտները</label></fieldset><div data-recipient-picker hidden><label>Գտնել աշակերտ<input type="search" data-recipient-search maxlength="120" placeholder="Անուն"></label><div data-recipient-list></div><button type="button" class="ghost" data-recipient-more hidden>Բեռնել ավելին</button></div><label>Հրահանգ աշակերտներին (ըստ ցանկության)<textarea data-assignment-instructions maxlength="2000" rows="3"></textarea></label><p data-recipient-summary aria-live="polite"></p><p class="assignment-meta">Ստացողների ցանկը պահպանվում է ուղարկման պահին։ Ավելի ուշ միացած աշակերտի համար ուղարկեք նոր առաջադրանք։</p><button type="button" data-assignment-send>Ուղարկել առաջադրանքը</button></div><button type="button" data-assignment-retry-send hidden>Կրկնել նույն ուղարկումը</button>';
  drawRoster(preview.roster);summary();lockControls();
 }
 function drawRoster(roster,more=false){
  const list=$('[data-recipient-list]');if(!list)return;
  const html=roster.map(r=>'<label class="assignment-choice"><input type="checkbox" data-recipient="'+esc(r.enrollmentId)+'"'+(selected.has(r.enrollmentId)?' checked':'')+(mode==='class'?' disabled':'')+'>'+esc(r.studentName)+'</label>').join('');
  if(more)list.insertAdjacentHTML('beforeend',html);else list.innerHTML=html||'<p>Ոչ մի աշակերտ չի համապատասխանում որոնմանը։</p>';
  $('[data-recipient-more]').hidden=!preview.hasMore;
 }
 function summary(){const s=$('[data-recipient-summary]');if(s)s.textContent='Ստացողներ՝ '+(mode==='class'?preview?.total??0:selected.size);const picker=$('[data-recipient-picker]');if(picker)picker.hidden=mode!=='selected';lockControls();}
 async function loadPreview(more=false,reset=false){
  if(!materialId||busy||pending)return;const token=++generation;message('Ստացողների ցանկը բեռնվում է…');
  try{
   const data=await life.invoke('preview',{materialId,offset:more?offset:0,search},ctx);
   if(!life.current()||token!==generation)return;
   const changed=preview&&data.rosterFingerprint!==preview.rosterFingerprint;
   if(changed||reset){selected.clear();mode='class';}
   const first=!preview||reset||changed;preview=data;offset=data.nextOffset;
   if(first)drawCompose();else{drawRoster(data.roster,more);summary();}
   message(changed?'Աշակերտների ցանկը փոխվել է։ Ստուգեք ստացողներին։':'');lockControls();
  }catch(e){if(life.current()&&token===generation&&e.message!=='assignment_stale'){message(errorText(e),true);if(!preview)$('[data-assignment-body]').innerHTML='<button type="button" data-assignment-preview-retry>Փորձել նորից</button>';}}
 }
 function drawReceipt(data){
  currentReceipt=data.assignment;
  const a=data.assignment;
  $('[data-assignment-body]').innerHTML='<section class="assignment-receipt"><h4>'+(a.status==='canceled'?'Առաջադրանքը չեղարկված է':'Առաջադրանքն ուղարկված է')+'</h4><p lang="'+esc(a.material.definition.locale)+'">'+esc(a.material.definition.title)+' · v'+a.material.version+'</p><p>Ստացողներ՝ '+a.recipientCount+'</p><p class="assignment-meta">Հաստատման համար՝ <span class="assignment-receipt-id">'+esc(a.id)+'</span></p><p>'+new Date(a.assignedAt).toLocaleString('hy-AM')+'</p>'+(data.recipients?'<details open><summary>Ստացողների ցանկը</summary><ul>'+data.recipients.map(r=>'<li>'+esc(r.studentName)+'</li>').join('')+'</ul>'+(data.recipients.length<a.recipientCount?'<p>Որոշ հաշիվներ կամ անդամակցություններ այլևս գրանցված չեն։ Սկզբնական ստացողների քանակը պահպանված է։</p>':'')+'</details>':'<button type="button" class="ghost" data-assignment-inspect="'+esc(a.id)+'">Ստուգել ստացողների ցանկը</button>')+(a.status==='assigned'&&!data.readOnly?'<details class="assignment-cancel"><summary>Չեղարկել առաջադրանքը</summary><label>Չեղարկման պատճառ<textarea data-assignment-cancel-reason maxlength="1000" rows="2"></textarea></label><button type="button" class="ghost" data-assignment-cancel>Չեղարկել</button></details>':'')+(data.events?'<details><summary>Գործողությունների պատմություն</summary><ul>'+data.events.map(e=>'<li>'+(e.event==='assigned'?'Ուղարկված է':'Չեղարկված է')+' · '+new Date(e.at).toLocaleString('hy-AM')+(e.detail.reason?' · '+esc(e.detail.reason):'')+'</li>').join('')+'</ul></details>':'')+'</section>';
 }
 async function inspect(id){
  const token=++generation;busy=true;message('Հաստատումը բեռնվում է…');lockControls();
  try{const data=await life.invoke('get',{id},ctx);if(life.current()&&token===generation){drawReceipt(data);message('');}}
  catch(e){if(life.current()&&token===generation&&e.message!=='assignment_stale')message(errorText(e),true);}
  finally{if(life.current()&&token===generation){busy=false;lockControls();}}
 }
 async function send(){
  if(busy||!preview)return;
  if(!pending)pending={materialId,fingerprint:preview.material.fingerprint,requestId:crypto.randomUUID(),rosterFingerprint:preview.rosterFingerprint,mode,enrollmentIds:mode==='selected'?[...selected].sort():[],instructions:$('[data-assignment-instructions]').value.trim()};
  busy=true;++generation;lockControls();message('Առաջադրանքն ուղարկվում է…');
  try{
   const data=await life.invoke('assign',pending,ctx);pending=null;
   if(!life.current())return;drawReceipt(data);message('Պահպանված է։ Առաջադրանքը հասանելի է ստացողների «Իմ աշխատանքները» բաժնում։');
  }catch(e){
   if(e.message==='assignment_stale'||!life.current())return;
   if(['assignment_preview_stale','assignment_recipients_invalid'].includes(e.message)){pending=null;preview=null;selected.clear();message(errorText(e),true);}
   else if(errors[e.message]){pending=null;message(errorText(e),true);}
   else message('Ուղարկման հաստատումը չի ստացվել։ Կրկնեք նույն ուղարկումը՝ կրկնօրինակ չստեղծելու համար։',true);
  }finally{
   if(life.current()){busy=false;lockControls();if(!preview&&!pending)void loadPreview(false,true);}
  }
 }
 async function loadList(more=false){
  if(busy||pending){message('Նախ ավարտեք ընթացիկ ուղարկումը։');return;}
  const token=++generation;busy=true;message('Ուղարկված առաջադրանքները բեռնվում են…');
  if(!more){listRows=[];listOffset=0;}
  try{
   const data=await life.invoke('list',{offset:listOffset,state:listState},ctx);if(!life.current()||token!==generation)return;
   listRows=more?[...listRows,...data.assignments]:data.assignments;listOffset=data.nextOffset;
   $('[data-assignment-body]').innerHTML='<div class="assignment-list-controls"><label class="assignment-choice"><input type="checkbox" data-assignment-canceled'+(listState==='history'?' checked':'')+'>Ցույց տալ չեղարկվածները</label></div><div class="assignment-list">'+(listRows.map(a=>assignmentCard(a,true)).join('')||'<p>Այս բաժնում ուղարկված առաջադրանք չկա։</p>')+'</div>'+(data.hasMore?'<button type="button" class="ghost" data-assignment-list-more>Բեռնել ավելին</button>':'');message('');
  }catch(e){if(life.current()&&token===generation&&e.message!=='assignment_stale'){message(errorText(e),true);$('[data-assignment-body]').innerHTML='<button type="button" data-assignment-history-list>Փորձել նորից</button>';}}
  finally{if(life.current()&&token===generation){busy=false;lockControls();}}
 }
 async function cancel(){
  if(busy||!currentReceipt)return;const reason=$('[data-assignment-cancel-reason]')?.value.trim();if(!reason){message(errors.assignment_reason_required,true);return;}
  busy=true;const b=$('[data-assignment-cancel]');b.disabled=true;
  try{const data=await life.invoke('cancel',{id:currentReceipt.id,revision:currentReceipt.revision,reason},ctx);if(life.current()){drawReceipt(data);message('Առաջադրանքը չեղարկված է։ Հրապարակված նյութի հասանելիությունը չի փոխվել։');}}
  catch(e){if(life.current()&&e.message!=='assignment_stale')message(errorText(e),true);}
  finally{busy=false;if(b.isConnected)b.disabled=false;}
 }
 const click=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-assignment-send')||b.hasAttribute('data-assignment-retry-send'))void send();
  if(b.hasAttribute('data-assignment-preview-retry'))void loadPreview();
  if(b.hasAttribute('data-recipient-more'))void loadPreview(true);
  if(b.hasAttribute('data-assignment-history-list'))void loadList();
  if(b.hasAttribute('data-assignment-list-more'))void loadList(true);
  if(b.dataset.assignmentInspect&&!busy&&!pending)void inspect(b.dataset.assignmentInspect);
  if(b.hasAttribute('data-assignment-cancel'))void cancel();
 };
 const change=e=>{
  if(e.target.name==='assignmentAudience'&&!locked()){mode=e.target.value;summary();}
  if(e.target.hasAttribute('data-recipient')&&!locked()){const id=e.target.dataset.recipient;e.target.checked?selected.add(id):selected.delete(id);summary();}
  if(e.target.hasAttribute('data-assignment-canceled')&&!busy){listState=e.target.checked?'history':'current';void loadList();}
 };
 const input=e=>{if(e.target.matches('[data-recipient-search]')&&!locked()){search=e.target.value;clearTimeout(timer);generation++;timer=setTimeout(()=>void loadPreview(),250);}};
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);
 life.ready.then(ok=>{if(ok&&life.current())materialId?void loadPreview():void loadList();else if(life.current())message('Մուտք գործեք առաջադրանքները կառավարելու համար։');}).catch(()=>message('Մուտքը ստուգել չհաջողվեց։ Թարմացրեք էջը։',true));
 $('[tabindex="-1"]')?.focus();
 return {isBusy:()=>busy||Boolean(pending),dispose(){generation++;clearTimeout(timer);root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);life.dispose();}};
}
