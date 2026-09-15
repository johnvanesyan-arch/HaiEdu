import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let dashboard = null;
let selectedClassId = null;
let rosterQuery = "";

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
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? "#8a3342" : "#356246";
}

function friendlyError(error, fallback) {
  const message = String(error?.message ?? "");
  if (message.includes("teacher_role_required")) return "Այս հաշիվը ուսուցչի դեր չունի։";
  if (message.includes("display_name_too_short")) return "Անունը պետք է պարունակի առնվազն 2 նիշ։";
  if (message.includes("display_name_too_long")) return "Անունը չափազանց երկար է։";
  if (message.includes("class_name_required")) return "Մուտքագրեք դասարանի անունը։";
  return fallback || message || "Գործողությունը չհաջողվեց։";
}

async function signIn() {
  setMessage("authMessage", "Մուտք ենք գործում…");
  $("signInBtn").disabled = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: $("emailInput").value.trim(),
    password: $("passwordInput").value,
  });
  $("signInBtn").disabled = false;
  if (error) return setMessage("authMessage", error.message, true);
  setMessage("authMessage", "");
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
    return setMessage("authMessage", friendlyError(error, "Չհաջողվեց բեռնել ուսուցչի աշխատասեղանը։"), true);
  }

  dashboard = data;
  $("authPanel").classList.add("hidden");
  $("dashboardPanel").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");

  const displayName = data.teacher?.displayName || "Ուսուցիչ";
  $("teacherName").textContent = displayName;
  $("teacherDisplayNameInput").value = displayName === "Ուսուցիչ" ? "" : displayName;
  const { data: sessionData } = await supabase.auth.getSession();
  $("teacherEmail").value = sessionData.session?.user?.email ?? "";

  $("classCount").textContent = data.totals?.classes ?? 0;
  $("studentCount").textContent = data.totals?.students ?? 0;
  $("supportCount").textContent = data.totals?.studentsNeedingSupport ?? 0;

  renderClassList();
  const selected = data.classes?.find((c) => c.id === selectedClassId)
    ?? data.classes?.find((c) => c.isActive)
    ?? data.classes?.[0]
    ?? null;
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
    btn.className = `teacher-class-button${klass.id === selectedClassId ? " active" : ""}${klass.isActive ? "" : " archived"}`;
    btn.type = "button";
    btn.innerHTML = `
      <strong>${escapeHtml(klass.name)}</strong>
      <span>${escapeHtml(klass.academicYear ?? "")}</span>
      <span class="class-list-meta"><span>${klass.studentCount} աշակերտ</span><span class="class-list-status">${klass.isActive ? "Ակտիվ" : "Արխիվացված"}</span></span>`;
    btn.addEventListener("click", () => selectClass(klass.id));
    list.appendChild(btn);
  }
  if (!list.children.length) {
    list.innerHTML = '<div class="teacher-empty-state"><strong>Դասարան դեռ չկա</strong><p class="subtle small">Ստեղծեք ձեր առաջին դասարանը, հետո աշակերտներին տվեք միանալու կոդը։</p><a class="button-link" href="#createClassCard">+ Ստեղծել դասարան</a></div>';
  }
}

function selectedClass() {
  return dashboard?.classes?.find((c) => c.id === selectedClassId) ?? null;
}

function selectClass(id) {
  selectedClassId = id;
  rosterQuery = "";
  if ($("studentSearchInput")) $("studentSearchInput").value = "";
  renderClassList();
  const klass = selectedClass();
  if (!klass) return;

  $("emptyClass").classList.add("hidden");
  $("classView").classList.remove("hidden");
  $("selectedClassName").textContent = klass.name;
  $("selectedClassMeta").textContent = `${klass.academicYear ?? ""} · ${klass.studentCount} աշակերտ · ${klass.needingSupport} աջակցություն է պետք`;
  $("joinCode").textContent = klass.joinCode ?? "—";
  $("copyCodeStatus").textContent = "";

  const badge = $("classStatusBadge");
  badge.textContent = klass.isActive ? "Ակտիվ" : "Արխիվացված";
  badge.className = `status-badge ${klass.isActive ? "success" : "neutral"}`;
  $("toggleClassBtn").textContent = klass.isActive ? "Արխիվացնել դասարանը" : "Վերակտիվացնել դասարանը";

  const invite = buildInviteUrl(klass.joinCode);
  $("openJoinBtn").href = invite || "./join.html";
  $("copyCodeBtn").disabled = !klass.isActive || !klass.joinCode;
  $("copyInviteBtn").disabled = !klass.isActive || !klass.joinCode;
  $("rotateCodeBtn").disabled = !klass.isActive;

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
    : '<div class="teacher-empty-state"><strong>Աշակերտ դեռ չկա</strong><p class="subtle small">Պատճենեք վերևի կոդը կամ հրավերի հղումը և ուղարկեք աշակերտներին։</p></div>';
  $("matrixWrap").querySelectorAll("[data-student]").forEach((el) => el.addEventListener("click", () => openStudent(el.dataset.student)));
}

