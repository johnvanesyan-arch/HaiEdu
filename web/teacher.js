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

function navigationSelection() {
  if (typeof window.location?.search !== "string") return { classId: null, selection: null };
  const params = new URLSearchParams(window.location.search);
  const assignmentId = params.get("assignment");
  const curriculumReleaseId = params.get("release");
  const unitId = params.get("unit");
  return {
    classId: params.get("class"),
    selection: assignmentId && curriculumReleaseId && unitId
      ? { assignmentId, curriculumReleaseId, unitId }
      : null,
  };
}

function syncNavigation(klass, push = false) {
  if (!klass) return;
  const url = new URL(window.location.href);
  url.searchParams.set("class", klass.id);
  if (dashboard?.institutionalTeacher && klass.selectedUnit) {
    url.searchParams.set("assignment", klass.assignmentId);
    url.searchParams.set("release", klass.selectedUnit.curriculumReleaseId);
    url.searchParams.set("unit", klass.selectedUnit.unitId);
  } else {
    url.searchParams.delete("assignment");
    url.searchParams.delete("release");
    url.searchParams.delete("unit");
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history[push ? "pushState" : "replaceState"]({}, "", next);
}

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
  if (message.includes("school_year_unavailable")) return "Դպրոցի ընթացիկ ուսումնական տարին հասանելի չէ։";
  if (message.includes("subject_program_unavailable")) return "Ընտրված առարկայի ծրագիրը հասանելի չէ։";
  if (message.includes("teacher_subject_unavailable")) return "Այս առարկայի ձեր թույլտվությունը հասանելի չէ։";
  if (message.includes("teacher_class_unavailable")) return "Դպրոցի դասարանի ստեղծումը հասանելի չէ այս հաշվին։";
  return fallback || message || "Գործողությունը չհաջողվեց։";
}

function institutionalOptionKey(option) {
  return [
    option?.teacherMembershipId,
    option?.academicYearId,
    option?.subjectProgramId,
  ].filter(Boolean).join(":");
}

function renderInstitutionalClassCreator(data, institutional) {
  $("teacherLegacyOnboarding").classList.toggle("hidden", institutional);
  $("createClassCard").classList.toggle("hidden", institutional);
  $("institutionalTeacherNotice").classList.toggle("hidden", !institutional);
  $("institutionalCreateCard").classList.toggle("hidden", !institutional);

  const shortcut = $("createClassShortcut");
  shortcut.classList.remove("hidden");
  shortcut.href = institutional ? "#institutionalCreateCard" : "#createClassCard";

  if (!institutional) return;
  const options = Array.isArray(data.institutionalOptions) ? data.institutionalOptions : [];
  const select = $("institutionalClassOption");
  select.replaceChildren();
  for (const option of options) {
    const item = document.createElement("option");
    item.value = institutionalOptionKey(option);
    item.textContent = [
      option.schoolName,
      option.academicYearLabel,
      option.gradeNumber ? `${option.gradeNumber}-րդ դասարան` : "",
      option.subjectName,
    ].filter(Boolean).join(" · ");
    select.appendChild(item);
  }
  if (!options.length) {
    const item = document.createElement("option");
    item.value = "";
    item.textContent = "Հասանելի ուսումնական համատեքստ չկա";
    item.disabled = true;
    item.selected = true;
    select.appendChild(item);
  }
  select.disabled = !options.length;
  $("institutionalCreateBtn").disabled = !options.length;
  setMessage("institutionalCreateMessage", options.length
    ? ""
    : "Դասարան ստեղծելու համար դպրոցը պետք է ունենա ընթացիկ ուսումնական տարի, իսկ ձեր առարկան՝ հրապարակված ծրագիր։",
    !options.length);
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
  const navigation = navigationSelection();
  if (navigation.classId) selectedClassId = navigation.classId;
  const { data, error } = await supabase.functions.invoke("get-teacher-dashboard", {
    body: navigation.selection ? { selection: navigation.selection } : {},
  });
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
  renderInstitutionalClassCreator(data, institutional);

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
    $("institutionalEmpty").classList.toggle("hidden", !institutional);
    $("institutionalClassView").classList.add("hidden");
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
    btn.addEventListener("click", () => selectClass(klass.id, { pushNavigation: true }));
    list.appendChild(btn);
  }
  if (!list.children.length) {
    list.innerHTML = dashboard?.institutionalTeacher
      ? '<div class="teacher-empty-state"><strong>Դպրոցի դասարան դեռ չկա</strong><p class="subtle small">Դպրոցի ադմինիստրատորը պետք է բացի ընթացիկ տարին, իսկ դուք՝ ստեղծեք ձեզ թույլատրված դասարանը։</p></div>'
      : '<div class="teacher-empty-state"><strong>Դասարան դեռ չկա</strong><p class="subtle small">Ստեղծեք ձեր առաջին դասարանը, հետո աշակերտներին տվեք միանալու կոդը։</p><a class="button-link" href="#createClassCard">+ Ստեղծել դասարան</a></div>';
  }
}

