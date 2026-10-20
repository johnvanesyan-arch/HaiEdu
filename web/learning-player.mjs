import {assessmentRules,assessmentResultMarkup} from './assessment-reporting.mjs';
import { escapeHtml as esc } from './learning-navigation.mjs';
import { renderLearningStimulus } from './learning-stimulus.mjs';
import {typedFieldsMarkup,collectTypedResponse} from './typed-fields-ui.mjs';
// Server-owned counts, option presentation, scoring, help and original bound policy.
export function mountLearningPlayer({root,supabase,context,skills=[],mode,targetSkillId,isCurrent,onComplete}) {
  let live=true, busy=false, session, current, started, serial=0, policy, saveTimer;
  const valid = () => live && isCurrent();
  const guardUnsaved = event => {
    if(!valid()||current?.item.type!=='typed_fields'||current.answerAccepted)return;
    let dirty=true;try{dirty=JSON.stringify(collectTypedResponse(root,current.item.responseDefinition))!==current.savedSignature;}catch{}
    if(dirty){event.preventDefault();event.returnValue='';}
  };
  window.addEventListener('beforeunload',guardUnsaved);
  const invoke = async(name,body) => {
    const {data,error}=await supabase.functions.invoke(name,{body});
    if(!valid())throw new Error('stale_context');
    if(error || data?.error){const detail=data?.error??error?.error??(error?.context instanceof Response?await error.context.clone().json().then(x=>x.error).catch(()=>null):null);throw new Error(detail==='typed_fields_draft_conflict'?'Պատասխանը փոփոխվել է մեկ այլ պատուհանում։ Պատճենեք ձեր գրածը և վերաբեռնեք էջը՝ վերջին տարբերակը տեսնելու համար։':'Այս գործողությունն այս պահին հասանելի չէ։ Ձեր գրածը պահպանեք և կրկին փորձեք։');}
    return data;
  };
  const fail = error => { if(valid()) { const p=document.createElement('p');p.textContent=error.message;root.appendChild(p); } };
  async function serve() {
    clearTimeout(saveTimer);
    const request=++serial;
    const data=await invoke('get-session-item',{sessionId:session.id});
    if(!valid() || request!==serial)return;
    if(data.complete){ root.innerHTML=`<h2>Աշխատանքն ավարտված է</h2>${assessmentResultMarkup(data.assessmentResult) || `<p>${data.summary.correct}/${data.summary.answered} · ${data.summary.percent}%</p>`}<button type="button">Թարմացնել արդյունքները</button>`;root.querySelector('button').onclick=onComplete;return; }
    current=data;started=performance.now();
    const type=data.item.type;
    if(!['single_choice','true_false','typed_fields'].includes(type))throw new Error('Այս հարցի պատասխանման ձևը դեռ չի աջակցվում։');
    const options=type==='true_false'?[{option_key:'true',content_hy:'Ճիշտ'},{option_key:'false',content_hy:'Սխալ'}]:data.item.options;
    const controls=type==='typed_fields'?typedFieldsMarkup(data.item.responseDefinition,data.responseDraft):options.map(o=>`<label class="option"><input type="radio" name="answer" value="${esc(o.option_key)}" required> ${esc(o.content_hy)}</label>`).join('');
    root.innerHTML=`<section class="card"><p>Սեսիայի սկզբնական կանոններ՝ ${policy.plannedQuestionCount} հարց${policy.minimumPercent == null ? "" : ` · անցողիկ շեմ՝ ${policy.minimumPercent}%`}${policy.hintsAllowed ? " · օգնությունը հասանելի է" : " · առանց օգնության"}</p>${assessmentRules(policy,skills)}<h2>Հարց ${data.session.position}/${data.session.total}</h2><p>${esc(data.item.promptHy)}</p><div id="governedStimulus"></div><form><fieldset>${controls}</fieldset><p data-draft-status role="status"></p><button type="submit">Ուղարկել պատասխանը</button></form>${data.remediation.available?'<button type="button" data-help>Օգնություն</button>':''}<div data-feedback role="status"></div><div data-help-content></div></section>`;
    renderLearningStimulus(root.querySelector('#governedStimulus'),data.item.stimulus, context.extensionKey);
    if(type==='typed_fields')data.savedSignature=JSON.stringify(collectTypedResponse(root,data.item.responseDefinition));
    root.querySelector('form').addEventListener('submit',event=>{event.preventDefault();void answer();});
    if(type==='typed_fields')root.querySelector('form').addEventListener('input',()=>{clearTimeout(saveTimer);root.querySelector('[data-draft-status]').textContent='Կան չպահպանված փոփոխություններ։';saveTimer=setTimeout(()=>{saveDraft(data).catch(fail);},600);});
    root.querySelector('[data-help]')?.addEventListener('click',()=>void help());
  }
  function saveDraft(item) {
    clearTimeout(saveTimer);
    const response=collectTypedResponse(root,item.item.responseDefinition),signature=JSON.stringify(response);
    item.saveQueue=(item.saveQueue??Promise.resolve()).catch(()=>{}).then(async()=>{
      if(!valid()||current!==item||item.answerAccepted||signature===item.savedSignature)return;
      root.querySelector('[data-draft-status]').textContent='Պահպանվում է…';
      const data=await invoke(item.session.mode==='mastery_check'?'submit-mastery-answer':'submit-answer',{sessionId:session.id,sessionItemId:item.sessionItemId,itemId:item.item.id,response,saveDraft:true,draftRevision:item.draftRevision??0});
      if(!valid()||current!==item)return;
      item.draftRevision=data.draftRevision;item.savedSignature=signature;
      root.querySelector('[data-draft-status]').textContent=signature===JSON.stringify(collectTypedResponse(root,item.item.responseDefinition))?'Սևագիրը պահպանված է։':'Կան չպահպանված փոփոխություններ։';
    }).catch(error=>{if(valid()&&current===item)root.querySelector('[data-draft-status]').textContent='Սևագիրը չի պահպանվել։ Կրկին փորձեք։';throw error;});
    return item.saveQueue;
  }
  async function answer() {
    if(busy || !valid() || current?.answerAccepted)return;
    const value=root.querySelector('input[name="answer"]:checked')?.value;
    const typed=current.item.type==='typed_fields';
    if(!typed&&!value)return;
    busy=true;const item=current;root.querySelector('button[type="submit"]').disabled=true;root.querySelector('fieldset').disabled=true;
    try {
      if(typed)await saveDraft(item);
      if(!valid()||current!==item)return;
      const data=await invoke(current.session.mode==='mastery_check'?'submit-mastery-answer':'submit-answer',{sessionId:session.id,sessionItemId:item.sessionItemId,itemId:item.item.id,response:typed?collectTypedResponse(root,item.item.responseDefinition):{value},...(typed?{draftRevision:item.draftRevision??0}:{}),responseTimeMs:Math.round(performance.now()-started)});
      if(!valid() || current!==item)return;
      item.answerAccepted=true;
      const feedback=root.querySelector('[data-feedback]');
      feedback.textContent=data.revealCorrect===false?'Պատասխանն ընդունված է։ Արդյունքները կտեսնեք ավարտից հետո։':typed?`Ճիշտ լրացված դաշտեր՝ ${data.grading.correctComponents}/${data.grading.requiredComponents}։ Միավոր՝ ${Number(data.grading.score.toFixed(2))}/1։`:data.grading?.correct?'Ճիշտ պատասխան։':'Պատասխանը սխալ է։';
      const next=document.createElement('button');next.type='button';next.textContent='Հաջորդը';next.onclick=()=>{ if(busy)return;busy=true;serve().catch(fail).finally(()=>{busy=false;}); };feedback.appendChild(next);
    }catch(error){fail(error);if(valid()&&current===item){root.querySelector('button[type="submit"]').disabled=false;root.querySelector('fieldset').disabled=false;}}
    finally{busy=false;}
  }
  async function help() {
    if(busy||!valid())return;busy=true;const item=current;const button=root.querySelector('[data-help]');button.disabled=true;
    try{const data=await invoke('get-remediation-help',{sessionId:session.id,sessionItemId:item.sessionItemId});if(valid()&&current===item){root.querySelector('[data-help-content]').textContent=[data.titleHy,data.strategyHy,data.contentHy].filter(Boolean).join('\n');button.disabled=!data.moreHelpAvailable;}}
    catch(error){fail(error);if(valid()&&current===item)button.disabled=false;}finally{busy=false;}
  }
  root.innerHTML='<p>Սեսիան բեռնվում է…</p>';
  invoke('start-learning-session',{enrollmentId:context.enrollmentId,curriculumReleaseId:context.curriculumReleaseId,unitId:context.unitId,mode,...(targetSkillId?{targetSkillId}:{})})
    .then(async data=>{session=data.session;const status=await invoke('get-mastery-check-status',{sessionId:session.id});policy=status.assessmentPolicy;if(!policy)throw new Error('Սեսիայի սկզբնական կանոնները հասանելի չեն։');return serve();}).catch(fail);
  return ()=>{live=false;++serial;clearTimeout(saveTimer);window.removeEventListener('beforeunload',guardUnsaved);root.replaceChildren();};
}