function renderRoster(klass) {
  const roster = $("roster");
  roster.innerHTML = "";
  const query = rosterQuery.trim().toLocaleLowerCase("hy-AM");
  const students = (klass.students ?? []).filter((student) => !query || String(student.displayName).toLocaleLowerCase("hy-AM").includes(query));
  $("rosterCount").textContent = query
    ? `Ցուցադրվում է ${students.length} / ${klass.students.length} աշակերտ`
    : `${klass.students.length} աշակերտ`;

  for (const student of students) {
    const card = document.createElement("article");
    card.className = "roster-row";
    const weak = student.weakSkills?.map((s) => s.code.replace("PHY7-U01-", "")).join(", ") || "—";
    card.innerHTML = `
      <div><button class="link-button roster-name" data-open-student="${student.id}">${escapeHtml(student.displayName)}</button><span class="subtle small">${student.latestActivityAt ? `Վերջին ակտիվություն՝ ${new Date(student.latestActivityAt).toLocaleString("hy-AM")}` : "Գործունեություն դեռ չկա"}</span></div>
      <div><span class="stat-label">Վերջին ճշգրտություն</span><strong>${student.recentAccuracy === null ? "—" : `${student.recentAccuracy}%`}</strong></div>
      <div><span class="stat-label">Ուշադրության հմտություններ</span><strong>${escapeHtml(weak)}</strong></div>
      <div class="intervention-cell"><span class="stat-label">Հաջորդ առաջարկություն</span><strong>${escapeHtml(student.intervention?.messageHy ?? "—")}</strong></div>
      <div class="roster-actions"><button class="secondary small-button" type="button" data-open-student="${student.id}">Դիտել</button><button class="ghost small-button roster-remove" type="button" data-remove-student="${student.id}" data-student-name="${escapeHtml(student.displayName)}">Հեռացնել</button></div>`;
    roster.appendChild(card);
  }

  roster.querySelectorAll("[data-open-student]").forEach((el) => el.addEventListener("click", () => openStudent(el.dataset.openStudent)));
  roster.querySelectorAll("[data-remove-student]").forEach((el) => el.addEventListener("click", () => removeStudent(el.dataset.removeStudent, el.dataset.studentName)));

  if (!students.length) {
    roster.innerHTML = query
      ? '<div class="teacher-empty-state"><strong>Աշակերտ չի գտնվել</strong><p class="subtle small">Փորձեք այլ անուն կամ մաքրեք որոնումը։</p></div>'
      : '<div class="teacher-empty-state"><strong>Ցուցակը դեռ դատարկ է</strong><p class="subtle small">Աշակերտները այստեղ կհայտնվեն միանալու կոդը օգտագործելուց հետո։</p></div>';
  }
}

