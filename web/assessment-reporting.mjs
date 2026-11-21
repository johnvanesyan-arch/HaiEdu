import {escapeHtml as esc} from './learning-navigation.mjs';
import {teacherDate} from './teacher-dates.mjs';
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

// ---- School teacher check results (V12/V13; provisionally accepted 20–21 Nov 2026) ----
// Separate from the student, personal-account and admin displays above, which are unchanged.
// Shows the saved pass status, saved score and every saved group. Never infers a pass from a
// percentage, never guesses counts and never replaces a saved scored result with the raw
// whole-check figures. An unreadable saved record stays neutral.
const SAVED_FORMATS = new Set(['haiedu-assessment-result-v2', 'haiedu-assessment-result-v3']);
const finite = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
function readableRecord(record) {
  if (!record || !SAVED_FORMATS.has(record.schemaVersion) || !Array.isArray(record.groups) || typeof record.passed !== 'boolean') return null;
  const points = record.schemaVersion === 'haiedu-assessment-result-v3', s = record.score;
  const scoreOk = s && (points ? finite(s.earned) && finite(s.possible) && s.possible > 0 && s.earned <= s.possible
    : Number.isInteger(s.correct) && Number.isInteger(s.answered) && s.answered > 0 && s.correct >= 0 && s.correct <= s.answered);
  if (!scoreOk || record.groups.some(g => !g || typeof g.label !== 'string')) return null;
  return { record, points };
}
const scoreText = ({ record, points }) => {
  const s = record.score, pct = finite(s.percent) ? ` · ${s.percent}%` : '';
  return points ? `${Number(Number(s.earned).toFixed(2))}/${s.possible} միավոր${pct}` : `${s.correct} / ${s.answered}${pct}`;
};
// The single pass-determining group replaces the score line only when its saved values equal the saved score.
function scoredGroupIsScore({ record, points }) {
  const scored = record.groups.filter(g => g.determinesPass);
  if (scored.length !== 1) return false;
  const g = scored[0], s = record.score;
  return points ? g.earned === s.earned && g.possible === s.possible : g.correct === s.correct && g.answered === s.answered;
}
const groupsMarkup = ({ record, points }, omitScored) =>
  record.groups.filter(g => !(omitScored && g.determinesPass)).map(g => assessmentGroupMarkup(g, { points })).join('');

// Counts for an older check (no saved record) only from exactly one matching completed check session.
export function matchedCheckCounts(check = null, sessions = []) {
  if (!check?.completedAt) return null;
  const matches = sessions.filter(row => row?.mode === 'mastery_check' && row.status === 'completed' && row.completedAt === check.completedAt);
  if (matches.length !== 1) return null;
  const { correct, answered } = matches[0];
  return Number.isInteger(correct) && Number.isInteger(answered) && answered > 0 && correct >= 0 && correct <= answered ? { correct, answered } : null;
}

// A saved record is authoritative only when this renderer can read its format.
// Unknown/malformed records stay neutral everywhere; legacy status is used only
// when no saved reporting record exists.
export function schoolCheckStatus(check = null) {
  if (!check) return null;
  if (check.assessmentResult != null) return readableRecord(check.assessmentResult)?.record.passed ?? null;
  return check.result === 'passed' ? true : check.result === 'failed' ? false : null;
}

// Box 1 of the school student panel. `check` is latestMasteryCheck; `sessions` the returned recent sessions.
export function schoolCheckResultMarkup(check = null, sessions = []) {
  if (!check) return '<p data-testid="school-check-empty">Այս դասարանում ստուգման արդյունք դեռ չի գրանցվել։</p>';
  const readable = readableRecord(check.assessmentResult);
  const passed = schoolCheckStatus(check);
  const pill = passed === null ? '' : `<p><span class="school-pill ${passed ? 'passed' : 'not-passed'}" data-testid="school-check-status">${passed ? 'Անցած է' : 'Չի անցել'}</span></p>`;
  let body;
  if (readable) {
    // Box 1: when the single scored group equals the saved score, its labelled line stands in for the score line.
    body = `${scoredGroupIsScore(readable) ? '' : `<p data-testid="school-check-score">${esc(scoreText(readable))}</p>`}${groupsMarkup(readable, false)}`;
  } else if (check.assessmentResult != null) {
    body = '<p data-testid="school-check-score" data-assessment-state="unavailable">Տվյալը հասանելի չէ</p>';
  } else {
    const counts = matchedCheckCounts(check, sessions), pct = finite(check.percent) ? `${check.percent}%` : '';
    body = counts || pct ? `<p data-testid="school-check-score">${esc(counts ? `${counts.correct} / ${counts.answered}${pct ? ` · ${pct}` : ''}` : pct)}</p>` : '';
  }
  const completedDate = teacherDate(check.completedAt);
  const date = completedDate ? `<p>Ավարտի ամսաթիվը՝ ${completedDate}</p>` : '';
  return `<p class="subtle small">Այս դասարանում գրանցված արդյունք</p>${pill}${body}${date}<p class="subtle small">Արդյունքը վերաբերում է միայն այս ստուգմամբ գնահատված հմտություններին։</p>`;
}

// One mastery-check attempt in the school work history, with its own saved score.
export function schoolAttemptMarkup(session = {}) {
  const readable = readableRecord(session.reporting);
  const passed = schoolCheckStatus({ assessmentResult: session.reporting, result: session.assessmentResult });
  const status = passed === null ? null : passed ? 'Ստուգարքն անցած է' : 'Ստուգարքը չի անցել';
  if (readable) {
    // History: the status line carries the saved score; a scored group equal to it is not repeated.
    return `<p>${esc([status, scoreText(readable)].filter(Boolean).join(' · '))}</p>${groupsMarkup(readable, scoredGroupIsScore(readable))}`;
  }
  if (session.reporting != null) return `<p data-assessment-state="unavailable">${esc([status, 'Տվյալը հասանելի չէ'].filter(Boolean).join(' · '))}</p>`;
  const counts = Number.isInteger(session.correct) && Number.isInteger(session.answered) && session.answered > 0 ? `${session.correct} / ${session.answered}` : null;
  const pct = finite(session.scorePercent) ? `${session.scorePercent}%` : null;
  return `<p>${esc([status, [counts, pct].filter(Boolean).join(' · ')].filter(Boolean).join(' · ') || '—')}</p>`;
}
