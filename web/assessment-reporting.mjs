import {escapeHtml as esc} from './learning-navigation.mjs';
// The saved policy/result supplies the assessed groups. Never infer additional
// outcomes, a course grade or a separate performed task from a pass flag.
export const assessmentScopeText = 'Արդյունքը վերաբերում է միայն այս ստուգմամբ գնահատված հմտություններին։ Այն ամբողջ դասընթացի ընդհանուր գնահատականը չէ և չի ներառում առանձին գնահատվող աշխատանքները։';
export function assessmentScopeMarkup({disclosure=false}={}) {
  const text=`<p class="subtle" data-assessment-scope>${assessmentScopeText}</p>`;
  return disclosure ? `<details class="assessment-scope"><summary>Արդյունքների սահմանները</summary>${text}</details>` : text;
}
export function assessmentGroupMarkup(group,{points=false,showPercent=true}={}) {
  const numerator=points?group.earned:group.correct,denominator=points?group.possible:group.answered;
  const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const unassessed=numerator===0&&denominator===0;
  const assessed=valid(numerator)&&valid(denominator)&&denominator>0&&numerator<=denominator;
  const state=unassessed?'unassessed':assessed?'assessed':'unavailable';
  const value=unassessed?'Չի գնահատվել':!assessed?'Տվյալը հասանելի չէ':`${points?Number(numerator.toFixed(2)):numerator}/${denominator}${points?' միավոր':''}${showPercent&&group.percent!=null?` · ${esc(group.percent)}%`:''}`;
  return `<p class="assessment-group" data-assessment-state="${state}">${esc(group.label)}՝ ${value}${group.determinesPass?' · հաշվի է առնվում ստուգարքը հանձնելիս':''}</p>`;
}
export function assessmentSkillRules(policy, skills = []) {
  const minima=Object.entries(policy?.minimumCorrectBySkill ?? {}).map(([id,n],index)=>`<li>${esc(skills.find(s=>s.id===id)?.nameHy || `Հմտություն ${index+1}`)}՝ ${esc(n)}</li>`).join('');
  return minima ? `<details class="assessment-skill-rules"><summary>Ըստ հմտության պահանջները</summary><p>Ամբողջությամբ ճիշտ պատասխանների նվազագույն թիվը՝</p><ul>${minima}</ul></details>` : '';
}
export function assessmentRules(policy, skills = []) {
  const points=['haiedu-assessment-policy-v3','haiedu-assessment-policy-v4'].includes(policy?.schemaVersion);
  if (!points && policy?.schemaVersion !== 'haiedu-assessment-policy-v2') return '';
  if (!policy.questionCountBySkill) return '';
  const counts=policy.questionCountBySkill;
  const groups=(policy.reportingGroups ?? []).map(g=>`${esc(g.label)}՝ ${g.skillIds.reduce((n,id)=>n+(counts[id] ?? 0),0)} հարց`).join(' · ');
  if (policy.minimumPercent == null) return groups ? `<p>${groups}</p>${assessmentScopeMarkup()}` : '';
  const total=policy.scoredSkillIds.reduce((n,id)=>n+counts[id],0);
  const skillRules=assessmentSkillRules(policy,skills);
  if(points){
    const partial=policy.responseTypes.some(type=>['typed_fields','matching'].includes(type));
    const ordering=policy.responseTypes.includes('ordering');
    return `<p>${groups}</p><p>Յուրաքանչյուր հարցի առավելագույն միավորը 1 է։${partial?' Դաշտերի ու զույգերի համար միավորը հաշվվում է ըստ ճիշտ լրացված մասերի բաժնի։':''}${ordering?' Հերթականության առաջադրանքում միավոր տրվում է միայն ամբողջությամբ ճիշտ հերթականության համար։':''} Ստուգարքն անցնելու համար անհրաժեշտ է գնահատվող հարցերի միավորների առնվազն ${policy.minimumPercent}%-ը։ Բոլոր հարցերին պատասխանելը պարտադիր է։</p>${skillRules}${assessmentScopeMarkup()}`;
  }
  return `<p>${groups}</p><p>Ստուգարքը հանձնելու համար գնահատվող ${total} հարցից առնվազն ${Math.ceil(total*policy.minimumPercent/100)}-ին պետք է ճիշտ պատասխանել։${Object.entries(counts).some(([id,n])=>n>0 && !policy.scoredSkillIds.includes(id)) ? ' Մյուս հարցերի արդյունքները ներկայացվում են առանձին և չեն ազդում ստուգարքը հանձնելու վրա։' : ''} Բոլոր հարցերին պատասխանելը պարտադիր է։</p>${skillRules}${assessmentScopeMarkup()}`;
}
// hideUnassessed (student pages, 16.5B review, Phase 4): omit groups with nothing assessed
// (R3) and a lone pass-determining group that only repeats the overall score (R4). Teacher views
// keep every group. Nothing is inferred: only saved groups and the saved score are shown.
export function assessmentResultMarkup(result,{includeScope=true,hideUnassessed=false}={}) {
  const scope=includeScope?assessmentScopeMarkup():'';
  const total=result?.score;
  const repeatsScore=group=>Boolean(total&&group.determinesPass&&group.percent===total.percent&&
    (group.earned??group.correct)===(total.earned??total.correct)&&(group.possible??group.answered)===(total.possible??total.answered));
  const assessed=group=>!(((group.earned??group.correct)===0)&&((group.possible??group.answered)===0));
  if (result?.groups && hideUnassessed) {
    const groups=result.groups.filter(assessed);
    // The repeated line goes only when it is the sole group; beside other groups its label
    // says which part the score refers to.
    result={...result,groups:groups.length===1&&repeatsScore(groups[0])?[]:groups};
  }
  if (result?.schemaVersion === 'haiedu-assessment-result-v3') {
    const format=s=>`${Number(Number(s.earned).toFixed(2))}/${s.possible} միավոր${s.percent==null?'':` · ${s.percent}%`}`;
    return `${result.score?`<p><strong>${result.passed?'Ստուգարքն անցած է':'Ստուգարքը չի անցել'} · ${format(result.score)}</strong></p>`:''}${result.groups.map(g=>assessmentGroupMarkup(g,{points:true})).join('')}${scope}`;
  }
  if (result?.schemaVersion !== 'haiedu-assessment-result-v2') return '';
  const score=result.score;
  return `${score ? `<p><strong>${result.passed ? 'Ստուգարքն անցած է' : 'Ստուգարքը չի անցել'} · ${score.correct}/${score.answered} · ${score.percent}%</strong></p>` : ''}${result.groups.map(g=>assessmentGroupMarkup(g)).join('')}${scope}`;
}
