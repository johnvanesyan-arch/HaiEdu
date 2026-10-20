import {assessmentRules,assessmentResultMarkup} from './assessment-reporting.mjs';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { readLearningSelection, sameContext, sameCourse, contextHref, courseLabel, escapeHtml as esc } from './learning-navigation.mjs';
import { registeredExtensionHref } from './learning-extensions.mjs';
import { mountLearningPlayer } from './learning-player.mjs';
import { mountWrittenWork } from './written-work.mjs';
const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const root = document.getElementById('courseContent');
let version = 0, accountId = null, disposePlayer = () => {}, disposeWriting = () => {};
function completionDate(value) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '—';
  // Numeric parts keep the local date readable even when the browser lacks
  // Armenian locale data and would otherwise substitute English month names.
  const parts = Object.fromEntries(new Intl.DateTimeFormat('hy-AM', {
    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'
  }).formatToParts(date).map(({type,value}) => [type,value]));
  return `${parts.day}.${parts.month}.${parts.year} · ${parts.hour}:${parts.minute}`;
}
function clear() { disposeWriting(); disposeWriting = () => {}; disposePlayer(); disposePlayer = () => {}; root.replaceChildren(); document.getElementById('courseTitle').textContent = 'Դասընթաց'; document.getElementById('courseSubtitle').textContent = ''; }
async function load() {
  if (disposeWriting.flush && !(await disposeWriting.flush())) return;
  const request = ++version;
  clear();
  root.classList.remove('hidden');
  document.getElementById('courseLoading').classList.remove('hidden');
  const valid = () => request === version;
  try {
    const selection = readLearningSelection(location.search);
    if (!selection) throw new Error('Ընտրեք դասընթացը գլխավոր էջից։');
    const { data: auth } = await supabase.auth.getSession();
    if (!valid()) return;
    if (!auth.session) throw new Error('Մուտք գործեք ձեր հաշիվ։');
    accountId = auth.session.user.id;
    const { data: navigation, error: accessError } = await supabase.functions.invoke('get-student-classes',{body:{}});
    if (!valid()) return;
    const context = navigation?.contexts?.find(c => sameContext(c,selection));
    if (accessError || !context) throw new Error('Ընտրված դասընթացն այս պահին հասանելի չէ։');
    const { data, error } = await supabase.functions.invoke('get-student-dashboard',{body:selection});
    if (!valid()) return;
    if (error || !data?.dashboardVersion) throw new Error('Չհաջողվեց բեռնել տվյալները։ Փորձեք նորից։');
    document.getElementById('courseTitle').textContent = `${courseLabel(context)} · ${context.unitTitleHy}`;
    document.getElementById('courseSubtitle').textContent = `${context.schoolName} · ${context.className} · ${context.academicYearLabel} · Թողարկում ${context.releaseNumber}`;
    const modes = { diagnostic:'Ախտորոշիչ', practice:'Վարժանք', mastery_check:'Յուրացման ստուգում', chapter_review:'Գլխի կրկնություն' };
    const tab = new URLSearchParams(location.search).get('tab') || 'course';
    const action = (mode, spec, skillId) => {
      const legacy = registeredExtensionHref(spec.extensionKey,mode,context);
      if (legacy && skillId) { const url=new URL(legacy,location.href);url.searchParams.set('skill',skillId);return url.href; }
      return legacy || contextHref(context,tab,{action:mode,skill:skillId});
    };
    const active = data.activeSession;
    const activeSpec = active?.policyBindingId ? {status:'configured'} : data.modes[active?.mode];
    const resume = active ? `<section class="card course-active-session" aria-label="Ընթացիկ աշխատանք"><div><h2>Ընթացիկ աշխատանք</h2><p>${esc(modes[active.mode])} · Պատասխանված է ${active.answered}/${active.planned} հարցի։</p></div><a class="button-link course-resume" href="${esc(action(active.mode,activeSpec ?? {}))}">Շարունակել · ${esc(modes[active.mode])}</a></section>` : '';
    const modeCards = Object.entries(modes).map(([mode,label]) => {
      const spec = data.modes[mode];
      const enabled = spec?.status === 'configured' || spec?.status === 'registered_legacy';
      const locked = mode !== 'diagnostic' && !data.practiceAccess.unlocked;
      const done = mode === 'diagnostic' && data.baseline;
      const masteryReady = data.skills.some(s => s.requiredForReadiness !== false) && data.skills.filter(s => s.requiredForReadiness !== false).every(s => s.ready === true);
      const state = data.lifecycle?.state;
      const retryReady = /^mastery_retry_\d+_ready$/.test(state ?? '');
      const masteryBlocked = mode === 'mastery_check' && !active && !retryReady && !masteryReady;
      const final = ['mastery_passed','mastery_failed_final'].includes(state);
      const disabled = Boolean(active) || !enabled || locked || done || (mode === 'mastery_check' && (masteryBlocked || final));
      const minima = Object.entries(spec?.minimumCorrectBySkill ?? {}).map(([id,min]) => `${data.skills.find(s=>s.id===id)?.code ?? id}: ${min}`).join(' · ');
      return `<article class="card course-mode-card"><h3>${label}</h3><p>${enabled ? `${spec.questions} հարց${spec.hintsAllowed ? ' · օգնությունը հասանելի է' : ' · առանց օգնության'}` : 'Կանոնները դեռ չեն ակտիվացվել։'}</p>${spec?.minimumPercent != null ? `<p>Անցողիկ շեմ՝ ${spec.minimumPercent}%</p><p class="subtle">Հմտությունների նվազագույն ճիշտ պատասխաններ՝ ${esc(minima)}</p>` : ''}${assessmentRules(spec,data.skills)}${done ? '<p>Ախտորոշիչն ավարտված է։</p>' : locked ? '<p>Նախ ավարտեք այս գլխի ախտորոշիչը։</p>' : masteryBlocked && mode==='mastery_check' ? '<p>Նախ ամրապնդեք պահանջվող հմտությունները կամ ավարտեք պարտադիր կրկնությունը։</p>' : ''}${disabled ? '' : `<a class="button-link" href="${esc(action(mode,spec))}">Բացել</a>`}</article>`;
    }).join('');
    const skills = data.skills.map(s=>`<tr><td>${esc(s.code)} — ${esc(s.nameHy)}</td><td>${s.mastery ? `${s.mastery.percent}% · ${s.mastery.evidenceCount} պատասխան` : 'Տվյալը հասանելի չէ'}</td><td>${s.requiredForReadiness === false ? 'Չի սահմանափակում ստուգարքի հասանելիությունը · ' : ''}${s.ready === true ? 'Պատրաստ է' : s.ready === false ? 'Ամրապնդում է պետք' : '—'}</td>${tab === 'progress' ? '' : `<td>${data.practiceAccess.unlocked && ['configured','registered_legacy'].includes(data.modes.practice.status) ? `<a href="${esc(action('practice',data.modes.practice,s.id))}">Վարժանք</a>` : ''}</td>`}</tr>`).join('');
    const legacyCourse = registeredExtensionHref(context.extensionKey,'course',context);
    const history = data.history.map(s=>`<tr><td>${esc(modes[s.mode])}</td><td>${assessmentResultMarkup(s.assessmentResult) || `${s.correct}/${s.answered}${s.percent==null?'':` · ${s.percent}%`}`}</td><td><time datetime="${esc(s.completedAt)}" title="Տեղական ժամով">${esc(completionDate(s.completedAt))}</time></td><td><details><summary>Սկզբնական տարբերակները</summary><p>Թողարկում՝ ${esc(s.curriculumReleaseId)}<br>Սեսիա՝ ${esc(s.id)}<br>Հարցաշար՝ ${esc(s.blueprintId)}<br>Կանոնների կապ՝ ${esc(s.policyBindingId || 'Հին գրանցված կանոններ')}<br>Մոդել՝ ${esc(s.modelId || 'Չգրանցված')}<br>Կոդի տարբերակ՝ ${esc(s.runtimeBuildId || 'Չգրանցված')}<br>Փորձերի կանոններ՝ ${esc(s.academicMasteryPolicyId || 'Չգրանցված')}<br>Ծագման կարգավիճակ՝ ${esc(s.provenanceStatus)}</p></details></td></tr>`).join('');
    const skillHeader = `<thead><tr><th scope="col" class="course-skill-name">Հմտություն</th><th scope="col">Ուսումնական ապացույց</th><th scope="col">Պատրաստություն</th>${tab === 'progress' ? '' : '<th scope="col">Գործողություն</th>'}</tr></thead>`;
    const skillTable = `<div class="matrix-wrap" tabindex="0" role="region" aria-label="Հմտությունների ցուցանիշներ"><table class="course-table">${skillHeader}<tbody>${skills || `<tr><td colspan="${tab === 'progress' ? 3 : 4}">Հմտությունների տվյալներ դեռ չկան։</td></tr>`}</tbody></table></div>`;
    const learningContent = tab === 'progress'
      ? `<section class="card course-data-section"><h2>Հմտությունների առաջընթաց</h2><p class="subtle">Հմտությունների ցուցանիշները տվյալ թողարկման ուսումնական պատմությունն են։ Տարբեր կանոններով սեսիաները ներկայացվում են առանձին։</p>${skillTable}</section>`
      : `${active ? '' : `<div class="amp-subject-grid">${modeCards}</div>`}${tab === 'course' ? `<section class="card course-data-section"><h2>Հմտություններ</h2>${skillTable}</section>` : ''}`;
    const chapters = navigation.contexts.filter(c=>sameCourse(c,context)).sort((a,b)=>a.unitSequence-b.unitSequence);
    const chapterLinks = chapters.length>1 ? `<nav class="row course-chapters" aria-label="Դասընթացի գլուխներ">${chapters.map(c=>`<a class="button-link ghost" href="${esc(contextHref(c,tab))}"${sameContext(c,context)?' aria-current="page"':''}>${esc(c.unitTitleHy)}</a>`).join('')}</nav>` : '';
    root.innerHTML = `${chapterLinks}<nav class="row course-tabs" aria-label="Դասընթացի բաժիններ">${[['assessment','Գնահատումներ'],['course','Դասընթաց'],['progress','Առաջընթաց'],['writing','Գրավոր աշխատանքներ']].map(([t,l])=>`<a class="button-link ghost" href="${esc(contextHref(context,t))}"${t===tab?' aria-current="page"':''}>${l}</a>`).join('')}</nav>
      <section class="card course-overview" aria-label="Ուսուցման ամփոփում"><p>${data.baseline?.assessmentResult ? assessmentResultMarkup(data.baseline.assessmentResult) : data.baseline ? `Ելակետային ախտորոշիչ՝ ${data.baseline.correct}/${data.baseline.answered} · ${data.baseline.percent}%` : 'Ախտորոշիչը կսահմանի ձեր մեկնարկային մակարդակը։'}</p>${data.lifecycle ? `<p>Յուրացման օգտագործված փորձեր՝ ${data.lifecycle.attemptsUsed}/${data.maximumAttempts ?? '—'}</p>` : ''}</section>
      ${resume}${legacyCourse ? `<div><a class="button-link ghost" href="${esc(legacyCourse)}">Դիտել դասընթացի թեմաները</a></div>` : ''}<div id="learningPlayer"></div>${learningContent}
      <section class="card course-data-section" aria-labelledby="courseHistoryTitle"><h2 id="courseHistoryTitle">Ավարտված աշխատանքներ</h2><div class="matrix-wrap" tabindex="0" role="region" aria-label="Ավարտված աշխատանքների պատմություն"><table class="course-table"><thead><tr><th scope="col">Տեսակ</th><th scope="col">Արդյունք</th><th scope="col">Ավարտ</th><th scope="col">Տվյալներ</th></tr></thead><tbody>${history || '<tr><td colspan="4">Ավարտված աշխատանք դեռ չկա։</td></tr>'}</tbody></table></div></section>`;
    if (tab === 'writing') {
      root.querySelectorAll(':scope > :not(nav)').forEach(node => node.remove());
      const writingRoot = document.createElement('div');
      root.append(writingRoot);
      disposeWriting = mountWrittenWork({root:writingRoot,supabase,context:selection,actorId:auth.session.user.id,isCurrent:valid});
      return;
    }
    const requestedMode = new URLSearchParams(location.search).get('action');
    if (requestedMode && Object.hasOwn(modes,requestedMode) && (data.modes[requestedMode]?.status==='configured' || active?.policyBindingId)) {
      disposePlayer = mountLearningPlayer({root:document.getElementById('learningPlayer'),supabase,context,skills:data.skills,mode:requestedMode,targetSkillId:new URLSearchParams(location.search).get('skill'),isCurrent:valid,onComplete:()=>{ const url=new URL(location.href);url.searchParams.delete('action');url.searchParams.delete('skill');window.history.replaceState({},'',url);load(); }});
    }
  } catch(error) {
    if (valid()) root.textContent = error.message === 'invalid_context_selection'
      ? 'Ընտրեք դասընթացը գլխավոր էջից։'
      : /[\u0531-\u0587]/.test(error.message ?? '') ? error.message
      : 'Չհաջողվեց բեռնել դասընթացը։ Փորձեք նորից։';
  }
  finally { if (valid()) document.getElementById('courseLoading').classList.add('hidden'); }
}
supabase.auth.onAuthStateChange((_event,session)=>{ const next=session?.user?.id??null;if(next&&next===accountId)return;accountId=next;++version;clear();if(session)setTimeout(load,0); });
window.addEventListener('popstate',load);
load();
