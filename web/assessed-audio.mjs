// Assessed playback uses one server ledger per session/recording. Controls enforce
// the normal learner flow, not DRM or proof of attention. No transcript is sent.
export function mountAssessedAudio({root,stimulus,invoke,context,isCurrent=()=>true,onReady=()=>{},onEndUnscored=()=>{}}) {
 let live=true,busy=false,running=false,url=null,timer,state=stimulus.playback,playId=null,lastTime=0,ackAt=0,pending=false;
 let queue=Promise.resolve();
 const clientId=crypto.randomUUID(),valid=()=>live&&isCurrent();
 const wrapper=document.createElement('section');wrapper.className='learning-audio assessed-audio';
 const title=document.createElement('p');title.textContent=stimulus.title;title.lang=stimulus.locale;
 const notice=document.createElement('p');notice.textContent=`Նախ կարդացեք այս ձայնագրության բոլոր հարցերը։ Այն կարող եք լսել ընդհանուր ${state.maximumPlays} անգամ՝ այս ստուգման ընթացքում։ Ընդհատումից հետո լսելը կշարունակվի պահպանված կետից։`;
 const questions=document.createElement('ol');questions.dataset.audioQuestions='';questions.style.overflowWrap='anywhere';
 const add=(parent,text)=>{const p=document.createElement('p');p.textContent=text;parent.append(p);};
 for(const q of stimulus.questions){
  const li=document.createElement('li');li.value=q.position;li.lang=stimulus.locale;add(li,q.promptHy);
  const options=q.type==='true_false'?[{content_hy:'Ճիշտ / Սխալ'}]:q.options;
  for(const o of options??[])add(li,`${o.option_key?o.option_key+'. ':''}${o.content_hy}`);
  const d=q.responseDefinition;
  if(q.type==='typed_fields')for(const f of d.fields)add(li,f.label+' ______');
  if(q.type==='matching'){for(const f of d.sources)add(li,f.label);add(li,d.targets.map(x=>x.label).join(' · '));}
  if(q.type==='ordering')for(const f of d.segments)add(li,f.label);
  questions.append(li);
 }
 const counter=document.createElement('p');counter.dataset.audioCount='';
 const button=document.createElement('button');button.type='button';button.dataset.audioPlay='';
 const pause=document.createElement('button');pause.type='button';pause.textContent='Դադարեցնել';pause.hidden=true;
 const end=document.createElement('button');end.type='button';end.textContent='Ավարտել՝ առանց գնահատման';end.hidden=true;
 const audio=document.createElement('audio');audio.preload='none';audio.hidden=true;
 const progress=document.createElement('progress');progress.max=stimulus.durationMs;progress.value=0;progress.setAttribute('aria-label','Լսելու ընթացքը');progress.style.maxWidth='100%';
 const status=document.createElement('p');status.setAttribute('role','status');
 wrapper.append(title,notice,questions,counter,button,pause,progress,audio,status,end);root.append(wrapper);
 const render=()=>{
  if(!valid())return;
  counter.textContent=`Ավարտված լսումներ՝ ${state.completedPlays}/${state.maximumPlays}։ Մնացել է՝ ${state.remainingPlays}։`;
  button.disabled=busy||running||state.remainingPlays===0;
  button.textContent=!url?'Բեռնել ձայնագրությունը':state.playId?'Շարունակել լսելը':state.completedPlays?'Կրկին լսել':'Լսել ձայնագրությունը';
  pause.hidden=!running;pause.disabled=busy;end.hidden=!state.canEndUnscored;end.disabled=busy||running;
  onReady(state.completed===true&&!busy&&!running);
 };
 const call=async(action,payload={})=>{const result=await invoke('get-learning-audio',{...context,playbackPolicy:'assessed-recording-v1',action,...payload});if(!valid())throw new Error('stale_context');return result;};
 const event=(action,positionMs)=>call(action,{clientId,playId,positionMs});
 const serial=fn=>{const next=queue.catch(()=>{}).then(()=>{if(!valid())throw new Error('stale_context');return fn();});queue=next;return next;};
 const stop=()=>{running=false;clearInterval(timer);audio.pause();};
 const release=()=>{stop();audio.removeAttribute('src');audio.load();if(url){URL.revokeObjectURL(url);url=null;}};
 async function failure(){
  if(!valid())return;stop();status.textContent='Լսելն ընդհատվել է։ Կրկին փորձեք։ Եթե խնդիրը շարունակվում է, կարող եք ավարտել առանց գնահատման։ Պահպանված լսումներն ու պատասխանները չեն ջնջվի։';
  try{state=await serial(()=>call('failed'));}catch{}finally{if(valid()){busy=false;render();}}
 }
 const position=()=>Math.min(stimulus.durationMs,Math.max(0,Math.round(audio.currentTime*1000)));
 async function checkpoint(){
  if(!valid()||!running)return;
  if(pending){if(performance.now()-ackAt>3000)void failure();return;}
  pending=true;const at=position();
  try{const result=await serial(()=>event('progress',at));if(valid()){state=result;ackAt=performance.now();}}
  catch{if(valid())void failure();}finally{pending=false;}
 }
 button.onclick=async()=>{
  if(!valid()||busy||running)return;busy=true;render();
  try{
   state=await call('state');
   if(state.remainingPlays===0)return;
   if(!url){
    status.textContent='Ձայնագրությունը բեռնվում է…';const blob=await call('load');
    if(!(blob instanceof Blob)||!['audio/mpeg','audio/wav'].includes(blob.type)||!blob.size)throw new Error('audio_unavailable');
    url=URL.createObjectURL(blob);audio.src=url;audio.load();status.textContent='Երբ պատրաստ լինեք, սեղմեք «Լսել ձայնագրությունը»։';return;
   }
   playId=state.playId??crypto.randomUUID();state=await event('begin',state.resumePositionMs);
   if(state.playId!==playId)return;
   lastTime=state.resumePositionMs/1000;audio.currentTime=lastTime;audio.playbackRate=1;
   running=true;ackAt=performance.now();await audio.play();
   if(!valid()){stop();return;}
   timer=setInterval(()=>void checkpoint(),750);status.textContent='Լսեք ձայնագրությունը մինչև վերջ։';
  }catch{if(valid())await failure();}finally{if(valid()){busy=false;render();}}
 };
 pause.onclick=async()=>{
  if(!valid()||busy||!running)return;busy=true;const at=position();stop();render();
  try{state=await serial(()=>event('pause',at));status.textContent='Լսելը դադարեցված է։ Շարունակեք նույն կետից։';}
  catch{await failure();}finally{if(valid()){busy=false;render();}}
 };
 end.onclick=async()=>{
  if(!valid()||busy||running)return;busy=true;render();
  try{await serial(()=>call('cancel'));if(valid()){release();onEndUnscored();}}
  catch{if(valid())status.textContent='Չհաջողվեց ավարտել աշխատանքը։ Կրկին փորձեք։';}finally{if(valid()){busy=false;render();}}
 };
 audio.addEventListener('timeupdate',()=>{if(!valid()||audio.seeking)return;lastTime=audio.currentTime;progress.value=position();});
 audio.addEventListener('seeking',()=>{if(Math.abs(audio.currentTime-lastTime)>.05)audio.currentTime=lastTime;});
 audio.addEventListener('ratechange',()=>{if(audio.playbackRate!==1)audio.playbackRate=1;});
 audio.addEventListener('ended',()=>{
  if(!valid()||!running)return;const at=position();stop();busy=true;render();
  void serial(()=>event('complete',at)).then(result=>{if(valid()){state=result;status.textContent='Լսումն ավարտված է։ Կարող եք պատասխանել հարցերին։';}}).catch(()=>failure()).finally(()=>{if(valid()){busy=false;render();}});
 });
 audio.addEventListener('error',()=>{if(valid()&&url)void failure();});
 render();
 return ()=>{live=false;button.onclick=pause.onclick=end.onclick=null;release();wrapper.remove();};
}
