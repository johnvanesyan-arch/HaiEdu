import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { schoolMembershipStatus } from "./school-membership-status.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const pageSize = 20;
const viewBySection = {
  overviewSection: "overview",
  schoolsSection: "schools",
  accountsSection: "accounts",
  archiveSection: "archive",
  deletionsSection: "deletions",
  auditSection: "audit",
};
const sections = Object.keys(viewBySection);
let actor = null;
let currentView = "overview";
let schoolPage = 1;
let accountPage = 1;
let archivePage = 1;
let selectedSchoolId = null;
let accountCache = new Map();

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

function fmtDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("hy-AM");
}

function roleLabel(role) {
  return ({ admin:"Master admin", content_admin:"Բովանդակության ստուգող", school_admin:"Դպրոցի ադմին", teacher:"Ուսուցիչ", student:"Աշակերտ", parent:"Ծնող" })[role] || role || "—";
}

function statusLabel(status) {
  return ({ active:"Ակտիվ", suspended:"Կասեցված", archived:"Արխիվացված", deletion_pending:"Ջնջման սպասող", ended:"Ավարտված", revoked:"Չեղարկված" })[status] || status || "—";
}

function schoolStatusMarkup(user) {
  const membership = schoolMembershipStatus(user?.membershipStatus);
  const accountWarning = user?.accountStatus && user.accountStatus !== "active"
    ? `<span class="status-chip ${esc(user.accountStatus)}">Հաշիվը՝ ${esc(statusLabel(user.accountStatus))}</span>`
    : "";
  return `<div class="school-status-stack"><span class="status-chip school-${membership.key}">${esc(membership.label)}</span>${accountWarning}</div>`;
}

function displayUser(user) {
  if (!user) return "—";
  return user.displayName || user.email || `User ${String(user.id || "").slice(0, 8)}`;
}

function setMessage(text, bad = false) {
  const target = $("consoleMessage");
  if (!target) return;
  target.textContent = text || "";
  target.style.color = bad ? "#8a3342" : "#356246";
}

function friendlyError(error) {
  const value = String(error?.message || error || "");
  const labels = {
    mfa_required: "Այս գործողության համար անհրաժեշտ է MFA-ով հաստատված master admin սեսիա։",
    admin_required: "Այս հաշիվը չունի master admin իրավունք։",
    last_active_admin_protected: "Վերջին ակտիվ master admin հաշիվը չի կարող կասեցվել կամ փոխել դերը։",
    last_active_school_admin_protected: "Այս հաշիվը մեկ կամ մի քանի դպրոցի վերջին ակտիվ ադմինն է։ Նախ նշանակեք մեկ այլ ակտիվ դպրոցի ադմին։",
    master_admin_deletion_forbidden: "Master admin հաշիվը վերջնականապես ջնջել չի կարելի։",
    cannot_change_own_role: "Չեք կարող փոխել ձեր սեփական master admin դերը։",
    cannot_change_own_status: "Չեք կարող փոխել ձեր սեփական հաշվի վիճակը։",
    account_type_immutable: "Աշակերտի, ուսուցչի և դպրոցի ադմինի հաշվի տեսակը չի կարող փոխվել։ Platform staff դերերը կառավարվում են միայն առանձին platform հաշիվների միջև։",
    institutional_role_change_forbidden: "Ուսուցչի և դպրոցի ադմինի դերը կառավարվում է միայն համապատասխան հրավերի ու դպրոցի անդամակցության միջոցով։",
    active_pristine_account_required: "Platform staff դերի համար անհրաժեշտ է հաստատված, ակտիվ և ուսումնական պատմություն չունեցող առանձին հաշիվ։",
    suspend_before_archiving: "Հաշիվը նախ պետք է կասեցնել, հետո՝ արխիվացնել։",
    school_not_found: "Դպրոցը չի գտնվել։",
    class_not_found: "Դասարանը չի գտնվել։",
  };
  if (labels[value]) return `${labels[value]}${error?.detail ? ` (${error.detail})` : ""}`;
  return error?.detail || value;
}

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const response = error.context;
    const payload = response instanceof Response ? await response.json().catch(() => null) : null;
    const failure = new Error(payload?.error || data?.error || error.message);
    failure.detail = payload?.detail || data?.detail || "";
    throw failure;
  }
  if (data?.error) {
    const failure = new Error(data.error);
    failure.detail = data.detail || "";
    throw failure;
  }
  return data;
}

