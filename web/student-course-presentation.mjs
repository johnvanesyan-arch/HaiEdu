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
// Readiness is factual evidence, not decoration: it is shared by the banner and
// by the course tab, which shows it beside the skills it summarizes.
export function readinessSummary(data) {
 const required=(data.skills || []).filter(s=>s.requiredForReadiness!==false);
 const known=required.length>0 && required.every(s=>typeof s.ready==='boolean');
 if(!known) return '';
 const ready=required.filter(s=>s.ready===true).length;
 return `<div class="student-course-readiness"><strong>${ready} / ${required.length}</strong><span>Պահանջվող հմտություններ՝ պատրաստ ստուգման</span><meter min="0" max="${required.length}" value="${ready}" aria-label="Պահանջվող հմտությունների պատրաստություն">${ready}/${required.length}</meter></div>`;
}
// summary: optional markup that replaces the generic description (Progress puts the
// learner's baseline result there instead of a separate card; Phase 4, R5).
export function courseHero(tab, data, summary = '') {
 const [title,description,icon] = views[tab] || views.course;
 const evidence=['course','progress'].includes(tab) ? readinessSummary(data) : '';
 return `<section class="student-course-hero" data-hero-tab="${esc(tab)}" aria-labelledby="studentViewTitle"><div>${tab === 'course' ? `<span class="student-course-subject-art">${subjectArtwork(data.context?.subjectCode)}</span>` : `<span class="student-feature-icon">${studentIcon(icon)}</span>`}<h2 id="studentViewTitle">${title}</h2>${summary ? `<div class="student-course-hero-summary">${summary}</div>` : `<p>${description}</p>`}</div>${evidence}</section>`;
}
export function modeIcon(mode) {
 return `<span class="student-feature-icon">${studentIcon(({diagnostic:'assessment',practice:'practice',mastery_check:'progress',chapter_review:'review'})[mode])}</span>`;
}
// "Too few answers yet" mirrors the server's own mastery status (insufficient_evidence);
// the browser applies no answer-count threshold of its own.
function readinessState(skill) {
 const few=skill.ready!==true && skill.mastery?.status==='insufficient_evidence';
 return skill.ready===true?'ready':few?'insufficient':skill.ready===false?'developing':'unknown';
}
export function readinessBadge(skill) {
 const state=readinessState(skill);
 const label={ready:'Պատրաստ է',insufficient:'Դեռ քիչ պատասխաններ',developing:'Ամրապնդում է պետք',unknown:'Տվյալը դեռ չկա'}[state];
 return `<span class="student-evidence-badge" data-readiness="${state}">${label}</span>`;
}
export function skillEvidence(skill) {
 if(!skill.mastery) return 'Տվյալը հասանելի չէ';
 const {percent,evidenceCount}=skill.mastery;
 // 16.5B review, Phase 4 (R1): the bar takes the colour of the server's readiness status,
 // because readiness is not a percentage threshold the learner could read off the bar.
 const bar=Number.isFinite(percent) && percent>=0 && percent<=100 ? `<meter min="0" max="100" value="${percent}" data-evidence-state="${readinessState(skill)}" aria-label="${esc(skill.nameHy)}՝ վարժանքի ցուցանիշ">${percent}%</meter>` : '';
 return `<span class="student-skill-evidence">${esc(percent)}% · ${esc(evidenceCount)} պատասխան${bar}</span>`;
}
