import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let dashboard = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
}

function setMessage(text, bad = false) {
  $("consoleMessage").textContent = text || "";
  $("consoleMessage").style.color = bad ? "#8a3342" : "#356246";
}

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(data?.detail || data?.error || error.message);
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

function userById(id) {
  return dashboard?.users?.find((u) => u.id === id) ?? null;
}

function displayUser(user) {
  if (!user) return "—";
  return user.displayName || user.email || `User ${user.id.slice(0, 8)}`;
}

function renderStats(data) {
  const roleCounts = data.totals?.roleCounts || {};
  const cards = [
    ["Օգտատերեր", data.totals?.users ?? 0],
    ["Ուսանողներ", roleCounts.student ?? 0],
    ["Ուսուցիչներ", roleCounts.teacher ?? 0],
    ["Բաց ջնջման հարցումներ", data.totals?.pendingDeletionRequests ?? 0],
  ];
  $("stats").innerHTML = cards.map(([label, value]) => `<article class="card admin-stat"><span class="stat-label">${esc(label)}</span><strong>${esc(value)}</strong></article>`).join("");
}

function renderUsers() {
  const rows = dashboard?.users ?? [];
  $("userRows").innerHTML = rows.length ? rows.map((user) => {
    const roleOptions = ["student", "teacher", "content_admin", "admin"].map((role) => `<option value="${role}" ${role === user.role ? "selected" : ""}>${role}</option>`).join("");
    const statusAction = user.accountStatus === "active"
      ? `<button class="secondary" data-action="suspend" data-user="${user.id}">Կասեցնել</button>`
      : `<button data-action="activate" data-user="${user.id}">Ակտիվացնել</button>`;
    return `<tr>
      <td><strong>${esc(displayUser(user))}</strong><div class="subtle small">${esc(user.email || "էլ. հասցե չկա")}</div></td>
      <td><span class="role-chip">${esc(user.role)}</span></td>
      <td><span class="status-chip ${esc(user.accountStatus)}">${esc(user.accountStatus)}</span></td>
      <td>${user.lastSignInAt ? esc(new Date(user.lastSignInAt).toLocaleString("hy-AM")) : "—"}</td>
      <td><div class="admin-actions"><select data-role-select="${user.id}">${roleOptions}</select><button class="ghost" data-action="set_role" data-user="${user.id}">Պահել դերը</button>${statusAction}</div></td>
    </tr>`;
  }).join("") : '<tr><td colspan="5" class="empty-row">Օգտատեր չկա։</td></tr>';

  $("userRows").querySelectorAll("button[data-action]").forEach((btn) => btn.addEventListener("click", () => handleUserAction(btn.dataset.action, btn.dataset.user)));
}

function renderDeletionRequests() {
  const requests = dashboard?.deletionRequests ?? [];
  $("deletionRows").innerHTML = requests.length ? requests.map((r) => {
    const user = userById(r.user_id);
    let actions = "—";
    if (r.status === "pending") {
      actions = `<div class="admin-actions"><button data-delete-approve="${r.id}">Հաստատել հարցումը</button><button class="secondary" data-delete-reject="${r.id}">Մերժել</button></div>`;
    } else if (r.status === "processing") {
      actions = `<div class="admin-actions"><button class="danger-btn" data-delete-execute="${r.id}">Ջնջել վերջնականապես</button><button class="secondary" data-delete-reject="${r.id}">Մերժել / վերադարձնել</button></div>`;
    }
    return `<tr>
      <td><code>${esc(r.id.slice(0, 8))}</code></td>
      <td>${esc(displayUser(user))}</td>
      <td><span class="status-chip ${esc(r.status)}">${esc(r.status)}</span>${r.resolution_code ? `<div class="subtle small">${esc(r.resolution_code)}</div>` : ""}</td>
      <td>${esc(new Date(r.requested_at).toLocaleString("hy-AM"))}</td>
      <td>${actions}</td>
    </tr>`;
  }).join("") : '<tr><td colspan="5" class="empty-row">Ջնջման հարցում չկա։</td></tr>';

  $("deletionRows").querySelectorAll("[data-delete-approve]").forEach((btn) => btn.addEventListener("click", () => approveDeletion(btn.dataset.deleteApprove)));
  $("deletionRows").querySelectorAll("[data-delete-execute]").forEach((btn) => btn.addEventListener("click", () => executeDeletion(btn.dataset.deleteExecute)));
  $("deletionRows").querySelectorAll("[data-delete-reject]").forEach((btn) => btn.addEventListener("click", () => rejectDeletion(btn.dataset.deleteReject)));
}

function renderClasses() {
  const teachers = (dashboard?.users ?? []).filter((u) => ["teacher", "admin"].includes(u.role) && u.accountStatus === "active");
  const classes = dashboard?.classes ?? [];
  $("classRows").innerHTML = classes.length ? classes.map((klass) => {
    const options = teachers.map((t) => `<option value="${t.id}" ${t.id === klass.teacherId ? "selected" : ""}>${esc(displayUser(t))}</option>`).join("");
    return `<tr>
      <td><strong>${esc(klass.name)}</strong><div class="subtle small">${esc(klass.academicYear || "")}</div></td>
      <td>${esc(klass.teacherDisplayName || displayUser(userById(klass.teacherId)))}</td>
      <td>${esc(klass.studentCount)}</td>
      <td>${klass.active ? "active" : "archived"}</td>
      <td><div class="admin-actions"><select data-class-teacher="${klass.id}">${options}</select><button class="ghost" data-reassign="${klass.id}">Փոխանցել</button></div></td>
    </tr>`;
  }).join("") : '<tr><td colspan="5" class="empty-row">Դասարան չկա։</td></tr>';

  $("classRows").querySelectorAll("[data-reassign]").forEach((btn) => btn.addEventListener("click", () => reassignClass(btn.dataset.reassign)));
}