function selectedClass() {
  return dashboard?.classes?.find((c) => c.id === selectedClassId) ?? null;
}

function selectClass(id, { pushNavigation = false } = {}) {
  selectedClassId = id;
  rosterQuery = "";
  if ($("studentSearchInput")) $("studentSearchInput").value = "";
  renderClassList();
  const klass = selectedClass();
  if (!klass) return;
  syncNavigation(klass, pushNavigation);

  if (dashboard?.institutionalTeacher) {
    $("emptyClass").classList.add("hidden");
    $("institutionalEmpty").classList.add("hidden");
    $("classView").classList.remove("hidden");
    $("legacyClassHeader").classList.add("hidden");
    $("institutionalClassView").classList.remove("hidden");
    $("institutionalSelectedName").textContent = klass.name;
    $("institutionalSelectedMeta").textContent = [
      klass.schoolName,
      klass.academicYear,
      klass.gradeNumber ? `${klass.gradeNumber}-րդ դասարան` : "",
      klass.subjectName,
    ].filter(Boolean).join(" · ");
    $("institutionalClassBadge").textContent = klass.isActive ? "Ակտիվ" : "Արխիվացված";
    $("institutionalClassBadge").className = `status-badge ${klass.isActive ? "success" : "neutral"}`;
    $("institutionalClassToggle").textContent = klass.isActive ? "Արխիվացնել դասարանը" : "Վերակտիվացնել դասարանը";
    $("institutionalStudentInviteBtn").disabled = !klass.isActive;
    $("institutionalStudentEmail").disabled = !klass.isActive;
    $("institutionalStudentEmail").value = "";
    setMessage("institutionalStudentInviteMessage", klass.isActive
      ? ""
      : "Արխիվացված դասարանին նոր աշակերտ հրավիրել հնարավոր չէ։", !klass.isActive);
    $("rosterDescription").textContent = "Բացեք աշակերտի առաջընթացը՝ ախտորոշիչի, վարժությունների, կրկնության և յուրացման ստուգման ճշգրիտ տվյալները տեսնելու համար։";
    const unitFilter = $("teacherUnitFilter");
    unitFilter.replaceChildren(...(klass.unitOptions ?? []).map((unit) => {
      const option = document.createElement("option");
      option.value = `${unit.curriculumReleaseId}:${unit.unitId}`;
      option.textContent = `${unit.unitSequence}. ${unit.unitTitleHy}`;
      option.selected = unit.unitId === klass.selectedUnit?.unitId
        && unit.curriculumReleaseId === klass.selectedUnit?.curriculumReleaseId;
      return option;
    }));
    $("teacherUnitFilterLabel").classList.toggle("hidden", !(klass.unitOptions?.length));
    unitFilter.disabled = (klass.unitOptions?.length ?? 0) < 2;
    const analyticsAvailable = klass.analyticsAvailable === true;
    $("teacherAnalyticsUnavailable").classList.toggle("hidden", analyticsAvailable);
    $("rosterAnalyticsCard").classList.toggle("hidden", !analyticsAvailable);
    $("matrixAnalyticsCard").classList.toggle("hidden", !analyticsAvailable);
    if (analyticsAvailable) {
      $("matrixContextKicker").textContent = [klass.subjectName, klass.gradeNumber ? `${klass.gradeNumber}-րդ դասարան` : "", klass.selectedUnit?.unitSequence ? `Գլուխ ${klass.selectedUnit.unitSequence}` : ""].filter(Boolean).join(" · ");
      $("matrixUnitTitle").textContent = klass.selectedUnit?.unitTitleHy ?? "—";
      renderMatrix(klass);
      renderRoster(klass);
    }
    void loadInstitutionalStudentInvitations(klass);
    return;
  }

  $("emptyClass").classList.add("hidden");
  $("institutionalEmpty").classList.add("hidden");
  $("institutionalClassView").classList.add("hidden");
  $("classView").classList.remove("hidden");
  $("legacyClassHeader").classList.remove("hidden");
  $("teacherAnalyticsUnavailable").classList.add("hidden");
  $("rosterAnalyticsCard").classList.remove("hidden");
  $("matrixAnalyticsCard").classList.remove("hidden");
  $("teacherUnitFilterLabel").classList.add("hidden");
  $("rosterDescription").textContent = "Բացեք աշակերտի առաջընթացը կամ հեռացրեք նրան այս դասարանից։ Նույն հաշվով կրկին միանալիս նրա նախկին տվյալները կպահպանվեն։";
  $("matrixContextKicker").textContent = "ՖԻԶԻԿԱ 7 · ԳԼՈՒԽ I";
  $("matrixUnitTitle").textContent = "Բնության ուսումնասիրության ֆիզիկական մեթոդները";
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

async function changeInstitutionalUnit(event) {
  const klass = selectedClass();
  if (!dashboard?.institutionalTeacher || !klass) return;
  const option = (klass.unitOptions ?? []).find((unit) =>
    `${unit.curriculumReleaseId}:${unit.unitId}` === event.target.value);
  if (!option || (option.unitId === klass.selectedUnit?.unitId
    && option.curriculumReleaseId === klass.selectedUnit?.curriculumReleaseId)) return;
  event.target.disabled = true;
  setMessage("institutionalClassMessage", "Գլխի տվյալները բեռնվում են…");
  const { data, error } = await supabase.functions.invoke("get-teacher-dashboard", {
    body: { selection: {
      assignmentId: klass.assignmentId,
      curriculumReleaseId: option.curriculumReleaseId,
      unitId: option.unitId,
    } },
  });
  event.target.disabled = false;
  if (error || !data?.institutionalTeacher) {
    setMessage("institutionalClassMessage", "Ընտրված գլխի տվյալները չբեռնվեցին։", true);
    event.target.value = `${klass.selectedUnit?.curriculumReleaseId}:${klass.selectedUnit?.unitId}`;
    return;
  }
  dashboard = data;
  selectedClassId = klass.id;
  $("classCount").textContent = data.totals?.classes ?? 0;
  $("studentCount").textContent = data.totals?.students ?? 0;
  $("supportCount").textContent = data.totals?.studentsNeedingSupport ?? 0;
  renderClassList();
  selectClass(selectedClassId, { pushNavigation: true });
  setMessage("institutionalClassMessage", "");
}

function renderInstitutionalRoster(klass) {
  const students = Array.isArray(klass.students) ? klass.students : [];
  $("institutionalRosterCount").textContent = `${students.length} աշակերտ`;
  const list = $("institutionalRoster");
  list.replaceChildren();
  if (!students.length) {
    const empty = document.createElement("li");
    empty.className = "institutional-student-empty";
    empty.textContent = "Այս դասարանում հաստատված աշակերտ դեռ չկա։";
    list.append(empty);
    return;
  }
  for (const student of students) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = student.displayName || "Աշակերտ";
    item.append(name);
    list.append(item);
  }
}

