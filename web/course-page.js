import {learnerAccess,publishLearnerAccess} from './learner-access.mjs';
import {resourceHref} from './resource-navigation.mjs';
import {courseHero,modeIcon,readinessBadge,readinessSummary,skillEvidence} from './student-course-presentation.mjs';
import {assessmentRules,assessmentSkillRules,assessmentResultMarkup,assessmentScopeMarkup} from './assessment-reporting.mjs';
import { createClient } from './supabase-browser.bundle.mjs';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { readLearningSelection, sameContext, sameCourse, contextHref, studentHomeHref, courseLabel, rememberLearningSelection, escapeHtml as esc } from './learning-navigation.mjs';
import { registeredExtensionHref } from './learning-extensions.mjs';
import { mountLearningPlayer } from './learning-player.mjs';
import { mountWrittenWork } from './written-work.mjs';
import { mountUnitGuides } from './unit-guides.mjs';
const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const access=learnerAccess(supabase);
let loading=false,loadTimer;
function scheduleLoad(){clearTimeout(loadTimer);loadTimer=setTimeout(load,0);}
const root = document.getElementById('courseContent');
let version = 0, accountId = null, lastCourseUrl = location.href, disposePlayer = () => {}, disposeWriting = () => {}, disposeGuides = () => {};
function collectionNavigation(tab, context = null) {
  const writing = tab === 'writing';
  const link = document.getElementById('courseCollectionLink');
  if (link) {
    link.href = studentHomeHref(writing ? 'work' : 'courses', context);
    link.textContent = writing ? 'Իմ աշխատանքները' : 'Դասընթացներ';
  }
  const label = document.getElementById('courseCollectionLabel');
  if (label) label.textContent = writing ? 'ԻՄ ԱՇԽԱՏԱՆՔՆԵՐԸ' : 'ԻՄ ԴԱՍԸՆԹԱՑՆԵՐԸ';
}
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
// Focused practice: the course header shrinks to one title line and this link leaves
// the player for the course page. An unfinished session stays resumable there.
function showPlayerExit(href) {
  let link = document.getElementById('playerExitLink');
  if (!link) {
    link = document.createElement('a');
    link.id = 'playerExitLink';
    link.className = 'ghost button-link student-player-exit';
    document.querySelector('.topbar .row')?.prepend(link);
  }
  link.href = href;
  link.textContent = '← Դասընթացի էջ';
}
function clear() { disposeGuides(); disposeGuides = () => {}; disposeWriting(); disposeWriting = () => {}; disposePlayer(); disposePlayer = () => {}; root.replaceChildren(); document.body.removeAttribute('data-student-player'); document.getElementById('playerExitLink')?.remove(); document.getElementById('courseTitle').textContent = 'Դասընթաց'; document.getElementById('courseSubtitle').textContent = ''; collectionNavigation(new URLSearchParams(location.search).get('tab')); }
async function load() {
  const previousVersion=version,writer=disposeWriting;
  if(writer.flush){const saved=await writer.flush();if(previousVersion!==version||writer!==disposeWriting)return;
    if(!saved){history.replaceState({},'',lastCourseUrl);window.dispatchEvent(new CustomEvent('haiedu-home-selection'));return;}}
  lastCourseUrl = location.href;
  const request = ++version;
  loading=true;
  clear();
  const tab = new URLSearchParams(location.search).get('tab') || 'course';
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
    const {data:navigation,error:accessError,stale}=await access.read();
    if(stale)return;
    if (!valid()) return;
    const context = navigation?.contexts?.find(c => sameContext(c,selection));
    if (accessError || !context) throw new Error('Ընտրված դասընթացն այս պահին հասանելի չէ։');
    publishLearnerAccess(navigation);
    rememberLearningSelection(accountId, context);
    collectionNavigation(tab, context);
    const { data, error } = await supabase.functions.invoke('get-student-dashboard',{body:selection});
    if (!valid()) return;
    if (error || !data?.dashboardVersion) throw new Error('Չհաջողվեց բեռնել տվյալները։ Փորձեք նորից։');
    // 16.5B review D1: the unit is the page title; course, class and year form one short line.
    document.getElementById('courseTitle').textContent = context.unitTitleHy;
    document.getElementById('courseSubtitle').textContent = `${courseLabel(context)} · ${context.className} · ${context.academicYearLabel}`;
    const modes = { diagnostic:'Ախտորոշիչ', practice:'Վարժանք', mastery_check:'Յուրացման ստուգում', chapter_review:'Գլխի կրկնություն' };
    const action = (mode, spec, skillId) => {
      const legacy = registeredExtensionHref(spec.extensionKey,mode,context);
      if (legacy && skillId) { const url=new URL(legacy,location.href);url.searchParams.set('skill',skillId);return url.href; }
      return legacy || contextHref(context,tab,{action:mode,skill:skillId});
    };
    const active = data.activeSession;
    const activeSpec = active?.policyBindingId ? {status:'configured'} : data.modes[active?.mode];
    const answeredShare = Number.isFinite(active?.answered) && Number.isFinite(active?.planned) && active.planned > 0 ? Math.min(100, Math.max(0, Math.round(active.answered / active.planned * 100))) : null;
    // The bar repeats the answered/planned text visually, so it is hidden from assistive technology.
    const resume = active ? `<section class="card course-active-session" aria-label="Ընթացիկ աշխատանք"><div><h2>Ընթացիկ աշխատանք</h2><p>${esc(modes[active.mode])} · Պատասխանված է ${active.answered}/${active.planned} հարցի։</p>${answeredShare == null ? '' : `<span class="course-session-bar" aria-hidden="true"><span style="width:${answeredShare}%"></span></span>`}</div><a class="button-link course-resume" href="${esc(action(active.mode,activeSpec ?? {}))}">Շարունակել · ${esc(modes[active.mode])}</a></section>` : '';
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
      const rules = assessmentRules(spec,data.skills) || assessmentSkillRules(spec,data.skills);
      return `<article class="card course-mode-card">${modeIcon(mode)}<h3>${label}</h3><p>${enabled ? `${spec.questions} հարց${spec.hintsAllowed ? ' · օգնությունը հասանելի է' : ' · առանց օգնության'}` : 'Կանոնները դեռ չեն ակտիվացվել։'}</p>${spec?.minimumPercent != null ? `<p>Անցողիկ շեմ՝ ${spec.minimumPercent}%</p>` : ''}${rules ? `<details class="student-rule-details" open><summary>Կանոններ և գնահատում</summary>${rules}</details>` : ''}${done ? '<p>Ախտորոշիչն ավարտված է։</p>' : locked ? '<p>Նախ ավարտեք այս գլխի ախտորոշիչը։</p>' : masteryBlocked && mode==='mastery_check' ? '<p>Նախ ամրապնդեք պահանջվող հմտությունները կամ ավարտեք պարտադիր կրկնությունը։</p>' : ''}${disabled ? '' : `<a class="button-link" aria-label="Բացել՝ ${label}" href="${esc(action(mode,spec))}">Բացել</a>`}</article>`;
    }).join('');
    const skills = data.skills.map(s=>`<tr role="row"><td role="cell">${esc(s.code)} — ${esc(s.nameHy)}</td><td role="cell">${skillEvidence(s)}</td><td role="cell">${s.requiredForReadiness === false ? 'Չի սահմանափակում ստուգարքի հասանելիությունը · ' : ''}${readinessBadge(s)}</td>${tab === 'progress' ? '' : `<td role="cell">${data.practiceAccess.unlocked && ['configured','registered_legacy'].includes(data.modes.practice.status) ? `<a href="${esc(action('practice',data.modes.practice,s.id))}">Վարժանք</a>` : ''}</td>`}</tr>`).join('');
    const legacyCourse = registeredExtensionHref(context.extensionKey,'course',context);
    const history = data.history.map(s=>`<li><div class="assessment-record-heading"><h3>${esc(modes[s.mode])}</h3><time datetime="${esc(s.completedAt)}" title="Տեղական ժամով">${esc(completionDate(s.completedAt))}</time></div><div>${assessmentResultMarkup(s.assessmentResult,{includeScope:false}) || `${s.correct}/${s.answered}${s.percent==null?'':` · ${s.percent}%`}`}</div><details><summary>Սկզբնական տարբերակները</summary><p>Թողարկում՝ ${esc(s.curriculumReleaseId)}<br>Սեսիա՝ ${esc(s.id)}<br>Հարցաշար՝ ${esc(s.blueprintId)}<br>Կանոնների կապ՝ ${esc(s.policyBindingId || 'Հին գրանցված կանոններ')}<br>Մոդել՝ ${esc(s.modelId || 'Չգրանցված')}<br>Կոդի տարբերակ՝ ${esc(s.runtimeBuildId || 'Չգրանցված')}<br>Փորձերի կանոններ՝ ${esc(s.academicMasteryPolicyId || 'Չգրանցված')}<br>Ծագման կարգավիճակ՝ ${esc(s.provenanceStatus)}</p></details></li>`).join('');
    const skillHeader = `<thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader" class="course-skill-name">Հմտություն</th><th scope="col" role="columnheader">Ուսումնական ապացույց</th><th scope="col" role="columnheader">Պատրաստություն</th>${tab === 'progress' ? '' : '<th scope="col" role="columnheader">Գործողություն</th>'}</tr></thead>`;
    const skillTable = `<div class="matrix-wrap" tabindex="0" role="region" aria-label="Հմտությունների ցուցանիշներ"><table class="course-table" role="table">${skillHeader}<tbody role="rowgroup">${skills || `<tr role="row"><td role="cell" colspan="${tab === 'progress' ? 3 : 4}">Հմտությունների տվյալներ դեռ չկան։</td></tr>`}</tbody></table></div>`;
    const evidenceScope = '<p class="subtle" data-learner-evidence-scope>Ցուցանիշները վերաբերում են դասընթացի այս թողարկման ձեր ուսումնական պատմությանը։ Դասարանի առանձին աշխատանքների արդյունքները կարող են տարբերվել։</p>';
    const learningContent = tab === 'progress'
      ? `<section class="card course-data-section"><h2>Հմտությունների առաջընթաց</h2>${evidenceScope}<p class="subtle">Տարբեր կանոններով սեսիաները ներկայացվում են առանձին։</p>${skillTable}</section>`
      : `${active ? '' : `<div class="amp-subject-grid">${modeCards}</div>`}${tab === 'course' ? `<section class="card course-data-section"><h2>Հմտություններ</h2>${readinessSummary(data)}${evidenceScope}${skillTable}</section>` : ''}`;
    const chapters = navigation.contexts.filter(c=>sameCourse(c,context)).sort((a,b)=>a.unitSequence-b.unitSequence);
    const chapterLinks = chapters.length>1 ? `<nav class="row course-chapters" aria-label="Դասընթացի գլուխներ">${chapters.map(c=>`<a class="button-link ghost" href="${esc(contextHref(c,tab))}"${sameContext(c,context)?' aria-current="page"':''}>${esc(c.unitTitleHy)}</a>`).join('')}</nav>` : '';
    // Three primary sections first; guides, written work and materials follow the current work as secondary links.
    const sectionLink = ([t,l]) => `<a class="button-link ghost" href="${esc(contextHref(context,t))}"${t===tab?' aria-current="page"':''}>${l}</a>`;
    const sections = `<nav class="row course-tabs" aria-label="Դասընթացի բաժիններ"><div class="course-tabs-primary">${[['assessment','Գնահատումներ'],['course','Դասընթաց'],['progress','Առաջընթաց']].map(sectionLink).join('')}</div></nav>`;
    const moreSections = `<nav class="row course-tabs course-tabs-more" aria-label="Լրացուցիչ բաժիններ"><div class="course-tabs-secondary">${[['guides','Ուղեցույցներ'],['writing','Գրավոր աշխատանքներ']].map(sectionLink).join('')}<a class="button-link ghost" href="${esc(resourceHref(context))}">Նյութերի գրադարան</a></div></nav>`;
    // The course tab leads with the learner's current work; its decorative banner is omitted.
    root.innerHTML = `${chapterLinks}${sections}${tab === 'course' ? '' : courseHero(tab,data)}
      ${tab === 'progress' ? '' : resume}${moreSections}<section class="card course-overview" aria-label="Ուսուցման ամփոփում"><p>${data.baseline?.assessmentResult ? assessmentResultMarkup(data.baseline.assessmentResult) : data.baseline ? `Ելակետային ախտորոշիչ՝ ${data.baseline.correct}/${data.baseline.answered} · ${data.baseline.percent}%` : 'Ախտորոշիչը կսահմանի ձեր մեկնարկային մակարդակը։'}</p>${data.lifecycle ? `<p>Յուրացման օգտագործված փորձեր՝ ${data.lifecycle.attemptsUsed}/${data.maximumAttempts ?? '—'}</p>` : ''}</section>
      ${legacyCourse ? `<div><a class="button-link ghost" href="${esc(legacyCourse)}">Դիտել դասընթացի թեմաները</a></div>` : ''}<div id="learningPlayer"></div>${learningContent}
      <section class="card course-data-section course-history-section" aria-labelledby="courseHistoryTitle"><h2 id="courseHistoryTitle">Ավարտված աշխատանքներ</h2>${history?assessmentScopeMarkup({disclosure:true}):''}<ol class="assessment-history-list" aria-label="Ավարտված աշխատանքների պատմություն">${history || '<li>Ավարտված աշխատանք դեռ չկա։</li>'}</ol></section>`;
    // Keep the selected chapter visible in the phone's scrollable chapter row (horizontal only).
    const chapterRow = root.querySelector('.course-chapters'), currentChapter = chapterRow?.querySelector('[aria-current=page]');
    // 16.5B review D2: a fade marks chips scrolled out of view in the phone's chapter row.
    if (chapterRow) {
      const edges = () => { chapterRow.toggleAttribute('data-more-before', chapterRow.scrollLeft > 2); chapterRow.toggleAttribute('data-more-after', chapterRow.scrollLeft + chapterRow.clientWidth < chapterRow.scrollWidth - 2); };
      chapterRow.addEventListener('scroll', edges, { passive: true });
      requestAnimationFrame(edges);
    }
    if (chapterRow && currentChapter && chapterRow.scrollWidth > chapterRow.clientWidth) chapterRow.scrollLeft += currentChapter.getBoundingClientRect().left - chapterRow.getBoundingClientRect().left - 8;
    if (tab === 'guides') {
      root.querySelectorAll(':scope > :not(nav):not(.student-course-hero)').forEach(node => node.remove());
      const guidesRoot = document.createElement('div');
      root.append(guidesRoot);
      disposeGuides = mountUnitGuides({root:guidesRoot,supabase,context:selection,isCurrent:valid});
      return;
    }
    if (tab === 'writing') {
      root.querySelectorAll(':scope > :not(nav):not(.student-course-hero)').forEach(node => node.remove());
      const writingRoot = document.createElement('div');
      root.append(writingRoot);
      disposeWriting = mountWrittenWork({root:writingRoot,supabase,context:selection,actorId:auth.session.user.id,isCurrent:valid,initialTaskId:/^[0-9a-f-]{36}$/i.test(new URLSearchParams(location.search).get("writingTask")??"")?new URLSearchParams(location.search).get("writingTask"):null});
      return;
    }
    const requestedMode = new URLSearchParams(location.search).get('action');
    if (requestedMode && Object.hasOwn(modes,requestedMode) && (data.modes[requestedMode]?.status==='configured' || active?.policyBindingId)) {
      document.body.dataset.studentPlayer = 'active';
      showPlayerExit(contextHref(context, tab));
      disposePlayer = mountLearningPlayer({root:document.getElementById('learningPlayer'),supabase,context,skills:data.skills,mode:requestedMode,targetSkillId:new URLSearchParams(location.search).get('skill'),isCurrent:valid,onComplete:()=>{ const url=new URL(location.href);url.searchParams.delete('action');url.searchParams.delete('skill');window.history.replaceState({},'',url);load(); }});
    }
  } catch(error) {
    if(valid())publishLearnerAccess({contexts:[],accessStatus:'unavailable'});
    if (valid()) root.textContent = error.message === 'invalid_context_selection'
      ? 'Ընտրեք դասընթացը գլխավոր էջից։'
      : /[\u0531-\u0587]/.test(error.message ?? '') ? error.message
      : 'Չհաջողվեց բեռնել դասընթացը։ Փորձեք նորից։';
  }
  finally { if (valid()) {loading=false;document.getElementById('courseLoading').classList.add('hidden');} }
}
access.subscribe(({reason,session})=>{
 if(reason==='TOKEN_REFRESHED'&&!loading){
  // Keep an active answer/focus intact. Every action still authorizes on the
  // server; recheck navigation without restarting a learning session.
  const request=version;
  setTimeout(async()=>{const {data,error,stale}=await access.read();if(stale||request!==version)return;
   let selection;try{selection=readLearningSelection(location.search);}catch{selection=null;}
   if(!selection||error||!data?.contexts?.some(c=>sameContext(c,selection))){++version;clear();root.textContent='Ընտրված դասընթացն այս պահին հասանելի չէ։';publishLearnerAccess({contexts:[]});}
   else publishLearnerAccess(data);
  },0);return;
 }
 clearTimeout(loadTimer);++version;accountId=session?.user?.id??null;clear();publishLearnerAccess({contexts:[],accessStatus:accountId?'loading':'signed_out'});
 if(reason==='pagehide'||!session){loading=false;document.getElementById('courseLoading').classList.add('hidden');return;}
 scheduleLoad();
});
window.addEventListener('popstate',scheduleLoad);
scheduleLoad();