function renderAudit() {
  const rows = dashboard?.auditEvents ?? [];
  $("auditRows").innerHTML = rows.length ? rows.map((event) => {
    const actor = userById(event.actor_user_id);
    const target = userById(event.target_user_id);
    const detailKeys = Object.keys(event.details || {}).slice(0, 5).map((k) => `${k}: ${String(event.details[k])}`).join(" · ");
    return `<tr>
      <td>${esc(new Date(event.created_at).toLocaleString("hy-AM"))}</td>
      <td><strong>${esc(event.action)}</strong><div class="audit-meta">${esc(detailKeys)}</div></td>
      <td>${esc(displayUser(actor))}<div class="subtle small">${esc(event.actor_role || "")}</div></td>
      <td>${esc(target ? displayUser(target) : event.target_key || event.target_type || "—")}</td>
      <td>${esc(event.outcome)}</td>
    </tr>`;
  }).join("") : '<tr><td colspan="5" class="empty-row">Աուդիտի գրառում դեռ չկա։</td></tr>';
}

function render(data) {
  dashboard = data;
  $("authPanel").classList.add("hidden");
  $("console").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  renderStats(data);
  renderUsers();
  renderDeletionRequests();
  renderClasses();
  renderAudit();
}

async function refresh() {
  try {
    setMessage("Բեռնվում է…");
    render(await invoke("get-admin-dashboard"));
    setMessage("");
  } catch (err) {
    $("console").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    $("authMessage").textContent = err.message === "admin_required" ? "Այս հաշիվը admin դեր չունի։" : err.message;
  }
}

async function handleUserAction(action, userId) {
  if (!userId) return;
  try {
    if (action === "set_role") {
      const select = document.querySelector(`[data-role-select="${userId}"]`);
      const role = select?.value;
      if (!confirm(`Փոխե՞լ օգտատիրոջ դերը՝ ${role}։`)) return;
      setMessage("Դերը փոխվում է…");
      await invoke("manage-admin-account", { action, targetUserId: userId, role });
    } else {
      if (!confirm(action === "suspend" ? "Կասեցնե՞լ այս հաշիվը։" : "Ակտիվացնե՞լ այս հաշիվը։")) return;
      setMessage("Հաշվի կարգավիճակը փոխվում է…");
      await invoke("manage-admin-account", { action, targetUserId: userId });
    }
    await refresh();
    setMessage("Պատրաստ է։");
  } catch (err) { setMessage(err.message, true); }
}

async function approveDeletion(requestId) {
  if (!confirm("Հաստատե՞լ ջնջման հարցումը։ Այս քայլը դեռ չի ջնջում տվյալները․ ուսանողը կարող է չեղարկել մինչև վերջնական ջնջումը։")) return;
  try {
    setMessage("Հարցումը հաստատվում է…");
    await invoke("manage-admin-account", { action: "approve_deletion", requestId });
    await refresh();
    setMessage("Հարցումը հաստատված է։ Վերջնական ջնջման համար պահանջվում է առանձին քայլ։");
  } catch (err) { setMessage(err.message, true); }
}

async function executeDeletion(requestId) {
  if (!confirm("Վերջնականապե՞ս ջնջել այս ուսանողի տվյալներն ու մուտքի հաշիվը։ Այս գործողությունը հետադարձելի չէ։")) return;
  const token = prompt('Անվտանգության համար մուտքագրեք DELETE՝ վերջնական ջնջումը հաստատելու համար։', "");
  if (token !== "DELETE") {
    setMessage("Վերջնական ջնջումը չեղարկվեց։", true);
    return;
  }
  try {
    setMessage("Վերջնական ջնջումն իրականացվում է…");
    await invoke("manage-admin-account", { action: "execute_deletion", requestId });
    await refresh();
    setMessage("Ուսանողի հաշիվն ու ուսուցման տվյալները վերջնականապես ջնջվեցին։");
  } catch (err) { setMessage(err.message, true); }
}

async function rejectDeletion(requestId) {
  const resolutionCode = prompt("Մերժման կոդ՝ not_verified, staff_offboarding_required, legal_hold, duplicate_request", "not_verified") || "not_verified";
  try {
    setMessage("Հարցումը մերժվում է…");
    await invoke("manage-admin-account", { action: "reject_deletion", requestId, resolutionCode });
    await refresh();
    setMessage("Հարցումը մերժվեց։");
  } catch (err) { setMessage(err.message, true); }
}

async function reassignClass(classId) {
  const select = document.querySelector(`[data-class-teacher="${classId}"]`);
  const newTeacherId = select?.value;
  if (!newTeacherId || !confirm("Փոխանցե՞լ այս դասարանը ընտրված ուսուցչին։")) return;
  try {
    setMessage("Դասարանը փոխանցվում է…");
    await invoke("manage-admin-account", { action: "reassign_class", classId, newTeacherId });
    await refresh();
    setMessage("Դասարանը փոխանցվեց։");
  } catch (err) { setMessage(err.message, true); }
}

$("signInBtn").addEventListener("click", async () => {
  $("authMessage").textContent = "Մուտք ենք գործում…";
  const { error } = await supabase.auth.signInWithPassword({ email: $("emailInput").value.trim(), password: $("passwordInput").value });
  if (error) $("authMessage").textContent = error.message;
});
$("signOutBtn").addEventListener("click", async () => { await supabase.auth.signOut(); window.location.reload(); });
$("refreshBtn").addEventListener("click", refresh);

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) refresh();
  else {
    $("console").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    $("signOutBtn").classList.add("hidden");
  }
});
const { data: sessionData } = await supabase.auth.getSession();
if (sessionData.session) refresh();