function renderInstitutionalStudentInvitations(invitations) {
  const list = $("institutionalPendingInvites");
  list.replaceChildren();
  if (!invitations.length) {
    const empty = document.createElement("li");
    empty.className = "institutional-invitation-empty";
    empty.textContent = "Այս դասարանի համար սպասվող հրավեր չկա։";
    list.append(empty);
    return;
  }
  const dateFormat = new Intl.DateTimeFormat("hy-AM", {
    dateStyle: "medium", timeStyle: "short",
  });
  for (const invitation of invitations) {
    const item = document.createElement("li");
    const copy = document.createElement("div");
    copy.className = "institutional-invitation-copy";
    const email = document.createElement("strong");
    email.textContent = invitation.email || "Աշակերտի էլ. հասցեն անհասանելի է";
    const expiry = document.createElement("span");
    expiry.className = "subtle small";
    expiry.textContent = `Վավեր է մինչև ${dateFormat.format(new Date(invitation.expiresAt))}`;
    const revoke = document.createElement("button");
    revoke.type = "button";
    revoke.className = "ghost small-button";
    revoke.textContent = "Չեղարկել";
    revoke.dataset.revokeInstitutionalInvite = invitation.id;
    copy.append(email, expiry);
    item.append(copy, revoke);
    list.append(item);
  }
  list.querySelectorAll("[data-revoke-institutional-invite]").forEach((button) => {
    button.addEventListener("click", () => revokeInstitutionalStudentInvitation(button));
  });
}

