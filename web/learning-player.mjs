import {assessmentRules,assessmentResultMarkup} from './assessment-reporting.mjs';
import { escapeHtml as esc } from './learning-navigation.mjs';
import { renderLearningStimulus } from './learning-stimulus.mjs';
import {decodeLearningAudio} from './learning-audio.mjs';
import {typedFieldsMarkup,collectTypedResponse} from './typed-fields-ui.mjs';
import {arrangementMarkup,collectArrangementResponse,bindArrangement} from './arrangement-ui.mjs';
const draftable=type=>['typed_fields','matching','ordering'].includes(type);
const collectResponse=(root,item)=>item.type==='typed_fields'?collectTypedResponse(root,item.responseDefinition):collectArrangementResponse(root,item.type,item.responseDefinition);
// Server-owned counts, option presentation, scoring, help and original bound policy.
export function mountLearningPlayer({root,supabase,context,skills=[],mode,targetSkillId,isCurrent,onComplete}) {
  let live=true, busy=false, session, current, started, serial=0, policy, saveTimer,disposeStimulus;
  const valid = () => live && isCurrent();
  const guardUnsaved = event => {
    if(!valid()||!draftable(current?.item.type)||current.answerAccepted)return;
    let dirty=true;try{dirty=JSON.stringify(collectResponse(root,current.item))!==current.savedSignature;}catch{}
    if(dirty){event.preventDefault();event.returnValue='';}
  };
  window.addEventListener('beforeunload',guardUnsaved);
  const invoke = async(name,body) => {
    const {data,error,response}=await supabase.functions.invoke(name,{body});
    if(!valid())throw new Error('stale_context');
    if(error || data?.error){const detail=data?.error??error?.error??(error?.context instanceof Response?await error.context.clone().json().then(x=>x.error).catch(()=>null):null);throw new Error(['typed_fields_draft_conflict','response_draft_conflict'].includes(detail)?'Պատասխանը փոփոխվել է մեկ այլ պատուհանում։ Պահպանեք ձեր պատասխանի պատճենը և վերաբեռնեք էջը՝ վերջին տարբերակը տեսնելու համար։':'Այս գործողությունն այս պահին հասանելի չէ։ Ձեր պատասխանը պահպանեք և կրկին փորձեք։');}
    return name==='get-learning-audio'?decodeLearningAudio(data,response,body.action):data;
  };
  const fail = error => { if(valid()) { const p=document.createElement('p');p.textContent=error.message;root.appendChild(p); } };
  async function serve() {
    clearTimeout(saveTimer);
    disposeStimulus?.();disposeStimulus=null;
    const request=++serial;
    const data=await invoke('get-session-item',{sessionId:session.id});
    if(!valid() || request!==serial)return;
    if(data.complete){ root.innerHTML=`<h2>Աշխատանքն ավարտված է</h2>${assessmentResultMarkup(data.assessmentResult) || `<p>${data.summary.correct}/${data.summary.answered} · ${data.summary.percent}%</p>`}<button type="button">Թարմացնել արդյունքները</button>`;root.querySelector('button').onclick=onComplete;return; }
    current=data;started=performance.now();
    const type=data.item.type;
    if(!['single_choice','true_false','typed_fields','matching','ordering'].includes(type))throw new Error('Այս հարցի պատասխանման ձևը դեռ չի աջակցվում։');
    const options=type==='true_false'?[{option_key:'true',content_hy:'Ճիշտ'},{option_key:'false',content_hy:'Սխալ'}]:data.item.options;
    const controls=type==='typed_fields'?typedFieldsMarkup(data.item.responseDefinition,data.responseDraft):['matching','ordering'].includes(type)?arrangementMarkup(type,data.item.responseDefinition,data.responseDraft):options.map(o=>`<label class="option"><input type="radio" name="answer" value="${esc(o.option_key)}" required> ${esc(o.content_hy)}</label>`).join('');
    root.innerHTML=`<section class="card"><p>Սեսիայի սկզբնական կանոններ՝ ${policy.plannedQuestionCount} հարց${policy.minimumPercent == null ? "" : ` · անցողիկ շեմ՝ ${policy.minimumPercent}%`}${policy.hintsAllowed ? " · օգնությունը հասանելի է" : " · առանց օգնության"}</p>${assessmentRules(policy,skills)}<h2>Հարց ${data.session.position}/${data.session.total}</h2><p>${esc(data.item.promptHy)}</p><div id="governedStimulus"></div><form><fieldset>${controls}</fieldset><p data-draft-status role="status"></p><button type="submit">Ուղարկել պատասխանը</button></form>${data.remediation.available?'<button type="button" data-help>Օգնություն</button>':''}<div data-feedback role="status"></div><div data-help-content></div></section>`;
    data.audioReady=data.item.stimulus?.kind!=='audio';
    disposeStimulus=renderLearningStimulus(root.querySelector('#governedStimulus'),data.item.stimulus,{
      invoke,context:{sessionId:session.id,sessionItemId:data.sessionItemId},isCurrent:()=>valid()&&current===data,
      onReady:ready=>{data.audioReady=ready;root.querySelector('button[type="submit"]').disabled=!ready||Boolean(data.answerAccepted);},
    });
    if(['matching','ordering'].includes(type))bindArrangement(root.querySelector('[data-arrangement]'),type,data.item.responseDefinition);
    if(draftable(type))data.savedSignature=JSON.stringify(collectResponse(root,data.item));
    root.querySelector('form').addEventListener('submit',event=>{event.preventDefault();void answer();});
    if(draftable(type))root.querySelector('form').addEventListener('input',()=>{clearTimeout(saveTimer);root.querySelector('[data-draft-status]').textContent='Կան չպահպանված փոփոխություններ։';saveTimer=setTimeout(()=>{saveDraft(data).catch(fail);},600);});
    root.querySelector('[data-help]')?.addEventListener('click',()=>void help());
  }
  function saveDraft(item) {
    clearTimeout(saveTimer);
    const response=collectResponse(root,item.item),signature=JSON.stringify(response);
    item.saveQueue=(item.saveQueue??Promise.resolve()).catch(()=>{}).then(async()=>{
      if(!valid()||current!==item||item.answerAccepted||signature===item.savedSignature)return;
      root.querySelector('[data-draft-status]').textContent='Պահպանվում է…';
      const data=await invoke(item.session.mode==='mastery_check'?'submit-mastery-answer':'submit-answer',{sessionId:session.id,sessionItemId:item.sessionItemId,itemId:item.item.id,response,saveDraft:true,draftRevision:item.draftRevision??0});
      if(!valid()||current!==item)return;
      item.draftRevision=data.draftRevision;item.savedSignature=signature;
      root.querySelector('[data-draft-status]').textContent=signature===JSON.stringify(collectResponse(root,item.item))?'Սևագիրը պահպանված է։':'Կան չպահպանված փոփոխություններ։';
    }).catch(error=>{if(valid()&&current===item)root.querySelector('[data-draft-status]').textContent='Սևագիրը չի պահպանվել։ Կրկին փորձեք։';throw error;});
    return item.saveQueue;
  }
  async function answer() {
    if(busy || !valid() || current?.answerAccepted || !current?.audioReady)return;
    const value=root.querySelector('input[name="answer"]:checked')?.value;
    const typed=draftable(current.item.type);
    if(!typed&&!value)return;
    busy=true;const item=current;root.querySelector('button[type="submit"]').disabled=true;root.querySelector('fieldset').disabled=true;
    try {
      if(typed)await saveDraft(item);
      if(!valid()||current!==item)return;
      const data=await invoke(current.session.mode==='mastery_check'?'submit-mastery-answer':'submit-answer',{sessionId:session.id,sessionItemId:item.sessionItemId,itemId:item.item.id,response:typed?collectResponse(root,item.item):{value},...(typed?{draftRevision:item.draftRevision??0}:{}),responseTimeMs:Math.round(performance.now()-started)});
      if(!valid() || current!==item)return;
      item.answerAccepted=true;
      disposeStimulus?.();disposeStimulus=null;
      const feedback=root.querySelector('[data-feedback]');
      feedback.textContent=data.revealCorrect===false?'Պատասխանն ընդունված է։ Արդյունքները կտեսնեք ավարտից հետո։':typed?`${item.item.type==='matching'?'Ճիշտ համապատասխանեցումներ':item.item.type==='ordering'?'Ճիշտ հերթականություն':'Ճիշտ լրացված դաշտեր'}՝ ${data.grading.correctComponents}/${data.grading.requiredComponents}։ Միավոր՝ ${Number(data.grading.score.toFixed(2))}/1։`:data.grading?.correct?'Ճիշտ պատասխան։':'Պատասխանը սխալ է։';
      const next=document.createElement('button');next.type='button';next.textContent='Հաջորդը';next.onclick=()=>{ if(busy)return;busy=true;serve().catch(fail).finally(()=>{busy=false;}); };feedback.appendChild(next);
    }catch(error){fail(error);if(valid()&&current===item){root.querySelector('button[type="submit"]').disabled=!item.audioReady;root.querySelector('fieldset').disabled=false;}}
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
  return ()=>{live=false;++serial;clearTimeout(saveTimer);disposeStimulus?.();window.removeEventListener('beforeunload',guardUnsaved);root.replaceChildren();};
}
