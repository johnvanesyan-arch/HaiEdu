import { escapeHtml as esc } from './learning-navigation.mjs';
import { assessmentScopeMarkup, assessmentGroupMarkup } from './assessment-reporting.mjs';
const purposes = Object.freeze({
  practice: ['Վարժություն', 'Վարժության ցուցանիշը նկարագրում է ուսումնական ընթացքը․ այն ստուգարքի գնահատական չէ։'],
  diagnostic: ['Ախտորոշիչ', 'Մեկնարկային արդյունքը պահվում է վարժության և ստուգարքի արդյունքներից առանձին։'],
  mastery_check: ['Յուրացման ստուգում', 'Պահպանվում են ստուգարքի սկզբնական արդյունքն ու անցնելու կանոնները։'],
  chapter_review: ['Գլխի կրկնություն', 'Կրկնության արդյունքները ներկայացված են առանձին։'],
});
export function evidencePurposeGroups(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const mode = row.contract?.mode ?? row.mode ?? 'unknown';
    if (!groups.has(mode)) groups.set(mode, []);
    groups.get(mode).push(row);
  }
  const order = Object.keys(purposes);
  return [...groups].sort(([a], [b]) => (order.includes(a) ? order.indexOf(a) : order.length) - (order.includes(b) ? order.indexOf(b) : order.length))
    .map(([mode, entries]) => ({ mode, label: Object.hasOwn(purposes, mode) ? purposes[mode][0] : 'Ուսումնական աշխատանք',
      description: Object.hasOwn(purposes, mode) ? purposes[mode][1] : 'Սկզբնական արդյունքները պահպանված են առանձին։',
      entries: [...entries].sort((a, b) => (Date.parse(b.lastActivityAt ?? b.lastAttemptAt ?? '') || 0) - (Date.parse(a.lastActivityAt ?? a.lastAttemptAt ?? '') || 0)) }));
}
export function evidenceSeparationMarkup(rows = []) {
  if (rows.length < 2) return '';
  if (rows.every(row => JSON.stringify(row.contract ?? {}) === JSON.stringify(rows[0].contract ?? {})))
    return '<p class="subtle small evidence-separation">Արդյունքները ներկայացված են առանձին՝ ըստ դասարանի և ուսումնական համատեքստի։</p>';
  const fields = [['releaseId','թողարկումները'],['unitId','գլուխները'],['blueprintId','հարցաշարերը'],['policyBindingId','գնահատման կանոնները'],['modelId','հաշվարկի մոդելները'],['academicPolicyId','փորձերի կանոնները']];
  const differences = fields.filter(([key]) => new Set(rows.map(r => r.contract?.[key] ?? null)).size > 1).map(([, label]) => label);
  return `<p class="subtle small evidence-separation">${differences.length ? `Տարբեր են ${esc(differences.join(', '))}։ ` : ''}Ամբողջական համատեղելիությունը հաստատված չէ․ արդյունքները չեն միավորվում։</p>`;
}
export function evidenceVersionsMarkup(rows, render) {
  if (!rows.length) return '';
  return render(rows[0], 0) + (rows.length > 1 ? `<details class="evidence-other-versions"><summary>Մյուս առանձին արդյունքները (${rows.length - 1})</summary>${rows.slice(1).map((row, index) => render(row, index + 1)).join('')}</details>` : '');
}
export function evidenceContextMarkup(payload = {}, group = {}) {
  const options = payload.options ?? {}, scope = { ...payload.scope, ...group.context };
  const release = options.releases?.find(r => r.id === group.contract?.releaseId);
  const programme = options.programmes?.find(r => r.id === (scope.subjectProgramId ?? release?.subjectProgramId));
  const klass = options.classes?.find(r => r.id === scope.classId);
  const units = (options.units ?? []).filter(r => r.curriculumReleaseId === group.contract?.releaseId && (group.contract?.unitId != null
    ? r.id === group.contract.unitId : scope.unitCode != null && r.unitCode === scope.unitCode));
  const unit = units.length === 1 ? units[0] : null;
  const labels = [programme?.label ?? programme?.name, klass?.label ?? klass?.name, unit?.label ?? 'Գլուխը հստակեցված չէ', release?.label].filter(Boolean);
  return labels.length ? `<p class="evidence-context-label">${labels.map(esc).join(' · ')}</p>` : '';
}
export function contractMarkup(contract = {}) {
  return `<details class="evidence-technical-details"><summary>Սկզբնական տարբերակներ</summary><dl>${[['Թողարկում','releaseId'],['Գլուխ','unitId'],['Հարցաշար','blueprintId'],['Կանոնների կապ','policyBindingId'],['Մոդել','modelId'],['Փորձերի կանոններ','academicPolicyId'],['Կոդի տարբերակ','runtimeBuildId'],['Ծագում','provenanceStatus'],['Մոդելի ծագում','modelProvenanceStatus'],['Կոդի ծագում','runtimeProvenanceStatus']].map(([label,key])=>`<dt>${label}</dt><dd>${esc(contract[key] ?? 'Չգրանցված')}</dd>`).join('')}</dl></details>`;
}
export function renderEvidenceGroups(root,payload) {
  const purposes = evidencePurposeGroups(payload.analytics?.evidenceGroups ?? []);
  root.innerHTML=`<p class="subtle">Մասնակցությունն ու ավարտված աշխատանքները համախմբվում են։ Տարբեր դասարանների, հարցաշարերի կամ կանոնների արդյունքները ներկայացվում են առանձին․ դրանցից միասնական գնահատական չի հաշվարկվում։${payload.scope?.history ? ' Ցուցադրվում է ընտրված ուսումնական տարվա պատմությունը։' : ''}</p>${assessmentScopeMarkup()}<div class="evidence-purpose-list">${purposes.map(purpose=>`<section class="evidence-purpose" data-evidence-purpose="${esc(purpose.mode)}"><h4>${esc(purpose.label)}</h4><p class="subtle small">${esc(purpose.description)}${purpose.entries.length>1?` ${purpose.entries.length} առանձին արդյունք։`:''}</p>${evidenceSeparationMarkup(purpose.entries)}${evidenceVersionsMarkup(purpose.entries,(group,index)=>`<article class="card evidence-version"><h5>${esc(purpose.label)}${purpose.entries.length>1?` · տարբերակ ${index+1}`:''}</h5>${evidenceContextMarkup(payload,group)}<p>${esc(group.sessions)} ավարտված աշխատանք · ${esc(group.correct)}/${esc(group.answered)} ճիշտ պատասխան${group.reportingGroups?.length ? " · բոլոր պատասխանների նկարագրական արդյունք" : ""}${group.accuracy==null?'':` · ${esc(group.accuracy)}%`}</p>${(group.reportingGroups ?? []).map(g=>assessmentGroupMarkup(g,{points:g.possible!=null||g.earned!=null,showPercent:false})).join("")}${group.passScore ? `<p>Ստուգարքն անցած աշխատանքներ՝ ${esc(group.masteryPassed)}/${esc(group.sessions)}</p>` : ""}${contractMarkup(group.contract)}</article>`)}</section>`).join('')}${purposes.length?'':'<p>Ընտրված տվյալներով ավարտված աշխատանք դեռ չկա։</p>'}</div>`;
}