async function loadInstitutionalStudentInvitations(klass = selectedClass()) {
  if (!klass || !dashboard?.institutionalTeacher) return;
  const requestedClassId = klass.id;
  const list = $("institutionalPendingInvites");
  list.innerHTML = '<li class="institutional-invitation-empty">Բեռնվում է…</li>';
  const { data, error } = await supabase.functions.invoke("manage-student-invitation", {
    body: {
      action: "list", schoolId: klass.schoolId, classId: klass.id,
      assignmentId: klass.assignmentId,
    },
  });
  if (selectedClassId !== requestedClassId) return;
  if (error || !Array.isArray(data?.invitations)) {
    list.innerHTML = '<li class="institutional-invitation-empty">Հրավերների ցանկը հասանելի չէ։</li>';
    return;
  }
  renderInstitutionalStudentInvitations(data.invitations);
}

async function submitInstitutionalStudentInvitation(event) {
  event.preventDefault();
  const klass = selectedClass();
  if (!klass || !dashboard?.institutionalTeacher || !klass.isActive) return;
  const button = $("institutionalStudentInviteBtn");
  const email = $("institutionalStudentEmail").value.trim();
  button.disabled = true;
  setMessage("institutionalStudentInviteMessage", "Հրավերն ուղարկվում է…");
  const { data, error } = await supabase.functions.invoke("provision-student-account", {
    body: {
      schoolId: klass.schoolId, classId: klass.id,
      assignmentId: klass.assignmentId, email,
    },
  });
  button.disabled = false;
  if (error) {
    return setMessage("institutionalStudentInviteMessage",
      "Հրավերը չուղարկվեց։ Ստուգեք հասցեն և դասարանի ձեր գործող նշանակումը։", true);
  }
  $("institutionalStudentEmail").value = "";
  setMessage("institutionalStudentInviteMessage", data?.accountState === "existing"
    ? "Հրավերն ուղարկվել է աշակերտի գործող հաշվին։"
    : "Հրավերն ուղարկվել է։ Աշակերտը ինքնուրույն կսահմանի իր գաղտնաբառը։");
  await loadInstitutionalStudentInvitations(klass);
}

async function revokeInstitutionalStudentInvitation(button) {
  const klass = selectedClass();
  const invitationId = button?.dataset?.revokeInstitutionalInvite;
  if (!klass || !invitationId || !klass.isActive) return;
  if (!window.confirm("Չեղարկե՞լ այս աշակերտի սպասվող հրավերը։")) return;
  button.disabled = true;
  const { data, error } = await supabase.functions.invoke("manage-student-invitation", {
    body: {
      action: "revoke", invitationId, schoolId: klass.schoolId,
      classId: klass.id, assignmentId: klass.assignmentId,
    },
  });
  if (error || data?.revoked !== true) {
    button.disabled = false;
    return setMessage("institutionalStudentInviteMessage", "Հրավերը չեղարկելը չհաջողվեց։", true);
  }
  setMessage("institutionalStudentInviteMessage", "Հրավերը չեղարկված է։");
  await loadInstitutionalStudentInvitations(klass);
}

function matrixCell(skill) {
  const label = skill.percent === null ? "—" : `${skill.percent}%`;
  return `<td class="matrix-cell ${escapeHtml(skill.band)}" title="${escapeHtml(skill.nameHy)}">${escapeHtml(label)}</td>`;
}