function requestedView() {
  const section = window.location.hash.slice(1);
  return viewBySection[section] || "overview";
}

function showView(view) {
  currentView = view;
  for (const id of sections) {
    const section = $(id);
    if (section) section.hidden = viewBySection[id] !== view;
  }
}

function renderPager(targetId, page, total, onChange) {
  const target = $(targetId);
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  if (!target || pages <= 1) {
    if (target) target.innerHTML = "";
    return;
  }
  target.innerHTML = `<button type="button" class="ghost" data-prev ${page <= 1 ? "disabled" : ""}>Նախորդ</button><span>Էջ ${page} / ${pages}</span><button type="button" class="ghost" data-next ${page >= pages ? "disabled" : ""}>Հաջորդ</button>`;
  target.querySelector("[data-prev]")?.addEventListener("click", () => onChange(page - 1));
  target.querySelector("[data-next]")?.addEventListener("click", () => onChange(page + 1));
}

function cacheUsers(users = []) {
  for (const user of users) accountCache.set(user.id, user);
}

function actionButtons(user, compact = false) {
  if (!user || user.id === actor?.id) return '<span class="protected-note">Ձեր հաշիվը</span>';
  if (user.accountStatus === "active") return `<button class="secondary" data-action="suspend" data-user="${esc(user.id)}">Կասեցնել</button>`;
  if (user.accountStatus === "suspended") return `<button data-action="activate" data-user="${esc(user.id)}">Ակտիվացնել</button><button class="secondary" data-action="archive" data-user="${esc(user.id)}">Արխիվացնել</button>`;
  if (user.accountStatus === "archived") return `<button class="secondary" data-action="unarchive" data-user="${esc(user.id)}">Վերականգնել</button>${user.role === "admin" ? '<span class="protected-note">Ջնջումը արգելված է</span>' : compact ? "" : '<span class="protected-note">Պահպանված է արխիվում</span>'}`;
  return '<span class="protected-note">Գործողությունն արգելված է</span>';
}

function bindAccountActions(root = document) {
  root.querySelectorAll("button[data-action][data-user]").forEach((button) => {
    button.addEventListener("click", () => handleUserAction(button.dataset.action, button.dataset.user));
  });
}

