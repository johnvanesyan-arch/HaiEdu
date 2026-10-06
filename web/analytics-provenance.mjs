import { escapeHtml as esc } from './learning-navigation.mjs';
export function contractMarkup(contract = {}) {
  return `<details><summary>Սկզբնական տարբերակներ</summary><dl>${[['Թողարկում','releaseId'],['Գլուխ','unitId'],['Հարցաշար','blueprintId'],['Կանոնների կապ','policyBindingId'],['Մոդել','modelId'],['Փորձերի կանոններ','academicPolicyId'],['Կոդի տարբերակ','runtimeBuildId'],['Ծագում','provenanceStatus']].map(([label,key])=>`<dt>${label}</dt><dd>${esc(contract[key] ?? 'Չգրանցված')}</dd>`).join('')}</dl></details>`;
}
export function renderEvidenceGroups(root,payload) {
  root.innerHTML=`<p class="subtle">Մասնակցությունն ու ավարտված աշխատանքները համախմբվում են։ Տարբեր հարցաշարերով կամ կանոններով արդյունքները ներկայացվում են առանձին․ դրանցից միասնական գնահատական չի հաշվարկվում։${payload.scope?.history ? ' Ցուցադրվում է ընտրված ուսումնական տարվա պատմությունը։' : ''}</p><div class="amp-subject-grid">${(payload.analytics?.evidenceGroups ?? []).map(group=>`<article class="card"><h4>${esc(({diagnostic:'Ախտորոշիչ',practice:'Վարժանք',mastery_check:'Յուրացման ստուգում',chapter_review:'Գլխի կրկնություն'})[group.mode] ?? group.mode)}</h4><p>${group.sessions} ավարտված աշխատանք · ${group.correct}/${group.answered} ճիշտ պատասխան${group.accuracy==null?'':` · ${group.accuracy}%`}</p>${contractMarkup(group.contract)}</article>`).join('')}</div>`;
}
