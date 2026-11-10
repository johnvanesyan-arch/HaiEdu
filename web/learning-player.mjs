import {assessmentRules,assessmentResultMarkup} from './assessment-reporting.mjs';
import { escapeHtml as esc } from './learning-navigation.mjs';
import { renderLearningStimulus } from './learning-stimulus.mjs';
import {decodeLearningAudio} from './learning-audio.mjs';
import {typedFieldsMarkup,collectTypedResponse} from './typed-fields-ui.mjs';
import {arrangementMarkup,collectArrangementResponse,bindArrangement} from './arrangement-ui.mjs';
import {invokeLearnerFunction,createAnswerRequest,showAnswerRecovery,clearAnswerRecovery} from './answer-response-recovery.mjs';
import {focusHint,hintConflictMessage,hintRefreshLabel,invokeForHint} from './remediation-request.mjs';
import {captureFocusHandoff} from './keyboard-focus.mjs';
const draftable=type=>['typed_fields','matching','ordering'].includes(type);
const collectResponse=(root,item)=>item.type==='typed_fields'?collectTypedResponse(root,item.responseDefinition):collectArrangementResponse(root,item.type,item.responseDefinition);
// Server-owned counts, option presentation, scoring, help and original bound policy.
export function mountLearningPlayer({root,supabase,context,skills=[],mode,targetSkillId,isCurrent,onComplete}) {
  let live=true, busy=false, session, current, started, serial=0, policy, saveTimer,disposeStimulus;
  const valid = () => live && isCurrent();
  const guardUnsaved = event => {
    if(!valid()||!current||current.answerAccepted)return;
    if(current.answerRequest?.uncertain||busy){event.preventDefault();event.returnValue='';return;}
    if(!draftable(current.item.type))return;
    let dirty=true;try{dirty=JSON.stringify(collectResponse(root,current.item))!==current.savedSignature;}catch{}
    if(dirty){event.preventDefault();event.returnValue='';}
  };
  window.addEventListener('beforeunload',guardUnsaved);
  const invoke = async(name,body) => {
    // Bound stalled transport without racing the server's playback lease or
    // rejecting a healthy, slow initial state/begin response.
    const {data,error,response}=await invokeLearnerFunction(supabase,name,{body,...(name==='get-learning-audio'?{timeout:body.action==='load'?60000:15000}:{})});
    if(!valid())throw new Error('stale_context');
    if(error || data?.error){const detail=data?.error??error?.error??(error?.context instanceof Response?await error.context.clone().json().then(x=>x.error).catch(()=>null):null);throw new Error(['typed_fields_draft_conflict','response_draft_conflict'].includes(detail)?'Պատասխանը փոփոխվել է մեկ այլ պատուհանում։ Պահպանեք ձեր պատասխանի պատճենը և վերաբեռնեք էջը՝ վերջին տարբերակը տեսնելու համար։':'Այս գործողությունն այս պահին հասանելի չէ։ Ձեր պատասխանը պահպանեք և կրկին փորձեք։');}
    return name==='get-learning-audio'?decodeLearningAudio(data,response,body.action):data;
  };
  const fail = error => { if(valid()) { const p=document.createElement('p');p.textContent=error.message;root.appendChild(p); } };
  async function serve(refreshed, focusHandoff) {
    clearTimeout(saveTimer);
    disposeStimulus?.();disposeStimulus=null;
    const request=++serial;
    const data=refreshed??await invoke('get-session-item',{sessionId:session.id});
    if(!valid() || request!==serial)return;
    if(data.complete){ current=null;root.innerHTML=`<h2>Աշխատանքն ավարտված է</h2>${assessmentResultMarkup(data.assessmentResult,{hideUnassessed:true}) || `<p>${data.summary.correct}/${data.summary.answered} · ${data.summary.percent}%</p>`}<button type="button">Թարմացնել արդյունքները</button>`;root.querySelector('button').onclick=onComplete;focusHandoff?.move(root.querySelector('h2'));return; }
    current=data;started=performance.now();
    data.hintLevel=Number(data.remediation?.hintLevelUsed??0);
    const type=data.item.type;
    if(!['single_choice','true_false','typed_fields','matching','ordering'].includes(type))throw new Error('Այս հարցի պատասխանման ձևը դեռ չի աջակցվում։');
    const options=type==='true_false'?[{option_key:'true',content_hy:'Ճիշտ'},{option_key:'false',content_hy:'Սխալ'}]:data.item.options;
    const controls=type==='typed_fields'?typedFieldsMarkup(data.item.responseDefinition,data.responseDraft):['matching','ordering'].includes(type)?arrangementMarkup(type,data.item.responseDefinition,data.responseDraft):options.map(o=>`<label class="option"><input type="radio" name="answer" value="${esc(o.option_key)}" required> ${esc(o.content_hy)}</label>`).join('');
    root.innerHTML=`<section class="card student-task-card"><details class="student-rule-details"${Number(data.session.position)>1?'':' open'}><summary>Աշխատանքի կանոնները</summary><p>Սեսիայի սկզբնական կանոններ՝ ${policy.plannedQuestionCount} հարց${policy.minimumPercent == null ? "" : ` · անցողիկ շեմ՝ ${policy.minimumPercent}%`}${policy.hintsAllowed ? " · օգնությունը հասանելի է" : " · առանց օգնության"}</p>${assessmentRules(policy,skills)}</details>${data.skill?.nameHy?`<p class="learning-skill">${esc(data.skill.nameHy)}</p>`:''}<h2 tabindex="-1">Հարց ${data.session.position}/${data.session.total}</h2>${Number(data.session.total)>0&&Number(data.session.position)>0?`<span class="learning-progress" aria-hidden="true"><span style="width:${Math.min(100,Math.round(Number(data.session.position)/Number(data.session.total)*100))}%"></span></span>`:''}<p>${esc(data.item.promptHy)}</p>${data.item.taskSet?`<p data-task-set>${esc(data.item.taskSet.title)} · Հարց ${esc(data.item.taskSet.position)}/${esc(data.item.taskSet.total)}՝ այս նյութի վերաբերյալ</p>`:''}<div id="governedStimulus"></div><form><fieldset><legend class="sr-only">Ձեր պատասխանը</legend>${controls}</fieldset><p data-draft-status role="status"></p><button type="submit">Ուղարկել պատասխանը</button></form><div data-feedback role="status"></div>${data.remediation.available?`<section id="governedHelp" data-help-content tabindex="-1" aria-labelledby="governedHelpTitle" hidden></section><button type="button" data-help aria-controls="governedHelp"${data.hintLevel>=3?' disabled':''}>Օգնություն</button>`:''}<div data-next></div></section>`;
    data.audioReady=data.item.stimulus?.kind!=='audio';
    disposeStimulus=renderLearningStimulus(root.querySelector('#governedStimulus'),data.item.stimulus,{
      invoke,context:{sessionId:session.id,sessionItemId:data.sessionItemId},isCurrent:()=>valid()&&current===data,
      onReady:ready=>{data.audioReady=ready;root.querySelector('button[type="submit"]').disabled=!ready||Boolean(data.answerAccepted);},
      onEndUnscored:()=>{disposeStimulus?.();disposeStimulus=null;current=null;root.innerHTML='<p>Աշխատանքն ավարտված է առանց գնահատման՝ ձայնագրության տեխնիկական խնդրի պատճառով։ Գնահատվող փորձ չի օգտագործվել։ Նոր փորձը հնարավոր է միայն չօգտագործված առաջադրանքաշարի առկայության դեպքում։</p><button type="button">Վերադառնալ</button>';root.querySelector('button').onclick=onComplete;},
    });
    if(['matching','ordering'].includes(type))bindArrangement(root.querySelector('[data-arrangement]'),type,data.item.responseDefinition);
    if(draftable(type))data.savedSignature=JSON.stringify(collectResponse(root,data.item));
    root.querySelector('form').addEventListener('submit',event=>{event.preventDefault();void answer();});
    if(draftable(type))root.querySelector('form').addEventListener('input',()=>{clearTimeout(saveTimer);root.querySelector('[data-draft-status]').textContent='Կան չպահպանված փոփոխություններ։';saveTimer=setTimeout(()=>{saveDraft(data).catch(fail);},600);});
    root.querySelector('[data-help]')?.addEventListener('click',()=>void help());
    focusHandoff?.move(root.querySelector('h2'));
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
    const form=root.querySelector('form'),focusHandoff=captureFocusHandoff(form);
    busy=true;const item=current;form.dataset.answerSubmitting='true';root.querySelector('button[type="submit"]').disabled=true;root.querySelector('fieldset').disabled=true;
    try {
      if(typed&&!item.answerRequest)await saveDraft(item);
      if(!valid()||current!==item)return;
      const request=item.answerRequest??=createAnswerRequest(supabase,current.session.mode==='mastery_check'?'submit-mastery-answer':'submit-answer',{
        body:{sessionId:session.id,sessionItemId:item.sessionItemId,itemId:item.item.id,response:typed?collectResponse(root,item.item):{value},...(typed?{draftRevision:item.draftRevision??0}:{}),responseTimeMs:Math.round(performance.now()-started)},
      },{isCurrent:()=>valid()&&current===item});
      const {data,error,stale}=await request.send();
      if(!valid() || current!==item)return;
      if(stale)return;
      if(error){
        const locked=showAnswerRecovery(form,root.querySelector('[data-feedback]'),request,{error});
        if(!locked)item.answerRequest=null;
        if(root.querySelector('[data-help]'))root.querySelector('[data-help]').disabled=locked||(!item.refreshHint&&item.hintLevel>=3);
        focusHandoff.move(root.querySelector('button[type="submit"]'));
        return;
      }
      clearAnswerRecovery(form);item.answerRequest=null;
      item.answerAccepted=true;
      const helpButton=root.querySelector('[data-help]');
      if(helpButton){
        const afterMistake=data.grading?.correct===false&&data.session?.status==='active';
        helpButton.hidden=!afterMistake;
        helpButton.disabled=!afterMistake||(!item.refreshHint&&item.hintLevel>=3);
        root.querySelector('[data-help-content]').hidden=true;
        if(afterMistake&&!helpButton.disabled&&!item.refreshHint)helpButton.textContent='Բացատրել սխալը';
      }
      disposeStimulus?.();disposeStimulus=null;
      const feedback=root.querySelector('[data-feedback]');
      // Outcome colour only; the wording and grading data are unchanged.
      feedback.dataset.outcome=data.revealCorrect===false?'accepted':typed?(data.grading.correctComponents>=data.grading.requiredComponents?'correct':data.grading.correctComponents>0?'partial':'incorrect'):data.grading?.correct?'correct':'incorrect';
      feedback.textContent=data.revealCorrect===false?'Պատասխանն ընդունված է։ Արդյունքները կտեսնեք ավարտից հետո։':typed?`${item.item.type==='matching'?'Ճիշտ համապատասխանեցումներ':item.item.type==='ordering'?'Ճիշտ հերթականություն':'Ճիշտ լրացված դաշտեր'}՝ ${data.grading.correctComponents}/${data.grading.requiredComponents}։ Միավոր՝ ${Number(data.grading.score.toFixed(2))}/1։`:data.grading?.correct?'Ճիշտ պատասխան։':'Պատասխանը սխալ է։';
      const next=document.createElement('button');next.type='button';next.textContent='Հաջորդը';next.onclick=()=>{
        if(busy)return;
        const nextFocus=captureFocusHandoff(root);busy=true;
        serve(undefined,nextFocus).catch(error=>{fail(error);nextFocus.move(next);}).finally(()=>{nextFocus.cancel();busy=false;});
      };root.querySelector('[data-next]').appendChild(next);
      focusHandoff.move(next);
    }catch(error){fail(error);if(valid()&&current===item){root.querySelector('button[type="submit"]').disabled=!item.audioReady;root.querySelector('fieldset').disabled=false;}}
    finally{focusHandoff.cancel();delete form.dataset.answerSubmitting;busy=false;}
  }
  function displayHelp({titleHy,strategyHy,contentHy,noteHy}) {
    const panel=root.querySelector('[data-help-content]');
    panel.innerHTML=`<h3 id="governedHelpTitle">${esc(titleHy||'Օգնություն')}</h3>${[strategyHy,contentHy,noteHy].filter(Boolean).map(text=>`<p>${esc(text)}</p>`).join('')}`;
    panel.hidden=false;
    focusHint(panel);
  }
  async function help() {
    const item=current,button=root.querySelector('[data-help]');
    if(busy||!valid()||item?.answerRequest?.uncertain||!button||button.hidden||button.disabled)return;
    busy=true;button.disabled=true;
    const isCurrent=()=>valid()&&current===item;
    const refreshing=item.refreshHint;
    try{
      const {data,error,stale}=await invokeForHint(supabase,refreshing?'get-session-item':'get-remediation-help',{
        sessionId:session.id,
        ...(refreshing?{}:{sessionItemId:item.sessionItemId,hintState:{level:item.hintLevel,afterAnswer:Boolean(item.answerAccepted)}}),
      },isCurrent);
      if(stale||!isCurrent())return;
      if(error)throw error;
      if(refreshing){
        item.refreshHint=false;
        if(data.complete||data.sessionItemId!==item.sessionItemId){
          await serve(data);
          root.querySelector('h2')?.focus();
          return;
        }
        item.hintLevel=Number(data.remediation?.hintLevelUsed??0);
        displayHelp({titleHy:'Հարցը թարմացվել է',contentHy:'Կարող եք շարունակել հարցը։'});
      }else{
        item.hintLevel=data.level;
        displayHelp(data);
      }
      button.textContent=item.hintLevel===1?'Հաջորդ հուշումը':item.hintLevel===2?'Տեսնել նման օրինակ':item.hintLevel>=3?'Օրինակը տեսել եք':'Օգնություն';
    }catch(error){
      if(!isCurrent())return;
      item.refreshHint ||= error?.code==='hint_state_conflict';
      displayHelp({
        titleHy:item.refreshHint?'Թարմացրեք հարցը':'Օգնությունը չբեռնվեց',
        contentHy:error?.code==='hint_state_conflict'?hintConflictMessage:'Չհաջողվեց բեռնել։ Կրկին փորձեք։',
      });
      button.textContent=item.refreshHint?hintRefreshLabel:'Կրկին փորձել';
    }finally{
      if(isCurrent())button.disabled=!item.refreshHint&&item.hintLevel>=3;
      busy=false;
    }
  }
  root.innerHTML='<p>Սեսիան բեռնվում է…</p>';
  invoke('start-learning-session',{enrollmentId:context.enrollmentId,curriculumReleaseId:context.curriculumReleaseId,unitId:context.unitId,mode,...(targetSkillId?{targetSkillId}:{})})
    .then(async data=>{session=data.session;const status=await invoke('get-mastery-check-status',{sessionId:session.id});policy=status.assessmentPolicy;if(!policy)throw new Error('Սեսիայի սկզբնական կանոնները հասանելի չեն։');return serve();}).catch(fail);
  return ()=>{live=false;++serial;clearTimeout(saveTimer);disposeStimulus?.();window.removeEventListener('beforeunload',guardUnsaved);root.replaceChildren();};
}