function shortSkillCode(code, unitCode = selectedClass()?.selectedUnit?.unitCode || dashboard?.unitCode || "") {
  const prefix = unitCode ? `${unitCode}-` : "";
  return prefix && String(code).startsWith(prefix) ? String(code).slice(prefix.length) : String(code);
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

  const skills = klass.skills ?? dashboard.skills ?? [];
  const attention = skills.map((skill, index) => {
    let needsSupport = 0;
    let developing = 0;
    for (const student of students) {
      const cell = student.matrix?.[index];
      if (cell?.band === "needs_support") needsSupport += 1;
      if (cell?.band === "developing") developing += 1;
    }
    return {
      code: shortSkillCode(skill.code, klass.selectedUnit?.unitCode),
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
  const skills = klass.skills ?? dashboard.skills ?? [];
  const allStudents = klass.students ?? [];
  const students = allStudents.filter(matchesMatrixFilter);
  renderMatrixSummary(klass);

  const header = skills.map((s) => `<th title="${escapeHtml(s.nameHy)}">${escapeHtml(shortSkillCode(s.code, klass.selectedUnit?.unitCode))}</th>`).join("");
  const rows = students.map((student) => `
    <tr>
      <th class="student-matrix-name"><button class="link-button" data-student="${student.id}">${escapeHtml(student.displayName)}</button></th>
      ${student.matrix.map(matrixCell).join("")}
    </tr>`).join("");

  $("matrixVisibleCount").textContent = matrixStudentFilter === "all"
    ? `${students.length} աշակերտ`
    : `Ցուցադրվում է ${students.length} / ${allStudents.length} աշակերտ`;

  if (!allStudents.length) {
    $("matrixWrap").innerHTML = dashboard?.institutionalTeacher
      ? '<div class="teacher-empty-state"><strong>Աշակերտ դեռ չկա</strong><p class="subtle small">Աշակերտին հրավիրեք այս դասարանի հրավերի ձևով։</p></div>'
      : '<div class="teacher-empty-state"><strong>Աշակերտ դեռ չկա</strong><p class="subtle small">Պատճենեք վերևի կոդը կամ հրավերի հղումը և ուղարկեք աշակերտներին։</p></div>';
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
    const weak = student.weakSkills?.map((s) => shortSkillCode(s.code, klass.selectedUnit?.unitCode)).join(", ") || "—";
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
      <div class="roster-actions"><button class="secondary small-button" type="button" data-open-student="${student.id}">Դիտել</button>${dashboard?.institutionalTeacher ? "" : `<button class="ghost small-button roster-remove" type="button" data-remove-student="${student.id}" data-student-name="${escapeHtml(student.displayName)}">Հեռացնել</button>`}</div>`;
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

  const klass = selectedClass();
  const institutionalContext = dashboard?.institutionalTeacher ? {
    assignmentId: klass?.assignmentId,
    curriculumReleaseId: klass?.selectedUnit?.curriculumReleaseId,
    unitId: klass?.selectedUnit?.unitId,
  } : {};
  const { data, error } = await supabase.functions.invoke("get-teacher-student", {
    body: { studentId, classId: selectedClassId, ...institutionalContext },
  });
  if (error) {
    $("studentDrawerContent").innerHTML = `<p class="message bad">${escapeHtml(friendlyError(error, "Չհաջողվեց բեռնել աշակերտի տվյալները։"))}</p>`;
    return;
  }

  $("studentDrawerName").textContent = data.student.displayName;
  const skillCards = data.skills.map((s) => `
    <div class="teacher-skill ${s.band}">
      <strong>${escapeHtml(shortSkillCode(s.code, data.unitCode))}</strong>
      <span>${escapeHtml(s.nameHy)}</span>
      <b>${s.percent === null ? "—" : `${s.percent}%`}</b>
    </div>`).join("");
  const attempts = data.recentAttempts.map((a) => `
    <tr><td>${escapeHtml(a.itemCode ?? "—")}</td><td>${a.correct ? "✓" : "✗"}</td><td>${a.hintUsed ? "այո" : "ոչ"}</td><td>${new Date(a.createdAt).toLocaleString("hy-AM")}</td></tr>`).join("");
  const review = data.chapterReview;
  const reviewHistory = (review?.history ?? []).map((row) => `
    <tr><td>${row.qualifying ? "Պարտադիր" : "Լրացուցիչ"}</td><td>${row.cycleNumber ?? "—"} / ${row.sessionNumber ?? "—"}</td><td>${row.targetQuestions}</td><td>${row.completedAt ? new Date(row.completedAt).toLocaleString("hy-AM") : "Ընթացքի մեջ"}</td></tr>`).join("");
  const reviewSkills = (review?.skills ?? []).map((s) => `
    <tr><td>${escapeHtml(shortSkillCode(s.code, data.unitCode))}</td><td>${s.reviewObservations}</td><td>${s.independentCorrect} / ${s.independentObservations}</td><td>${s.hintAssistedResponses}</td><td>${s.failedLatestMastery ? "Այո" : "Ոչ"}</td><td>Շեմերը դեռ սահմանված չեն</td></tr>`).join("");
  const masteryStatus = review?.masteryStatus === "confirmed" ? "Հաստատված"
    : review?.masteryStatus === "not_demonstrated" ? "Չի հաստատվել" : "Ընթացքի մեջ";
  const masteryResult = data.latestMasteryCheck?.result === "passed" ? "Անցած է"
    : data.latestMasteryCheck?.result === "failed" ? "Չի անցել"
    : data.latestMasteryCheck?.result ?? null;
  const coverage = review?.currentCycleEligiblePoolSize
    ? `${review.currentCycleUniqueSeen ?? 0} / ${review.currentCycleEligiblePoolSize}` : "—";
  const modeSummary = data.modeSummary ?? {};
  const recentSessions = (data.sessions ?? []).map((session) => {
    const labels = { diagnostic: "Ախտորոշիչ", practice: "Վարժություն", chapter_review: "Գլխի կրկնություն", mastery_check: "Յուրացման ստուգում" };
    return `<tr><td>${escapeHtml(labels[session.mode] ?? session.mode)}</td><td>${escapeHtml(session.status)}</td><td>${session.correct} / ${session.answered}</td><td>${session.completedAt ? new Date(session.completedAt).toLocaleString("hy-AM") : "Ընթացքի մեջ"}</td></tr>`;
  }).join("");
  const unitTitle = data.selectedUnit?.unitTitleHy ?? klass?.selectedUnit?.unitTitleHy ?? "—";
  const contextKicker = dashboard?.institutionalTeacher
    ? [klass?.subjectName, klass?.gradeNumber ? `${klass.gradeNumber}-րդ դասարան` : "", klass?.selectedUnit?.unitSequence ? `Գլուխ ${klass.selectedUnit.unitSequence}` : ""].filter(Boolean).join(" · ")
    : "Ֆիզիկա 7 · Գլուխ I";
  $("studentDrawerContent").innerHTML = `
    <section class="drawer-summary-grid">
      <div class="mini-card"><span>Ախտորոշիչ</span><strong>${data.latestDiagnostic ? `${data.latestDiagnostic.percent}%` : "—"}</strong></div>
      <div class="mini-card"><span>Վարժություն</span><strong>${modeSummary.practice?.completed ?? 0} ավարտված</strong></div>
      <div class="mini-card"><span>Գլխի կրկնություն</span><strong>${modeSummary.chapter_review?.completed ?? review?.totalReviewsCompleted ?? 0} ավարտված</strong></div>
      <div class="mini-card"><span>Յուրացման ստուգում</span><strong>${data.latestMasteryCheck ? `${escapeHtml(masteryResult ?? "—")} · ${data.latestMasteryCheck.percent}%` : "—"}</strong></div>
    </section>
    <section class="teacher-intervention"><strong>Առաջարկվող միջամտություն</strong><p>${escapeHtml(data.recommendation?.messageHy ?? "—")}</p></section>
    <p class="mode-kicker">${escapeHtml(contextKicker)}</p>
    <p class="subtle small">${escapeHtml(unitTitle)}</p>
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
      <div class="mini-card"><span>Դեպքեր, երբ նոր հարց չէր մնացել</span><strong>${review?.poolExhaustionEventCount ?? "—"}</strong></div>
      <div class="mini-card"><span>Ինքնուրույն ճիշտ պատասխանների տոկոս</span><strong>${review?.independentAccuracyPercent == null ? "—" : `${review.independentAccuracyPercent}%`}</strong></div>
      <div class="mini-card"><span>Օգնություն օգտագործած պատասխաններ</span><strong>${review?.hintAssistedResponses ?? 0}</strong></div>
    </section>
    <p class="subtle small">Գլխի կրկնության «ուշադրության» շեմերը դեռ չեն հաստատվել։ Ստորև ցուցադրվում են միայն դիտարկելի փաստերը, ոչ վերջնական դասակարգում։</p>
    <h3>Կրկնությունների պատմություն</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Տեսակ</th><th>Ցիկլ / սեսիա</th><th>Հարցեր</th><th>Ավարտ</th></tr></thead><tbody>${reviewHistory || '<tr><td colspan="4">Տվյալ չկա</td></tr>'}</tbody></table></div>
    <h3>Գլխի կրկնության հմտությունների տվյալներ</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Հմտություն</th><th>Դիտարկումներ</th><th>Ինքնուրույն ճիշտ</th><th>Օգնություն օգտագործած</th><th>Սխալ՝ վերջին յուրացման ստուգման ժամանակ</th><th>Վիճակ</th></tr></thead><tbody>${reviewSkills || '<tr><td colspan="6">Գլխի կրկնության բավարար տվյալ դեռ չկա</td></tr>'}</tbody></table></div>
    <h3>Հմտությունների յուրացում</h3><div class="teacher-skill-grid">${skillCards}</div>
    <h3>Սեսիաների պատմություն</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Տեսակ</th><th>Վիճակ</th><th>Ճիշտ / պատասխանած</th><th>Ավարտ</th></tr></thead><tbody>${recentSessions || '<tr><td colspan="4">Տվյալ չկա</td></tr>'}</tbody></table></div>
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

async function createInstitutionalClass(event) {
  event.preventDefault();
  if (!dashboard?.institutionalTeacher) return;
  const options = Array.isArray(dashboard.institutionalOptions) ? dashboard.institutionalOptions : [];
  const selectedKey = $("institutionalClassOption").value;
  const option = options.find((candidate) => institutionalOptionKey(candidate) === selectedKey);
  const name = $("institutionalClassName").value.trim();
  if (!option) {
    return setMessage("institutionalCreateMessage", "Ընտրեք հասանելի դպրոցական համատեքստը։", true);
  }
  if (name.length < 2) {
    return setMessage("institutionalCreateMessage", "Դասարանի անունը պետք է պարունակի առնվազն 2 նիշ։", true);
  }

  const button = $("institutionalCreateBtn");
  button.disabled = true;
  setMessage("institutionalCreateMessage", "Դպրոցի դասարանը ստեղծվում է…");
  const { data, error } = await supabase.functions.invoke("manage-institutional-teacher-class", {
    body: {
      action: "create",
      membershipId: option.teacherMembershipId,
      academicYearId: option.academicYearId,
      subjectProgramId: option.subjectProgramId,
      name,
    },
  });
  button.disabled = false;
  if (error || !data?.classId) {
    return setMessage("institutionalCreateMessage",
      friendlyError(error, "Չհաջողվեց ստեղծել դպրոցի դասարանը։"), true);
  }

  selectedClassId = data.classId;
  $("institutionalClassName").value = "";
  setMessage("institutionalCreateMessage", "Դպրոցի դասարանը ստեղծված է։ Այժմ կարող եք հրավիրել աշակերտներին։");
  await loadDashboard();
  $("institutionalClassView")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

async function toggleInstitutionalClassStatus() {
  const klass = selectedClass();
  if (!klass || !dashboard?.institutionalTeacher) return;
  const action = klass.isActive ? "archive" : "activate";
  if (klass.isActive && !window.confirm("Արխիվացնե՞լ դպրոցի այս դասարանը։ Աշակերտների և դասարանի պատմությունը կպահպանվի։")) return;
  $("institutionalClassToggle").disabled = true;
  setMessage("institutionalClassMessage", action === "archive" ? "Արխիվացվում է…" : "Վերակտիվացվում է…");
  const { data, error } = await supabase.functions.invoke("manage-institutional-teacher-class", {
    body: { action, classId: klass.id },
  });
  $("institutionalClassToggle").disabled = false;
  if (error || data?.updated !== true) {
    return setMessage("institutionalClassMessage", "Դասարանի կարգավիճակը չփոխվեց։ Ստուգեք թույլտվությունները և ուսումնական տարին։", true);
  }
  setMessage("institutionalClassMessage", action === "archive" ? "Դասարանն արխիվացված է։" : "Դասարանը վերակտիվացված է։");
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
$("institutionalCreateForm").addEventListener("submit", createInstitutionalClass);
$("copyCodeBtn").addEventListener("click", copyJoinCode);
$("copyInviteBtn").addEventListener("click", copyInviteLink);
$("rotateCodeBtn").addEventListener("click", rotateCode);
$("toggleClassBtn").addEventListener("click", toggleClassStatus);
$("institutionalClassToggle").addEventListener("click", toggleInstitutionalClassStatus);
$("institutionalStudentInviteForm").addEventListener("submit", submitInstitutionalStudentInvitation);
$("refreshInstitutionalInvites").addEventListener("click", () => loadInstitutionalStudentInvitations());
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
$("teacherUnitFilter").addEventListener("change", changeInstitutionalUnit);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("studentDrawer").classList.contains("hidden")) closeDrawer();
});
window.addEventListener("popstate", () => loadDashboard());

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
