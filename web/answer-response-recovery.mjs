// A timeout is an unknown write outcome, never permission to change the answer.
export const learnerRequestTimeoutMs = 15000;
const uncertainMessage = 'Պատասխանի գրանցումը դեռ հաստատված չէ։ Կրկին փորձեք՝ նույն պատասխանի արդյունքը ստանալու համար։';
const conflictCodes = new Set(['answer_response_conflict','answer_result_unavailable','session_item_already_answered']);

const numericFormatHint = 'Տասնորդական մասից առաջ դրեք կետ կամ ստորակետ։ Հազարավորների խմբերը բաժանեք բացատով։';
const isNumericFormatRejection = error => error?.status === 422 && error?.code === 'invalid_numeric_format';

export function numericAnswerInput(label) {
  return `<label>${label}<input id="numericAnswer" inputmode="decimal" autocomplete="off" placeholder="Մուտքագրեք թիվը" aria-describedby="numericAnswerFormat"><small id="numericAnswerFormat">${numericFormatHint}</small></label>`;
}

export function studentErrorMessage(code, status, unknown=false) {
  if(unknown) return uncertainMessage;
  if(isNumericFormatRejection({code,status})) return 'Ստուգեք թվի գրությունը։ Հարցը դեռ չի գնահատվել։';
  if(conflictCodes.has(code)) return 'Այս հարցի պատասխանը կարող է արդեն գրանցված լինել։ Թարմացրեք էջը՝ ընթացիկ վիճակը տեսնելու համար։';
  if(status===401||status===403) return 'Այս գործողությունն այլևս հասանելի չէ։ Ստուգեք մուտքն ու դասընթացի հասանելիությունը։';
  if(status===429) return 'Հարցումները չափազանց հաճախ են։ Մի փոքր սպասեք և կրկին փորձեք։';
  return 'Գործողությունը չհաջողվեց։ Ձեր պատասխանը պահպանեք և կրկին փորձեք։';
}

async function failure(result,write=false) {
  const original=result.error;
  let code=result.data?.error??original?.error??original?.code;
  const context=original?.context;
  const status=Number(context?.status??original?.status??0);
  if(!code&&typeof context?.clone==='function') code=await context.clone().json().then(x=>x.error).catch(()=>null);
  const unknown=!status||status>=500||status===408;
  const error=Object.assign(new Error(unknown&&!write?'Հարցման պատասխանը դեռ հասանելի չէ։ Կրկին փորձեք։':studentErrorMessage(code,status,unknown)),{
    code,status,context,unknown,retryable:!conflictCodes.has(code)&&status!==401&&status!==403,
  });
  return {...result,error};
}

export async function invokeLearnerFunction(supabase,name,options={}) {
  const controller=new AbortController(),timeout=options.timeout??learnerRequestTimeoutMs;
  const {beforeRequest,afterRequest,...sdkOptions}=options;
  const write=['submit-answer','submit-mastery-answer'].includes(name)&&!options.body?.saveDraft;
  let timer;
  const abort=()=>controller.abort();
  options.signal?.addEventListener('abort',abort,{once:true});
  if(options.signal?.aborted)abort();
  const deadline=new Promise(resolve=>{timer=setTimeout(()=>{
    controller.abort();
    resolve({data:null,error:Object.assign(new Error(write?uncertainMessage:'Հարցման պատասխանը դեռ հասանելի չէ։ Կրկին փորձեք։'),{
      code:'learner_request_timeout',unknown:true,retryable:true,status:0,
    })});
  },timeout);});
  try {
    const call=(async()=>{
      if(beforeRequest&&!(await beforeRequest()))return {stale:true};
      if(controller.signal.aborted)return {stale:true};
      let result;
      try {result=await supabase.functions.invoke(name,{...sdkOptions,signal:controller.signal});}
      catch(error){result={data:null,error};}
      if(afterRequest&&!(await afterRequest()))return {stale:true};
      return result.error||result.data?.error?failure(result,write):result;
    })();
    return await Promise.race([call,deadline]);
  } finally {
    clearTimeout(timer);options.signal?.removeEventListener('abort',abort);
  }
}

