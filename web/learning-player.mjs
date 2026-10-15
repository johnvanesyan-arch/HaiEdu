import {assessmentRules,assessmentResultMarkup} from './assessment-reporting.mjs';
import { escapeHtml as esc } from './learning-navigation.mjs';
import { renderLearningStimulus } from './learning-stimulus.mjs';
// Server-owned counts, option presentation, scoring, help and original bound policy.
export function mountLearningPlayer({root,supabase,context,skills=[],mode,targetSkillId,isCurrent,onComplete}) {
  let live=true, busy=false, session, current, started, serial=0, policy;
  const valid = () => live && isCurrent();
  const invoke = async(name,body) => {
    const {data,error}=await supabase.functions.invoke(name,{body});
    if(!valid())throw new Error('stale_context');
    if(error || data?.error)throw new Error('Այս գործողությունն այս պահին հասանելի չէ։ Վերաբեռնեք դասընթացը՝ ընթացիկ պահանջները տեսնելու համար։');
    return data;
  };
  const fail = error => { if(valid()) { const p=document.createElement('p');p.textContent=error.message;root.appendChild(p); } };
  async function serve() {
    const request=++serial;
    const data=await invoke('get-session-item',{sessionId:session.id});
    if(!valid() || request!==serial)return;
    if(data.complete){ root.innerHTML=`<h2>Աշխատանքն ավարտված է</h2>${assessmentResultMarkup(data.assessmentResult) || `<p>${data.summary.correct}/${data.summary.answered} · ${data.summary.percent}%</p>`}<button type="button">Թարմացնել արդյունքները</button>`;root.querySelector('button').onclick=onComplete;return; }
    current=data;started=performance.now();
    const type=data.item.type;
    if(!['single_choice','true_false'].includes(type))throw new Error('Այս հարցի պատասխանման ձևը դեռ չի աջակցվում։');
    const options=type==='true_false'?[{option_key:'true',content_hy:'Ճիշտ'},{option_key:'false',content_hy:'Սխալ'}]:data.item.options;
    root.innerHTML=`<section class="card"><p>Սեսիայի սկզբնական կանոններ՝ ${policy.plannedQuestionCount} հարց${policy.minimumPercent == null ? "" : ` · անցողիկ շեմ՝ ${policy.minimumPercent}%`}${policy.hintsAllowed ? " · օգնությունը հասանելի է" : " · առանց օգնության"}</p>${assessmentRules(policy,skills)}<h2>Հարց ${data.session.position}/${data.session.total}</h2><p>${esc(data.item.promptHy)}</p><div id="governedStimulus"></div><form><fieldset>${options.map(o=>`<label class="option"><input type="radio" name="answer" value="${esc(o.option_key)}" required> ${esc(o.content_hy)}</label>`).join('')}</fieldset><button type="submit">Ուղարկել պատասխանը</button></form>${data.remediation.available?'<button type="button" data-help>Օգնություն</button>':''}<div data-feedback role="status"></div><div data-help-content></div></section>`;
    renderLearningStimulus(root.querySelector('#governedStimulus'),data.item.stimulus, context.extensionKey);
    root.querySelector('form').addEventListener('submit',event=>{event.preventDefault();void answer();});
    root.querySelector('[data-help]')?.addEventListener('click',()=>void help());
  }
  async function answer() {
    if(busy || !valid() || current?.answerAccepted)return;
    const value=root.querySelector('input[name="answer"]:checked')?.value;
    if(!value)return;
    busy=true;const item=current;root.querySelector('button[type="submit"]').disabled=true;
    try {
      const data=await invoke(current.session.mode==='mastery_check'?'submit-mastery-answer':'submit-answer',{sessionId:session.id,sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value},responseTimeMs:Math.round(performance.now()-started)});
      if(!valid() || current!==item)return;
      item.answerAccepted=true;
      const feedback=root.querySelector('[data-feedback]');
      feedback.textContent=data.revealCorrect===false?'Պատասխանն ընդունված է։ Արդյունքները կտեսնեք ավարտից հետո։':data.grading?.correct?'Ճիշտ պատասխան։':'Պատասխանը սխալ է։';
      const next=document.createElement('button');next.type='button';next.textContent='Հաջորդը';next.onclick=()=>{ if(busy)return;busy=true;serve().catch(fail).finally(()=>{busy=false;}); };feedback.appendChild(next);
    }catch(error){fail(error);if(valid()&&current===item)root.querySelector('button[type="submit"]').disabled=false;}
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
  return ()=>{live=false;++serial;root.replaceChildren();};
}
