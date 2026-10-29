import {feedbackApi,teacherFeedbackMarkup,mountTeacherFeedback} from './teacher-feedback.mjs';
import {escapeHtml as esc} from './learning-navigation.mjs';
export const writtenWordCount=text=>String(text).trim().split(/\p{White_Space}+/u).filter(Boolean).length;
const labels={not_started:'Չի սկսվել',draft:'Սևագիր',submitted:'Սպասում է ստուգման',changes_requested:'Վերանայման կարիք ունի',reviewed:'Ստուգված է'};
const errors={written_conflict:'Աշխատանքը փոխվել է մեկ այլ պատուհանում։ Ձեր գրածը պահպանեք, ապա թարմացրեք էջը։',written_read_only:'Այս աշխատանքը հասանելի է միայն դիտման համար։',chapter_diagnostic_required:'Նախ ավարտեք այս գլխի ախտորոշիչը։',written_review_invalid:'Լրացրեք բոլոր չափանիշների միավորները և մեկնաբանությունը։',written_text_invalid:'Մուտքագրեք աշխատանքը՝ առավելագույնը 20 000 նիշ։',written_context_unavailable:'Այս դասարանի կամ աշխատանքի հասանելիությունն ավարտվել է։',written_work_unavailable:'Աշխատանքը հասանելի չէ։',written_task_unavailable:'Այս առաջադրանքն այլևս հասանելի չէ կատարման համար։',account_or_session_inactive:'Մուտք գործեք ձեր հաշիվ։'};
const date=v=>new Date(v).toLocaleString('hy-AM',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const rubric=d=>`<details class="written-rubric"><summary>Գնահատման չափանիշները</summary>${d.criteria.map(c=>`<section lang="${esc(d.locale)}"><h4>${esc(c.label)}</h4><ol start="0">${c.descriptors.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section>`).join('')}</details>`;
const reviewMarkup=r=>`<div class="written-feedback"><strong>${r.decision==='assessed'?'Գնահատված է':'Վերադարձվել է վերանայման'}</strong><p class="written-text">${esc(r.feedback)}</p>${r.changeReason?`<p>Փոփոխության պատճառ՝ ${esc(r.changeReason)}</p>`:''}<small>${esc(date(r.createdAt))}</small></div>`;
export function mountWrittenWork({root,supabase,context,actorId,teacher=false,isCurrent=()=>true,initialWorkId=null,initialState="submitted",stateButtons=false,onStateChange=()=>{},onReviewed=()=>{},onBack=null}) {
 let feedbackEditor=()=>{},feedbackInitial=null;
 let authSubscription=null,alive=true,sequence=0,model=null,timer=null,saving=null,savedText='',busy=false,conflict=false,pendingSubmission=null,offset=0,state=['submitted','changes_requested','reviewed','all'].includes(initialState)?initialState:'submitted',teacherDirty=false;
 const current=()=>alive&&isCurrent();
 const $=s=>root.querySelector(s);
 const message=(text,bad=false)=>{const el=$('[data-writing-message]');if(current()&&el){el.textContent=text;el.classList.toggle('written-error',bad);}};
 const dirty=()=>Boolean(!teacher&&(pendingSubmission||busy||conflict||($('[data-writing-text]')&&$('[data-writing-text]').value!==savedText)))||teacherDirty||Boolean(teacher&&feedbackEditor.hasUnsaved?.());
 const unload=e=>{if(current()&&(dirty()||saving||busy)){e.preventDefault();e.returnValue='';}};
 window.addEventListener('beforeunload',unload);
 async function api(action,payload={}) {
  const {data,error}=await supabase.functions.invoke('manage-written-work',{body:{action,context,payload}});
  if(error||data?.error){let code=data?.error;if(!code&&error?.context?.json){try{code=(await error.context.json()).error;}catch{}}
   const problem=new Error(errors[code]??'Չհաջողվեց պահպանել կամ բեռնել տվյալները։ Փորձեք նորից։');problem.code=code;throw problem;}
  if(data?.version!=='written-work-v1')throw new Error('Չհաջողվեց բեռնել գրավոր աշխատանքները։');
  return data;
 }
 function shell(content){feedbackEditor();feedbackEditor=()=>{};root.innerHTML=`<section class="card written-work"><h2>${teacher?'Գրավոր աշխատանքների ստուգում':'Գրավոր աշխատանքներ'}</h2><p data-writing-message role="status" aria-live="polite"></p><p class="subtle" data-writing-scope>Գրավոր աշխատանքի գնահատականը ներկայացվում է առանձին։ Այն չի գումարվում ավտոմատ ստուգարքի միավորներին և չի որոշում դրա արդյունքը։</p>${content}</section>`;}
 async function list(){
  if(!(await flush()))return;
  if(teacher&&feedbackEditor.hasUnsaved?.()&&!window.confirm('Չպահպանված գնահատականը չեղարկե՞լ։'))return;
  teacherDirty=false;feedbackInitial=null;model=null;const request=++sequence;shell('<p>Բեռնվում է…</p>');
  try{const data=await api(teacher?'queue':'tasks',teacher?{state,offset}:{});if(!current()||request!==sequence)return;
   if(teacher){const rows=data.queue.slice(0,50);shell(`${stateButtons?`<div class="written-state-filters" role="group" aria-label="Աշխատանքների կարգավիճակ">${[['submitted','Սպասում են ստուգման'],['changes_requested','Վերադարձված են'],['reviewed','Ստուգված են'],['all','Բոլորը']].map(([v,l])=>`<button type="button" class="ghost" data-writing-state="${v}" aria-pressed="${state===v}">${l}</button>`).join('')}</div>`:`<label>Ցուցադրել <select data-writing-filter>${[['submitted','Սպասում են ստուգման'],['changes_requested','Վերադարձված են'],['reviewed','Ստուգված են'],['all','Բոլորը']].map(([v,l])=>`<option value="${v}"${state===v?' selected':''}>${l}</option>`).join('')}</select></label>`}${data.readOnly?'<p>Արխիվ․ աշխատանքները հասանելի են միայն դիտման համար։</p>':''}<div class="written-list">${rows.map(r=>`<article><div><strong>${esc(r.studentName)}</strong><p>${esc(r.taskTitle)} · ${labels[r.state]}</p></div><button type="button" data-writing-open="${esc(r.id)}">Բացել</button></article>`).join('')||'<p>Այս բաժնում աշխատանքներ չկան։</p>'}</div><div class="row"><button type="button" class="ghost" data-writing-prev${offset===0?' disabled':''}>Նախորդը</button><button type="button" class="ghost" data-writing-next${data.queue.length<=50?' disabled':''}>Հաջորդը</button><button type="button" class="ghost" data-writing-refresh>Թարմացնել</button></div>`);
    const filter=value=>{state=value;offset=0;onStateChange(state);void list();};if($('[data-writing-filter]'))$('[data-writing-filter]').onchange=e=>filter(e.target.value);root.querySelectorAll('[data-writing-state]').forEach(b=>b.onclick=()=>filter(b.dataset.writingState));$('[data-writing-prev]').onclick=()=>{offset=Math.max(0,offset-50);list();};$('[data-writing-next]').onclick=()=>{offset+=50;list();};$('[data-writing-refresh]').onclick=list;
   }else{shell(`<p>Ուսուցիչը կստուգի ներկայացված աշխատանքը և կուղարկի մեկնաբանություն։</p><div class="written-list">${data.tasks.map(t=>`<article><div><strong lang="${esc(t.locale)}">${esc(t.title)}</strong><p>${labels[t.state]}${!t.available?' · Նախորդ տարբերակ':''}</p>${t.baselineRequired&&!t.baselineCompleted?'<p>Կատարելուց առաջ ավարտեք գլխի ախտորոշիչը։</p>':''}</div><button type="button" data-writing-open="${esc(t.id)}">Բացել</button></article>`).join('')||'<p>Այս գլխի համար գրավոր առաջադրանք դեռ չի հրապարակվել։</p>'}</div>`);}
   root.querySelectorAll('[data-writing-open]').forEach(b=>b.onclick=()=>open(b.dataset.writingOpen));
  }catch(e){if(current()&&request===sequence){shell('<button type="button" data-writing-retry>Փորձել նորից</button>');message(e.message,true);$('[data-writing-retry]').onclick=list;}}
 }
 async function open(id){const request=++sequence;feedbackInitial=null;shell('<p>Բեռնվում է…</p>');try{const data=teacher?await feedbackApi(supabase,context,'open',{workId:id}):await api('open',{taskId:id});if(!current()||request!==sequence)return;feedbackInitial=teacher?data:null;model=teacher?data.writtenWork:data;savedText=model.draftText??'';conflict=false;render();}catch(e){if(current()&&request===sequence){shell('<button type="button" data-writing-back>Վերադառնալ ցանկին</button>');message(e.message,true);$('[data-writing-back]').onclick=onBack??list;}}}

 function render(){
  const d=model.task.definition,work=model.work,last=model.submissions.at(-1),lastReview=last?.reviews.at(-1);
  const editable=!teacher&&!model.readOnly&&(!d.baselineRequired||model.baselineCompleted)&&(!work||['draft','changes_requested'].includes(work.state));
  const canMark=teacher&&!model.readOnly&&['submitted','reviewed'].includes(work?.state);
  const max=d.criteria.reduce((n,c)=>n+c.descriptors.length-1,0);
  const score=lastReview?.decision==='assessed'?Object.values(lastReview.scores).reduce((n,x)=>n+x,0):null;
  shell(`<button type="button" class="ghost" data-writing-back>Վերադառնալ ցանկին</button>${teacher?`<p><strong>${esc(model.studentName)}</strong></p>`:''}<h3 lang="${esc(d.locale)}">${esc(d.title)}</h3><p>${labels[work?.state??'not_started']}${model.readOnly?' · Միայն դիտման համար':''}</p><p class="written-text" lang="${esc(d.locale)}">${esc(d.prompt)}</p><p>Առաջարկվող ծավալ՝ ${d.minWords}–${d.maxWords} բառ։</p>${typeof d.assistance.policy==='string'?`<p class="subtle" data-writing-assistance lang="${esc(d.locale)}">${esc(d.assistance.policy)}</p>`:''}${canMark?'':rubric(d)}
   ${editable?`<form data-writing-form><label>Ձեր աշխատանքը<textarea data-writing-text rows="10" maxlength="20000" lang="${esc(d.locale)}" spellcheck="${d.assistance.spellcheck===true}" autocomplete="off" autocorrect="off" autocapitalize="off">${esc(savedText)}</textarea></label><p data-writing-count aria-live="polite"></p><p class="subtle">Բառերը հաշվվում են ըստ բացատների և տողադարձերի։ Ծավալը գնահատման ուղեցույց է։</p><div class="row"><button type="button" class="secondary" data-writing-save>Պահպանել սևագիրը</button><button type="submit" data-writing-submit>Ներկայացնել ուսուցչին</button><button type="button" data-writing-recover hidden>Ստուգել ներկայացման կարգավիճակը</button><button type="button" class="secondary" data-writing-reload hidden>Բեռնել վերջին պահպանված տարբերակը</button></div></form>`:!teacher&&!last?'<p>Այս պահին աշխատանքը ներկայացնել հնարավոր չէ։</p>':''}
   ${canMark?'<div class="written-review-layout">':''}${last?`<section class="written-submitted"><h3>Ներկայացված տարբերակ ${last.version}</h3><p class="written-text written-response" lang="${esc(d.locale)}">${esc(last.text)}</p><p>${last.wordCount} բառ · ${esc(date(last.submittedAt))}</p>${score==null?'':`<p class="written-score">Արդյունք՝ ${score}/${max}</p><ul>${d.criteria.map(c=>`<li><span lang="${esc(d.locale)}">${esc(c.label)}</span>՝ ${lastReview.scores[c.key]}/${c.descriptors.length-1}</li>`).join('')}</ul>`}${lastReview?reviewMarkup(lastReview):'<p>Սպասում է ուսուցչի ստուգմանը։ Կարող եք շարունակել մյուս առաջադրանքները։</p>'}</section>`:''}
   ${canMark?teacherFeedbackMarkup(d,lastReview):''}${canMark?'</div>':''}${teacher&&!canMark&&feedbackInitial?.draft?`<section class="written-feedback"><h3>Ձեր անձնական սևագիրը · Միայն դիտման համար</h3><p>Աշակերտին չի ուղարկվել։</p><p class="written-text">${esc(feedbackInitial.draft.data.feedback)}</p></section>`:''}

   ${model.submissions.length?`<details class="written-history"><summary>Ներկայացումների և գնահատումների պատմությունը</summary>${model.submissions.slice().reverse().map(s=>`<section><h4>Տարբերակ ${s.version} · ${esc(date(s.submittedAt))}</h4><p class="written-text" lang="${esc(d.locale)}">${esc(s.text)}</p>${s.reviews.map(r=>`${r.scores?`<p>${d.criteria.map(c=>`${esc(c.label)}՝ ${r.scores[c.key]}/${c.descriptors.length-1}`).join(' · ')}</p>`:''}${reviewMarkup(r)}`).join('')}</section>`).join('')}</details>`:''}`);
  $('[data-writing-back]').onclick=onBack??list;
  if(editable){const input=$('[data-writing-text]');const count=()=>{$('[data-writing-count]').textContent=`${writtenWordCount(input.value)} բառ`;};count();input.oninput=()=>{count();clearTimeout(timer);message('Փոփոխությունները դեռ չեն պահպանվել։');timer=setTimeout(()=>void flush(),750);};$('[data-writing-save]').onclick=()=>flush();$('[data-writing-form]').onsubmit=e=>{e.preventDefault();void submit();};$('[data-writing-recover]').onclick=()=>void recoverSubmission();$('[data-writing-reload]').onclick=()=>{if(!busy&&window.confirm('Ձեր այս պատուհանի տեքստը կփոխարինվի վերջին պահպանված տարբերակով։ Նախ պատճենեք այն, եթե ցանկանում եք պահել։ Շարունակե՞լ։'))void open(model.task.id);};controls();}
  if(canMark){const editorSequence=sequence;feedbackEditor=mountTeacherFeedback({root:$('[data-feedback-editor]'),supabase,context,model,initial:feedbackInitial,onReload:()=>void open(model.work.id),isCurrent:()=>current()&&sequence===editorSequence,
   onDenied:()=>{if(current()&&sequence===editorSequence){sequence++;model=null;feedbackInitial=null;shell('<p>Այս աշխատանքն այլևս հասանելի չէ։ Նորից բացեք ձեր հասանելի դասարանի աշխատանքները։</p>');}},
   onPublished:(next,receipt)=>{if(!current()||sequence!==editorSequence)return;model=next;feedbackInitial={...feedbackInitial,draft:null};teacherDirty=false;render();message(next.work.state==='changes_requested'?'Աշխատանքը վերադարձվել է աշակերտին։':'Գնահատումն ու մեկնաբանությունն ուղարկված են աշակերտին։');void Promise.resolve().then(()=>{if(current())return onReviewed({workId:model.work.id,receipt});}).catch(()=>{});}});}

 }
 function controls(){
  if(teacher||!current())return;
  const locked=busy||Boolean(pendingSubmission)||conflict;
  const input=$('[data-writing-text]');if(input)input.readOnly=locked;
  for(const selector of ['[data-writing-save]','[data-writing-submit]']){const button=$(selector);if(button){button.disabled=locked;button.hidden=Boolean(pendingSubmission)||conflict;}}
  const back=$('[data-writing-back]');if(back)back.disabled=locked;
  const recover=$('[data-writing-recover]');if(recover){recover.hidden=!pendingSubmission;recover.disabled=busy;}
  const reload=$('[data-writing-reload]');if(reload){reload.hidden=!conflict;reload.disabled=busy;}
 }
 async function flush(duringSubmit=false){
  clearTimeout(timer);if(teacher||!current())return true;
  if(pendingSubmission||(busy&&!duringSubmit))return false;
  if(!$('[data-writing-text]'))return true;
  if(conflict)return false;
  if(saving){if(!(await saving))return false;return flush(duringSubmit);}
  const input=$('[data-writing-text]'),text=input.value;if(text===savedText)return true;
  message('Սևագիրը պահպանվում է…');const taskId=model.task.id,request=sequence;
  saving=(async()=>{try{const data=await api('save',{taskId,text,expectedRevision:model.work?.revision??0});if(!current()||request!==sequence)return false;model=data;savedText=text;message(input.value===text?'Սևագիրը պահպանված է։':'Նոր փոփոխությունները դեռ պահպանվում են…');return true;}catch(e){if(current()&&request===sequence){conflict=e.code==='written_conflict';message(e.message,true);controls();}return false;}})();
  const success=await saving;saving=null;if(success&&current()&&input.value!==savedText)return flush(duringSubmit);return success;
 }
 async function recoverSubmission(){
  if(busy||!current()||!pendingSubmission)return;
  busy=true;controls();message('Ստուգվում է՝ արդյոք աշխատանքը ներկայացված է ուսուցչին…');
  const pending=pendingSubmission,request=sequence;
  try{
   const data=await api('open',{taskId:pending.taskId});
   if(!current()||request!==sequence||pending!==pendingSubmission)return;
   if(data.task.id!==pending.taskId)throw new Error('written_recovery_context');
   // Immutable history confirms the submitted text even if a teacher has already
   // reviewed/returned it. Never replay a mutation merely to discover its outcome.
   const confirmed=data.submissions.some(s=>!pending.submissionIds.includes(s.id)&&s.text===pending.text);
   if(confirmed){pendingSubmission=null;model=data;savedText=data.draftText;conflict=false;render();message('Աշխատանքի ներկայացումը հաստատված է։ Ստորև կարող եք տեսնել ներկայացված տարբերակն ու ստուգման կարգավիճակը։');return;}
   const unchanged=data.work?.revision===pending.expectedRevision&&data.work?.currentSubmissionId===pending.previousSubmissionId&&data.draftText===pending.text&&!data.readOnly&&['draft','changes_requested'].includes(data.work?.state);
   pendingSubmission=null;
   if(unchanged){model=data;conflict=false;message('Ներկայացումը դեռ չի հաստատվել։ Ձեր սևագիրը պահպանված է։ Կարող եք կրկին սեղմել «Ներկայացնել ուսուցչին»։',true);}
   else{conflict=true;message('Աշխատանքի պահպանված տարբերակը փոխվել է։ Այս պատուհանի տեքստը մնացել է տեսանելի․ պատճենեք այն, ապա բեռնեք վերջին պահպանված տարբերակը։',true);}
  }catch{if(current()&&request===sequence&&pending===pendingSubmission){message('Չհաջողվեց հաստատել ներկայացման կարգավիճակը։ Ձեր տեքստը մնացել է այս պատուհանում։ Մի փակեք էջը․ կապը վերականգնելուց հետո սեղմեք «Ստուգել ներկայացման կարգավիճակը»։',true);}}
  finally{busy=false;controls();}
 }
 async function submit(){
  if(busy||pendingSubmission||!current()||conflict)return;
  busy=true;controls();const request=sequence;
  try{
   if(!(await flush(true))||!current()||request!==sequence)return;
   const text=$('[data-writing-text]').value;if(!writtenWordCount(text)){message('Նախ գրեք ձեր պատասխանը։',true);return;}
   pendingSubmission={taskId:model.task.id,text,expectedRevision:model.work?.revision??0,previousSubmissionId:model.work?.currentSubmissionId??null,submissionIds:model.submissions.map(s=>s.id)};
   controls();message('Աշխատանքը ներկայացվում է ուսուցչին…');
   const data=await api('submit',{taskId:pendingSubmission.taskId,text,expectedRevision:pendingSubmission.expectedRevision});
   if(!current()||request!==sequence)return;
   pendingSubmission=null;model=data;savedText=text;render();message('Աշխատանքը ներկայացված է ուսուցչին։');
  }catch(e){if(current()&&request===sequence){if(pendingSubmission){busy=false;await recoverSubmission();}else{message(e.message,true);controls();}}}
  finally{busy=false;controls();}
 }
 const navigate=async e=>{const link=e.target.closest?.('a[href]');if(!current()||teacher||!link||(!dirty()&&!saving)||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.target==='_blank')return;e.preventDefault();e.stopImmediatePropagation();if(await flush())location.assign(link.href);};
 document.addEventListener('click',navigate,true);
 if(teacher&&initialWorkId)void open(initialWorkId);else void list();
 const dispose=()=>{if(!alive)return;alive=false;feedbackEditor();feedbackInitial=null;pendingSubmission=null;authSubscription?.unsubscribe?.();sequence++;clearTimeout(timer);window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);root.replaceChildren();model=null;savedText='';};
 authSubscription=supabase.auth?.onAuthStateChange?.((_event,session)=>{if(!session||session.user?.id!==actorId)dispose();})?.data?.subscription;
 if(!alive)authSubscription?.unsubscribe?.();
 dispose.flush=()=>flush();dispose.hasUnsaved=dirty;return dispose;
}
