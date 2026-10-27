import { escapeHtml as esc } from './learning-navigation.mjs';
import { studentIcon } from './student-visuals.mjs';
import { subjectArtwork } from './subject-visuals.mjs';
const views = {
 course: ['Քայլ առ քայլ դեպի ամուր գիտելիք', 'Ընտրեք հմտությունը և շարունակեք վարժանքը։', 'courses'],
 assessment: ['Տեսեք՝ ինչն եք արդեն կարողանում', 'Ախտորոշիչը ցույց է տալիս մեկնարկը, իսկ յուրացման ստուգումը՝ անկախ արդյունքը։', 'assessment'],
 progress: ['Ձեր ուսուցման պատկերը', 'Վարժանքի պատրաստությունն ու ստուգման արդյունքները ներկայացված են առանձին։', 'progress'],
 guides: ['Օգնություն՝ սովորելու համար', 'Բացեք տվյալ բաժնի հասանելի ուղեցույցը։', 'courses'],
 writing: ['Ձեր մտքերը՝ ձեր բառերով', 'Սևագրեր, ներկայացված աշխատանքներ և ուսուցչի արձագանք՝ մեկ վայրում։', 'work'],
};
export function courseHero(tab, data) {
 const [title,description,icon] = views[tab] || views.course;
 const required=(data.skills || []).filter(s=>s.requiredForReadiness!==false);
 const known=required.length>0 && required.every(s=>typeof s.ready==='boolean');
 const ready=required.filter(s=>s.ready===true).length;
 const evidence=known && ['course','progress'].includes(tab)
  ? `<div class="student-course-readiness"><strong>${ready} / ${required.length}</strong><span>Պահանջվող հմտություններ՝ պատրաստ ստուգման</span><meter min="0" max="${required.length}" value="${ready}" aria-label="Պահանջվող հմտությունների պատրաստություն">${ready}/${required.length}</meter></div>` : '';
 return `<section class="student-course-hero" aria-labelledby="studentViewTitle"><div>${tab === 'course' ? `<span class="student-course-subject-art">${subjectArtwork(data.context?.subjectCode)}</span>` : `<span class="student-feature-icon">${studentIcon(icon)}</span>`}<h2 id="studentViewTitle">${title}</h2><p>${description}</p></div>${evidence}</section>`;
}
export function modeIcon(mode) {
 return `<span class="student-feature-icon">${studentIcon(({diagnostic:'assessment',practice:'practice',mastery_check:'progress',chapter_review:'review'})[mode])}</span>`;
}
export function readinessBadge(skill) {
 const state=skill.ready===true?'ready':skill.ready===false?'developing':'unknown';
 const label=skill.ready===true?'Պատրաստ է':skill.ready===false?'Ամրապնդում է պետք':'Տվյալը դեռ չկա';
 return `<span class="student-evidence-badge" data-readiness="${state}">${label}</span>`;
}
export function skillEvidence(skill) {
 if(!skill.mastery) return 'Տվյալը հասանելի չէ';
 const {percent,evidenceCount}=skill.mastery;
 const bar=Number.isFinite(percent) && percent>=0 && percent<=100 ? `<meter min="0" max="100" value="${percent}" aria-label="${esc(skill.nameHy)}՝ վարժանքի ցուցանիշ">${percent}%</meter>` : '';
 return `<span class="student-skill-evidence">${esc(percent)}% · ${esc(evidenceCount)} պատասխան${bar}</span>`;
}
