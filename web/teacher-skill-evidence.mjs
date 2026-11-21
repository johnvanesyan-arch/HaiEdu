import { escapeHtml as esc } from './learning-navigation.mjs';
import { contractMarkup, evidencePurposeGroups, evidenceSeparationMarkup, evidenceVersionsMarkup } from './analytics-provenance.mjs';

const bands = {
  secure: 'Կայուն', developing: 'Զարգացող', needs_support: 'Աջակցություն է պետք',
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
      return `<details data-skill-evidence="${esc(row.skillId ?? row.id)}"><summary><strong>${esc(code)}</strong> ${esc(row.nameHy)}<span>${esc(state.label)}</span></summary>
        ${skillEvidenceBody(row)}</details>`;
    }).join('')}</section>`;
}

// One skill's evidence, every estimate separate with its own contract. Shared by both teacher views.
function skillEvidenceBody(row) {
      const estimates = row.estimates?.length ? row.estimates : Number(row.evidenceCount) > 0 ? [row] : [];
      return `${Number(row.excludedEvidenceCount) > 0 ? `<p class="subtle small" data-evidence-coverage>Գրանցված պատասխաններ՝ ${esc(row.observedEvidenceCount)}։ Ցուցանիշի հաշվարկին մասնակցող պատասխաններ՝ ${esc(row.evidenceCount)}։ Պատասխանները պահպանված են, սակայն հարցերի նախկին տարբերակների տվյալները բավարար չեն բոլոր պատասխաններով ցուցանիշ հաշվարկելու համար։</p>` : ''}
        ${estimates.length ? evidencePurposeGroups(estimates).map(purpose=>`<section class="evidence-purpose" data-evidence-purpose="${esc(purpose.mode)}"><h4>${esc(purpose.label)}</h4><p class="subtle small">${esc(purpose.description)}${purpose.entries.length>1?` ${purpose.entries.length} առանձին ցուցանիշ։`:''}</p>${evidenceSeparationMarkup(purpose.entries)}${evidenceVersionsMarkup(purpose.entries,(estimate,index)=>{
          const presentation = skillEvidenceState(estimate);
          return `<article class="skill-estimate ${presentation.band}"><h5>${esc(purpose.label)}${purpose.entries.length > 1 ? ` · արդյունք ${index + 1}` : ''}</h5>
            <p>${esc(presentation.label)} · ${esc(estimate.evidenceCount)} պատասխան${Number.isInteger(estimate.sessionCount)?` · ${estimate.sessionCount} աշխատանք`:''}</p>
            ${presentation.kind !== 'classified' && Number.isFinite(estimate.percent) ? `<p class="subtle small">Նախնական ցուցանիշ՝ ${estimate.percent}%․ դասակարգման համար դիտարկումները դեռ բավարար չեն։</p>` : ''}
            ${estimate.contract ? contractMarkup(estimate.contract) : ''}</article>`;
        })}</section>`).join('') : Number(row.excludedEvidenceCount) > 0 ? '<p>Ցուցանիշը հասանելի չէ։</p>' : '<p>Այս հմտության համար ուսումնական տվյալ դեռ չկա։</p>'}`;
}

// ---- School teacher roster and panel (V12/V13, provisionally accepted 20–21 Nov 2026) ----
// Presentation only: every class, score and date below is the server's. Nothing is recalculated,
// merged across evidence contracts or inferred from a pass decision. The personal-account view
// does not use these helpers.

const time = value => { const t = Date.parse(value ?? ''); return Number.isFinite(t) ? t : null; };

// The server's separate estimates for one skill row (one per full evidence contract).
export const skillEstimates = (row = {}) => (row.estimates?.length ? row.estimates : Number(row.evidenceCount) > 0 ? [row] : []);

// Kind-of-work label from the estimate's own contract, using the existing purpose labels.
export function workKindLabel(estimate = {}) {
  const mode = estimate.contract?.mode;
  return mode ? evidencePurposeGroups([{ contract: { mode } }])[0]?.label ?? null : null;
}

// Every classified «needs support» estimate in the student's class evidence, newest included answer
// first (full timestamps), then curriculum order. Sparse, unavailable and unclassified evidence never counts.
export function supportEvidence(student = {}) {
  const rows = student.matrix ?? [];
  return rows.flatMap((row, index) => skillEstimates(row)
    .filter(estimate => { const state = skillEvidenceState(estimate); return state.kind === 'classified' && state.band === 'needs_support'; })
    .map(estimate => ({ row, index, estimate, kind: workKindLabel(estimate), lastAttemptAt: estimate.lastAttemptAt ?? null })))
    .sort((a, b) => ((time(b.lastAttemptAt) ?? -Infinity) - (time(a.lastAttemptAt) ?? -Infinity)) || a.index - b.index);
}

// The roster flag: the most recent qualifying estimate and the number of OTHER distinct skills.
export function supportFlag(student = {}) {
  const evidence = supportEvidence(student);
  if (!evidence.length) return null;
  const top = evidence[0];
  const others = new Set(evidence.map(item => item.row.skillId ?? item.row.id).filter(id => id !== (top.row.skillId ?? top.row.id)));
  return { ...top, moreSkills: others.size };
}

// «ստուգման ավարտից առաջ» only when both timestamps are valid and the estimate's latest included answer
// is strictly earlier than the recorded check's completion.
export function answeredBeforeCheck(lastAttemptAt, check = null) {
  const a = time(lastAttemptAt), c = time(check?.completedAt);
  return a !== null && c !== null && a < c;
}

// Skill cards: red, then yellow, then the rest; curriculum order within each group.
export function skillCardOrder(rows = []) {
  const rank = row => ({ needs_support: 0, developing: 1 })[skillAttentionBand(row)] ?? 2;
  return rows.map((row, index) => ({ row, index })).sort((a, b) => rank(a.row) - rank(b.row) || a.index - b.index).map(item => item.row);
}

// School-only wording for two class-based actions (approved in V12); every other action keeps the server text.
const SCHOOL_NEXT_STEP = Object.freeze({
  mastery_check_retry: 'Այս դասարանում ավարտվել է գլխի պարտադիր կրկնություն։',
  review_chapter: 'Առաջարկվում է կրկնել գլուխը։',
});
export const schoolNextStep = (intervention = null) => SCHOOL_NEXT_STEP[intervention?.action] ?? intervention?.messageHy ?? null;

// Active work shown under the next step (approved texts exist for practice and chapter review only).
export function activeWorkProgress(active = null) {
  const answered = Number(active?.answered_count), planned = Number(active?.planned_item_count);
  if (!active || !Number.isInteger(answered) || !Number.isInteger(planned) || planned < 1) return null;
  if (active.mode === 'practice') return `Վարժությունն ընթացքի մեջ է · պատասխանել է ${planned} հարցից ${answered}-ին`;
  if (active.mode === 'chapter_review') return `Գլխի կրկնությունն ընթացքի մեջ է · պատասխանել է ${planned} հարցից ${answered}-ին`;
  return null;
}

// Recent accuracy, from the same returned sample the server used. Null when the server withheld it
// (mixed contracts) or the sample is not one contract. 0% is a valid value.
export function recentAccuracySummary(student = {}) {
  const sample = student.recentAttempts ?? [];
  if (!Number.isFinite(student.recentAccuracy) || !sample.length) return null;
  const keys = new Set(sample.map(row => JSON.stringify(row.contract ?? null)));
  if (keys.size !== 1 || !sample[0].contract?.mode) return null;
  return { percent: student.recentAccuracy, kind: workKindLabel(sample[0]), count: sample.length };
}

// School skill cards (V12): ordered red, yellow, rest; the summary names the skill and its strongest
// classified estimate with its kind of work, or a neutral state; «Առանձին արդյունքներ · N» when one kind
// has several estimates. Opened, the card shows the same separate estimates and contracts as today.
export function schoolSkillCardsMarkup(rows = [], context = {}) {
  const scope = [context.subjectNameHy, context.gradeLabelHy, context.unitTitleHy].filter(Boolean);
  const rank = { needs_support: 0, developing: 1, secure: 2 };
  const cards = skillCardOrder(rows).map(row => {
    const estimates = skillEstimates(row);
    const classified = estimates.map(estimate => ({ estimate, state: skillEvidenceState(estimate) })).filter(item => item.state.kind === 'classified')
      .sort((a, b) => rank[a.state.band] - rank[b.state.band]);
    const strongest = classified[0];
    const neutral = skillEvidenceState(estimates.length > 1 ? { ...row, status: 'mixed_contracts', estimates: [] } : estimates[0] ?? row);
    const cue = strongest
      ? `<span class="school-pill ${esc(strongest.state.band)}">${esc([workKindLabel(strongest.estimate), strongest.state.label].filter(Boolean).join('՝ '))}</span>`
      : `<span class="school-pill neutral">${esc(neutral.kind === 'separate' ? 'Առանձին արդյունքներ' : neutral.label)}</span>`;
    const several = evidencePurposeGroups(estimates).find(group => group.entries.length > 1);
    const separate = several ? `<span class="school-pill separate">${esc(several.label)}՝ Առանձին արդյունքներ · ${several.entries.length}</span>` : '';
    return `<details class="school-skill-card" data-skill-evidence="${esc(row.skillId ?? row.id)}" data-testid="school-skill-card"><summary><span class="school-skill-name">${esc(row.nameHy)}</span><span class="school-cues">${cue}${separate}</span></summary>
      ${row.code ? `<p class="subtle small school-skill-code" data-testid="school-skill-code">${esc(row.code)}</p>` : ''}
      ${skillEvidenceBody(row)}</details>`;
  }).join('');
  return `<section class="teacher-skill-evidence school-skill-evidence" aria-labelledby="schoolSkillCardsTitle"><h3 id="schoolSkillCardsTitle">Տվյալներ ըստ հմտության</h3>
    ${scope.length ? `<p class="evidence-context-label">${scope.map(esc).join(' · ')}</p>` : ''}
    <p class="subtle small">Ցուցադրվում են ընտրված դասարանի տվյալները։ Տարբեր աշխատանքների կամ կանոնների արդյունքները ներկայացված են առանձին։ Գույները ուսումնական ցուցանիշներ են, ոչ ստուգարքի գնահատական։</p>
    <div class="school-skill-cards">${cards}</div></section>`;
}
