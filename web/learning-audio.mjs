// Short private recordings are fetched through the authenticated Edge handler.
// No object path, storage token, transcript or signed URL enters the page.
export function decodeLearningAudio(data,response,action){
 if(!['load','preview'].includes(action))return data;
 const mime=response?.headers?.get('X-HaiEdu-Audio-Type');
 if(!(data instanceof Blob)||data.type!=='application/octet-stream'||!data.size||data.size>8388608||!['audio/mpeg','audio/wav'].includes(mime))throw new Error('Ձայնագրությունը հասանելի չէ։');
 return data.slice(0,data.size,mime);
}
export function mountLearningAudio({root,stimulus,invoke,context,isCurrent=()=>true,onReady=()=>{}}){
 let live=true,busy=false,url=null,serial=0,queue=Promise.resolve(),completed=stimulus.completed===true,failed=false;
 const preview=Boolean(context.itemId),valid=()=>live&&isCurrent();
 const wrapper=document.createElement('section');wrapper.className='learning-audio';
 const title=document.createElement('p');title.textContent=stimulus.title||'Ձայնագրություն';
 if(stimulus.locale)title.lang=stimulus.locale;
 const notice=document.createElement('p');notice.textContent='Կարող եք կրկին լսել ձայնագրությունը։ Տեքստային տարբերակն այս առաջադրանքում հասանելի չէ։';
 const button=document.createElement('button');button.type='button';button.textContent='Բեռնել ձայնագրությունը';
 const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.style.width='100%';audio.setAttribute('aria-label',stimulus.title||'Ձայնագրություն');audio.hidden=true;
 const status=document.createElement('p');status.setAttribute('role','status');
 wrapper.append(title,notice,button,audio,status);root.append(wrapper);
 const ready=value=>{if(valid())onReady(value);};
 ready(preview||completed);
 const call=async action=>{const data=await invoke('get-learning-audio',{...context,action});if(!valid())throw new Error('stale_context');return data;};
 const release=()=>{audio.pause();audio.removeAttribute('src');audio.load();if(url){URL.revokeObjectURL(url);url=null;}};
 function error(){if(!valid())return;failed=true;completed=false;ready(false);status.textContent='Ձայնագրությունը չի բեռնվել կամ ընդհատվել է։ Կրկին բեռնեք և լսեք այն։ Պատասխան չի գրանցվել։';button.disabled=false;button.textContent='Կրկին բեռնել';}
 const record=action=>{queue=queue.catch(()=>{}).then(()=>{if(valid()&&!preview)return call(action);}).catch(e=>{if(valid())error();throw e;});return queue;};
 button.onclick=async()=>{
  if(busy||!valid())return;busy=true;button.disabled=true;ready(false);status.textContent='Ձայնագրությունը բեռնվում է…';const request=++serial;
  release();failed=false;
  try{
   const blob=await call(preview?'preview':'load');
   if(!valid()||request!==serial)return;
   if(!(blob instanceof Blob)||!['audio/mpeg','audio/wav'].includes(blob.type)||!blob.size)throw new Error('audio_unavailable');
   url=URL.createObjectURL(blob);audio.src=url;audio.hidden=false;audio.load();button.textContent='Կրկին բեռնել';status.textContent='Սեղմեք նվագարկման կոճակը։';ready(preview||completed);
  }catch{if(valid()&&request===serial){error();if(!preview)await record('failed').catch(()=>{});}}
  finally{busy=false;if(valid()&&request===serial)button.disabled=false;}
 };
 audio.addEventListener('playing',()=>{if(valid()&&!failed){status.textContent='Լսեք ձայնագրությունը մինչև վերջ։';if(!preview)void record('started').catch(()=>{});}});
 audio.addEventListener('ended',()=>{if(!valid()||failed)return;void record('completed').then(()=>{if(valid()&&!failed){completed=true;ready(true);status.textContent='Ձայնագրությունն ավարտված է։ Կարող եք պատասխանել կամ կրկին լսել։';}}).catch(()=>{});});
 audio.addEventListener('error',()=>{if(!valid()||!url)return;error();if(!preview)void record('failed').catch(()=>{});});
 // This replayable practice policy uses normal speed. Controls are usability
 // conditions, not DRM or proof that a person paid attention.
 audio.addEventListener('ratechange',()=>{if(audio.playbackRate!==1)audio.playbackRate=1;});
 return ()=>{live=false;++serial;button.onclick=null;release();wrapper.remove();};
}
