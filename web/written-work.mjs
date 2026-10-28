import {escapeHtml as esc} from './learning-navigation.mjs';
export const writtenWordCount=text=>String(text).trim().split(/\p{White_Space}+/u).filter(Boolean).length;
const labels={not_started:'Չի սկսվել',draft:'Սևագիր',submitted:'Սպասում է ստուգման',changes_requested:'Վերանայման կարիք ունի',reviewed:'Ստուգված է'};
const errors={written_conflict:'Աշխատանքը փոխվել է մեկ այլ պատուհանում։ Ձեր գրածը պահպանեք, ապա թարմացրեք էջը։',written_read_only:'Այս աշխատանքը հասանելի է միայն դիտման համար։',chapter_diagnostic_required:'Նախ ավարտեք այս գլխի ախտորոշիչը։',written_review_invalid:'Լրացրեք բոլոր չափանիշների միավորները և մեկնաբանությունը։',written_text_invalid:'Մուտքագրեք աշխատանքը՝ առավելագույնը 20 000 նիշ։',written_context_unavailable:'Այս դասարանի կամ աշխատանքի հասանելիությունն ավարտվել է։',written_work_unavailable:'Աշխատանքը հասանելի չէ։',written_task_unavailable:'Այս առաջադրանքն այլևս հասանելի չէ կատարման համար։',account_or_session_inactive:'Մուտք գործեք ձեր հաշիվ։'};
const date=v=>new Date(v).toLocaleString('hy-AM',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
const rubric=d=>`<details class="written-rubric"><summary>Գնահատման չափանիշները</summary>${d.criteria.map(c=>`<section lang="${esc(d.locale)}"><h4>${esc(c.label)}</h4><ol start="0">${c.descriptors.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section>`).join('')}</details>`;
const reviewMarkup=r=>`<div class="written-feedback"><strong>${r.decision==='assessed'?'Գնահատված է':'Վերադարձվել է վերանայման'}</strong><p class="written-text">${esc(r.feedback)}</p>${r.changeReason?`<p>Փոփոխության պատճառ՝ ${esc(r.changeReason)}</p>`:''}<small>${esc(date(r.createdAt))}</small></div>`;
export function mountWrittenWork({root,supabase,context,actorId,teacher=false,isCurrent=()=>true,initialWorkId=null,onReviewed=()=>{},onBack=null}) {
 let authSubscription=null,alive=true,sequence=0,model=null,timer=null,saving=null,savedText='',busy=false,conflict=false,offset=0,state='submitted',teacherDirty=false;
 const current=()=>alive&&isCurrent();
 const $=s=>root.querySelector(s);
 const message=(text,bad=false)=>{const el=$('[data-writing-message]');if(current()&&el){el.textContent=text;el.classList.toggle('written-error',bad);}};
 const dirty=()=>Boolean(!teacher&&$('[data-writing-text]')&&$('[data-writing-text]').value!==savedText)||teacherDirty;
 const unload=e=>{if(current()&&(dirty()||saving||busy)){e.preventDefault();e.returnValue='';}};
 window.addEventListener('beforeunload',unload);
 async function api(action,payload={}) {
  const {data,error}=await supabase.functions.invoke('manage-written-work',{body:{action,context,payload}});
  if(error||data?.error){let code=data?.error;if(!code&&error?.context?.json){try{code=(await error.context.json()).error;}catch{}}
   const problem=new Error(errors[code]??'Չհաջողվեց պահպանել կամ բեռնել տվյալները։ Փորձեք նորից։');problem.code=code;throw problem;}
  if(data?.version!=='written-work-v1')throw new Error('Չհաջողվեց բեռնել գրավոր աշխատանքները։');
  return data;
 }
 function shell(content){root.innerHTML=`<section class="card written-work"><h2>${teacher?'Գրավոր աշխատանքների ստուգում':'Գրավոր աշխատանքներ'}</h2><p data-writing-message role="status" aria-live="polite"></p><p class="subtle" data-writing-scope>Գրավոր աշխատանքի գնահատականը ներկայացվում է առանձին։ Այն չի գումարվում ավտոմատ ստուգարքի միավորներին և չի որոշում դրա արդյունքը։</p>${content}</section>`;}
 async function list(){
  if(!(await flush()))return;
  if(teacherDirty&&!window.confirm('Չպահպանված գնահատականը չեղարկե՞լ։'))return;
  teacherDirty=false;model=null;const request=++sequence;shell('<p>Բեռնվում է…</p>');
  try{const data=await api(teacher?'queue':'tasks',teacher?{state,offset}:{});if(!current()||request!==sequence)return;
   if(teacher){const rows=data.queue.slice(0,50);shell(`<label>Ցուցադրել <select data-writing-filter>${[['submitted','Սպասում են ստուգման'],['changes_requested','Վերադարձված են'],['reviewed','Ստուգված են'],['all','Բոլորը']].map(([v,l])=>`<option value="${v}"${state===v?' selected':''}>${l}</option>`).join('')}</select></label>${data.readOnly?'<p>Արխիվ․ աշխատանքները հասանելի են միայն դիտման համար։</p>':''}<div class="written-list">${rows.map(r=>`<article><div><strong>${esc(r.studentName)}</strong><p>${esc(r.taskTitle)} · ${labels[r.state]}</p></div><button type="button" data-writing-open="${esc(r.id)}">Բացել</button></article>`).join('')||'<p>Այս բաժնում աշխատանքներ չկան։</p>'}</div><div class="row"><button type="button" class="ghost" data-writing-prev${offset===0?' disabled':''}>Նախորդը</button><button type="button" class="ghost" data-writing-next${data.queue.length<=50?' disabled':''}>Հաջորդը</button><button type="button" class="ghost" data-writing-refresh>Թարմացնել</button></div>`);
    $('[data-writing-filter]').onchange=e=>{state=e.target.value;offset=0;list();};$('[data-writing-prev]').onclick=()=>{offset=Math.max(0,offset-50);list();};$('[data-writing-next]').onclick=()=>{offset+=50;list();};$('[data-writing-refresh]').onclick=list;
   }else{shell(`<p>Ուսուցիչը կստուգի ներկայացված աշխատանքը և կուղարկի մեկնաբանություն։</p><div class="written-list">${data.tasks.map(t=>`<article><div><strong lang="${esc(t.locale)}">${esc(t.title)}</strong><p>${labels[t.state]}${!t.available?' · Նախորդ տարբերակ':''}</p>${t.baselineRequired&&!t.baselineCompleted?'<p>Կատարելուց առաջ ավարտեք գլխի ախտորոշիչը։</p>':''}</div><button type="button" data-writing-open="${esc(t.id)}">Բացել</button></article>`).join('')||'<p>Այս գլխի համար գրավոր առաջադրանք դեռ չի հրապարակվել։</p>'}</div>`);}
   root.querySelectorAll('[data-writing-open]').forEach(b=>b.onclick=()=>open(b.dataset.writingOpen));
  }catch(e){if(current()&&request===sequence){shell('<button type="button" data-writing-retry>Փորձել նորից</button>');message(e.message,true);$('[data-writing-retry]').onclick=list;}}
 }
 async function open(id){const request=++sequence;shell('<p>Բեռնվում է…</p>');try{const data=await api(teacher?'inspect':'open',teacher?{workId:id}:{taskId:id});if(!current()||request!==sequence)return;model=data;savedText=data.draftText??'';conflict=false;render();}catch(e){if(current()&&request===sequence){shell('<button type="button" data-writing-back>Վերադառնալ ցանկին</button>');message(e.message,true);$('[data-writing-back]').onclick=onBack??list;}}}
 function render(){
  const d=model.task.definition,work=model.work,last=model.submissions.at(-1),lastReview=last?.reviews.at(-1);
  const editable=!teacher&&!model.readOnly&&(!d.baselineRequired||model.baselineCompleted)&&(!work||['draft','changes_requested'].includes(work.state));
  const canMark=teacher&&!model.readOnly&&['submitted','reviewed'].includes(work?.state);
  const max=d.criteria.reduce((n,c)=>n+c.descriptors.length-1,0);
  const score=lastReview?.decision==='assessed'?Object.values(lastReview.scores).reduce((n,x)=>n+x,0):null;
  shell(`<button type="button" class="ghost" data-writing-back>Վերադառնալ ցանկին</button>${teacher?`<p><strong>${esc(model.studentName)}</strong></p>`:''}<h3 lang="${esc(d.locale)}">${esc(d.title)}</h3><p>${labels[work?.state??'not_started']}${model.readOnly?' · Միայն դիտման համար':''}</p><p class="written-text" lang="${esc(d.locale)}">${esc(d.prompt)}</p><p>Առաջարկվող ծավալ՝ ${d.minWords}–${d.maxWords} բառ։</p>${typeof d.assistance.policy==='string'?`<p class="subtle" data-writing-assistance lang="${esc(d.locale)}">${esc(d.assistance.policy)}</p>`:''}${rubric(d)}
   ${editable?`<form data-writing-form><label>Ձեր աշխատանքը<textarea data-writing-text rows="10" maxlength="20000" lang="${esc(d.locale)}" spellcheck="${d.assistance.spellcheck===true}" autocomplete="off" autocorrect="off" autocapitalize="off">${esc(savedText)}</textarea></label><p data-writing-count aria-live="polite"></p><p class="subtle">Բառերը հաշվվում են ըստ բացատների և տողադարձերի։ Ծավալը գնահատման ուղեցույց է։</p><div class="row"><button type="button" class="secondary" data-writing-save>Պահպանել սևագիրը</button><button type="submit" data-writing-submit>Ներկայացնել ուսուցչին</button></div></form>`:!teacher&&!last?'<p>Այս պահին աշխատանքը ներկայացնել հնարավոր չէ։</p>':''}
   ${last?`<section><h3>Ներկայացված տարբերակ ${last.version}</h3><p class="written-text written-response" lang="${esc(d.locale)}">${esc(last.text)}</p><p>${last.wordCount} բառ · ${esc(date(last.submittedAt))}</p>${score==null?'':`<p class="written-score">Արդյունք՝ ${score}/${max}</p><ul>${d.criteria.map(c=>`<li><span lang="${esc(d.locale)}">${esc(c.label)}</span>՝ ${lastReview.scores[c.key]}/${c.descriptors.length-1}</li>`).join('')}</ul>`}${lastReview?reviewMarkup(lastReview):'<p>Սպասում է ուսուցչի ստուգմանը։ Կարող եք շարունակել մյուս առաջադրանքները։</p>'}</section>`:''}
   ${canMark?`<form data-writing-review><h3>Ուսուցչի գնահատումը</h3>${d.criteria.map(c=>`<label><span lang="${esc(d.locale)}">${esc(c.label)}</span><select data-writing-score="${esc(c.key)}"><option value="">Ընտրեք միավորը</option>${c.descriptors.map((text,n)=>`<option value="${n}"${lastReview?.scores?.[c.key]===n?' selected':''}>${n} — ${esc(text)}</option>`).join('')}</select></label>`).join('')}<label>Մեկնաբանություն<textarea data-writing-feedback rows="4" maxlength="4000" required>${esc(lastReview?.feedback??'')}</textarea></label>${lastReview?'<label>Գնահատման փոփոխության պատճառը<textarea data-writing-reason rows="2" minlength="3" maxlength="1000" required></textarea></label>':''}<div class="row"><button type="submit" data-writing-grade>Պահպանել գնահատականը</button><button type="button" class="secondary" data-writing-return>Վերադարձնել վերանայման</button></div></form>`:''}
   ${model.submissions.length?`<details class="written-history"><summary>Ներկայացումների և գնահատումների պատմությունը</summary>${model.submissions.slice().reverse().map(s=>`<section><h4>Տարբերակ ${s.version} · ${esc(date(s.submittedAt))}</h4><p class="written-text" lang="${esc(d.locale)}">${esc(s.text)}</p>${s.reviews.map(r=>`${r.scores?`<p>${d.criteria.map(c=>`${esc(c.label)}՝ ${r.scores[c.key]}/${c.descriptors.length-1}`).join(' · ')}</p>`:''}${reviewMarkup(r)}`).join('')}</section>`).join('')}</details>`:''}`);
  $('[data-writing-back]').onclick=onBack??list;
  if(editable){const input=$('[data-writing-text]');const count=()=>{$('[data-writing-count]').textContent=`${writtenWordCount(input.value)} բառ`;};count();input.oninput=()=>{count();clearTimeout(timer);message('Փոփոխությունները դեռ չեն պահպանվել։');timer=setTimeout(()=>void flush(),750);};$('[data-writing-save]').onclick=()=>flush();$('[data-writing-form]').onsubmit=e=>{e.preventDefault();void submit();};}
  if(canMark){$('[data-writing-review]').oninput=()=>{teacherDirty=true;};$('[data-writing-review]').onsubmit=e=>{e.preventDefault();void review('assessed');};$('[data-writing-return]').onclick=()=>review('return');}
 }
 async function flush(){
  clearTimeout(timer);if(teacher||!current()||!$('[data-writing-text]'))return true;
  if(conflict)return false;
  if(saving){if(!(await saving))return false;return flush();}
  const input=$('[data-writing-text]'),text=input.value;if(text===savedText)return true;
  message('Սևագիրը պահպանվում է…');const taskId=model.task.id,request=sequence;
  saving=(async()=>{try{const data=await api('save',{taskId,text,expectedRevision:model.work?.revision??0});if(!current()||request!==sequence)return false;model=data;savedText=text;message(input.value===text?'Սևագիրը պահպանված է։':'Նոր փոփոխությունները դեռ պահպանվում են…');return true;}catch(e){if(current()&&request===sequence){conflict=e.code==='written_conflict';message(e.message,true);}return false;}})();
  const success=await saving;saving=null;if(success&&current()&&input.value!==savedText)return flush();return success;
 }
 async function submit(){if(busy||!current()||conflict)return;busy=true;const button=$('[data-writing-submit]');button.disabled=true;
  try{if(!(await flush()))return;const text=$('[data-writing-text]').value;if(!writtenWordCount(text)){message('Նախ գրեք ձեր պատասխանը։',true);return;}
   $('[data-writing-text]').readOnly=true;const request=sequence;const data=await api('submit',{taskId:model.task.id,text,expectedRevision:model.work?.revision??0});if(!current()||request!==sequence)return;model=data;savedText=text;render();message('Աշխատանքը ներկայացված է ուսուցչին։');
  }catch(e){if(current()){message(e.message,true);const input=$('[data-writing-text]');if(input)input.readOnly=false;conflict=e.code==='written_conflict';}}
  finally{busy=false;if(current()&&button.isConnected)button.disabled=false;}
 }
 async function review(decision){if(busy||!current())return;const form=$('[data-writing-review]');if(!form.reportValidity())return;
  const scores=decision==='assessed'?Object.fromEntries([...root.querySelectorAll('[data-writing-score]')].map(s=>[s.dataset.writingScore,s.value===''?null:Number(s.value)])):null;
  if(scores&&Object.values(scores).some(v=>v===null)){message('Ընտրեք միավորը յուրաքանչյուր չափանիշի համար։',true);return;}
  busy=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);const request=sequence;
  try{const data=await api('review',{workId:model.work.id,expectedRevision:model.work.revision,decision,scores,feedback:$('[data-writing-feedback]').value,...($('[data-writing-reason]')?{changeReason:$('[data-writing-reason]').value}:{})});if(!current()||request!==sequence)return;model=data;teacherDirty=false;render();message(decision==='assessed'?'Գնահատականն ու մեկնաբանությունը պահպանված են։':'Աշխատանքը վերադարձվել է աշակերտին։');void Promise.resolve().then(()=>{if(current())return onReviewed({workId:model.work.id,decision});}).catch(()=>{});}catch(e){if(current()&&request===sequence)message(e.message,true);}finally{busy=false;if(current()&&form.isConnected)form.querySelectorAll('button').forEach(b=>b.disabled=false);}
 }
 const navigate=async e=>{const link=e.target.closest?.('a[href]');if(!current()||teacher||!link||(!dirty()&&!saving)||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.target==='_blank')return;e.preventDefault();e.stopImmediatePropagation();if(await flush())location.assign(link.href);};
 document.addEventListener('click',navigate,true);
 if(teacher&&initialWorkId)void open(initialWorkId);else void list();
 const dispose=()=>{if(!alive)return;alive=false;authSubscription?.unsubscribe?.();sequence++;clearTimeout(timer);window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);root.replaceChildren();model=null;savedText='';};
 authSubscription=supabase.auth?.onAuthStateChange?.((_event,session)=>{if(!session||session.user?.id!==actorId)dispose();})?.data?.subscription;
 if(!alive)authSubscription?.unsubscribe?.();
 dispose.flush=flush;dispose.hasUnsaved=dirty;return dispose;
}