export function createAnswerRequest(supabase,name,{body},{isCurrent=()=>true,timeout=learnerRequestTimeoutMs}={}) {
  // This copy includes response time and draft revision, and survives every retry.
  const snapshot=JSON.stringify(body);
  let flight=null,uncertain=false;
  const identity=()=>supabase.auth?.getSession?.().then(x=>x.data?.session?.user?.id??null).catch(()=>null)??Promise.resolve(null);
  const actor=identity();
  const request={
    get uncertain(){return uncertain;},
    send(){
      if(flight)return flight;
      flight=(async()=>{
        let initial;
        const result=await invokeLearnerFunction(supabase,name,{body:JSON.parse(snapshot),timeout,
          beforeRequest:async()=>{initial=await actor;return isCurrent()&&initial===await identity();},
          afterRequest:async()=>isCurrent()&&initial===await identity(),
        });
        if(isNumericFormatRejection(result.error)) uncertain=false;
        else uncertain ||= result.error?.unknown===true;
        return result;
      })().finally(()=>{flight=null;});
      return flight;
    },
  };
  return request;
}

const recoveryFeedback=new WeakMap();
export function showAnswerRecovery(form,feedback,request,result) {
  const error=result.error,locked=request.uncertain||conflictCodes.has(error?.code);
  form.toggleAttribute('data-answer-uncertain',locked);
  if(locked)form.dataset.answerUncertain='true';
  if(error?.retryable===false)form.dataset.answerBlocked='true';else delete form.dataset.answerBlocked;
  form.querySelectorAll('input,select,textarea,fieldset').forEach(control=>{control.disabled=locked;});
  const submit=form.querySelector('[type="submit"]');
  if(submit){
    submit.dataset.answerLabel??=submit.textContent;
    submit.disabled=error?.retryable===false;
    submit.textContent=locked?'Կրկին փորձել':submit.dataset.answerLabel;
  }
  feedback.replaceChildren();feedback.className='feedback bad';
  // Presentation: an unknown outcome is not a failure (the answer may be recorded),
  // so it is styled as attention; a lost reply with no HTTP status is named as such.
  // clearAnswerRecovery removes the state when the result arrives.
  if(feedback.dataset){feedback.dataset.recovery=locked?'uncertain':'failed';recoveryFeedback.set(form,feedback);}
  if(locked&&error?.unknown&&!Number(error?.status)){
    const title=document.createElement('p');title.className='answer-recovery-title';title.textContent='Կապը ընդհատվեց';feedback.appendChild(title);
  }
  const message=document.createElement('p');
  message.textContent=locked&&error?.retryable!==false?uncertainMessage:error?.message??studentErrorMessage(null,0,true);
  feedback.appendChild(message);
  if(!locked&&isNumericFormatRejection(error)) form.querySelector('#numericAnswer')?.focus();
  if(locked){
    const kept=document.createElement('p');kept.className='answer-recovery-kept';
    kept.textContent='Ձեր պատասխանը մնում է այս էջում՝ անփոփոխ։';feedback.appendChild(kept);
  }
  if(error?.retryable===false){
    const reload=document.createElement('button');reload.type='button';reload.textContent='Թարմացնել էջը';
    reload.onclick=()=>window.location.reload();feedback.appendChild(reload);
  }
  return locked;
}

export function clearAnswerRecovery(form) {
  const feedback=recoveryFeedback.get(form);if(feedback?.dataset){delete feedback.dataset.recovery;recoveryFeedback.delete(form);}
  delete form.dataset.answerUncertain;
  delete form.dataset.answerBlocked;
  const submit=form.querySelector('[type="submit"]');
  if(submit?.dataset.answerLabel){submit.textContent=submit.dataset.answerLabel;delete submit.dataset.answerLabel;}
}

if(typeof window!=='undefined')window.addEventListener('beforeunload',event=>{
  if(document.querySelector('form[data-answer-uncertain="true"],form[data-answer-submitting="true"]')){
    event.preventDefault();event.returnValue='';
  }
});
