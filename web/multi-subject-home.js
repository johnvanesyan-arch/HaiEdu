import {mountStudentTeacherTasks} from './student-teacher-tasks.mjs';
import {mountStudentWritingAssignments} from './writing-assignments.mjs';
import { createClient } from './supabase-browser.bundle.mjs';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { groupLearningContexts, courseLabel, courseKey, contextKey, contextHref, sameContext, readLearningSelection, studentHomeHref, rememberLearningSelection, recallLearningSelection, forgetLearningSelection, escapeHtml as esc } from './learning-navigation.mjs';
import { subjectArtwork } from './subject-visuals.mjs';
import { studentIcon } from './student-visuals.mjs';
import { homeLearningSummary, homeLearningPath } from './student-home-model.mjs';
import { mountStudentResourceAssignments } from './resource-assignments.mjs';
import { mountWorkHub, workToolbarMarkup } from './student-work-hub.mjs';
import { mountStudentWorkList, describeWorkItem } from './student-work-list.mjs';
const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const panel = document.getElementById('modePanel');
const requestedView = new URLSearchParams(location.search).get('view');
const view = ['courses', 'work'].includes(requestedView) ? requestedView : 'home';
let root, contexts = [], courses = [], selected = null, requestedCourse = '';
let assignmentView = null,writingAssignmentView=null,customTaskView=null,deferredTaskAccess=null,workHub=null;
function clearAssignments() { workHub?.dispose();workHub=null; customTaskView?.dispose();customTaskView=null; writingAssignmentView?.dispose();writingAssignmentView=null; assignmentView?.dispose(); assignmentView = null; }
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
// Phone selects cannot wrap, so options name the course only; class and school are added
// only when two of the student's courses would otherwise read the same.
function courseOptionLabel(course) {
  const label = courseLabel(course);
  if (courses.filter(other => courseLabel(other) === label).length < 2) return label;
  const detailed = `${label} · ${course.className}`;
  return courses.filter(other => `${courseLabel(other)} · ${other.className}` === detailed).length < 2 ? detailed : `${detailed} · ${course.schoolName}`;
}
function selectorMarkup() {
  return `<div class="student-selection"><label for="studentCourseSelect">Դասընթացը<select id="studentCourseSelect"><option value="">Ընտրեք դասընթացը</option>${courses.map(course => `<option value="${esc(course.key)}"${course.key === requestedCourse ? ' selected' : ''}>${esc(courseOptionLabel(course))}</option>`).join('')}</select></label><label for="studentUnitSelect">Բաժինը<select id="studentUnitSelect"${requestedCourse ? '' : ' disabled'}>${unitOptions()}</select></label></div>`;
}
function unitOptions() {
  const course = courses.find(course => course.key === requestedCourse);
  return '<option value="">Ընտրեք բաժինը</option>' + (course?.units ?? []).map(unit => `<option value="${esc(contextKey(unit))}"${sameContext(unit, selected) ? ' selected' : ''}>${esc(unit.unitTitleHy)}${course.units.filter(other => other.unitTitleHy === unit.unitTitleHy).length > 1 ? ` · Թողարկում ${esc(unit.releaseNumber)}` : ''}</option>`).join('');
}
function courseCards() {
  const writing = view === 'work';
  return `<section id="mySubjects" aria-labelledby="mySubjectsTitle"><div class="amp-subjects-heading"><div><h2 id="mySubjectsTitle">${writing ? 'Գրավոր աշխատանքներ՝ ըստ դասընթացի' : 'Իմ դասընթացները'}</h2></div></div><div class="amp-subject-grid">${courses.map(course => {
    const unit = selected && courseKey(selected) === course.key ? selected : course.units[0];
    const tab = writing ? 'writing' : 'course';
    // Home uses the compact card from the refinement mockup; the card, its links and the
    // unit list keep their hooks for every other view and for production acceptance.
    if (view === 'home') return `<article class="card amp-subject-card student-course-compact" data-course-key="${esc(course.key)}"><span class="student-course-mark" aria-hidden="true">${subjectArtwork(course.subjectCode)}</span><div class="student-course-body"><p class="student-course-kicker" hidden>Ընտրված դասընթաց</p><h3>${esc(courseLabel(course))}</h3><p>${esc(course.className)} · ${esc(course.schoolName)} · ${esc(course.academicYearLabel)}</p><div class="student-course-readiness-slot"></div><a class="button-link ghost" href="${esc(contextHref(unit, tab))}">Բացել դասընթացը</a><details class="student-unit-links"><summary>Բաժինների ցանկ · ${course.units.length}</summary><div class="amp-subject-class-list">${course.units.map(unit => `<a href="${esc(contextHref(unit, tab))}">${esc(unit.unitTitleHy)} <small>· Թողարկում ${esc(unit.releaseNumber)}</small></a>`).join('')}</div></details></div></article>`;
    return `<article class="card amp-subject-card"><div class="student-card-art" aria-hidden="true">${subjectArtwork(course.subjectCode)}</div><h3>${esc(courseLabel(course))}</h3><p>${esc(course.className)} · ${esc(course.schoolName)}<br>${esc(course.academicYearLabel)}</p><a class="button-link ghost" href="${esc(contextHref(unit, tab))}">${writing ? 'Բացել գրավոր աշխատանքները' : 'Բացել դասընթացը'}</a><details class="student-unit-links"><summary>Բաժինների ցանկ · ${course.units.length}</summary><div class="amp-subject-class-list">${course.units.map(unit => `<a href="${esc(contextHref(unit, tab))}">${esc(unit.unitTitleHy)} <small>· Թողարկում ${esc(unit.releaseNumber)}</small></a>`).join('')}</div></details></article>`;
  }).join('')}</div>${writing ? '' : '<p class="student-join-hint">Ուսուցիչը տվե՞լ է նոր դասարանի կոդ։ <a class="student-help-link" href="./join.html">Միանալ դասարանին</a></p>'}</section>`;
}
function render() {
  clearAssignments();
  // Home leads with the one continuation action.
  // My work leads with one status filter and one refresh instead of the decorative welcome.
  const intro = view === 'home'
    ? '<section class="student-next-section" aria-labelledby="studentNextTitle"><h2 id="studentNextTitle">Ձեր հաջորդ քայլը</h2><div id="studentNextStep" aria-live="polite" aria-atomic="true"></div></section><div id="studentPath"></div><div id="studentFeedback"></div>' + selectorMarkup()
    // Courses opens directly on the course list (16.5B review C1: no decorative banner).
    : '';
  root.innerHTML = `${intro}${view==='work'?'<div id="studentWork"></div>':''}${courseCards()}`;
  root.classList.toggle('student-home-grid', view === 'home');
  if (view === 'home') { void loadSelected(); void loadFeedback(); }
  if(view==='work')mountWork(root.querySelector('#studentWork'));
}
// Re-check access only after an open teacher task has no unsaved work.
const taskClean=()=>queueMicrotask(()=>{if(deferredTaskAccess&&!customTaskView?.hasUnsaved()){const latest=deferredTaskAccess;deferredTaskAccess=null;updateAccess(latest);}});
// My work: one combined list; the three source sections remain the fallback.
function mountWork(target){
  customTaskView=mountStudentWorkList({root:target,client:supabase,actorId,onClean:taskClean,onFallback:()=>{customTaskView=null;mountWorkSections(target);}});
}
function mountWorkSections(target){
  target.innerHTML=workToolbarMarkup()+'<section class="student-work-sources" aria-label="Ուսուցչի առաջադրանքները"><h2>Ուսուցչի առաջադրանքները</h2><div id="studentCustomTasks"></div><div id="studentWritingAssignments"></div><div id="studentResourceAssignments"></div></section>';
  workHub=mountWorkHub({toolbar:target.querySelector('.student-work-toolbar'),scope:target.querySelector('.student-work-sources'),sources:3,refresh:()=>{customTaskView?.refresh();writingAssignmentView?.refresh();assignmentView?.refresh();}});
  customTaskView=mountStudentTeacherTasks({root:target.querySelector('#studentCustomTasks'),client:supabase,actorId,hubRefresh:true,onRender:state=>workHub?.report('task',state),onClean:taskClean});
  writingAssignmentView=mountStudentWritingAssignments({root:target.querySelector('#studentWritingAssignments'),client:supabase,hubRefresh:true,onRender:state=>workHub?.report('writing',state)});
  assignmentView=mountStudentResourceAssignments({root:target.querySelector('#studentResourceAssignments'),client:supabase,hubRefresh:true,onRender:state=>workHub?.report('material',state)});
}
function readSelectionSafely() { try { return readLearningSelection(location.search); } catch { return {}; } }
function syncSelectionUrl() {
  const url = new URL(studentHomeHref(view, selected), location.href);
  url.hash = location.hash;
  history.replaceState({}, '', url);
  window.dispatchEvent(new CustomEvent('haiedu-home-selection'));
}
// «Your path in this unit»: the three learning steps of the selected unit (same reply as the next step).
const pathMarker = (step, n) => step.state === 'done' ? studentIcon('check') : step.state === 'locked' || step.state === 'unavailable' ? studentIcon('lock') : String(n);
// Only the selected course has a dashboard reply, so only its card shows readiness
// (no extra request per course, by the owner's decision of 6 November 2026).
function markSelectedCourse(context, data) {
  for (const card of root.querySelectorAll('.student-course-compact')) {
    const chosen = Boolean(context) && card.dataset.courseKey === courseKey(context);
    card.classList.toggle('is-selected', chosen);
    card.querySelector('.student-course-kicker').hidden = !chosen;
    const slot = card.querySelector('.student-course-readiness-slot');
    const summary = chosen && data ? homeLearningSummary(context, data).readiness : null;
    slot.innerHTML = summary ? `<p class="student-course-readiness-line"><span>Ստուգման պատրաստ</span><span>${summary.ready} / ${summary.required}</span></p><meter min="0" max="${summary.required}" value="${summary.ready}" aria-label="Պահանջվող հմտություններ՝ պատրաստ ստուգման">${summary.ready}/${summary.required}</meter>${summary.ready === summary.required ? '<span class="student-evidence-badge" data-readiness="ready">Պատրաստ է ստուգման</span>' : ''}` : '';
  }
}
function pathMarkup(data) {
  return `<section class="card student-path" aria-labelledby="studentPathTitle"><h2 id="studentPathTitle">Ձեր ուղին այս բաժնում</h2><ol>${homeLearningPath(data).map((step, i) => `<li data-path-state="${step.state}"><span class="student-path-marker" aria-hidden="true">${pathMarker(step, i + 1)}</span><span><strong>${esc(step.label)}</strong><span class="student-path-detail">${esc(step.detail)}</span></span></li>`).join('')}</ol></section>`;
}
// «Teacher feedback»: work returned for revision (teacher task «returned», writing
// «changes_requested») from the read-only combined My work list. Failure hides the card.
let feedbackTicket = 0;
async function loadFeedback() {
  const ticket = ++feedbackTicket, target = root.querySelector('#studentFeedback');
  if (!target || !courses.length) return;
  target.replaceChildren();
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (ticket !== feedbackTicket || !auth.session) return;
    const account = auth.session.user.id;
    const { data, error } = await supabase.functions.invoke('get-student-work', { body: { action: 'inbox', payload: { state: 'current' } } });
    if (ticket !== feedbackTicket || !target.isConnected || (actorId && actorId !== account)) return;
    if (error || data?.version !== 'student-work-v1' || !Array.isArray(data.items)) return;
    const returned = data.items.filter(({ source, row }) => (source === 'task' && row.state === 'returned') || (source === 'writing' && row.workState === 'changes_requested'));
    if (!returned.length) return;
    const latest = describeWorkItem(returned[0]);
    target.innerHTML = `<section class="card student-feedback-card" aria-labelledby="studentFeedbackTitle"><p class="student-feedback-kicker">Ուսուցչի արձագանք</p><h2 id="studentFeedbackTitle">${returned.length === 1 ? 'Ձեր աշխատանքը վերադարձվել է վերանայման' : `${returned.length} աշխատանք վերադարձվել է վերանայման`}</h2><p><span${latest.locale ? ` lang="${esc(latest.locale)}"` : ''}>${esc(latest.title ?? '')}</span>${latest.scope ? ` · ${esc(latest.scope)}` : ''}</p><a href="./index.html?view=work&amp;show=returned">Դիտել արձագանքը</a></section>`;
  } catch { /* The card is optional: Home stays usable without it. */ }
}
async function loadSelected() {
  const request = ++epoch;
  const target = root.querySelector('#studentNextStep'), path = root.querySelector('#studentPath');
  if (!target) return;
  if (path) path.replaceChildren();
  const context = selected;
  markSelectedCourse(context, null);
  if (!context) { target.innerHTML = state('Ո՞ր բաժնից շարունակենք', 'Ընտրեք դասընթացն ու բաժինը ստորև՝ ցանկերից։'); return; }
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
    const summary = homeLearningSummary(context, data);
    if (path) path.innerHTML = pathMarkup(data);
    markSelectedCourse(context, data);
    target.innerHTML = `<section class="card student-next"><div><p class="student-context">${esc(courseLabel(context))} · ${esc(context.unitTitleHy)}</p><h3>${esc(summary.title)}</h3><p>${esc(summary.description)}</p>${summary.count ? `<p>${esc(summary.count)}</p>` : ''}<a class="button-link student-continue" href="${esc(summary.href)}">${esc(summary.action)}${studentIcon('arrow')}</a></div></section>`;
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
  const selection = readSelectionSafely();
  selected = contexts.find(context => sameContext(context, selection)) ?? null;
  let recalled = false;
  if (!selection && contexts.length === 1) selected = contexts[0];
  else if (!selection && view === 'home') {
    // B7: reopen the unit this account last opened, if it is still one of its units.
    selected = contexts.find(context => sameContext(context, recallLearningSelection(actorId))) ?? null;
    recalled = Boolean(selected);
  }
  if (selection && selected) rememberLearningSelection(actorId, selected);
  requestedCourse = selected ? courseKey(selected) : courses.length === 1 ? courses[0].key : '';
  render();
  if (recalled) syncSelectionUrl();
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
  if (selected) rememberLearningSelection(actorId, selected);
  syncSelectionUrl(); void loadSelected();
});
root?.addEventListener('click', event => {
  if (event.target.closest('[data-retry-access]')) window.dispatchEvent(new CustomEvent('haiedu-refresh-courses'));
  if (event.target.closest('[data-retry-selected]')) void loadSelected();
});
supabase.auth.onAuthStateChange((event, session) => {
  const next = session?.user?.id ?? null;
  if (event === 'INITIAL_SESSION') {
    actorId = next;
    // Course access can arrive before the session event; remember a linked unit, or apply
    // the remembered one, now that the account is known.
    if (view === 'home' && selected && readSelectionSafely()) rememberLearningSelection(actorId, selected);
    if (view === 'home' && !selected && contexts.length > 1 && Array.isArray(window.HaiEduCourseAccess?.contexts)) { accessSignature = null; updateAccess(window.HaiEduCourseAccess); }
    return;
  }
  if (event === 'SIGNED_OUT') forgetLearningSelection();
  if (next === actorId && event !== 'SIGNED_OUT') return;
  actorId = next; deferredTaskAccess=null; ++epoch; ++feedbackTicket; clearAssignments(); accessSignature = null; selected = null; contexts = []; courses = [];
  if (root) root.innerHTML = state('Դասընթացները բեռնվում են…', 'Ստուգում ենք հաշվի հասանելիությունը։');
});
window.addEventListener('haiedu-course-access', event => updateAccess(event.detail));
window.addEventListener('haiedu-navigation-ready', event => updateAccess(event.detail));
updateAccess(window.HaiEduCourseAccess);
