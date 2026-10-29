import {studentMaterialCard,previewExplanation} from './resource-learner-view.mjs';
import {escapeHtml as esc} from './learning-navigation.mjs';
import {studentIcon} from './student-visuals.mjs';
import {mountTeacherResourceAssignments} from './resource-assignments.mjs';
import {ensureMaterialMfa} from './content-material-mfa.mjs';
import {prepareResourceFile,resourceFileTitle,resourceFileDigest} from './resource-file-input.mjs';
const labels={draft:'Սևագիր',published:'Հրապարակված',superseded:'Նախորդ տարբերակ',withdrawn:'Հեռացված'};
const purposes={practice:'Վարժանք',reading:'Ընթերցանություն'};
const errors={resource_forbidden:'Այս դասընթացի հասանելիությունն ավարտվել է։ Թարմացրեք էջը։',resource_unavailable:'Նյութը հեռացվել կամ փոխարինվել է։ Թարմացրեք ցանկը։',resource_conflict:'Նյութը փոխվել է։ Թարմացրեք ցանկը և բացեք վերջին տարբերակը։',resource_definition_invalid:'Ստուգեք դաշտերն ու աղբյուրի հաստատումները։',resource_file_invalid:'Ընտրեք PDF ֆայլ՝ առավելագույնը 5 ՄԲ։ Ֆայլը պետք է ամբողջական լինի։',resource_too_large:'Ֆայլը գերազանցում է 5 ՄԲ սահմանը։',resource_url_invalid:'Մուտքագրեք արտաքին կայքի HTTPS հղում։',resource_qa_required:'Նախ պահպանեք փոփոխությունները և անցկացրեք QA ստուգումը։',resource_mfa_required:'Հրապարակման համար հաստատեք բազմագործոն մուտքը։',resource_reason_required:'Նշեք փոփոխության պատճառը։'};
Object.assign(errors,{resource_file_required:'Նախ կցեք PDF ֆայլը։',resource_storage_unavailable:'Ֆայլը վերբեռնել չհաջողվեց։ Սևագիրը պահպանված է․ կրկին փորձեք կցել ֆայլը։',resource_create_uncertain:'Սևագրի ստեղծման հաստատումը չստացվեց։ Թարմացրեք ցանկը և ստուգեք սևագրերը՝ կրկնօրինակ չստեղծելու համար։',resource_upload_uncertain:'Կցման հաստատումը չստացվեց։ Կրկին փորձելուց առաջ կստուգենք պահպանված ֆայլը։',resource_file_conflict:'Պահպանված PDF-ը տարբերվում է ընտրված ֆայլից։ Թարմացրեք ցանկը և ստուգեք նյութը։'});
const errorText=e=>errors[e.message]||'Գործողությունը չհաջողվեց։ Փորձեք նորից։';
export const resourceContext=c=>Object.fromEntries(['enrollmentId','assignmentId','curriculumReleaseId','unitId'].filter(k=>c?.[k]).map(k=>[k,c[k]]));
const contextLabel=c=>[c.subjectNameHy,c.gradeLabelHy,c.unitTitleHy,c.className,c.schoolName,c.academicYearLabel].filter(Boolean).join(' · ');
export function filterResources(rows,{query='',purpose='',topic='',provider='',format=''}={}){return rows.filter(m=>{const d=m.definition;return(!purpose||d.purpose===purpose)&&(!topic||d.topic===topic)&&(!provider||m.provider===provider)&&(!format||d.format===format)&&[d.title,d.goal,d.description,d.topic].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());});}
function card(m,staff,teacher=false){if(!staff)return studentMaterialCard(m);const d=m.definition;
 return `<article class="resource-card ${d.purpose==='practice'?'resource-practice':'resource-reading'}"><div class="resource-art">${studentIcon(d.purpose==='practice'?'practice':'courses')}<span>${purposes[d.purpose]}</span></div><div class="resource-card-body"><div class="resource-badges"><span>${m.provider==='teacher'?'Ուսուցչից':'Հարթակից'}${m.providerName?' · '+esc(m.providerName):''}</span>${d.recommended&&m.provider==='teacher'?'<span class="resource-recommended">Ուսուցչի առաջարկ</span>':''}${staff?`<span>${labels[m.status]}</span>`:''}</div><h3 lang="${esc(d.locale)}">${esc(d.title)}</h3><p class="resource-goal" lang="${esc(d.locale)}">${esc(d.goal||d.description)}</p>${d.goal?`<p lang="${esc(d.locale)}">${esc(d.description)}</p>`:''}<p class="resource-meta">${esc(d.topic||'')}${d.topic?' · ':''}${d.format==='pdf'?'PDF':'Հղում'}${m.fileBytes?' · '+(m.fileBytes/1024/1024).toLocaleString('hy',{maximumFractionDigits:2})+' ՄԲ':''}${Number.isInteger(d.estimatedMinutes)&&d.estimatedMinutes>0?' · Մոտ '+d.estimatedMinutes+' րոպե':''}</p><p class="resource-meta">v${m.version}${m.publishedAt?' · '+new Date(m.publishedAt).toLocaleDateString('hy-AM'):''}</p><button type="button" data-resource-${teacher&&m.provider==='platform'?'assign':staff?'edit':'open'}="${esc(m.id)}">${teacher&&m.provider==='platform'?'Ուղարկել առաջադրանք':staff?'Ստուգել և կառավարել':d.format==='pdf'?'Ներբեռնել PDF':'Բացել նյութը'}${studentIcon('arrow')}</button>${teacher&&m.status==='published'?`<button type="button" class="ghost" data-resource-student-preview="${esc(m.id)}">Աշակերտի տեսքի նախադիտում</button>`:''}${teacher&&m.provider!=='platform'&&m.status==='published'?`<button type="button" class="ghost" data-resource-assign="${esc(m.id)}">Ուղարկել առաջադրանք</button>`:''}</div></article>`;
}
export function mountResourceLibrary({root,client,staff=false,onRole=()=>{}}){
 const assignmentMode=staff&&new URLSearchParams(location.search).get('intent')==='assign';
 let actor=null,epoch=0,request=0,contexts=[],selected=null,rows=[],role=null,current=null,busy=false,dirty=false,disposed=false,operation=0,busyKind='write';
 let assignmentView=null;const lockedControls=new Map();
 function lockWrites(){for(const el of root.querySelectorAll('input,select,textarea,button')){if(!lockedControls.has(el))lockedControls.set(el,el.disabled);el.disabled=true;}}
 function unlockWrites(){for(const [el,disabled]of lockedControls)if(el.isConnected)el.disabled=disabled;lockedControls.clear();if(uncertainCreate)for(const el of root.querySelectorAll('[data-resource-form] button[type=submit]'))el.disabled=true;}
 let pendingFile=null,fileTicket=0,uncertainCreate=false,uploadUncertain=false;
 const clearAssignments=()=>{assignmentView?.dispose();assignmentView=null;root.classList.remove('resource-composing');const el=root.querySelector('[data-resource-assignments]');if(el)el.hidden=true;};
 const urls=new Set();const $=q=>root.querySelector(q);const valid=(e,q=request)=>!disposed&&e===epoch&&q===request;
 const message=(t,bad=false)=>{const el=$('[data-resource-message]');if(el){el.textContent=t;el.classList.toggle('bad',bad);}};
 const clearDelivery=()=>{root.querySelectorAll('dialog').forEach(d=>d.remove());for(const u of urls)URL.revokeObjectURL(u);urls.clear();};
 const canLeave=()=>{if((busy&&busyKind==='write')||assignmentView?.isBusy()){message('Սպասեք գործողության հաստատմանը։');return false;}return !(dirty||pendingFile||assignmentView?.hasUnsaved())||window.confirm('Չպահպանված փոփոխությունները կհեռացվեն։ Շարունակե՞լ։');};
 async function invoke(action,payload={},context=resourceContext(selected),file){
  const e=epoch,q=request;let body={action,context,payload};
  if(file){const f=new FormData();f.append('request',JSON.stringify(body));f.append('file',file);body=f;}
  const {data,error}=await client.functions.invoke('manage-supplementary-resources',{body});
  if(!valid(e,q))throw Error('resource_stale');
  if(error){let code=data?.error;try{code||=(await error.context?.json())?.error;}catch{}throw Error(code||error.message);}
  return data;
 }
 const key=()=>({id:current.id,fingerprint:current.fingerprint});
 function filters(){return Object.fromEntries(['query','purpose','topic','provider','format'].map(k=>[k,$(`[data-filter="${k}"]`)?.value||'']));}
 function drawCards(){const f=filters(),shown=filterResources(rows,f),count=Object.values(f).filter(Boolean).length;
  $('[data-filter-count]').textContent=count?`Ակտիվ զտիչներ՝ ${count}`:'Բոլոր նյութերը';$('[data-filter-reset]').hidden=!count;
  $('[data-resource-count]').textContent=`${shown.length} նյութ${count?' · ընդհանուր՝ '+rows.length:''}`;
  $('[data-resource-list]').innerHTML=(() => {
    const active=shown.filter(m=>!staff||!['withdrawn','superseded'].includes(m.status));
    const history=staff?shown.filter(m=>['withdrawn','superseded'].includes(m.status)):[];
    return active.map(m=>card(m,staff,role==='teacher')).join('')+(history.length?`<details class="resource-history"><summary>Նյութերի պատմություն · ${history.length}</summary><div class="resource-grid">${history.map(m=>card(m,staff,role==='teacher')).join('')}</div></details>`:'');
  })()||`<div class="resource-empty">${studentIcon('courses')}<h2>${rows.length?'Ոչ մի նյութ չի համապատասխանում':'Այստեղ դեռ նյութեր չկան'}</h2><p>${rows.length?'Փոխեք որոնումը կամ մաքրեք զտիչները։':staff?'Ավելացրեք առաջին նյութը ընտրված բաժնի համար։':'Երբ ուսուցիչը կամ հարթակը նյութ ավելացնի, այն կտեսնեք այստեղ։'}</p></div>`;
 }
 function clearEditor(){root.classList.remove('resource-composing');current=null;dirty=false;pendingFile=null;fileTicket++;uncertainCreate=false;uploadUncertain=false;const ed=$('[data-resource-editor]');if(ed){ed.hidden=true;ed.innerHTML='';}}
 function resetFilters(){for(const el of root.querySelectorAll('[data-filter]'))el.value='';for(const b of root.querySelectorAll('[data-purpose]'))b.setAttribute('aria-pressed',String(!b.dataset.purpose));}
 function drawShell(){root.innerHTML=`<section class="resource-welcome"><div><p class="eyebrow">ՍՈՎՈՐԻՐ ԱՎԵԼԻՆ</p><h2>${staff?(role==='teacher'&&assignmentMode?'Ընտրեք նյութը և հանձնարարեք':'Կիսվեք օգտակար նյութերով'):'Փոքր քայլ, նոր բացահայտում'}</h2><p>${staff?'Ավելացրեք վարժանքներ կամ ընթերցանության նյութեր։ Սովորողները կտեսնեն միայն հրապարակված տարբերակը։':'Լրացուցիչ նյութեր՝ ինքնուրույն աշխատանքի համար։ Ուսուցչի ուղարկած առաջադրանքները գտեք «Իմ աշխատանքները» բաժնում։'}</p></div><div class="resource-welcome-art" aria-hidden="true">${studentIcon('courses')}${studentIcon('practice')}</div></section>
 ${staff&&role==='teacher'?'<p class="resource-workflow-note">'+(assignmentMode?'Ընտրեք հրապարակված նյութի «Ուղարկել առաջադրանք» գործողությունը կամ ավելացրեք նոր նյութ։ Ստացողներին կհաստատեք առանձին քայլում։':'Գրադարանում հրապարակելը լրացուցիչ նյութը հասանելի է դարձնում դասարանին։ Այն «Իմ աշխատանքները» բաժին ուղարկելու համար պետք է առանձին հանձնարարել։')+' <a href="./teacher-workflows.html#'+(assignmentMode?'assign':'library')+'">Գործողությունների ուղեցույց</a></p>':''}
 <section class="card resource-controls" aria-label="Դասընթաց և նյութերի որոնում"><label>Դասընթաց և բաժին<select data-resource-context><option value="">Ընտրեք բաժինը</option>${contexts.map((c,i)=>`<option value="${i}">${esc(contextLabel(c))}</option>`).join('')}</select></label><p data-resource-scope class="resource-meta"></p>${staff&&role==='teacher'?'<p class="resource-meta">Այստեղ հասանելի են ձեր ակտիվ դասարաններին վերագրված առարկաները։ Նշանակումները կառավարում է դպրոցի ադմինիստրատորը։ Նյութը հրապարակելուց առաջ ստուգեք ընտրված դասարանը և առարկան։</p>':''}<div class="resource-search"><label>Գտնել նյութ<input type="search" data-filter="query" placeholder="Վերնագիր, նպատակ կամ թեմա"></label><button type="button" class="ghost" data-resource-refresh>Թարմացնել</button></div>
 <div class="resource-purpose" role="group" aria-label="Նյութի նպատակը"><input type="hidden" data-filter="purpose"><button type="button" class="ghost" data-purpose="" aria-pressed="true">Բոլորը</button><button type="button" class="ghost" data-purpose="practice" aria-pressed="false">${studentIcon('practice')}Վարժանք</button><button type="button" class="ghost" data-purpose="reading" aria-pressed="false">${studentIcon('courses')}Ընթերցանություն</button></div>
 <details class="resource-filter-details"><summary>Լրացուցիչ զտիչներ <span data-filter-count></span></summary><div class="resource-filter-grid"><label>Թեմա<select data-filter="topic"><option value="">Բոլոր թեմաները</option></select></label><label>Տրամադրող<select data-filter="provider"><option value="">Բոլորը</option><option value="teacher">Ուսուցչից</option><option value="platform">Հարթակից</option></select></label><label>Ձևաչափ<select data-filter="format"><option value="">Բոլորը</option><option value="pdf">PDF</option><option value="link">Հղում</option></select></label></div></details><button type="button" class="ghost" data-filter-reset hidden>Մաքրել զտիչները</button></section>
 <p data-resource-message role="status" aria-live="polite"></p><div class="resource-list-heading"><h2>Նյութերի գրադարան</h2><span data-resource-count aria-live="polite"></span>${staff?'<button type="button" data-resource-new>+ Ավելացնել նյութ</button>':''}</div>${staff&&role==='teacher'?'<button type="button" class="ghost" data-resource-assignment-history>Ուղարկված առաջադրանքները</button>':''}<section data-resource-assignments hidden></section><section data-resource-editor class="card resource-editor" hidden aria-label="Նյութի խմբագրում"></section><div data-resource-list class="resource-grid"></div>`;
  drawCards();$('[data-resource-list]').innerHTML='<p>Ընտրեք դասընթացն ու բաժինը։</p>';
 }
 async function loadList(){if(!selected)return;const e=epoch,q=++request;clearDelivery();clearAssignments();rows=[];clearEditor();drawCards();message('Նյութերը բեռնվում են…');$('[data-resource-list]').setAttribute('aria-busy','true');
  try{let offset=0,all=[];do{const r=await invoke('list',{offset});if(!valid(e,q))return;all.push(...r.materials);if(!r.hasMore)break;offset+=r.materials.length;if(!r.materials.length)throw Error('invalid_page');}while(offset<100000);
   if(role==='teacher'){let page=0;do{const {data,error}=await client.functions.invoke('manage-resource-assignments',{body:{action:'catalog',context:resourceContext(selected),payload:{offset:page}}});if(!valid(e,q))return;if(error)throw Error('resource_unavailable');all.push(...data.materials);if(!data.hasMore)break;page=data.nextOffset;}while(page<100000);}
   rows=all;
   const topic=$('[data-filter="topic"]'),previous=topic.value;topic.innerHTML='<option value="">Բոլոր թեմաները</option>'+[...new Set(rows.map(m=>m.definition.topic).filter(Boolean))].sort().map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');topic.value=previous;drawCards();message(rows.length?'Նյութերը թարմացված են։':'');
  }catch(e2){if(valid(e,q)){message(errorText(e2),true);$('[data-resource-list]').innerHTML='<div class="resource-empty"><h2>Նյութերը հասանելի չեն</h2><p>Փորձեք թարմացնել ցանկը։</p></div>';}}
  finally{if(valid(e,q))$('[data-resource-list]').setAttribute('aria-busy','false');}
 }
 function selectContext(index){selected=contexts[Number(index)]??null;if(index==='')selected=null;request++;operation++;busy=false;clearDelivery();clearAssignments();clearEditor();rows=[];resetFilters();$('[data-resource-context]').value=selected?String(contexts.indexOf(selected)):'';
  $('[data-resource-scope]').textContent=selected?(role==='teacher'?'Նյութը կտրամադրվի՝ ':'')+contextLabel(selected):'';
  if(selected){const p=new URLSearchParams();if(role==='teacher'&&assignmentMode)p.set('intent','assign');for(const[k,v]of Object.entries(resourceContext(selected)))p.set(({enrollmentId:'enrollment',assignmentId:'assignment',curriculumReleaseId:'release',unitId:'unit'})[k],v);history.replaceState({},'',location.pathname+'?'+p);void loadList();}
  else{$('[data-resource-list]').innerHTML='<p>Ընտրեք դասընթացն ու բաժինը։</p>';message('');}
 }
 function drawEditor(m=null,history=[],events=[],keepFile=false){
  clearAssignments();root.classList.add('resource-composing');current=m;dirty=false;uncertainCreate=false;
  if(!keepFile){pendingFile=null;fileTicket++;uploadUncertain=false;}
  const d=m?.definition??{locale:'hy',format:'pdf',purpose:'reading'},ed=$('[data-resource-editor]');ed.hidden=false;
  ed.innerHTML=`<header><h2 tabindex="-1">${m?'Նյութ · v'+m.version:'Նոր նյութ'}</h2><button type="button" class="ghost" data-resource-close>Փակել</button></header>
  <p class="resource-compose-context">${esc(contextLabel(selected))}</p>
  ${role==='teacher'?`<p class="resource-audience-note" data-resource-step>${assignmentMode?'Քայլ 1․ պատրաստեք նյութը։ Հաջորդ քայլում ընտրեք ստացողներին և հաստատեք ուղարկումը։':'Հրապարակեք նյութը գրադարանում։ Աշակերտներին առաջադրանք ուղարկելը առանձին քայլ է։'}</p>`:''}
  ${m?`<p><strong>${labels[m.status]}</strong>${m.qa?.passed?' · Ստուգումն անցած է':m.qa&&!m.qa.passed?' · '+(m.qa.issues?.includes('file_required')?'PDF-ը դեռ կցված չէ':'Ստուգեք նյութի տվյալները'):''}</p>`:''}
  ${role==='teacher'&&m?.status==='published'?`<button type="button" class="ghost" data-resource-student-preview="${esc(m.id)}">Աշակերտի տեսքի նախադիտում</button>`:''}
  <form data-resource-form>
   <fieldset class="resource-file-first"><legend>Նյութը</legend>
    <label>Ձևաչափ<select name="format"><option value="pdf"${d.format==='pdf'?' selected':''}>PDF ֆայլ</option><option value="link"${d.format==='link'?' selected':''}>HTTPS հղում</option></select></label>
    <div data-pdf-field${d.format!=='pdf'?' hidden':''}>
     ${m?.fileBytes?`<p>Կցված PDF · ${(m.fileBytes/1024/1024).toLocaleString('hy-AM',{maximumFractionDigits:2})} ՄԲ</p><button type="button" class="ghost" data-resource-action="preview">Ստուգել պահպանված PDF-ը</button>`:''}
     <label>${m?.fileBytes?'Փոխարինող PDF՝ նոր տարբերակի համար':'Կցել PDF'}<input type="file" accept="application/pdf,.pdf" data-resource-file></label>
     <p class="resource-meta">Մինչև 5 ՄԲ։ Ֆայլը կկցվի պահպանման ժամանակ։</p>
     <p data-resource-file-status role="status"></p><button type="button" class="ghost" data-resource-file-preview hidden>Ստուգել ընտրված PDF-ը</button>
    </div>
    <label data-url-field${d.format!=='link'?' hidden':''}>Արտաքին HTTPS հղում<input name="url" type="url" maxlength="2048" value="${esc(d.url||'')}"></label>
   </fieldset>
   <label>Վերնագիր<input name="title" required maxlength="200" value="${esc(d.title||'')}" placeholder="Ինչ նյութ եք ուղարկում"></label>
   <label>Աղբյուր<input name="sourceReference" required maxlength="2000" value="${esc(d.sourceReference||'')}" placeholder="Օրինակ՝ իմ պատրաստած նյութը, գրքի անունը կամ աղբյուրի հղումը"></label>
   <label>Կարճ նկարագրություն${role==='teacher'?' (ըստ ցանկության)':''}<textarea name="description"${role==='teacher'?'':' required'} maxlength="2000" rows="2">${esc(d.description||'')}</textarea></label>
   <details class="resource-extra-fields"><summary>Լրացուցիչ տվյալներ (ըստ ցանկության)</summary><div class="resource-form-grid">
    <label>Թեմա<input name="topic" maxlength="200" value="${esc(d.topic||'')}"></label>
    <label>Նպատակ<select name="purpose"><option value="reading"${d.purpose==='reading'?' selected':''}>Ընթերցանություն</option><option value="practice"${d.purpose==='practice'?' selected':''}>Վարժանք</option></select></label>
    <label>Լեզու<select name="locale">${[['hy','Հայերեն'],['en','Անգլերեն'],['ru','Ռուսերեն']].map(([v,l])=>`<option value="${v}"${d.locale===v?' selected':''}>${l}</option>`).join('')}</select></label>
    <label>Մոտավոր տևողություն՝ րոպե<input name="estimatedMinutes" type="number" min="1" max="240" step="1" value="${esc(d.estimatedMinutes||'')}"></label>
   </div><label>Ինչ կսովորի աշակերտը<textarea name="goal" maxlength="500">${esc(d.goal||'')}</textarea></label>
   ${role==='teacher'?`<label class="resource-check"><input name="recommended" type="checkbox"${d.recommended?' checked':''}>Առաջարկել այս նյութը դասարանի գրադարանում</label>`:''}</details>
   <label class="resource-check"><input name="rightsConfirmed" type="checkbox" required${d.rightsConfirmed?' checked':''}>Ունեմ նյութը տրամադրելու իրավունք։</label>
   <label class="resource-check"><input name="assessmentSafe" type="checkbox" required${d.assessmentSafe?' checked':''}>Նյութը չի բացահայտում պաշտպանված գնահատման հարցեր, պատասխաններ կամ լսողական/ընթերցանության աղբյուրներ։</label>
   ${m?'<label>Փոփոխության կամ հեռացման պատճառ<textarea name="reason" maxlength="2000" rows="2"></textarea></label>':''}
   ${role==='teacher'?'<p class="resource-audience-note">«Հրապարակել գրադարանում» գործողությամբ նյութը հասանելի կլինի այս դասարանի բոլոր իրավասու աշակերտներին։ Առաջադրանք ուղարկելու համար ընտրեք «Հրապարակել և ընտրել ստացողներին», ապա հաստատեք ստացողներին։</p>':''}
   <p data-resource-dirty role="status"></p><div class="resource-actions">
   ${role==='teacher'?`<button type="submit" name="intent" value="library" data-resource-publish-library class="${assignmentMode?'ghost':''}">Հրապարակել գրադարանում</button><button type="submit" name="intent" value="assign" data-resource-publish-assign class="${assignmentMode?'':'ghost'}">Հրապարակել և ընտրել ստացողներին</button>`:''}
   <button type="submit" name="intent" value="draft" class="${role==='teacher'?'ghost':''}">${m?'Պահպանել նոր տարբերակ':'Պահպանել սևագիրը'}</button></div>
  </form>
  <p data-resource-compose-status role="status" aria-live="polite"></p><button type="button" class="ghost" data-resource-recover hidden>Թարմացնել և գտնել սևագիրը</button>
  ${m?`<details class="resource-publish"><summary>Հրապարակում և նյութի կառավարում</summary><p>Ֆայլի ստուգումը չի փոխարինում բովանդակության ձեր ստուգմանը։</p><div class="resource-actions">
   ${d.format==='pdf'&&!m.fileBytes&&m.status==='draft'?'<button type="button" data-resource-action="upload">Կցել PDF</button>':''}
   <button type="button" class="ghost" data-resource-action="preview">${d.format==='pdf'?'Ներբեռնել ստուգման համար':'Ստուգել հղումը'}</button>
   <button type="button" class="ghost" data-resource-action="qa"${m.status!=='draft'||(d.format==='pdf'&&!m.fileBytes)?' disabled':''}>Ստուգել QA</button>
   <button type="button" data-resource-action="publish"${m.status!=='draft'||!m.qa?.passed?' disabled':''}>${role==='teacher'?'Հրապարակել գրադարանում':'Հաստատել և հրապարակել'}</button>
   ${role==='teacher'&&m.status==='published'?`<button type="button" data-resource-assign="${esc(m.id)}">Ուղարկել առաջադրանք</button>`:''}
   <button type="button" class="ghost" data-resource-action="withdraw"${m.status==='withdrawn'?' disabled':''}>Հեռացնել հասանելիությունից</button></div></details>
   <details><summary>Տարբերակներ և գործողություններ</summary><ul>${history.map(v=>`<li>v${v.version} · ${labels[v.status]}</li>`).join('')}</ul><ul>${events.map(e=>`<li>${esc(({created:'Ստեղծված',revised:'Նոր տարբերակ',qa:'QA ստուգում',published:'Հրապարակված',superseded:'Փոխարինված',withdrawn:'Հեռացված',file_attached:'Ֆայլը կցված է'})[e.event]||e.event)} · v${e.version} · ${new Date(e.at).toLocaleString('hy-AM')}${e.detail?.reason?' · '+esc(e.detail.reason):''}</li>`).join('')}</ul></details>`:''}`;
  drawFileStatus();if(busy&&busyKind==='write')lockWrites();ed.querySelector('h2').focus();
 }
 function drawFileStatus(error=''){
  const note=$('[data-resource-file-status]');if(!note)return;
  note.textContent=error|| (pendingFile?pendingFile.name+' · '+(pendingFile.size<1024?pendingFile.size+' բայթ':pendingFile.size<1024*1024?(pendingFile.size/1024).toLocaleString('hy-AM',{maximumFractionDigits:1})+' ԿԲ':(pendingFile.size/1024/1024).toLocaleString('hy-AM',{maximumFractionDigits:2})+' ՄԲ')+' · պատրաստ է կցման':'PDF ֆայլ դեռ ընտրված չէ։');note.classList.toggle('bad',Boolean(error));
  $('[data-resource-file-preview]').hidden=!pendingFile;
 }
 function composeMessage(text,bad=false){message(text,bad);const el=$('[data-resource-compose-status]');if(el){el.textContent=text;el.classList.toggle('bad',bad);}}
 function remember(m){current=m;rows=[m,...rows.filter(x=>x.resourceId!==m.resourceId)];drawCards();}
 function openAssignments(materialId){clearAssignments();clearEditor();root.classList.add('resource-composing');assignmentView=mountTeacherResourceAssignments({root:$('[data-resource-assignments]'),client,context:selected,materialId,onClose:()=>{clearAssignments();const b=[...root.querySelectorAll('[data-resource-assign]')].find(b=>b.dataset.resourceAssign===materialId);(b??$('[data-resource-context]'))?.focus();}});}
 const sameDefinition=(a,b)=>['title','topic','description','goal','purpose','locale','format','sourceReference','url','estimatedMinutes','rightsConfirmed','assessmentSafe','recommended'].every(k=>(a[k]??(['recommended'].includes(k)?false:''))===(b[k]??(['recommended'].includes(k)?false:'')));
 async function attachPendingFile(file){
  const e=epoch,q=request;
  if(uploadUncertain){
   const saved=(await invoke('get',{id:current.id})).material;remember(saved);
   if(saved.fileBytes){const bytes=await invoke('open',{id:saved.id});const matches=bytes instanceof Blob&&await resourceFileDigest(bytes)===await resourceFileDigest(file);if(!valid(e,q))throw Error('resource_stale');if(!matches)throw Error('resource_file_conflict');uploadUncertain=false;return;}
  }
  try{remember((await invoke('upload',key(),resourceContext(selected),file)).material);uploadUncertain=false;}
  catch(error){if(error.message==='resource_stale')throw error;uploadUncertain=true;throw Error(error.message==='resource_file_invalid'||error.message==='resource_too_large'?error.message:'resource_upload_uncertain');}
 }
 async function saveResource(intent,definition,reason){
  if(uncertainCreate)throw Error('resource_create_uncertain');
  const e=epoch,q=request;
  const changed=current&&!sameDefinition(definition,current.definition),needsVersion=changed||Boolean(pendingFile&&current?.fileBytes&&!uploadUncertain);
  const file=definition.format==='pdf'?pendingFile:null;
  if(definition.format==='pdf'&&(!current||needsVersion||!current.fileBytes)&&!file)throw Error('resource_file_required');
  if(current&&needsVersion&&!reason)throw Error('resource_reason_required');
  if(!current||needsVersion){
   const payload={definition};if(current)Object.assign(payload,key(),{reason});
   composeMessage('Պահպանվում է նյութը…');
   try{remember((await invoke(current?'revise':'create',payload)).material);drawEditor(current,[],[],true);}
   catch(error){if(error.message!=='resource_stale'&&!['resource_definition_invalid','resource_request_invalid','resource_url_invalid','resource_reason_required','resource_conflict','resource_forbidden'].includes(error.message)){uncertainCreate=true;$('[data-resource-recover]').hidden=false;throw Error('resource_create_uncertain');}throw error;}
  }
  if(!valid(e,q))return;
  if(definition.format==='pdf'&&(!current.fileBytes||uploadUncertain)){
   composeMessage('Կցվում է PDF ֆայլը…');await attachPendingFile(file);if(!valid(e,q))return;drawEditor(current,[],[],true);
  }
  pendingFile=null;drawFileStatus();dirty=false;
  if(intent==='draft'){drawEditor(current);composeMessage('Սևագիրը և ֆայլը պահպանված են։ Երբ պատրաստ լինեք, հրապարակեք գրադարանում կամ ընտրեք ստացողներին։');return;}
  if(current.status!=='published'){
   // Repeat the read on retries: publication may have succeeded before a lost response.
   remember((await invoke('get',{id:current.id})).material);
   if(current.status!=='published'){
    composeMessage('Ստուգվում է նյութը…');remember((await invoke('qa',key())).material);
    if(!current.qa?.passed){drawEditor(current);throw Error(current.qa?.issues?.includes('file_required')?'resource_file_required':'resource_qa_required');}
    composeMessage('Հրապարակվում է նյութը…');remember((await invoke('publish',key())).material);
   }
  }
  if(valid(e,q)){
   if(intent==='library'){drawEditor(current);composeMessage('Նյութը հրապարակված է գրադարանում։ Առաջադրանք չի ուղարկվել։');}
   else{const id=current.id;openAssignments(id);message('Նյութը հրապարակված է։ Ընտրեք ստացողներին և հաստատեք ուղարկումը։');}
  }
 }
 function definitionFromForm(){const f=new FormData($('[data-resource-form]')),d=Object.fromEntries(['title','topic','description','goal','purpose','locale','format','sourceReference'].map(k=>[k,String(f.get(k)||'').trim()]));
  if(role==='teacher'&&!d.description)d.description=d.title;
  if(d.format==='link')d.url=String(f.get('url')||'').trim();if(f.get('estimatedMinutes'))d.estimatedMinutes=Number(f.get('estimatedMinutes'));d.rightsConfirmed=f.has('rightsConfirmed');d.assessmentSafe=f.has('assessmentSafe');if(role==='teacher')d.recommended=f.has('recommended');return d;
 }
 async function previewMaterial(id,trigger){
  clearDelivery();const e=epoch,q=request;let material;
  if(rows.find(m=>m.id===id)?.provider==='platform'){
   // Platform editorial get is deliberately forbidden to teachers. Revalidate through
   // their existing read-only, QA-filtered catalogue; never acquire editor rights.
   for(let offset=0;offset<100000;){
    const {data,error}=await client.functions.invoke('manage-resource-assignments',{body:{action:'catalog',context:resourceContext(selected),payload:{offset}}});
    if(!valid(e,q))return;if(error||data?.error)throw Error(data?.error==='assignment_forbidden'?'resource_forbidden':'resource_unavailable');
    material=data.materials.find(m=>m.id===id);if(material||!data.hasMore)break;
    if(!Number.isSafeInteger(data.nextOffset)||data.nextOffset<=offset)throw Error('resource_unavailable');offset=data.nextOffset;
   }
   if(!material||material.status!=='published')throw Error('resource_unavailable');
  }else{
   const data=await invoke('get',{id});if(!valid(e,q))return;material=data.material;
   if(material.status!=='published'||!material.qa?.passed||material.qa.fingerprint!==material.fingerprint)throw Error('resource_unavailable');
  }
  const dialog=document.createElement('dialog');dialog.className='resource-dialog learner-preview-dialog';dialog.setAttribute('aria-labelledby','resourceLearnerPreviewTitle');
  dialog.innerHTML='<h2 id="resourceLearnerPreviewTitle" tabindex="-1">Աշակերտի տեսքի նախադիտում</h2><p>Ցուցադրվում է հրապարակված տարբերակը։ Չպահպանված խմբագրումները չեն ներառվում։</p><p>'+esc(previewExplanation)+'</p><div class="learner-preview-card">'+studentMaterialCard(material,{preview:true})+'</div><button type="button" autofocus>Փակել նախադիտումը</button>';
  const close=()=>{dialog.remove();if(valid(e,q)&&trigger.isConnected)trigger.focus();};dialog.addEventListener('close',close,{once:true});dialog.querySelector('button[autofocus]').addEventListener('click',()=>dialog.close());root.append(dialog);dialog.showModal();dialog.querySelector('h2').focus();
 }
 async function delivery(id){clearDelivery();const data=await invoke('open',{id});
  if(data instanceof Blob){const url=URL.createObjectURL(data);urls.add(url);const a=document.createElement('a');a.href=url;a.download=`haiedu-material-${id}.pdf`;a.click();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},1000);message('PDF-ը պատրաստ է ներբեռնման։');}
  else if(data.url){const u=new URL(data.url);if(u.protocol!=='https:')throw Error('resource_unavailable');const dialog=document.createElement('dialog');dialog.className='resource-dialog';dialog.innerHTML=`<h2>Արտաքին նյութ</h2><p>Կբացվի նոր ներդիրում՝ <strong>${esc(u.hostname)}</strong></p><a class="button-link" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">Բացել արտաքին կայքը</a><button type="button" class="ghost">Փակել</button>`;dialog.querySelector('button').onclick=()=>{dialog.close();dialog.remove();};root.append(dialog);dialog.showModal();}
 }
 async function run(fn,kind='write'){
  if(busy||assignmentView?.isBusy())return;busy=true;busyKind=kind;root.setAttribute('aria-busy','true');const e=epoch,q=request,op=++operation;if(kind==='write')lockWrites();
  try{await fn();}catch(error){if(valid(e,q)&&error.message!=='resource_stale'){
   composeMessage(errorText(error),true);
   if(error.message==='resource_forbidden'){rows=[];clearEditor();clearDelivery();$('[data-resource-list]').innerHTML='<p>Դասընթացի հասանելիությունն ավարտվել է։ Թարմացրեք էջը։</p>';}
  }}finally{if(op===operation){busy=false;unlockWrites();root.removeAttribute('aria-busy');}}
 }
 root.addEventListener('input',e=>{
  if(e.target.matches('[data-filter]'))drawCards();
  if(e.target.closest('[data-resource-form]')&&!e.target.matches('[data-resource-file]')){dirty=true;$('[data-resource-dirty]').textContent='Կան չպահպանված փոփոխություններ։';}
 });
 root.addEventListener('change',e=>{
  if(e.target.matches('[data-resource-context]')){if(canLeave())selectContext(e.target.value);else e.target.value=selected?String(contexts.indexOf(selected)):'';}
  if(e.target.matches('[data-filter]'))drawCards();
  if(e.target.name==='format'){
   $('[data-url-field]').hidden=e.target.value!=='link';$('[data-pdf-field]').hidden=e.target.value!=='pdf';$('[name="url"]').required=e.target.value==='link';
   pendingFile=null;fileTicket++;$('[data-resource-file]').value='';drawFileStatus();
  }
  if(e.target.matches('[data-resource-file]')){
   const file=e.target.files?.[0],ticket=++fileTicket,epoch0=epoch,q=request;pendingFile=null;drawFileStatus();
   if(!file)return;$('[data-resource-file-status]').textContent='Ստուգվում է PDF ֆայլը…';
   void prepareResourceFile(file).then(ready=>{
    if(!valid(epoch0,q)||ticket!==fileTicket)return;pendingFile=ready;const title=$('[name="title"]');if(!title.value.trim())title.value=resourceFileTitle(file.name);drawFileStatus();
   }).catch(error=>{if(valid(epoch0,q)&&ticket===fileTicket){e.target.value='';drawFileStatus(errorText(error));}});
  }
 });
 root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if((b.dataset.resourceAssign||b.hasAttribute('data-resource-assignment-history'))&&role==='teacher'){
   if(busy||!canLeave())return;if(!selected){message('Նախ ընտրեք դասընթացն ու բաժինը։');return;}
   openAssignments(b.dataset.resourceAssign||null);return;
  }
  if(b.dataset.resourceStudentPreview&&role==='teacher'){void run(()=>previewMaterial(b.dataset.resourceStudentPreview,b),'read');return;}
  if(b.hasAttribute('data-purpose')){$('[data-filter="purpose"]').value=b.dataset.purpose;for(const x of root.querySelectorAll('[data-purpose]'))x.setAttribute('aria-pressed',String(x===b));drawCards();}
  if(b.hasAttribute('data-filter-reset')){resetFilters();drawCards();$('[data-filter="query"]').focus();}
  if(b.hasAttribute('data-resource-refresh')&&canLeave())void loadList();
  if(b.hasAttribute('data-resource-recover')&&!busy){dirty=false;pendingFile=null;void loadList();}
  if(b.hasAttribute('data-resource-file-preview')&&pendingFile){const url=URL.createObjectURL(pendingFile);urls.add(url);const a=document.createElement('a');a.href=url;a.download=pendingFile.name;a.click();setTimeout(()=>{URL.revokeObjectURL(url);urls.delete(url);},1000);}
  if(b.hasAttribute('data-resource-new')||b.hasAttribute('data-resource-close')||b.dataset.resourceEdit){if(busy&&busyKind==='write'){message('Գործողությունը կատարվում է…');return;}if(busy){request++;operation++;busy=false;root.removeAttribute('aria-busy');}}
  if(b.hasAttribute('data-resource-new')){if(!selected){message('Նախ ընտրեք դասընթացն ու բաժինը։');return;}if(canLeave())drawEditor();}
  if(b.hasAttribute('data-resource-close')&&canLeave())clearEditor();
  if(b.dataset.resourceEdit&&canLeave())void run(async()=>{const r=await invoke('get',{id:b.dataset.resourceEdit});drawEditor(r.material,r.history,r.events);},'read');
  if(b.dataset.resourceOpen)void run(()=>delivery(b.dataset.resourceOpen),'read');
  if(b.dataset.resourceAction)void run(async()=>{const action=b.dataset.resourceAction;
   if(dirty&&action!=='withdraw'){message('Նախ պահպանեք փոփոխությունները կամ նորից բացեք պահպանված տարբերակը։');return;}
   if(action==='preview')return delivery(current.id);
   const e0=epoch,q0=request;
   if(['publish','withdraw'].includes(action)&&role!=='teacher'&&!await ensureMaterialMfa(client,()=>valid(e0,q0)))return;
   if(!valid(e0,q0))return;
   const payload=key();let file;
   if(action==='upload'){file=pendingFile;if(!file)throw Error('resource_file_required');await attachPendingFile(file);pendingFile=null;drawEditor(current);composeMessage('Ֆայլը կցված է։ Կարող եք հրապարակել և ընտրել ստացողներին։');return;}
   if(action==='withdraw'){payload.reason=$('[name="reason"]').value.trim();if(!payload.reason)throw Error('resource_reason_required');}
   const r=await invoke(action,payload,resourceContext(selected),file);dirty=false;const m=r.material;
   rows=rows.map(x=>x.resourceId===m.resourceId?m:x);drawCards();drawEditor(m);message(action==='publish'?'Նյութը հրապարակված է։':action==='withdraw'?'Նյութն այլևս հասանելի չէ սովորողներին։':action==='qa'?(m.qa?.passed?'QA ստուգումն անցած է։':'Կցեք PDF-ը և կրկին ստուգեք։'):'Ֆայլը կցված է։');
  });
 });
 root.addEventListener('submit',e=>{
  if(!e.target.matches('[data-resource-form]'))return;e.preventDefault();
  const intent=role==='teacher'&&['assign','library'].includes(e.submitter?.value)?e.submitter.value:'draft',definition=definitionFromForm(),reason=$('[name="reason"]')?.value.trim()||'';
  void run(()=>saveResource(intent,definition,reason));
 });
 const beforeLeave=e=>{if(dirty||pendingFile||(busy&&busyKind==='write')||assignmentView?.isBusy()||assignmentView?.hasUnsaved()){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',beforeLeave);
 async function session(s,force=false){const next=s?.user?.id??null;if(!force&&next===actor)return;actor=next;epoch++;request++;operation++;clearDelivery();clearAssignments();pendingFile=null;fileTicket++;uncertainCreate=false;uploadUncertain=false;unlockWrites();root.removeAttribute('aria-busy');dirty=false;busy=false;current=null;selected=null;rows=[];contexts=[];document.querySelectorAll('.material-mfa').forEach(d=>d.dispatchEvent(new Event('material-session-ended')));
  if(!actor){root.classList.remove('resource-composing');root.innerHTML='<section class="card resource-empty"><h2>Մուտք գործեք</h2><p>Նյութերը հասանելի են ձեր դասընթացների շրջանակում։</p><a class="button-link" href="./account-access.html">Մուտք գործել</a></section>';return;}
  root.classList.remove('resource-composing');root.innerHTML='<p role="status">Ստուգվում է նյութերի հասանելիությունը…</p>';const e=epoch,q=request;
  try{const data=await invoke('contexts',{},{});if(!valid(e,q))return;role=data.role;contexts=data.contexts??[];
   if(staff?(role==='student'):role!=='student'){root.innerHTML=`<section class="card"><p>Այս էջը նախատեսված է ${staff?'նյութերը տրամադրողների':'սովորողների'} համար։</p><a href="./${staff?'materials':'resource-library'}.html">Բացել ձեր նյութերի բաժինը</a></section>`;return;}
   onRole(role);drawShell();
   if(!contexts.length){$('[data-resource-list]').innerHTML='<section class="resource-empty"><h2>Հասանելի դասընթաց չկա</h2><p>Ակտիվ դասարանին միանալուց հետո այստեղ կհայտնվեն ձեր նյութերը։</p></section>';return;}
   const p=new URLSearchParams(location.search),wanted={enrollmentId:p.get('enrollment'),assignmentId:p.get('assignment'),curriculumReleaseId:p.get('release'),unitId:p.get('unit')};
   const hasSelector=Object.values(wanted).some(Boolean),i=contexts.findIndex(c=>Object.entries(wanted).every(([k,v])=>!v||c[k]===v));
   if(hasSelector&&i<0){message('Ընտրված բաժինն այլևս հասանելի չէ։ Ընտրեք այլ բաժին։',true);return;}
   if(hasSelector||contexts.length===1)selectContext(hasSelector?i:0);
  }catch(error){if(valid(e,q))root.innerHTML=`<section class="card resource-empty"><h2>Հասանելիությունը ստուգել չհաջողվեց</h2><p>${esc(errorText(error))}</p><button type="button" data-resource-retry>Փորձել նորից</button></section>`;}
 }
 root.addEventListener('click',e=>{if(e.target.closest('[data-resource-retry]'))void session({user:{id:actor}},true);});
 let events=0;const sub=client.auth.onAuthStateChange((event,s)=>{events++;if(event==='SIGNED_OUT'||s?.user?.id!==actor)void session(event==='SIGNED_OUT'?null:s,true);});const version=events;
 client.auth.getSession().then(r=>{if(version===events)void session(r.data.session,true);}).catch(()=>{if(version===events&&!disposed)root.textContent='Մուտքը ստուգել չհաջողվեց։ Թարմացրեք էջը։';});
 return()=>{disposed=true;epoch++;request++;clearDelivery();clearAssignments();sub.data.subscription.unsubscribe();window.removeEventListener('beforeunload',beforeLeave);pendingFile=null;fileTicket++;lockedControls.clear();root.removeAttribute('aria-busy');root.innerHTML='';};
}
