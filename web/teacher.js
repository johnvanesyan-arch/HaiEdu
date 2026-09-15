import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let dashboard = null;
let selectedClassId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(id, text, bad = false) {
  const el = $(id);
  el.textContent = text;
  el.style.color = bad ? "#8a3342" : "#356246";
}

async function signIn() {
  setMessage("authMessage", "Մուտք ենք գործում…");
  const { error } = await supabase.auth.signInWithPassword({
    email: $("emailInput").value.trim(),
    password: $("passwordInput").value,
  });
  if (error) setMessage("authMessage", error.message, true);
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.reload();
}

async function loadDashboard() {
  setMessage("classMessage", "");
  const { data, error } = await supabase.functions.invoke("get-teacher-dashboard", { body: {} });
  if (error) {
    $("dashboardPanel").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    return setMessage("authMessage", error.message.includes("teacher_role_required") ? "Այս հաշիվը teacher դեր չունի։" : error.message, true);
  }
  dashboard = data;
  $("authPanel").classList.add("hidden");
  $("dashboardPanel").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  $("teacherName").textContent = data.teacher?.displayName || "Ուսուցիչ";
  $("classCount").textContent = data.totals?.classes ?? 0;
  $("studentCount").textContent = data.totals?.students ?? 0;
  $("supportCount").textContent = data.totals?.studentsNeedingSupport ?? 0;
  renderClassList();
  const selected = data.classes?.find((c) => c.id === selectedClassId) ?? data.classes?.[0] ?? null;
  if (selected) selectClass(selected.id);
  else {
    selectedClassId = null;
    $("emptyClass").classList.remove("hidden");
    $("classView").classList.add("hidden");
  }
}

function renderClassList() {
  const list = $("classList");
  list.innerHTML = "";
  for (const klass of dashboard?.classes ?? []) {
    const btn = document.createElement("button");
    btn.className = `teacher-class-button${klass.id === selectedClassId ? " active" : ""}`;
    btn.innerHTML = `<strong>${escapeHtml(klass.name)}</strong><span>${klass.studentCount} աշակերտ · ${escapeHtml(klass.academicYear ?? "")}</span>`;
    btn.addEventListener("click", () => selectClass(klass.id));
    list.appendChild(btn);
  }
  if (!list.children.length) list.innerHTML = '<p class="subtle">Դասարան դեռ չկա։ Ստեղծեք առաջինը վերևում։</p>';
}

function selectClass(id) {
  selectedClassId = id;
  renderClassList();
  const klass = dashboard.classes.find((c) => c.id === id);
  if (!klass) return;
  $("emptyClass").classList.add("hidden");
  $("classView").classList.remove("hidden");
  $("selectedClassName").textContent = klass.name;
  $("selectedClassMeta").textContent = `${klass.academicYear ?? ""} · ${klass.studentCount} աշակերտ · ${klass.needingSupport} աջակցություն է պետք`;
  $("joinCode").textContent = klass.joinCode ?? "—";
  $("copyCodeStatus").textContent = "";
  renderMatrix(klass);
  renderRoster(klass);
}

function matrixCell(skill) {
  const label = skill.percent === null ? "—" : `${skill.percent}%`;
  return `<td class="matrix-cell ${escapeHtml(skill.band)}" title="${escapeHtml(skill.nameHy)}">${escapeHtml(label)}</td>`;
}

