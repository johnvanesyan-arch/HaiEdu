import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { readLearningSelection, sameContext, contextHref, courseLabel, escapeHtml as esc } from './learning-navigation.mjs';
import { registeredExtensionHref } from './learning-extensions.mjs';
import { mountLearningPlayer } from './learning-player.mjs';
const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const root = document.getElementById('courseContent');
let version = 0, disposePlayer = () => {};
function clear() { disposePlayer(); disposePlayer = () => {}; root.replaceChildren(); document.getElementById('courseTitle').textContent = 'Դասընթաց'; document.getElementById('courseSubtitle').textContent = ''; }
async function load() {
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
    const resume = active ? `<a class="button-link" href="${esc(action(active.mode,activeSpec ?? {}))}">Շարունակել · ${esc(modes[active.mode])} · ${active.answered}/${active.planned}</a>` : '';
    const modeCards = Object.entries(modes).map(([mode,label]) => {
      const spec = data.modes[mode];
      const enabled = spec?.status === 'configured' || spec?.status === 'registered_legacy';
      const locked = mode !== 'diagnostic' && !data.practiceAccess.unlocked;
      const done = mode === 'diagnostic' && data.baseline;
      const masteryReady = data.skills.length && data.skills.every(s => s.ready === true);
      const state = data.lifecycle?.state;
      const retryReady = /^mastery_retry_\d+_ready$/.test(state ?? '');
      const masteryBlocked = mode === 'mastery_check' && !active && !retryReady && !masteryReady;
      const final = ['mastery_passed','mastery_failed_final'].includes(state);
      const disabled = Boolean(active) || !enabled || locked || done || (mode === 'mastery_check' && (masteryBlocked || final));
      const minima = Object.entries(spec?.minimumCorrectBySkill ?? {}).map(([id,min]) => `${data.skills.find(s=>s.id===id)?.code ?? id}: ${min}`).join(' · ');
      return `<article class="card"><h3>${label}</h3><p>${enabled ? `${spec.questions} հարց${spec.hintsAllowed ? ' · օգնությունը հասանելի է' : ' · առանց օգնության'}` : 'Կանոնները դեռ չեն ակտիվացվել։'}</p>${spec?.minimumPercent != null ? `<p>Անցողիկ շեմ՝ ${spec.minimumPercent}%</p><p class="subtle">Հմտությունների նվազագույն ճիշտ պատասխաններ՝ ${esc(minima)}</p>` : ''}${done ? '<p>Ախտորոշիչն ավարտված է։</p>' : locked ? '<p>Նախ ավարտեք այս գլխի ախտորոշիչը։</p>' : masteryBlocked && mode==='mastery_check' ? '<p>Նախ ամրապնդեք պահանջվող հմտությունները կամ ավարտեք պարտադիր կրկնությունը։</p>' : ''}${disabled ? '' : `<a class="button-link" href="${esc(action(mode,spec))}">Բացել</a>`}</article>`;
    }).join('');
    const skills = data.skills.map(s=>`<tr><td>${esc(s.code)} — ${esc(s.nameHy)}</td><td>${s.mastery ? `${s.mastery.percent}% · ${s.mastery.evidenceCount} պատասխան` : 'Տվյալը հասանելի չէ'}</td><td>${s.ready === true ? 'Պատրաստ է' : s.ready === false ? 'Ամրապնդում է պետք' : '—'}</td><td>${tab !== "progress" && data.practiceAccess.unlocked && ['configured','registered_legacy'].includes(data.modes.practice.status) ? `<a href="${esc(action('practice',data.modes.practice,s.id))}">Վարժանք</a>` : ''}</td></tr>`).join('');
    const legacyCourse = registeredExtensionHref(context.extensionKey,'course',context);
    const history = data.history.map(s=>`<tr><td>${esc(modes[s.mode])}</td><td>${s.correct}/${s.answered}${s.percent==null?'':` · ${s.percent}%`}</td><td>${esc(s.completedAt)}</td><td><details><summary>Սկզբնական տարբերակները</summary><p>Թողարկում՝ ${esc(s.curriculumReleaseId)}<br>Սեսիա՝ ${esc(s.id)}<br>Հարցաշար՝ ${esc(s.blueprintId)}<br>Կանոնների կապ՝ ${esc(s.policyBindingId || 'Հին գրանցված կանոններ')}<br>Մոդել՝ ${esc(s.modelId || 'Չգրանցված')}<br>Կոդի տարբերակ՝ ${esc(s.runtimeBuildId || 'Չգրանցված')}<br>Փորձերի կանոններ՝ ${esc(s.academicMasteryPolicyId || 'Չգրանցված')}<br>Ծագման կարգավիճակ՝ ${esc(s.provenanceStatus)}</p></details></td></tr>`).join('');
    root.innerHTML = `<div class="row">${[['assessment','Գնահատումներ'],['course','Դասընթաց'],['progress','Առաջընթաց']].map(([t,l])=>`<a class="button-link ghost" href="${esc(contextHref(context,t))}"${t===tab?' aria-current="page"':''}>${l}</a>`).join('')}</div><p>${data.baseline ? `Ելակետային ախտորոշիչ՝ ${data.baseline.correct}/${data.baseline.answered} · ${data.baseline.percent}%` : 'Ախտորոշիչը կսահմանի ձեր մեկնարկային մակարդակը։'}</p><p>${data.lifecycle ? `Յուրացման օգտագործված փորձեր՝ ${data.lifecycle.attemptsUsed}/${data.maximumAttempts ?? '—'}` : ''}</p>${resume}${legacyCourse ? `<p><a class="button-link ghost" href="${esc(legacyCourse)}">Դիտել դասընթացի թեմաները</a></p>` : ""}<div id="learningPlayer"></div>${tab==='progress' ? `<p class="subtle">Հմտությունների ցուցանիշները տվյալ թողարկման ուսումնական պատմությունն են։ Տարբեր կանոններով սեսիաները ներկայացվում են առանձին։</p><div class="matrix-wrap"><table><thead><tr><th>Հմտություն</th><th>Ուսումնական ապացույց</th><th>Պատրաստություն</th><th></th></tr></thead><tbody>${skills}</tbody></table></div>` : `<div class="amp-subject-grid">${active ? "" : modeCards}</div>${tab==='course'?`<h2>Հմտություններ</h2><div class="matrix-wrap"><table><tbody>${skills}</tbody></table></div>`:""}` }<h2>Ավարտված աշխատանքներ</h2><div class="matrix-wrap"><table><thead><tr><th>Տեսակ</th><th>Արդյունք</th><th>Ավարտ</th><th>Ծագում</th></tr></thead><tbody>${history || '<tr><td colspan="4">Ավարտված աշխատանք դեռ չկա։</td></tr>'}</tbody></table></div>`;
    const requestedMode = new URLSearchParams(location.search).get('action');
    if (requestedMode && Object.hasOwn(modes,requestedMode) && (data.modes[requestedMode]?.status==='configured' || active?.policyBindingId)) {
      disposePlayer = mountLearningPlayer({root:document.getElementById('learningPlayer'),supabase,context,mode:requestedMode,targetSkillId:new URLSearchParams(location.search).get('skill'),isCurrent:valid,onComplete:()=>{ const url=new URL(location.href);url.searchParams.delete('action');url.searchParams.delete('skill');history.replaceState({},'',url);load(); }});
    }
  } catch(error) { if (valid()) root.textContent = error.message; }
  finally { if (valid()) document.getElementById('courseLoading').classList.add('hidden'); }
}
supabase.auth.onAuthStateChange((_event,session)=>{ ++version; clear(); if(session)setTimeout(load,0); });
window.addEventListener('popstate',load);
load();
