import {escapeHtml as esc} from './learning-navigation.mjs';
export function assessmentRules(policy, skills = []) {
  if (policy?.schemaVersion !== 'haiedu-assessment-policy-v2') return '';
  if (!policy.questionCountBySkill) return '';
  const counts=policy.questionCountBySkill;
  const groups=(policy.reportingGroups ?? []).map(g=>`${esc(g.label)}՝ ${g.skillIds.reduce((n,id)=>n+(counts[id] ?? 0),0)} հարց`).join(' · ');
  if (policy.minimumPercent == null) return groups ? `<p>${groups}</p>` : '';
  const total=policy.scoredSkillIds.reduce((n,id)=>n+counts[id],0);
  const minima=Object.entries(policy.minimumCorrectBySkill).map(([id,n])=>`${esc(skills.find(s=>s.id===id)?.code ?? '')}՝ ${n}`).join(' · ');
  return `<p>${groups}</p><p>Ստուգարքը հանձնելու համար գնահատվող ${total} հարցից առնվազն ${Math.ceil(total*policy.minimumPercent/100)}-ին պետք է ճիշտ պատասխանել։${Object.entries(counts).some(([id,n])=>n>0 && !policy.scoredSkillIds.includes(id)) ? ' Մյուս հարցերի արդյունքները ներկայացվում են առանձին և չեն ազդում ստուգարքը հանձնելու վրա։' : ''} Բոլոր հարցերին պատասխանելը պարտադիր է։</p><p>Հմտությունների նվազագույն ճիշտ պատասխանները՝ ${minima}։</p>`;
}
export function assessmentResultMarkup(result) {
  if (result?.schemaVersion !== 'haiedu-assessment-result-v2') return '';
  const score=result.score;
  return `${score ? `<p><strong>${result.passed ? 'Ստուգարքն անցած է' : 'Ստուգարքը չի անցել'} · ${score.correct}/${score.answered} · ${score.percent}%</strong></p>` : ''}${result.groups.map(g=>`<p>${esc(g.label)}՝ ${g.correct}/${g.answered}${g.percent==null?'':` · ${g.percent}%`}${g.determinesPass ? ' · հաշվի է առնվում ստուգարքը հանձնելիս' : ''}</p>`).join('')}`;
}