function renderMatrix(klass) {
  const skills = dashboard.skills ?? [];
  const header = skills.map((s) => `<th title="${escapeHtml(s.nameHy)}">${escapeHtml(s.code.replace("PHY7-U01-", ""))}</th>`).join("");
  const rows = (klass.students ?? []).map((student) => `
    <tr>
      <th class="student-matrix-name"><button class="link-button" data-student="${student.id}">${escapeHtml(student.displayName)}</button></th>
      ${student.matrix.map(matrixCell).join("")}
    </tr>`).join("");
  $("matrixWrap").innerHTML = klass.students.length
    ? `<table class="skill-matrix"><thead><tr><th>Աշակերտ</th>${header}</tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="subtle">Այս դասարանում դեռ աշակերտ չկա։ Տվեք նրանց միանալու կոդը։</p>';
  $("matrixWrap").querySelectorAll("[data-student]").forEach((el) => el.addEventListener("click", () => openStudent(el.dataset.student)));
}

function renderRoster(klass) {
  const roster = $("roster");
  roster.innerHTML = "";
  for (const student of klass.students ?? []) {
    const card = document.createElement("article");
    card.className = "roster-row";
    const weak = student.weakSkills?.map((s) => s.code.replace("PHY7-U01-", "")).join(", ") || "—";
    card.innerHTML = `
      <div><button class="link-button roster-name">${escapeHtml(student.displayName)}</button><span class="subtle small">${student.latestActivityAt ? new Date(student.latestActivityAt).toLocaleString("hy-AM") : "Գործունեություն դեռ չկա"}</span></div>
      <div><span class="stat-label">Վերջին accuracy</span><strong>${student.recentAccuracy === null ? "—" : `${student.recentAccuracy}%`}</strong></div>
      <div><span class="stat-label">Թույլ հմտություններ</span><strong>${escapeHtml(weak)}</strong></div>
      <div class="intervention-cell"><span class="stat-label">Առաջարկություն</span><strong>${escapeHtml(student.intervention?.messageHy ?? "—")}</strong></div>`;
    card.querySelector("button").addEventListener("click", () => openStudent(student.id));
    roster.appendChild(card);
  }
  if (!roster.children.length) roster.innerHTML = '<p class="subtle">Roster-ը դատարկ է։</p>';
}

async function openStudent(studentId) {
  const drawer = $("studentDrawer");
  drawer.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");
  $("studentDrawerName").textContent = "Բեռնվում է…";
  $("studentDrawerContent").innerHTML = '<p class="subtle">Տվյալները բեռնվում են…</p>';
  const { data, error } = await supabase.functions.invoke("get-teacher-student", { body: { studentId, classId: selectedClassId } });
  if (error) {
    $("studentDrawerContent").innerHTML = `<p class="message bad">${escapeHtml(error.message)}</p>`;
    return;
  }
  $("studentDrawerName").textContent = data.student.displayName;
  const skillCards = data.skills.map((s) => `
    <div class="teacher-skill ${s.band}">
      <strong>${escapeHtml(s.code.replace("PHY7-U01-", ""))}</strong>
      <span>${escapeHtml(s.nameHy)}</span>
      <b>${s.percent === null ? "—" : `${s.percent}%`}</b>
    </div>`).join("");
  const attempts = data.recentAttempts.map((a) => `
    <tr><td>${escapeHtml(a.itemCode ?? "—")}</td><td>${a.correct ? "✓" : "✗"}</td><td>${a.hintUsed ? "այո" : "ոչ"}</td><td>${new Date(a.createdAt).toLocaleString("hy-AM")}</td></tr>`).join("");
  $("studentDrawerContent").innerHTML = `
    <section class="drawer-summary-grid">
      <div class="mini-card"><span>Ախտորոշիչ</span><strong>${data.latestDiagnostic ? `${data.latestDiagnostic.percent}%` : "—"}</strong></div>
      <div class="mini-card"><span>Mastery check</span><strong>${data.latestMasteryCheck ? `${data.latestMasteryCheck.result} · ${data.latestMasteryCheck.percent}%` : "—"}</strong></div>
    </section>
    <section class="teacher-intervention"><strong>Առաջարկվող միջամտություն</strong><p>${escapeHtml(data.recommendation?.messageHy ?? "—")}</p></section>
    <h3>Հմտությունների mastery</h3><div class="teacher-skill-grid">${skillCards}</div>
    <h3>Վերջին փորձերը</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Հարց</th><th>Արդյունք</th><th>Օգնություն</th><th>Ժամանակ</th></tr></thead><tbody>${attempts || '<tr><td colspan="4">Տվյալ չկա</td></tr>'}</tbody></table></div>`;
}

function closeDrawer() {
  $("studentDrawer").classList.add("hidden");
  $("studentDrawer").setAttribute("aria-hidden", "true");
}

async function createClass() {
  const name = $("classNameInput").value.trim();
  if (!name) return setMessage("classMessage", "Մուտքագրեք դասարանի անունը։", true);
  $("createClassBtn").disabled = true;
  const { data, error } = await supabase.functions.invoke("manage-teacher-class", { body: { action: "create", name, academicYear: $("academicYearInput").value.trim() } });
  $("createClassBtn").disabled = false;
  if (error) return setMessage("classMessage", error.message, true);
  selectedClassId = data.class.id;
  $("classNameInput").value = "";
  setMessage("classMessage", `Դասարանը ստեղծվեց։ Միանալու կոդ՝ ${data.class.join_code}`);
  await loadDashboard();
}

async function copyJoinCode() {
  const code = $("joinCode").textContent.trim();
  if (!code || code === "—") return;
  const status = $("copyCodeStatus");
  try {
    await navigator.clipboard.writeText(code);
    status.textContent = "Կոդը պատճենված է։";
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = code;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    status.textContent = copied ? "Կոդը պատճենված է։" : "Չհաջողվեց պատճենել։ Ընտրեք կոդը ձեռքով։";
  }
}

async function rotateCode() {
  if (!selectedClassId) return;
  $("rotateCodeBtn").disabled = true;
  const { data, error } = await supabase.functions.invoke("manage-teacher-class", { body: { action: "rotate_join_code", classId: selectedClassId } });
  $("rotateCodeBtn").disabled = false;
  if (error) return alert(error.message);
  $("joinCode").textContent = data.class.join_code;
  $("copyCodeStatus").textContent = "Նոր կոդը պատրաստ է։";
  const klass = dashboard.classes.find((c) => c.id === selectedClassId);
  if (klass) klass.joinCode = data.class.join_code;
}

$("signInBtn").addEventListener("click", signIn);
$("signOutBtn").addEventListener("click", signOut);
$("refreshBtn").addEventListener("click", loadDashboard);
$("createClassBtn").addEventListener("click", createClass);
$("copyCodeBtn").addEventListener("click", copyJoinCode);
$("rotateCodeBtn").addEventListener("click", rotateCode);
$("closeDrawerBtn").addEventListener("click", closeDrawer);
$("drawerBackdrop").addEventListener("click", closeDrawer);

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) loadDashboard();
  else {
    $("dashboardPanel").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    $("signOutBtn").classList.add("hidden");
  }
});
const { data: sessionData } = await supabase.auth.getSession();
if (sessionData.session) loadDashboard();
