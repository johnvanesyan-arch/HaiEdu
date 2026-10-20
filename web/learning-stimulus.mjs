import {mountLearningAudio} from './learning-audio.mjs';
// Subject-neutral media contract. Subject-specific diagrams require an explicit renderer.
export function renderLearningStimulus(root, stimulus, audioContext) {
  root.replaceChildren();
  if (!stimulus || !Object.keys(stimulus).length) return;
  if(stimulus.kind==='audio'){
    if(stimulus.schemaVersion!=='haiedu-audio-v1'||!audioContext?.invoke)throw new Error('Ձայնագրությունը հասանելի չէ այս աշխատավայրում։');
    return mountLearningAudio({root,stimulus,...audioContext});
  }
  if (stimulus.kind === 'image' && typeof stimulus.url === 'string') {
    const url = new URL(stimulus.url, location.href);
    if (url.protocol !== 'https:' || typeof stimulus.altHy !== 'string') throw new Error('Պատկերը հասանելի չէ։');
    const image = document.createElement('img'); image.src = url.href; image.alt = stimulus.altHy; image.style.maxWidth = '100%'; root.appendChild(image); return;
  }
  if (stimulus.kind === 'text' && typeof stimulus.contentHy === 'string') { root.textContent = stimulus.contentHy; return; }
  throw new Error('Հարցի պատկերումը դեռ չի աջակցվում այս դասընթացի աշխատավայրում։');
}
