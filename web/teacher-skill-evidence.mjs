import { escapeHtml as esc } from './learning-navigation.mjs';
import { contractMarkup, evidencePurposeGroups, evidenceSeparationMarkup, evidenceVersionsMarkup } from './analytics-provenance.mjs';

const bands = {
  secure: 'Կայուն', developing: 'Զարգացող', needs_support: 'Աջակցություն է պետք',
};
const modes = {
  diagnostic: 'Ախտորոշիչ', practice: 'Վարժություն',
  chapter_review: 'Գլխի կրկնություն', mastery_check: 'Յուրացման ստուգում',
};

// Present the server's governed classifications; never combine contracts or
// derive a skill classification from an assessment's overall pass decision.
export function skillEvidenceState(row = {}) {
  if (row.status === 'mixed_contracts' || row.estimates?.length > 1) {
    return { kind: 'separate', label: 'Առանձին արդյունքներ', band: 'separate' };
  }
  if (row.status === 'provenance_unavailable') {
    return { kind: 'unavailable', label: 'Ցուցանիշը հասանելի չէ', band: 'not_assessed' };
  }
  if (row.status === 'insufficient_evidence') {
    return { kind: 'insufficient', label: 'Դիտարկումները դեռ քիչ են', band: 'not_assessed' };
  }
  if (Object.hasOwn(bands, row.band) && Number.isFinite(row.percent)) {
    return { kind: 'classified', label: `${bands[row.band]} · ${row.percent}%`, band: row.band };
  }
  return Number(row.evidenceCount) > 0 || Number(row.observedEvidenceCount) > 0 || Number(row.excludedEvidenceCount) > 0
    ? { kind: 'unavailable', label: 'Ցուցանիշը հասանելի չէ', band: 'not_assessed' }
    : { kind: 'none', label: 'Տվյալ դեռ չկա', band: 'not_assessed' };
}

export function skillAttentionBand(row = {}) {
  const evidence = row.estimates?.length ? row.estimates : [row];
  const classified = evidence.map(skillEvidenceState).filter(state => state.kind === 'classified');
  if (classified.some(state => state.band === 'needs_support')) return 'needs_support';
  if (classified.some(state => state.band === 'developing')) return 'developing';
  return null;
}

export function skillMatrixCell(row, studentId) {
  const state = skillEvidenceState(row);
  const purposes = state.kind === 'separate' ? evidencePurposeGroups(row.estimates ?? []).map(p => p.label).join(' · ') : '';
  const label = `${row.nameHy} · ${state.label}${purposes ? ' · ' + purposes : ''}`;
  const content = state.kind === 'classified' ? `${row.percent}%` : state.label;
  return `<td class="matrix-cell ${state.band}" title="${esc(label)}">${state.kind === 'none'
    ? `<span aria-label="${esc(label)}">${esc(content)}</span>`
    : `<button type="button" class="skill-evidence-link" data-student="${esc(studentId)}" data-skill="${esc(row.skillId ?? row.id)}" aria-label="${esc(label)}">${esc(content)}${purposes ? `<small class="evidence-purpose-caption">${esc(purposes)}</small>` : ''}</button>`}</td>`;
}

export function skillEvidenceMarkup(rows = [], unitCode = '', context = {}) {
  const prefix = unitCode ? `${unitCode}-` : '';
  const scope = [context.subjectNameHy, context.gradeLabelHy, context.unitTitleHy].filter(Boolean);
  return `<section class="teacher-skill-evidence" aria-label="Հմտությունների տվյալներ"><h3>Հմտությունների տվյալներ</h3>
    ${scope.length ? `<p class="evidence-context-label">${scope.map(esc).join(' · ')}</p>` : ''}
    <p class="subtle small">Ցուցադրվում են ընտրված դասարանի տվյալները։ Տարբեր աշխատանքների կամ կանոնների արդյունքները ներկայացված են առանձին։ Գույները ուսումնական ցուցանիշներ են, ոչ ստուգարքի գնահատական։</p>
    ${rows.map(row => {
      const state = skillEvidenceState(row);
      const code = prefix && String(row.code).startsWith(prefix) ? String(row.code).slice(prefix.length) : row.code;
      const estimates = row.estimates?.length ? row.estimates : Number(row.evidenceCount) > 0 ? [row] : [];
      return `<details data-skill-evidence="${esc(row.skillId ?? row.id)}"><summary><strong>${esc(code)}</strong> ${esc(row.nameHy)}<span>${esc(state.label)}</span></summary>
        ${Number(row.excludedEvidenceCount) > 0 ? `<p class="subtle small" data-evidence-coverage>Գրանցված պատասխաններ՝ ${esc(row.observedEvidenceCount)}։ Ցուցանիշի հաշվարկին մասնակցող պատասխաններ՝ ${esc(row.evidenceCount)}։ Պատասխանները պահպանված են, սակայն հարցերի նախկին տարբերակների տվյալները բավարար չեն բոլոր պատասխաններով ցուցանիշ հաշվարկելու համար։</p>` : ''}
        ${estimates.length ? evidencePurposeGroups(estimates).map(purpose=>`<section class="evidence-purpose" data-evidence-purpose="${esc(purpose.mode)}"><h4>${esc(purpose.label)}</h4><p class="subtle small">${esc(purpose.description)}${purpose.entries.length>1?` ${purpose.entries.length} առանձին ցուցանիշ։`:''}</p>${evidenceSeparationMarkup(purpose.entries)}${evidenceVersionsMarkup(purpose.entries,(estimate,index)=>{
          const presentation = skillEvidenceState(estimate);
          return `<article class="skill-estimate ${presentation.band}"><h5>${esc(modes[estimate.contract?.mode] ?? 'Ուսումնական աշխատանք')}${purpose.entries.length > 1 ? ` · տարբերակ ${index + 1}` : ''}</h5>
            <p>${esc(presentation.label)} · ${esc(estimate.evidenceCount)} պատասխան${Number.isInteger(estimate.sessionCount)?` · ${estimate.sessionCount} աշխատանք`:''}</p>
            ${presentation.kind !== 'classified' && Number.isFinite(estimate.percent) ? `<p class="subtle small">Նախնական ցուցանիշ՝ ${estimate.percent}%․ դասակարգման համար դիտարկումները դեռ բավարար չեն։</p>` : ''}
            ${estimate.contract ? contractMarkup(estimate.contract) : ''}</article>`;
        })}</section>`).join('') : Number(row.excludedEvidenceCount) > 0 ? '<p>Ցուցանիշը հասանելի չէ։</p>' : '<p>Այս հմտության համար ուսումնական տվյալ դեռ չկա։</p>'}</details>`;
    }).join('')}</section>`;
}
