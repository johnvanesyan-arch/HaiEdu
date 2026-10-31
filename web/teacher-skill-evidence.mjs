import { escapeHtml as esc } from './learning-navigation.mjs';
import { contractMarkup } from './analytics-provenance.mjs';

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
  if (bands[row.band] && Number.isFinite(row.percent)) {
    return { kind: 'classified', label: `${bands[row.band]} · ${row.percent}%`, band: row.band };
  }
  return Number(row.evidenceCount) > 0
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
  const label = `${row.nameHy} · ${state.label}`;
  const content = state.kind === 'classified' ? `${row.percent}%` : state.label;
  return `<td class="matrix-cell ${state.band}" title="${esc(label)}">${state.kind === 'none'
    ? `<span aria-label="${esc(label)}">${esc(content)}</span>`
    : `<button type="button" class="skill-evidence-link" data-student="${esc(studentId)}" data-skill="${esc(row.skillId ?? row.id)}" aria-label="${esc(label)}">${esc(content)}</button>`}</td>`;
}

export function skillEvidenceMarkup(rows = [], unitCode = '') {
  const prefix = unitCode ? `${unitCode}-` : '';
  return `<section class="teacher-skill-evidence" aria-label="Հմտությունների տվյալներ"><h3>Հմտությունների տվյալներ</h3>
    <p class="subtle small">Տարբեր աշխատանքների կամ կանոնների արդյունքները ներկայացված են առանձին։ Գույները ուսումնական ցուցանիշներ են, ոչ ստուգարքի գնահատական։</p>
    ${rows.map(row => {
      const state = skillEvidenceState(row);
      const code = prefix && String(row.code).startsWith(prefix) ? String(row.code).slice(prefix.length) : row.code;
      const estimates = row.estimates?.length ? row.estimates : Number(row.evidenceCount) > 0 ? [row] : [];
      return `<details data-skill-evidence="${esc(row.skillId ?? row.id)}"><summary><strong>${esc(code)}</strong> ${esc(row.nameHy)}<span>${esc(state.label)}</span></summary>
        ${estimates.length ? estimates.map((estimate, index) => {
          const presentation = skillEvidenceState(estimate);
          return `<article class="skill-estimate ${presentation.band}"><h4>${esc(modes[estimate.contract?.mode] ?? 'Ուսումնական աշխատանք')}${estimates.length > 1 ? ` · արդյունք ${index + 1}` : ''}</h4>
            <p>${esc(presentation.label)} · ${esc(estimate.evidenceCount)} պատասխան</p>
            ${presentation.kind !== 'classified' && Number.isFinite(estimate.percent) ? `<p class="subtle small">Նախնական ցուցանիշ՝ ${estimate.percent}%․ դասակարգման համար դիտարկումները դեռ բավարար չեն։</p>` : ''}
            ${estimate.contract ? contractMarkup(estimate.contract) : ''}</article>`;
        }).join('') : '<p>Այս հմտության համար ուսումնական տվյալ դեռ չկա։</p>'}</details>`;
    }).join('')}</section>`;
}
