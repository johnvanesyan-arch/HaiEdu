import {mountStudentTeacherTasks} from './student-teacher-tasks.mjs';
import {mountStudentWritingAssignments} from './writing-assignments.mjs';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { groupLearningContexts, courseLabel, courseKey, contextKey, contextHref, sameContext, readLearningSelection, studentHomeHref, escapeHtml as esc } from './learning-navigation.mjs';
import { subjectArtwork } from './subject-visuals.mjs';
import { studentIcon, learningArtwork } from './student-visuals.mjs';
import { homeLearningSummary } from './student-home-model.mjs';
import { mountStudentResourceAssignments } from './resource-assignments.mjs';
const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const panel = document.getElementById('modePanel');
const requestedView = new URLSearchParams(location.search).get('view');
const view = ['courses', 'work'].includes(requestedView) ? requestedView : 'home';
let root, contexts = [], courses = [], selected = null, requestedCourse = '';
let assignmentView = null,writingAssignmentView=null,customTaskView=null,deferredTaskAccess=null;
function clearAssignments() { customTaskView?.dispose();customTaskView=null; writingAssignmentView?.dispose();writingAssignmentView=null; assignmentView?.dispose(); assignmentView = null; }
let epoch = 0, accessSignature = null, actorId = null;

function ensureRoot() {
  if (!panel) return false;
  document.getElementById('dashboardContent')?.classList.add('hidden');
  document.getElementById('dashboardLoading')?.classList.add('hidden');
  root = document.getElementById('multiSubjectHome');
  if (!root) { root = document.createElement('div'); root.id = 'multiSubjectHome'; panel.appendChild(root); }
  root.className = 'amp-multisubject-home student-home-main';
  document.body.classList.add('amp-multisubject-ready');
  return true;
}
function state(title, message, retry = false) {
  return `<section class="card student-state${retry ? ' student-error' : ''}" role="status"><h3>${title}</h3><p>${message}</p>${retry ? '<button type="button" data-retry-access>Փորձել նորից</button>' : ''}</section>`;
}
function selectorMarkup() {
  return `<div class="student-selection"><label for="studentCourseSelect">Դասընթացը<select id="studentCourseSelect"><option value="">Ընտրեք դասընթացը</option>${courses.map(course => `<option value="${esc(course.key)}"${course.key === requestedCourse ? ' selected' : ''}>${esc(courseLabel(course))} · ${esc(course.className)} · ${esc(course.schoolName)}</option>`).join('')}</select></label><label for="studentUnitSelect">Բաժինը<select id="studentUnitSelect"${requestedCourse ? '' : ' disabled'}>${unitOptions()}</select></label></div>`;
}
function unitOptions() {
  const course = courses.find(course => course.key === requestedCourse);
  return '<option value="">Ընտրեք բաժինը</option>' + (course?.units ?? []).map(unit => `<option value="${esc(contextKey(unit))}"${sameContext(unit, selected) ? ' selected' : ''}>${esc(unit.unitTitleHy)} · Թողարկում ${esc(unit.releaseNumber)}</option>`).join('');
}
function courseCards() {
  const writing = view === 'work';
  return `<section id="mySubjects" aria-labelledby="mySubjectsTitle"><div class="amp-subjects-heading"><div><h2 id="mySubjectsTitle">${writing ? 'Գրավոր աշխատանքներ՝ ըստ դասընթացի' : 'Իմ դասընթացները'}</h2></div><a class="student-help-link" href="./join.html">Միանալ դասարանին</a></div><div class="amp-subject-grid">${courses.map(course => {
    const unit = selected && courseKey(selected) === course.key ? selected : course.units[0];
    const tab = writing ? 'writing' : 'course';
    return `<article class="card amp-subject-card"><div class="student-card-art" aria-hidden="true">${subjectArtwork(course.subjectCode)}</div><h3>${esc(courseLabel(course))}</h3><p>${esc(course.className)} · ${esc(course.schoolName)}<br>${esc(course.academicYearLabel)}</p><a class="button-link ghost" href="${esc(contextHref(unit, tab))}">${writing ? 'Բացել գրավոր աշխատանքները' : 'Բացել դասընթացը'}</a><details class="student-unit-links"><summary>Բաժինների ցանկ · ${course.units.length}</summary><div class="amp-subject-class-list">${course.units.map(unit => `<a href="${esc(contextHref(unit, tab))}">${esc(unit.unitTitleHy)} <small>· Թողարկում ${esc(unit.releaseNumber)}</small></a>`).join('')}</div></details></article>`;
  }).join('')}</div></section>`;
}
function render() {
  clearAssignments();
  const welcome = view === 'work'
    ? ['Ձեր աշխատանքներն ու ուսուցչի արձագանքը', 'Այստեղ են ուսուցչի հանձնարարությունները, ձեր գրավոր աշխատանքները և ստացած մեկնաբանությունները։']
    : view === 'courses'
      ? ['Բացեք նոր էջ ձեր ուսուցման մեջ', 'Ընտրեք դասընթացը և շարունակեք ձեր աշխատանքը։']
      : ['Բարի գալուստ։ Շարունակե՞նք սովորել։', 'Ընտրեք դասընթացն ու բաժինը։ Ձեր ընթացիկ աշխատանքը կհայտնվի այստեղ։'];
  root.innerHTML = `<section class="student-home-welcome"><div><span class="mode-kicker">Իմ ուսուցումը</span><h2>${welcome[0]}</h2><p>${welcome[1]}</p></div>${learningArtwork()}</section>${view === 'home' ? selectorMarkup() + '<div id="studentNextStep" aria-live="polite" aria-atomic="true"></div>' : ''}${view==='work'?'<section aria-label="Ուսուցչի առաջադրանքները"><h2>Ուսուցչի առաջադրանքները</h2><div id="studentCustomTasks"></div><div id="studentWritingAssignments"></div><div id="studentResourceAssignments"></div></section>':''}${courseCards()}`;
  if (view === 'home') void loadSelected();
  if(view==='work')customTaskView=mountStudentTeacherTasks({root:root.querySelector('#studentCustomTasks'),client:supabase,actorId,onClean:()=>queueMicrotask(()=>{if(deferredTaskAccess&&!customTaskView?.hasUnsaved()){const latest=deferredTaskAccess;deferredTaskAccess=null;updateAccess(latest);}})});
  if(view==='work')writingAssignmentView=mountStudentWritingAssignments({root:root.querySelector('#studentWritingAssignments'),client:supabase});
  if (view === 'work') assignmentView = mountStudentResourceAssignments({root:root.querySelector('#studentResourceAssignments'),client:supabase});
}
function syncSelectionUrl() {
  const url = new URL(studentHomeHref(view, selected), location.href);
  url.hash = location.hash;
  history.replaceState({}, '', url);
  window.dispatchEvent(new CustomEvent('haiedu-home-selection'));
}
async function loadSelected() {
  const request = ++epoch;
  const target = root.querySelector('#studentNextStep');
  if (!target) return;
  const context = selected;
  if (!context) { target.innerHTML = state('Ո՞ր բաժնից շարունակենք', 'Ընտրեք դասընթացն ու բաժինը վերևի ցանկերից։'); return; }
  target.innerHTML = state('Բեռնվում է ձեր աշխատանքը…', 'Ստուգում ենք ընտրված բաժնի հասանելի աշխատանքները։');
  const current = () => request === epoch && sameContext(context, selected) && contexts.some(item => sameContext(item, context));
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!current()) return;
    if (!auth.session) throw Error('signed_out');
    const account = auth.session.user.id;
    if (!actorId) actorId = account;
    const { data, error } = await supabase.functions.invoke('get-student-dashboard', { body: {
      enrollmentId: context.enrollmentId, curriculumReleaseId: context.curriculumReleaseId, unitId: context.unitId,
    } });
    if (!current() || (actorId && actorId !== account)) return;
    if (error || !data?.dashboardVersion || (data.context && !sameContext(data.context, context))) throw Error('unavailable');
    const summary = homeLearningSummary(context, data), readiness = summary.readiness;
    target.innerHTML = `<section class="card student-next"><div><p class="student-context">${esc(courseLabel(context))} · ${esc(context.unitTitleHy)}<br>${esc(context.schoolName)} · ${esc(context.className)} · ${esc(context.academicYearLabel)}</p><h3>${esc(summary.title)}</h3><p>${esc(summary.description)}</p>${summary.count ? `<p>${esc(summary.count)}</p>` : ''}<a class="button-link student-continue" href="${esc(summary.href)}">${esc(summary.action)}${studentIcon('arrow')}</a></div>${readiness ? `<a class="student-readiness" href="${esc(contextHref(context,'progress'))}" aria-label="Ստուգարքի պատրաստություն՝ ${readiness.ready}՝ ${readiness.required} պահանջվող հմտությունից։ Բացել առաջընթացը"><span class="student-readiness-ring" style="--ready-angle:${360 * readiness.ready / readiness.required}deg" aria-hidden="true"><strong>${readiness.ready} / ${readiness.required}</strong></span><span>Ստուգարքի պատրաստություն<br><small>Պահանջվող հմտություններ</small></span></a>` : ''}</section>`;
  } catch {
    if (current()) {
      target.innerHTML = state('Չհաջողվեց բեռնել աշխատանքը', 'Ստուգեք կապը և փորձեք նորից։ Դասընթացների ցանկը հասանելի է ստորև։');
      const button = document.createElement('button'); button.type = 'button'; button.dataset.retrySelected = 'true'; button.textContent = 'Փորձել նորից';
      target.firstElementChild.append(button);
    }
  }
}
function updateAccess(detail = {}) {
  if (!ensureRoot()) return;
  const signature = JSON.stringify([detail.accessStatus ?? '', detail.contexts ?? null]);
  if (signature === accessSignature) return;
  if(customTaskView?.hasUnsaved()){deferredTaskAccess=detail;return;}
  accessSignature = signature; ++epoch; clearAssignments();
  contexts = Array.isArray(detail.contexts) ? detail.contexts : [];
  courses = groupLearningContexts(contexts);
  contexts = courses.flatMap(course => course.units);
  if (detail.accessStatus === 'unavailable') {
    selected = null; root.innerHTML = state('Դասընթացներն այս պահին անհասանելի են', 'Չհաջողվեց ստուգել հասանելիությունը։', true); return;
  }
  if (!Array.isArray(detail.contexts) || detail.accessStatus === 'loading') {
    selected = null; root.innerHTML = state('Դասընթացները բեռնվում են…', 'Ստուգում ենք ձեր հասանելի դասընթացները։'); return;
  }
  if (!courses.length) {
    selected = null; requestedCourse = '';
    root.innerHTML = state('Ձեր ուսուցումը սկսվում է այստեղ', 'Հասանելի դասընթացներ դեռ չկան։ Միացեք ձեր ուսուցչի դասարանին տրամադրված կոդով կամ հրավերով։') + '<a class="button-link" href="./join.html">Միանալ դասարանին</a>';
    return;
  }
  let selection;
  try { selection = readLearningSelection(location.search); } catch { selection = {}; }
  selected = contexts.find(context => sameContext(context, selection)) ?? null;
  if (!selection && contexts.length === 1) selected = contexts[0];
  requestedCourse = selected ? courseKey(selected) : courses.length === 1 ? courses[0].key : '';
  render();
}
ensureRoot();
root?.addEventListener('change', event => {
  if (event.target.id === 'studentCourseSelect') {
    requestedCourse = event.target.value;
    const course = courses.find(item => item.key === requestedCourse);
    selected = course?.units.length === 1 ? course.units[0] : null;
    const unitSelect = root.querySelector('#studentUnitSelect');
    unitSelect.disabled = !course; unitSelect.innerHTML = unitOptions();
  } else if (event.target.id === 'studentUnitSelect') {
    selected = contexts.find(item => contextKey(item) === event.target.value && courseKey(item) === requestedCourse) ?? null;
  } else return;
  syncSelectionUrl(); void loadSelected();
});
root?.addEventListener('click', event => {
  if (event.target.closest('[data-retry-access]')) window.dispatchEvent(new CustomEvent('haiedu-refresh-courses'));
  if (event.target.closest('[data-retry-selected]')) void loadSelected();
});
supabase.auth.onAuthStateChange((event, session) => {
  const next = session?.user?.id ?? null;
  if (event === 'INITIAL_SESSION') { actorId = next; return; }
  if (next === actorId && event !== 'SIGNED_OUT') return;
  actorId = next; deferredTaskAccess=null; ++epoch; clearAssignments(); accessSignature = null; selected = null; contexts = []; courses = [];
  if (root) root.innerHTML = state('Դասընթացները բեռնվում են…', 'Ստուգում ենք հաշվի հասանելիությունը։');
});
window.addEventListener('haiedu-course-access', event => updateAccess(event.detail));
window.addEventListener('haiedu-navigation-ready', event => updateAccess(event.detail));
updateAccess(window.HaiEduCourseAccess);