async function openStudent(studentId) {
  if (!studentId) return;
  const drawer = $("studentDrawer");
  drawer.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");
  $("closeDrawerBtn").focus();
  $("studentDrawerName").textContent = "Բեռնվում է…";
  $("studentDrawerContent").innerHTML = '<p class="subtle">Տվյալները բեռնվում են…</p>';

  const { data, error } = await supabase.functions.invoke("get-teacher-student", { body: { studentId, classId: selectedClassId } });
  if (error) {
    $("studentDrawerContent").innerHTML = `<p class="message bad">${escapeHtml(friendlyError(error, "Չհաջողվեց բեռնել աշակերտի տվյալները։"))}</p>`;
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
      <div class="mini-card"><span>Յուրացման ստուգում</span><strong>${data.latestMasteryCheck ? `${escapeHtml(data.latestMasteryCheck.result)} · ${data.latestMasteryCheck.percent}%` : "—"}</strong></div>
    </section>
    <section class="teacher-intervention"><strong>Առաջարկվող միջամտություն</strong><p>${escapeHtml(data.recommendation?.messageHy ?? "—")}</p></section>
    <h3>Հմտությունների յուրացում</h3><div class="teacher-skill-grid">${skillCards}</div>
    <h3>Վերջին փորձերը</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Հարց</th><th>Արդյունք</th><th>Օգնություն</th><th>Ժամանակ</th></tr></thead><tbody>${attempts || '<tr><td colspan="4">Տվյալ չկա</td></tr>'}</tbody></table></div>`;
}

function closeDrawer() {
  $("studentDrawer").classList.add("hidden");
  $("studentDrawer").setAttribute("aria-hidden", "true");
}

async function saveProfile() {
  const displayName = $("teacherDisplayNameInput").value.trim();
  if (displayName.length < 2) return setMessage("profileMessage", "Մուտքագրեք ձեր անունն ու ազգանունը։", true);
  $("saveProfileBtn").disabled = true;
  setMessage("profileMessage", "Պահպանում ենք…");
  const { data, error } = await supabase.functions.invoke("manage-teacher-profile", { body: { displayName } });
  $("saveProfileBtn").disabled = false;
  if (error) return setMessage("profileMessage", friendlyError(error, "Չհաջողվեց պահպանել անունը։"), true);
  const savedName = data?.profile?.displayName || displayName;
  $("teacherName").textContent = savedName;
  $("teacherDisplayNameInput").value = savedName;
  if (dashboard?.teacher) dashboard.teacher.displayName = savedName;
  setMessage("profileMessage", "Անունը պահպանված է։");
}

async function createClass() {
  const name = $("classNameInput").value.trim();
  if (!name) return setMessage("classMessage", "Մուտքագրեք դասարանի անունը։", true);
  $("createClassBtn").disabled = true;
  setMessage("classMessage", "Դասարանը ստեղծվում է…");
  const { data, error } = await supabase.functions.invoke("manage-teacher-class", {
    body: { action: "create", name, academicYear: $("academicYearInput").value.trim() },
  });
  $("createClassBtn").disabled = false;
  if (error) return setMessage("classMessage", friendlyError(error, "Չհաջողվեց ստեղծել դասարանը։"), true);
  selectedClassId = data.class.id;
  $("classNameInput").value = "";
  setMessage("classMessage", `Դասարանը ստեղծվեց։ Միանալու կոդ՝ ${data.class.join_code}`);
  await loadDashboard();
  document.getElementById("classView")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildInviteUrl(code) {
  if (!code) return "";
  const url = new URL("./join.html", window.location.href);
  url.searchParams.set("code", code);
  return url.toString();
}

async function copyText(value, successMessage) {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    $("copyCodeStatus").textContent = successMessage;
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    $("copyCodeStatus").textContent = copied ? successMessage : "Չհաջողվեց պատճենել։ Ընտրեք արժեքը ձեռքով։";
    return copied;
  }
}

async function copyJoinCode() {
  const klass = selectedClass();
  if (!klass?.joinCode) return;
  await copyText(klass.joinCode, "Կոդը պատճենված է։");
}

async function copyInviteLink() {
  const klass = selectedClass();
  const invite = buildInviteUrl(klass?.joinCode);
  if (!invite) return;
  await copyText(invite, "Հրավերի հղումը պատճենված է։");
}

async function rotateCode() {
  if (!selectedClassId) return;
  const klass = selectedClass();
  if (!klass?.isActive) return;
  if (!window.confirm("Ստեղծե՞լ նոր միանալու կոդ։ Նախորդ կոդը այլևս չի աշխատի։")) return;
  $("rotateCodeBtn").disabled = true;
  const { data, error } = await supabase.functions.invoke("manage-teacher-class", { body: { action: "rotate_join_code", classId: selectedClassId } });
  $("rotateCodeBtn").disabled = false;
  if (error) return setMessage("copyCodeStatus", "Չհաջողվեց ստեղծել նոր կոդ։", true);
  if (klass) klass.joinCode = data.class.join_code;
  $("joinCode").textContent = data.class.join_code;
  $("openJoinBtn").href = buildInviteUrl(data.class.join_code);
  $("copyCodeStatus").textContent = "Նոր կոդը պատրաստ է։";
}

async function toggleClassStatus() {
  const klass = selectedClass();
  if (!klass) return;
  const action = klass.isActive ? "archive" : "activate";
  if (klass.isActive && !window.confirm("Արխիվացնե՞լ դասարանը։ Արխիվացված դասարանի կոդով նոր աշակերտներ չեն կարող միանալ։")) return;
  $("toggleClassBtn").disabled = true;
  const { error } = await supabase.functions.invoke("manage-teacher-class", { body: { action, classId: klass.id } });
  $("toggleClassBtn").disabled = false;
  if (error) return setMessage("copyCodeStatus", "Դասարանի կարգավիճակը չհաջողվեց փոխել։", true);
  await loadDashboard();
}

async function removeStudent(studentId, studentName) {
  if (!studentId || !selectedClassId) return;
  const name = studentName || "այս աշակերտին";
  if (!window.confirm(`Հեռացնե՞լ ${name}-ին այս դասարանից։ Ուսանողի հաշիվը և ուսումնական տվյալները չեն ջնջվի։`)) return;
  const { error } = await supabase.functions.invoke("manage-teacher-class", {
    body: { action: "remove_student", classId: selectedClassId, studentId },
  });
  if (error) return alert("Չհաջողվեց հեռացնել աշակերտին դասարանից։");
  await loadDashboard();
}

$("signInBtn").addEventListener("click", signIn);
$("signOutBtn").addEventListener("click", signOut);
$("refreshBtn").addEventListener("click", loadDashboard);
$("saveProfileBtn").addEventListener("click", saveProfile);
$("createClassBtn").addEventListener("click", createClass);
$("copyCodeBtn").addEventListener("click", copyJoinCode);
$("copyInviteBtn").addEventListener("click", copyInviteLink);
$("rotateCodeBtn").addEventListener("click", rotateCode);
$("toggleClassBtn").addEventListener("click", toggleClassStatus);
$("closeDrawerBtn").addEventListener("click", closeDrawer);
$("drawerBackdrop").addEventListener("click", closeDrawer);
$("studentSearchInput").addEventListener("input", (event) => {
  rosterQuery = event.target.value || "";
  const klass = selectedClass();
  if (klass) renderRoster(klass);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("studentDrawer").classList.contains("hidden")) closeDrawer();
});

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
