import {mountLearningAudio} from './learning-audio.mjs';
import {mountTaskSetPreview} from './learning-task-set.mjs';
// Subject-neutral media contract. Subject-specific diagrams require an explicit renderer.
export function renderLearningStimulus(root, stimulus, audioContext) {
  root.replaceChildren();
  if (!stimulus || !Object.keys(stimulus).length) return;
  if(stimulus.kind==='task_set'){
    if(stimulus.schemaVersion!=='haiedu-task-set-v1'||!audioContext?.context?.itemId||!audioContext?.invoke)throw new Error('Ընդհանուր նյութը հասանելի չէ։');
    return mountTaskSetPreview({root,reference:stimulus,...audioContext,render:renderLearningStimulus});
  }
  if(stimulus.kind==='audio'){
    if(stimulus.schemaVersion!=='haiedu-audio-v1'||!audioContext?.invoke)throw new Error('Ձայնագրությունը հասանելի չէ այս աշխատավայրում։');
    return mountLearningAudio({root,stimulus,...audioContext});
  }
  if (stimulus.kind === 'image' && typeof stimulus.url === 'string') {
    const url = new URL(stimulus.url, location.href);
    if (url.protocol !== 'https:' || typeof stimulus.altHy !== 'string') throw new Error('Պատկերը հասանելի չէ։');
    const image = document.createElement('img'); image.src = url.href; image.alt = stimulus.altHy; image.style.maxWidth = '100%'; root.appendChild(image); return;
  }
  if(stimulus.kind==='text'&&stimulus.schemaVersion==='haiedu-text-v1'&&typeof stimulus.content==='string'&&/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(stimulus.locale??'')){
    const passage=document.createElement('div');passage.lang=stimulus.locale;passage.style.whiteSpace='pre-wrap';passage.style.overflowWrap='anywhere';passage.textContent=stimulus.content;root.append(passage);return;
  }
  if (stimulus.kind === 'text' && !stimulus.schemaVersion && typeof stimulus.contentHy === 'string') { root.textContent = stimulus.contentHy; return; }
  throw new Error('Հարցի պատկերումը դեռ չի աջակցվում այս դասընթացի աշխատավայրում։');
}
