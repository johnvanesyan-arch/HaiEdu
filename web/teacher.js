import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { roleDestination } from "./account-roles.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let dashboard = null;
let selectedClassId = null;
let rosterQuery = "";
let matrixStudentFilter = "all";
let dashboardLoadVersion = 0;

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

async function signOut() {
  await supabase.auth.signOut();
  window.location.reload();
}

async function loadDashboard() {
  const version = ++dashboardLoadVersion;
  $("dashboardPanel").classList.add("hidden");
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (version !== dashboardLoadVersion) return;
    if (sessionError || !sessionData?.session?.user) {
      $("authPanel").classList.remove("hidden");
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role, account_status")
      .eq("id", sessionData.session.user.id).maybeSingle();
    if (version !== dashboardLoadVersion) return;
    if (profileError || !profile) throw new Error("profile_lookup_failed");
    if (profile.account_status !== "active") {
      window.location.replace("./privacy.html");
      return;
    }
    if (profile.role !== "teacher") {
      const destination = roleDestination(profile.role);
      if (destination) window.location.replace(destination);
      else {
        $("authPanel").classList.remove("hidden");
        setMessage("authMessage", "Այս հաշիվը ուսուցչի դեր չունի։", true);
      }
      return;
    }
  } catch {
    if (version !== dashboardLoadVersion) return;
    $("authPanel").classList.remove("hidden");
    setMessage("authMessage", "Չհաջողվեց ստուգել հաշվի դերը։ Փորձեք կրկին։", true);
    return;
  }
  setMessage("classMessage", "");
  const { data, error } = await supabase.functions.invoke("get-teacher-dashboard", { body: {} });
  if (version !== dashboardLoadVersion) return;
  if (error) {
    $("dashboardPanel").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    return setMessage("authMessage", friendlyError(error, "Չհաջողվեց բեռնել ուսուցչի աշխատասեղանը։"), true);
  }

  dashboard = data;
  $("authPanel").classList.add("hidden");
  $("dashboardPanel").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  const institutional = data.institutionalTeacher === true;
  for (const id of ["createClassShortcut", "teacherLegacyOnboarding", "createClassCard"])
    $(id).classList.toggle("hidden", institutional);
  $("institutionalTeacherNotice").classList.toggle("hidden", !institutional);

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
    $("emptyClass").classList.toggle("hidden", institutional);
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
    list.innerHTML = dashboard?.institutionalTeacher
      ? '<div class="teacher-empty-state"><strong>Դպրոցի դասարանները դեռ հասանելի չեն</strong><p class="subtle small">Դպրոցական դասարանների մուտքը կբացվի համապատասխան թույլտվությունների ստուգումից հետո։</p></div>'
      : '<div class="teacher-empty-state"><strong>Դասարան դեռ չկա</strong><p class="subtle small">Ստեղծեք ձեր առաջին դասարանը, հետո աշակերտներին տվեք միանալու կոդը։</p><a class="button-link" href="#createClassCard">+ Ստեղծել դասարան</a></div>';
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

function studentHasNeedsSupport(student) {
  return (student.matrix ?? []).some((skill) => skill.band === "needs_support");
}

function studentHasRequiredReview(student) {
  return ["review_required_attempt_2", "review_required_attempt_3"].includes(student.chapterReview?.lifecycleState);
}

function studentMasteryConfirmed(student) {
  return student.chapterReview?.masteryStatus === "confirmed" || student.masteryCheck?.passed === true;
}

function matchesMatrixFilter(student) {
  if (matrixStudentFilter === "needs_support") return studentHasNeedsSupport(student);
  if (matrixStudentFilter === "required_review") return studentHasRequiredReview(student);
  if (matrixStudentFilter === "mastery_confirmed") return studentMasteryConfirmed(student);
  if (matrixStudentFilter === "no_activity") return !student.latestActivityAt;
  return true;
}

function renderMatrixSummary(klass) {
  const students = klass.students ?? [];
  $("matrixStudentTotal").textContent = String(students.length);
  $("matrixMasteredTotal").textContent = String(students.filter(studentMasteryConfirmed).length);
  $("matrixNeedsSupportTotal").textContent = String(students.filter(studentHasNeedsSupport).length);
  $("matrixRequiredReviewTotal").textContent = String(students.filter(studentHasRequiredReview).length);
  $("matrixNoActivityTotal").textContent = String(students.filter((student) => !student.latestActivityAt).length);

  const skills = dashboard.skills ?? [];
  const attention = skills.map((skill, index) => {
    let needsSupport = 0;
    let developing = 0;
    for (const student of students) {
      const cell = student.matrix?.[index];
      if (cell?.band === "needs_support") needsSupport += 1;
      if (cell?.band === "developing") developing += 1;
    }
    return {
      code: skill.code.replace("PHY7-U01-", ""),
      nameHy: skill.nameHy,
      needsSupport,
      developing,
      total: needsSupport + developing,
    };
  }).filter((row) => row.total > 0)
    .sort((a, b) => b.needsSupport - a.needsSupport || b.total - a.total || a.code.localeCompare(b.code))
    .slice(0, 3);

  $("matrixAttentionSummary").innerHTML = attention.length
    ? attention.map((row) => `
        <span class="matrix-attention-chip" title="${escapeHtml(row.nameHy)}">
          <strong>${escapeHtml(row.code)}</strong>
          <span>${row.needsSupport} աջակցություն · ${row.developing} զարգացող</span>
        </span>`).join("")
    : '<span class="subtle small">Կարմիր կամ դեղին հմտություններ չկան։</span>';
}

function renderMatrix(klass) {
  const skills = dashboard.skills ?? [];
  const allStudents = klass.students ?? [];
  const students = allStudents.filter(matchesMatrixFilter);
  renderMatrixSummary(klass);

  const header = skills.map((s) => `<th title="${escapeHtml(s.nameHy)}">${escapeHtml(s.code.replace("PHY7-U01-", ""))}</th>`).join("");
  const rows = students.map((student) => `
    <tr>
      <th class="student-matrix-name"><button class="link-button" data-student="${student.id}">${escapeHtml(student.displayName)}</button></th>
      ${student.matrix.map(matrixCell).join("")}
    </tr>`).join("");

  $("matrixVisibleCount").textContent = matrixStudentFilter === "all"
    ? `${students.length} աշակերտ`
    : `Ցուցադրվում է ${students.length} / ${allStudents.length} աշակերտ`;

  if (!allStudents.length) {
    $("matrixWrap").innerHTML = '<div class="teacher-empty-state"><strong>Աշակերտ դեռ չկա</strong><p class="subtle small">Պատճենեք վերևի կոդը կամ հրավերի հղումը և ուղարկեք աշակերտներին։</p></div>';
  } else if (!students.length) {
    $("matrixWrap").innerHTML = '<div class="matrix-empty-filter">Այս ֆիլտրին համապատասխանող աշակերտ չկա։</div>';
  } else {
    $("matrixWrap").innerHTML = `<table class="skill-matrix"><thead><tr><th>Աշակերտ</th>${header}</tr></thead><tbody>${rows}</tbody></table>`;
  }

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
    const review = student.chapterReview;
    const reviewSummary = review
      ? `${review.totalReviewsCompleted} կրկնություն · պարտադիր ${review.requiredReviewsCompleted} · լրացուցիչ ${review.optionalReviewsCompleted}`
      : "Գլխի կրկնության տվյալ դեռ չկա";
    card.innerHTML = `
      <div><button class="link-button roster-name" data-open-student="${student.id}">${escapeHtml(student.displayName)}</button><span class="subtle small">${student.latestActivityAt ? `Վերջին ակտիվություն՝ ${new Date(student.latestActivityAt).toLocaleString("hy-AM")}` : "Գործունեություն դեռ չկա"}</span></div>
      <div><span class="stat-label">Վերջին պատասխանների ընդհանուր ճշգրտություն</span><strong>${student.recentAccuracy === null ? "—" : `${student.recentAccuracy}%`}</strong></div>
      <div><span class="stat-label">Ուշադրության հմտություններ</span><strong>${escapeHtml(weak)}</strong></div>
      <div><span class="stat-label">Գլուխ I-ի կրկնություն</span><strong>${escapeHtml(reviewSummary)}</strong></div>
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
  const review = data.chapterReview;
  const reviewHistory = (review?.history ?? []).map((row) => `
    <tr><td>${row.qualifying ? "Պարտադիր" : "Լրացուցիչ"}</td><td>${row.cycleNumber ?? "—"} / ${row.sessionNumber ?? "—"}</td><td>${row.targetQuestions}</td><td>${row.completedAt ? new Date(row.completedAt).toLocaleString("hy-AM") : "Ընթացքի մեջ"}</td></tr>`).join("");
  const reviewSkills = (review?.skills ?? []).map((s) => `
    <tr><td>${escapeHtml(s.code.replace("PHY7-U01-", ""))}</td><td>${s.reviewObservations}</td><td>${s.independentCorrect} / ${s.independentObservations}</td><td>${s.hintAssistedResponses}</td><td>${s.failedLatestMastery ? "Այո" : "Ոչ"}</td><td>Շեմերը դեռ սահմանված չեն</td></tr>`).join("");
  const masteryStatus = review?.masteryStatus === "confirmed" ? "Հաստատված"
    : review?.masteryStatus === "not_demonstrated" ? "Չի հաստատվել" : "Ընթացքի մեջ";
  const masteryResult = data.latestMasteryCheck?.result === "passed" ? "Անցած է"
    : data.latestMasteryCheck?.result === "failed" ? "Չի անցել"
    : data.latestMasteryCheck?.result ?? null;
  const coverage = review?.currentCycleEligiblePoolSize
    ? `${review.currentCycleUniqueSeen ?? 0} / ${review.currentCycleEligiblePoolSize}` : "—";
  $("studentDrawerContent").innerHTML = `
    <section class="drawer-summary-grid">
      <div class="mini-card"><span>Ախտորոշիչ</span><strong>${data.latestDiagnostic ? `${data.latestDiagnostic.percent}%` : "—"}</strong></div>
      <div class="mini-card"><span>Յուրացման ստուգում</span><strong>${data.latestMasteryCheck ? `${escapeHtml(masteryResult ?? "—")} · ${data.latestMasteryCheck.percent}%` : "—"}</strong></div>
    </section>
    <section class="teacher-intervention"><strong>Առաջարկվող միջամտություն</strong><p>${escapeHtml(data.recommendation?.messageHy ?? "—")}</p></section>
    <p class="mode-kicker">Ֆիզիկա 7 · Գլուխ I</p>
    <p class="subtle small">Բնության ուսումնասիրության ֆիզիկական մեթոդները</p>
    <h3>Յուրացում և կրկնություն</h3>
    <section class="drawer-summary-grid">
      <div class="mini-card"><span>Յուրացման վիճակ</span><strong>${escapeHtml(masteryStatus)}</strong></div>
      <div class="mini-card"><span>Փորձեր</span><strong>${review ? `${review.attemptsUsed} / ${review.maximumAttempts}` : "—"}</strong></div>
      <div class="mini-card"><span>Անցած փորձ</span><strong>${review?.passedOnAttempt ?? "—"}</strong></div>
      <div class="mini-card"><span>Պարտադիր կրկնություններ</span><strong>${review?.requiredReviewsCompleted ?? 0}</strong></div>
      <div class="mini-card"><span>Լրացուցիչ կրկնություններ</span><strong>${review?.optionalReviewsCompleted ?? 0}</strong></div>
      <div class="mini-card"><span>Ընթացիկ ծածկույթ</span><strong>${escapeHtml(coverage)}</strong></div>
      <div class="mini-card"><span>Ծածկույթի տոկոս</span><strong>${review?.currentCycleCoveragePercent == null ? "—" : `${review.currentCycleCoveragePercent}%`}</strong></div>
      <div class="mini-card"><span>Տեսած տարբեր հարցեր</span><strong>${review?.lifetimeUniqueItemsSeen ?? 0}</strong></div>
      <div class="mini-card"><span>Նույն հարցի կրկնություններ</span><strong>${review?.exactRepeatCount ?? 0}</strong></div>
      <div class="mini-card"><span>Դեպքեր, երբ նոր հարց չէր մնացել</span><strong>${review?.poolExhaustionEventCount ?? 0}</strong></div>
      <div class="mini-card"><span>Ինքնուրույն ճիշտ պատասխանների տոկոս</span><strong>${review?.independentAccuracyPercent == null ? "—" : `${review.independentAccuracyPercent}%`}</strong></div>
      <div class="mini-card"><span>Օգնություն օգտագործած պատասխաններ</span><strong>${review?.hintAssistedResponses ?? 0}</strong></div>
    </section>
    <p class="subtle small">Գլխի կրկնության «ուշադրության» շեմերը դեռ չեն հաստատվել։ Ստորև ցուցադրվում են միայն դիտարկելի փաստերը, ոչ վերջնական դասակարգում։</p>
    <h3>Կրկնությունների պատմություն</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Տեսակ</th><th>Ցիկլ / սեսիա</th><th>Հարցեր</th><th>Ավարտ</th></tr></thead><tbody>${reviewHistory || '<tr><td colspan="4">Տվյալ չկա</td></tr>'}</tbody></table></div>
    <h3>Գլխի կրկնության հմտությունների տվյալներ</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Հմտություն</th><th>Դիտարկումներ</th><th>Ինքնուրույն ճիշտ</th><th>Օգնություն օգտագործած</th><th>Սխալ՝ վերջին յուրացման ստուգման ժամանակ</th><th>Վիճակ</th></tr></thead><tbody>${reviewSkills || '<tr><td colspan="6">Գլխի կրկնության բավարար տվյալ դեռ չկա</td></tr>'}</tbody></table></div>
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
$("matrixStudentFilter").addEventListener("change", (event) => {
  matrixStudentFilter = event.target.value || "all";
  const klass = selectedClass();
  if (klass) renderMatrix(klass);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("studentDrawer").classList.contains("hidden")) closeDrawer();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(() => loadDashboard(), 0);
  else {
    dashboardLoadVersion++;
    dashboard = null;
    $("dashboardPanel").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    $("signOutBtn").classList.add("hidden");
  }
});

const { data: sessionData } = await supabase.auth.getSession();
if (sessionData.session) loadDashboard();