function renderOverview(data) {
  actor = data.actor;
  const summary = data.summary || {};
  const cards = [
    ["Ակտիվ դպրոցներ", summary.activeSchools ?? 0],
    ["Դպրոցի ադմիններ", summary.activeSchoolAdmins ?? 0],
    ["Ակտիվ ուսուցիչներ", summary.activeTeachers ?? 0],
    ["Ուշադրության հարցեր", summary.attentionCount ?? 0],
  ];
  $("stats").innerHTML = cards.map(([label, value]) => `<article class="card admin-stat"><span class="stat-label">${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
  const attention = data.attention || [];
  $("attentionList").innerHTML = attention.length ? attention.map((item) => `<article class="admin-list-item ${esc(item.severity || "")}"><div><strong>${esc(item.label)}</strong><p class="subtle small">${esc(item.detail || "")}</p></div>${item.href ? `<a class="text-link" href="${esc(item.href)}">Բացել</a>` : ""}</article>`).join("") : '<div class="admin-empty">Այս պահին անհետաձգելի խնդիր չկա։</div>';
  const recent = data.recentAudit || [];
  $("recentActivity").innerHTML = recent.length ? recent.map((event) => `<article class="admin-activity-item"><div><strong>${esc(event.action)}</strong><p class="subtle small">${esc(event.actorDisplayName || event.actorRole || "Համակարգ")} · ${esc(event.targetDisplayName || event.targetType || "—")}</p></div><time class="admin-activity-time">${esc(fmtDate(event.createdAt))}</time></article>`).join("") : '<div class="admin-empty">Աուդիտի նոր գրառում չկա։</div>';
}

function renderSchools(data) {
  actor = data.actor;
  const schools = data.schools || [];
  $("schoolDirectory").innerHTML = schools.length ? schools.map((school) => `<article class="school-card">
    <div><h3>${esc(school.name)}</h3><span class="school-code">${esc(school.schoolCode)}</span></div>
    <div class="school-metric"><span>Ադմիններ</span><strong>${esc(school.adminCount)}</strong></div>
    <div class="school-metric"><span>Ուսուցիչներ</span><strong>${esc(school.teacherCount)}</strong></div>
    <div class="school-metric"><span>Աշակերտներ</span><strong>${esc(school.studentCount)}</strong></div>
    <button type="button" class="ghost" data-open-school="${esc(school.id)}">Բացել դպրոցը</button>
  </article>`).join("") : '<div class="admin-empty">Այս չափանիշներով դպրոց չի գտնվել։</div>';
  $("schoolDirectory").querySelectorAll("[data-open-school]").forEach((button) => button.addEventListener("click", () => loadSchoolDetail(button.dataset.openSchool)));
  renderPager("schoolPager", data.page || 1, data.total || 0, (next) => { schoolPage = next; loadSchools(); });
}

function renderSchoolDetail(data) {
  const target = $("schoolDetail");
  const school = data.school;
  if (!school) { target.classList.add("hidden"); return; }
  cacheUsers([...(data.admins || []), ...(data.teachers || [])]);
  const admins = data.admins || [];
  const teachers = data.teachers || [];
  target.innerHTML = `<div class="school-detail-header">
    <div><span class="mode-kicker">ԴՊՐՈՑ</span><h3>${esc(school.name)}</h3><span class="school-code">${esc(school.schoolCode)}</span></div>
    <div class="school-detail-stats"><span>${esc(admins.length)} ադմին</span><span>${esc(teachers.length)} ուսուցիչ</span><span>${esc(data.classCount || 0)} դասարան</span><span>${esc(data.studentCount || 0)} աշակերտ</span></div>
  </div>
  <section class="school-branch"><div class="school-branch-heading"><h4>Դպրոցի ադմիններ</h4><span class="subtle small">Ուսուցիչները չեն պատկանում որևէ մեկ ադմինի հաշվին։</span></div>
    <div class="person-list">${admins.length ? admins.map((user) => `<article class="person-card"><div class="person-card-static"><div><span class="person-name">${esc(displayUser(user))}</span><div class="person-meta">${esc(user.email || "էլ. հասցե չկա")}</div></div>${schoolStatusMarkup(user)}<div class="admin-actions">${actionButtons(user, true)}</div></div></article>`).join("") : '<div class="admin-empty">Ակտիվ դպրոցի ադմին չկա։ Սա պահանջում է անհապաղ գործողություն։</div>'}</div>
  </section>
  <section class="school-branch"><div class="school-branch-heading"><h4>Ուսուցիչներ և դասարաններ</h4><span class="subtle small">Դասարանների աշակերտները բացվում են ըստ պահանջի։</span></div>
    <div class="person-list">${teachers.length ? teachers.map((teacher) => `<details class="person-card"><summary><div><span class="person-name">${esc(displayUser(teacher))}</span><div class="person-meta">${esc(teacher.email || "էլ. հասցե չկա")} · ${esc((teacher.subjects || []).join(", ") || "Առարկա նշված չէ")}</div></div>${schoolStatusMarkup(teacher)}<div class="admin-actions">${actionButtons(teacher, true)}</div></summary><div class="class-assignment-list">${renderTeacherClasses(teacher.classes || [], school.id)}</div></details>`).join("") : '<div class="admin-empty">Ուսուցիչ դեռ չկա։</div>'}</div>
  </section>`;
  target.classList.remove("hidden");
  bindAccountActions(target);
  target.querySelectorAll("[data-load-roster]").forEach((button) => button.addEventListener("click", () => loadClassStudents(button.dataset.school, button.dataset.loadRoster)));
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTeacherClasses(classes, schoolId) {
  if (!classes.length) return '<div class="admin-empty">Դասարանային նշանակում չկա։</div>';
  return classes.map((klass) => `<div class="class-assignment"><strong>${esc(klass.name)}</strong><span>${esc(klass.gradeLabel || "Դասարան նշված չէ")}</span><span>${esc(klass.subjectName || "Առարկա նշված չէ")}</span><span>${esc(klass.studentCount || 0)} աշակերտ</span><button type="button" class="ghost" data-load-roster="${esc(klass.id)}" data-school="${esc(schoolId)}">Դիտել աշակերտներին</button></div><div id="roster-${esc(klass.id)}"></div>`).join("");
}

function renderAccounts(data, archived = false) {
  actor = data.actor;
  const users = data.users || [];
  cacheUsers(users);
  const target = archived ? $("archiveRows") : $("userRows");
  target.innerHTML = users.length ? users.map((user) => archived ? `<tr>
    <td><strong>${esc(displayUser(user))}</strong><div class="subtle small">${esc(user.email || "էլ. հասցե չկա")}</div></td>
    <td><span class="role-chip">${esc(roleLabel(user.role))}</span></td>
    <td>${esc(fmtDate(user.statusChangedAt))}</td>
    <td><div class="admin-actions">${actionButtons(user)}</div></td>
  </tr>` : `<tr>
    <td><strong>${esc(displayUser(user))}</strong><div class="subtle small">${esc(user.email || "էլ. հասցե չկա")}</div></td>
    <td><span class="role-chip">${esc(roleLabel(user.role))}</span></td>
    <td><span class="status-chip ${esc(user.accountStatus)}">${esc(statusLabel(user.accountStatus))}</span></td>
    <td>${esc(fmtDate(user.lastSignInAt))}</td>
    <td><div class="admin-actions">${renderRoleEditor(user)}${actionButtons(user, true)}</div></td>
  </tr>`).join("") : `<tr><td colspan="${archived ? 4 : 5}" class="empty-row">Հաշիվ չի գտնվել։</td></tr>`;
  bindAccountActions(target);
  target.querySelectorAll("[data-set-role]").forEach((button) => button.addEventListener("click", () => handleUserAction("set_role", button.dataset.setRole)));
  renderPager(archived ? "archivePager" : "accountPager", data.page || 1, data.total || 0, (next) => {
    if (archived) { archivePage = next; loadArchive(); } else { accountPage = next; loadAccounts(); }
  });
}

function renderRoleEditor(user) {
  if (user.id === actor?.id || !["content_admin", "admin"].includes(user.role) || user.accountStatus !== "active") return "";
  const roles = ["content_admin", "admin"];
  const options = roles.map((role) => `<option value="${role}" ${role === user.role ? "selected" : ""}>${esc(roleLabel(role))}</option>`).join("");
  return `<select data-role-select="${esc(user.id)}" aria-label="Փոխել դերը">${options}</select><button type="button" class="ghost" data-set-role="${esc(user.id)}">Պահել դերը</button>`;
}

function renderDeletionRequests(data) {
  actor = data.actor;
  cacheUsers(data.users || []);
  const requests = data.deletionRequests || [];
  $("deletionRows").innerHTML = requests.length ? requests.map((request) => {
    const user = accountCache.get(request.user_id);
    let actions = "—";
    if (request.status === "pending") actions = `<div class="admin-actions"><button data-delete-approve="${esc(request.id)}">Հաստատել հարցումը</button><button class="secondary" data-delete-reject="${esc(request.id)}">Մերժել</button></div>`;
    if (request.status === "processing") actions = `<div class="admin-actions"><button class="danger-btn" data-delete-execute="${esc(request.id)}">Ջնջել վերջնականապես</button><button class="secondary" data-delete-reject="${esc(request.id)}">Մերժել / վերադարձնել</button></div>`;
    return `<tr><td><code>${esc(request.id.slice(0, 8))}</code></td><td>${esc(displayUser(user))}</td><td><span class="status-chip ${esc(request.status)}">${esc(request.status)}</span>${request.resolution_code ? `<div class="subtle small">${esc(request.resolution_code)}</div>` : ""}</td><td>${esc(fmtDate(request.requested_at))}</td><td>${actions}</td></tr>`;
  }).join("") : '<tr><td colspan="5" class="empty-row">Ջնջման բաց հարցում չկա։</td></tr>';
  $("deletionRows").querySelectorAll("[data-delete-approve]").forEach((button) => button.addEventListener("click", () => approveDeletion(button.dataset.deleteApprove)));
  $("deletionRows").querySelectorAll("[data-delete-execute]").forEach((button) => button.addEventListener("click", () => executeDeletion(button.dataset.deleteExecute)));
  $("deletionRows").querySelectorAll("[data-delete-reject]").forEach((button) => button.addEventListener("click", () => rejectDeletion(button.dataset.deleteReject)));
}

function renderAudit(data) {
  actor = data.actor;
  cacheUsers(data.users || []);
  const rows = data.auditEvents || [];
  $("auditRows").innerHTML = rows.length ? rows.map((event) => {
    const detail = Object.entries(event.details || {}).slice(0, 4).map(([key, value]) => `${key}: ${String(value)}`).join(" · ");
    const eventActor = accountCache.get(event.actor_user_id);
    const eventTarget = accountCache.get(event.target_user_id);
    return `<tr><td>${esc(fmtDate(event.created_at))}</td><td><strong>${esc(event.action)}</strong><div class="audit-meta">${esc(detail)}</div></td><td>${esc(eventActor ? displayUser(eventActor) : event.actor_role || "—")}</td><td>${esc(eventTarget ? displayUser(eventTarget) : event.target_key || event.target_type || "—")}</td><td>${esc(event.outcome)}</td></tr>`;
  }).join("") : '<tr><td colspan="5" class="empty-row">Աուդիտի գրառում չկա։</td></tr>';
}

async function ensureMfa() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data?.currentLevel === "aal2";
}

async function loadOverview() {
  setMessage("Գլխավոր պատկերը բեռնվում է…");
  renderOverview(await invoke("get-admin-dashboard", { view: "overview" }));
}

async function loadSchools() {
  setMessage("Դպրոցների ցանկը բեռնվում է…");
  renderSchools(await invoke("get-admin-dashboard", { view: "schools", page: schoolPage, pageSize, search: $("schoolSearch").value.trim() }));
}

async function loadSchoolDetail(schoolId) {
  try {
    selectedSchoolId = schoolId;
    setMessage("Դպրոցի տվյալները բեռնվում են…");
    renderSchoolDetail(await invoke("get-admin-dashboard", { view: "school_detail", schoolId }));
    setMessage("");
  } catch (error) { setMessage(friendlyError(error), true); }
}

async function loadClassStudents(schoolId, classId, page = 1) {
  const target = $(`roster-${classId}`);
  try {
    target.innerHTML = '<div class="student-roster">Աշակերտների ցանկը բեռնվում է…</div>';
    const data = await invoke("get-admin-dashboard", { view: "class_students", schoolId, classId, page, pageSize });
    const students = data.students || [];
    target.innerHTML = `<div class="student-roster"><strong>${esc(data.className || "Դասարան")} — աշակերտներ</strong><div class="student-roster-list">${students.length ? students.map((student) => `<div class="student-row"><strong>${esc(displayUser(student))}</strong><div class="subtle small">${esc(student.email || "էլ. հասցե չկա")}</div></div>`).join("") : '<span class="subtle">Ակտիվ աշակերտ չկա։</span>'}</div><div class="admin-pager">${page > 1 ? `<button type="button" class="ghost" data-roster-page="${page - 1}">Նախորդ</button>` : ""}${page * pageSize < (data.total || 0) ? `<button type="button" class="ghost" data-roster-page="${page + 1}">Հաջորդ</button>` : ""}</div></div>`;
    target.querySelectorAll("[data-roster-page]").forEach((button) => button.addEventListener("click", () => loadClassStudents(schoolId, classId, Number(button.dataset.rosterPage))));
  } catch (error) { target.innerHTML = `<div class="student-roster">${esc(friendlyError(error))}</div>`; }
}

async function loadAccounts() {
  setMessage("Հաշիվները բեռնվում են…");
  renderAccounts(await invoke("get-admin-dashboard", { view: "accounts", page: accountPage, pageSize, search: $("accountSearch").value.trim(), role: $("accountRole").value, status: $("accountStatus").value, archived: false }), false);
}

async function loadArchive() {
  setMessage("Արխիվը բեռնվում է…");
  renderAccounts(await invoke("get-admin-dashboard", { view: "accounts", page: archivePage, pageSize, search: $("archiveSearch").value.trim(), archived: true }), true);
}

async function loadDeletions() {
  setMessage("Ջնջման հարցումները բեռնվում են…");
  renderDeletionRequests(await invoke("get-admin-dashboard", { view: "deletions" }));
}

async function loadAudit() {
  setMessage("Աուդիտը բեռնվում է…");
  renderAudit(await invoke("get-admin-dashboard", { view: "audit" }));
}

async function loadCurrentView() {
  try {
    showView(requestedView());
    const loaders = { overview:loadOverview, schools:loadSchools, accounts:loadAccounts, archive:loadArchive, deletions:loadDeletions, audit:loadAudit };
    await loaders[currentView]();
    setMessage("");
  } catch (error) {
    if (String(error?.message) === "mfa_required") {
      $("console").classList.add("hidden");
      $("mfaPanel").classList.remove("hidden");
      return;
    }
    setMessage(friendlyError(error), true);
  }
}

async function handleUserAction(action, userId) {
  if (!userId) return;
  const user = accountCache.get(userId);
  try {
    if (action === "set_role") {
      const role = document.querySelector(`[data-role-select="${CSS.escape(userId)}"]`)?.value;
      if (!role || !confirm(`Փոխե՞լ ${displayUser(user)} հաշվի դերը՝ ${roleLabel(role)}։`)) return;
      setMessage("Դերը փոխվում է…");
      await invoke("manage-admin-account", { action, targetUserId: userId, role });
    } else {
      const prompts = {
        suspend: `Կասեցնե՞լ ${displayUser(user)} հաշիվը։`,
        activate: `Ակտիվացնե՞լ ${displayUser(user)} հաշիվը։`,
        archive: `Արխիվացնե՞լ ${displayUser(user)} կասեցված հաշիվը։`,
        unarchive: `Վերադարձնե՞լ ${displayUser(user)} հաշիվը կասեցված վիճակում։`,
      };
      if (!prompts[action] || !confirm(prompts[action])) return;
      setMessage("Հաշվի կարգավիճակը փոխվում է…");
      await invoke("manage-admin-account", { action, targetUserId: userId });
    }
    await loadCurrentView();
    if (selectedSchoolId && currentView === "schools") await loadSchoolDetail(selectedSchoolId);
    setMessage("Փոփոխությունը պահպանված է։");
  } catch (error) { setMessage(friendlyError(error), true); }
}

async function approveDeletion(requestId) {
  if (!confirm("Հաստատե՞լ ջնջման հարցումը։ Այս քայլը դեռ չի ջնջում տվյալները։")) return;
  try { await invoke("manage-admin-account", { action:"approve_deletion", requestId }); await loadDeletions(); setMessage("Հարցումը հաստատված է։"); }
  catch (error) { setMessage(friendlyError(error), true); }
}

async function executeDeletion(requestId) {
  if (!confirm("Վերջնականապե՞ս ջնջել այս աշակերտի տվյալներն ու հաշիվը։ Գործողությունը հետադարձելի չէ։")) return;
  const token = prompt('Մուտքագրեք DELETE՝ վերջնական ջնջումը հաստատելու համար։', "");
  if (token !== "DELETE") return;
  try { await invoke("manage-admin-account", { action:"execute_deletion", requestId }); await loadDeletions(); setMessage("Հաշիվը վերջնականապես ջնջվել է։"); }
  catch (error) { setMessage(friendlyError(error), true); }
}

async function rejectDeletion(requestId) {
  const resolutionCode = prompt("Մերժման կոդ՝ not_verified, legal_hold կամ duplicate_request", "not_verified") || "not_verified";
  try { await invoke("manage-admin-account", { action:"reject_deletion", requestId, resolutionCode }); await loadDeletions(); setMessage("Հարցումը մերժվել է։"); }
  catch (error) { setMessage(friendlyError(error), true); }
}

async function enterConsole(session) {
  $("authPanel").classList.add("hidden");
  $("mfaPanel").classList.add("hidden");
  if (!session) {
    $("console").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    $("signOutBtn").classList.add("hidden");
    return;
  }
  const { data: profile } = await supabase.from("profiles").select("role,account_status").eq("id", session.user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "active") {
    $("console").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    $("authMessage").textContent = "Այս հաշիվը չունի ակտիվ master admin իրավունք։";
    return;
  }
  if (!await ensureMfa()) {
    $("console").classList.add("hidden");
    $("mfaPanel").classList.remove("hidden");
    $("signOutBtn").classList.remove("hidden");
    return;
  }
  $("console").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  await loadCurrentView();
}

$("signOutBtn").addEventListener("click", async () => { await supabase.auth.signOut({ scope:"global" }); window.location.assign("./account-access.html"); });
document.querySelectorAll("[data-refresh-view]").forEach((button) => button.addEventListener("click", loadCurrentView));
$("schoolSearchForm").addEventListener("submit", (event) => { event.preventDefault(); schoolPage = 1; selectedSchoolId = null; $("schoolDetail").classList.add("hidden"); loadSchools(); });
$("accountFilterForm").addEventListener("submit", (event) => { event.preventDefault(); accountPage = 1; loadAccounts(); });
$("archiveFilterForm").addEventListener("submit", (event) => { event.preventDefault(); archivePage = 1; loadArchive(); });
window.addEventListener("hashchange", loadCurrentView);
supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => enterConsole(session), 0); });
const { data: sessionData } = await supabase.auth.getSession();
await enterConsole(sessionData.session);
