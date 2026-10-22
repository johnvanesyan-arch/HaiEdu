import {escapeHtml as esc} from './learning-navigation.mjs';
// The saved policy/result supplies the assessed groups. Never infer additional
// outcomes, a course grade or a separate performed task from a pass flag.
export const assessmentScopeText = 'Արդյունքը վերաբերում է միայն այս ստուգմամբ գնահատված հմտություններին։ Այն ամբողջ դասընթացի ընդհանուր գնահատականը չէ և չի ներառում առանձին գնահատվող աշխատանքները։';
export const assessmentScopeMarkup = () => `<p class="subtle" data-assessment-scope>${assessmentScopeText}</p>`;
export function assessmentRules(policy, skills = []) {
  const points=['haiedu-assessment-policy-v3','haiedu-assessment-policy-v4'].includes(policy?.schemaVersion);
  if (!points && policy?.schemaVersion !== 'haiedu-assessment-policy-v2') return '';
  if (!policy.questionCountBySkill) return '';
  const counts=policy.questionCountBySkill;
  const groups=(policy.reportingGroups ?? []).map(g=>`${esc(g.label)}՝ ${g.skillIds.reduce((n,id)=>n+(counts[id] ?? 0),0)} հարց`).join(' · ');
  if (policy.minimumPercent == null) return groups ? `<p>${groups}</p>${assessmentScopeMarkup()}` : '';
  const total=policy.scoredSkillIds.reduce((n,id)=>n+counts[id],0);
  const minima=Object.entries(policy.minimumCorrectBySkill).map(([id,n])=>`${esc(skills.find(s=>s.id===id)?.code ?? '')}՝ ${n}`).join(' · ');
  if(points){
    const partial=policy.responseTypes.some(type=>['typed_fields','matching'].includes(type));
    const ordering=policy.responseTypes.includes('ordering');
    return `<p>${groups}</p><p>Յուրաքանչյուր հարցի առավելագույն միավորը 1 է։${partial?' Մուտքագրվող պատասխանների և համապատասխանեցումների համար միավորը հաշվվում է ըստ ճիշտ լրացված մասերի բաժնի։':''}${ordering?' Հերթականության առաջադրանքում միավոր տրվում է միայն ամբողջությամբ ճիշտ հերթականության համար։':''} Ստուգարքն անցնելու համար անհրաժեշտ է գնահատվող հարցերի միավորների առնվազն ${policy.minimumPercent}%-ը։ Հմտությունների ամբողջությամբ ճիշտ պատասխանների նվազագույն քանակները՝ ${minima}։ Բոլոր հարցերին պատասխանելը պարտադիր է։</p>${assessmentScopeMarkup()}`;
  }
  return `<p>${groups}</p><p>Ստուգարքը հանձնելու համար գնահատվող ${total} հարցից առնվազն ${Math.ceil(total*policy.minimumPercent/100)}-ին պետք է ճիշտ պատասխանել։${Object.entries(counts).some(([id,n])=>n>0 && !policy.scoredSkillIds.includes(id)) ? ' Մյուս հարցերի արդյունքները ներկայացվում են առանձին և չեն ազդում ստուգարքը հանձնելու վրա։' : ''} Բոլոր հարցերին պատասխանելը պարտադիր է։</p><p>Հմտությունների նվազագույն ճիշտ պատասխանները՝ ${minima}։</p>${assessmentScopeMarkup()}`;
}
export function assessmentResultMarkup(result) {
  if (result?.schemaVersion === 'haiedu-assessment-result-v3') {
    const format=s=>`${Number(Number(s.earned).toFixed(2))}/${s.possible} միավոր${s.percent==null?'':` · ${s.percent}%`}`;
    return `${result.score?`<p><strong>${result.passed?'Ստուգարքն անցած է':'Ստուգարքը չի անցել'} · ${format(result.score)}</strong></p>`:''}${result.groups.map(g=>`<p>${esc(g.label)}՝ ${format(g)}${g.determinesPass?' · հաշվի է առնվում ստուգարքը հանձնելիս':''}</p>`).join('')}${assessmentScopeMarkup()}`;
  }
  if (result?.schemaVersion !== 'haiedu-assessment-result-v2') return '';
  const score=result.score;
  return `${score ? `<p><strong>${result.passed ? 'Ստուգարքն անցած է' : 'Ստուգարքը չի անցել'} · ${score.correct}/${score.answered} · ${score.percent}%</strong></p>` : ''}${result.groups.map(g=>`<p>${esc(g.label)}՝ ${g.correct}/${g.answered}${g.percent==null?'':` · ${g.percent}%`}${g.determinesPass ? ' · հաշվի է առնվում ստուգարքը հանձնելիս' : ''}</p>`).join('')}${assessmentScopeMarkup()}`;
}
