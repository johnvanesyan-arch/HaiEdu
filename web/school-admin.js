import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let overview = null;
let selectedSchoolId = null;
let selectedTeacherMembershipId = null;

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[character]));
}

function message(id, text, error = false) {
  const element = $(id);
  element.textContent = text;
  element.classList.toggle("is-error", error);
  element.classList.toggle("is-success", Boolean(text) && !error);
}

async function invoke(name, body = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error && !data?.error) return data;
  const response = error?.context;
  const payload = response instanceof Response ? await response.json().catch(() => null) : null;
  throw new Error(payload?.error || data?.error || error?.message || "request_failed");
}

async function emailLimitExceeded(error) {
  if (error?.context?.status !== 429) return false;
  try { return (await error.context.json())?.error === "email_rate_limited"; }
  catch { return false; }
}

function setButtonBusy(button, busy, busyText) {
  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
  button.disabled = busy;
  button.toggleAttribute("aria-busy", busy);
  button.textContent = busy ? busyText : button.dataset.defaultLabel;
}

function selectedSchool() {
  return overview?.schools?.find((school) => school.id === selectedSchoolId) ?? null;
}

function renderStats(school) {
  const cards = [
    ["Ուսուցիչներ", school.counts.teachers, "Հաստատված ակտիվ անդամակցություններ", "blue"],
    ["Դասարաններ", school.counts.classes, `${school.counts.activeAssignments} ակտիվ դասավանդման կապ`, "teal"],
    ["Աշակերտներ", school.counts.students, "Հաստատված ակտիվ ընդգրկումներ", "amber"],
    ["Առարկաներ", school.counts.subjects, "Ուսուցիչներին թույլատրված առարկաներ", "violet"],
  ];
  $("overviewStats").innerHTML = cards.map(([label, value, detail, tone]) => `
    <article class="overview-stat" data-tone="${tone}">
      <span class="stat-label">${esc(label)}</span>
      <strong>${esc(value)}</strong>
      <span class="stat-detail">${esc(detail)}</span>
    </article>`).join("");
}

function teacherClassCount(teacher) {
  return teacher.classes?.length ?? 0;
}

function teacherStudentCount(teacher) {
  return new Set((teacher.classes ?? []).flatMap((klass) => (klass.students ?? []).map((student) => student.id))).size;
}

function renderTeacherList(school) {
  const teachers = school.teachers ?? [];
  if (!teachers.length) {
    $("teacherList").innerHTML = '<div class="empty-state">Ակտիվ ուսուցիչ դեռ չկա։</div>';
    $("teacherDetail").innerHTML = school.unassignedClasses?.length
      ? `<div class="empty-state">Կան ${esc(school.unassignedClasses.length)} դասարան, սակայն ակտիվ ուսուցիչ-դասարան կապ դեռ չկա։</div>`
      : '<div class="empty-state">Դասարանների կառուցվածքը կհայտնվի ուսուցչի և դասարանի հաստատված կապից հետո։</div>';
    return;
  }

  if (!teachers.some((teacher) => teacher.membershipId === selectedTeacherMembershipId)) {
    selectedTeacherMembershipId = teachers[0].membershipId;
  }

  $("teacherList").innerHTML = teachers.map((teacher) => `
    <button type="button" class="teacher-card" data-teacher="${esc(teacher.membershipId)}"
      aria-current="${teacher.membershipId === selectedTeacherMembershipId}">
      <strong>${esc(teacher.displayName)}</strong>
      <span>${esc(teacher.email || "Էլ. հասցեն հասանելի չէ")}</span>
      <span class="teacher-card-meta">${teacherClassCount(teacher)} դասարան · ${teacherStudentCount(teacher)} աշակերտ</span>
    </button>`).join("");

  $("teacherList").querySelectorAll("[data-teacher]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTeacherMembershipId = button.dataset.teacher;
      renderTeacherList(school);
      renderTeacherDetail(school);
    });
  });
}

function renderTeacherDetail(school) {
  const teacher = (school.teachers ?? []).find((item) => item.membershipId === selectedTeacherMembershipId);
  if (!teacher) return;

  const subjects = teacher.subjects?.length
    ? teacher.subjects.map((subject) => `<span class="subject-chip">${esc(subject.name)}</span>`).join("")
    : '<span class="subject-chip">Առարկա չի նշված</span>';

  const classes = teacher.classes?.length ? teacher.classes.map((klass) => {
    const context = [klass.grade?.label, klass.subject?.name, klass.academicYear].filter(Boolean).join(" · ");
    const students = klass.students?.length
      ? `<ul class="student-list">${klass.students.map((student) => `
          <li><strong>${esc(student.displayName)}</strong><span>${esc(student.email || "Էլ. հասցեն հասանելի չէ")}</span></li>`).join("")}</ul>`
      : '<p class="empty-inline">Այս դասարանում հաստատված աշակերտ դեռ չկա։</p>';
    return `<article class="class-card">
      <div class="class-card-header">
        <div><h5>${esc(klass.name)}</h5><p class="class-context">${esc(context || "Համատեքստը լրացվում է")}</p></div>
        <span class="student-count">${esc(klass.students?.length ?? 0)} աշակերտ</span>
      </div>
      ${students}
    </article>`;
  }).join("") : '<div class="empty-state">Այս ուսուցչին ակտիվ դասարան դեռ չի վերագրվել։</div>';

  $("teacherDetail").innerHTML = `
    <div class="teacher-detail-header">
      <div>
        <h4>${esc(teacher.displayName)}</h4>
        <p class="teacher-email">${esc(teacher.email || "Էլ. հասցեն հասանելի չէ")}</p>
        <div class="subject-chips">${subjects}</div>
      </div>
    </div>
    <div class="class-list">${classes}</div>`;
}

function renderSchool(school) {
  selectedSchoolId = school.id;
  $("overviewSchool").value = school.id;
  $("schoolCodeBadge").textContent = school.schoolCode ? `Կոդ՝ ${school.schoolCode}` : "Դպրոցի կոդ չկա";
  renderStats(school);
  renderTeacherList(school);
  renderTeacherDetail(school);
}

function renderOverview(data) {
  overview = data;
  const schools = data.schools ?? [];
  if (!schools.length) {
    $("overviewPanel").classList.add("hidden");
    return false;
  }

  $("overviewPanel").classList.remove("hidden");
  $("overviewSchool").replaceChildren(...schools.map((school) => new Option(school.name, school.id)));
  $("overviewSchoolField").classList.toggle("hidden", schools.length < 2);
  const school = schools.find((item) => item.id === selectedSchoolId) ?? schools[0];
  renderSchool(school);
  return true;
}

async function loadOverview() {
  const button = $("refreshOverviewBtn");
  setButtonBusy(button, true, "Թարմացվում է…");
  message("overviewMessage", "Բեռնվում է…");
  try {
    const data = await invoke("get-school-admin-overview");
    const available = renderOverview(data);
    message("overviewMessage", available ? "" : "Դպրոցական կառուցվածք դեռ չի ստեղծվել։");
    return data.schools ?? [];
  } catch {
    message("overviewMessage", "Դպրոցի գործառնական պատկերը չի բեռնվել։ Փորձեք կրկին։", true);
    return [];
  } finally {
    setButtonBusy(button, false, "Թարմացվում է…");
  }
}

async function invite(kind, values, messageId, form) {
  const button = form.querySelector("button[type=submit]");
  setButtonBusy(button, true, "Ուղարկվում է…");
  message(messageId, "");

  let error = null;
  try {
    ({ error } = await supabase.functions.invoke("provision-staff-account", {
      body: { kind, ...values },
    }));
  } catch (requestError) {
    error = requestError;
  } finally {
    setButtonBusy(button, false, "Ուղարկվում է…");
  }

  if (error) {
    if (await emailLimitExceeded(error))
      return message(messageId,
        "Հրավերը չուղարկվեց․ էլ. նամակների ժամային սահմանաչափը սպառվել է։ Փորձեք ավելի ուշ։", true);
    return message(messageId,
      "Հրավերը չուղարկվեց։ Ստուգեք թույլտվությունը, հասցեն և կրկնվող հաշիվները։", true);
  }

  form.reset();
  message(messageId, "Հրավերի հարցումն ընդունվել է։ Ստուգեք նաև Spam բաժինը. նամակի ստացումը դեռ հաստատված չէ։");
  await Promise.all([loadPendingInvites(), loadOverview()]);
}

async function loadPendingInvites() {
  const list = $("pendingInvites");
  const refreshButton = $("refreshInvitesBtn");
  list.replaceChildren();
  message("pendingMessage", "Բեռնվում է…");
  setButtonBusy(refreshButton, true, "Թարմացվում է…");

  let data;
  let error = null;
  try {
    ({ data, error } = await supabase.functions.invoke("manage-staff-invitation", {
      body: { action: "list" },
    }));
  } catch (requestError) {
    error = requestError;
  } finally {
    setButtonBusy(refreshButton, false, "Թարմացվում է…");
  }

  if (error || !Array.isArray(data?.invitations)) {
    message("pendingMessage", "Հրավերների ցանկը հասանելի չէ։ Փորձեք ավելի ուշ։", true);
    return;
  }

  const invitations = data.invitations;
  message("pendingMessage", invitations.length ? "" : "Սպասվող հրավերներ չկան։");

  for (const invite of invitations) {
    const row = document.createElement("article");
    row.className = `invite-row${invite.expired ? " expired" : ""}`;

    const main = document.createElement("div");
    main.className = "invite-main";
    const title = document.createElement("div");
    title.className = "invite-title";
    const roleBadge = document.createElement("span");
    roleBadge.className = "invite-role";
    roleBadge.textContent = invite.kind === "teacher" ? "Ուսուցիչ" : "Դպրոցի ադմինիստրատոր";
    const email = document.createElement("strong");
    email.className = "invite-email";
    email.textContent = invite.recipient_email;
    const scope = document.createElement("p");
    scope.className = "invite-meta";
    scope.textContent = [invite.school_name, invite.subject_name].filter(Boolean).join(" · ") || "Դպրոցական հրավեր";
    const expiry = document.createElement("p");
    expiry.className = "invite-expiry";
    const expiresAt = new Date(invite.expires_at).toLocaleString("hy-AM");
    expiry.textContent = invite.expired ? "Ժամկետանց հրավեր" : `Վավեր է մինչև ${expiresAt}`;
    title.append(roleBadge, email);
    main.append(title, scope, expiry);

    const actions = document.createElement("div");
    actions.className = "invite-actions";
    if (!invite.expired) {
      const resendButton = document.createElement("button");
      resendButton.type = "button";
      resendButton.className = "ghost";
      resendButton.textContent = "Վերաուղարկել";
      resendButton.addEventListener("click", async () => {
        setButtonBusy(resendButton, true, "Ուղարկվում է…");
        try {
          const result = await invoke("manage-staff-invitation", { action: "resend", invitationId: invite.invitation_id });
          if (result?.resendRequested !== true) throw new Error("resend_unavailable");
          await loadPendingInvites();
          message("pendingMessage", "Վերաուղարկման հարցումն ընդունվել է։ Բացեք միայն ամենավերջին նամակի հղումը։");
        } catch (error) {
          setButtonBusy(resendButton, false, "Ուղարկվում է…");
          message("pendingMessage", error.message === "email_rate_limited"
            ? "Էլ. նամակների ժամային սահմանաչափը սպառվել է։ Փորձեք ավելի ուշ։"
            : "Վերաուղարկման հարցումը չհաջողվեց։ Փորձեք ավելի ուշ։", true);
        }
      });
      actions.append(resendButton);
    }

    const revokeButton = document.createElement("button");
    revokeButton.type = "button";
    revokeButton.className = "ghost danger-ghost";
    revokeButton.textContent = "Չեղարկել";
    revokeButton.addEventListener("click", async () => {
      if (!window.confirm("Չեղարկե՞լ այս հրավերը։")) return;
      setButtonBusy(revokeButton, true, "Չեղարկվում է…");
      try {
        const result = await invoke("manage-staff-invitation", { action: "revoke", invitationId: invite.invitation_id });
        if (result?.revoked !== true) throw new Error("revoke_unavailable");
        await loadPendingInvites();
        message("pendingMessage", "Հրավերը չեղարկված է։");
      } catch {
        setButtonBusy(revokeButton, false, "Չեղարկվում է…");
        message("pendingMessage", "Հրավերը չչեղարկվեց։ Թարմացրեք ցանկը։", true);
      }
    });
    actions.append(revokeButton);
    row.append(main, actions);
    list.append(row);
  }
}

async function loadTeacherSubjects(schoolId) {
  const subjectSelect = $("teacherSubject");
  subjectSelect.replaceChildren();
  subjectSelect.disabled = true;
  const loadingOption = new Option("Բեռնվում է…", "");
  loadingOption.disabled = true;
  loadingOption.selected = true;
  subjectSelect.add(loadingOption);

  const { data: options, error } = await supabase.functions.invoke("get-school-subject-options", {
    body: { schoolId },
  });
  const subjects = options?.subjects;
  subjectSelect.replaceChildren();
  if (error || !Array.isArray(subjects) || !subjects.length) {
    const emptyOption = new Option("Հասանելի առարկաներ չկան", "");
    emptyOption.disabled = true;
    emptyOption.selected = true;
    subjectSelect.add(emptyOption);
    return false;
  }
  for (const subject of subjects) subjectSelect.add(new Option(subject.nameHy || subject.code, subject.id));
  subjectSelect.disabled = false;
  return true;
}

$("refreshOverviewBtn").addEventListener("click", loadOverview);
$("overviewSchool").addEventListener("change", (event) => {
  selectedTeacherMembershipId = null;
  const school = overview?.schools?.find((item) => item.id === event.currentTarget.value);
  if (school) renderSchool(school);
});
$("refreshInvitesBtn").addEventListener("click", loadPendingInvites);
$("schoolForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await invite("school_admin", {
    schoolName: $("schoolName").value.trim(),
    email: $("schoolAdminEmail").value.trim(),
  }, "schoolMessage", event.currentTarget);
});
$("teacherForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await invite("teacher", {
    schoolId: $("teacherSchool").value,
    subjectId: $("teacherSubject").value,
    email: $("teacherEmail").value.trim(),
  }, "teacherMessage", event.currentTarget);
});
$("teacherSchool").addEventListener("change", async (event) => {
  message("teacherMessage", "");
  const loaded = await loadTeacherSubjects(event.currentTarget.value);
  if (!loaded) message("teacherMessage", "Այս դպրոցի համար հրապարակված առարկա չի գտնվել։", true);
});
$("signOutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.replace("./account-access");
});

const { data: auth } = await supabase.auth.getUser();
const id = auth.user?.id;
const { data: profile } = id ? await supabase.from("profiles")
  .select("role,account_status").eq("id", id).maybeSingle() : { data: null };
$("loading").classList.add("hidden");

if (profile?.account_status !== "active" || !["admin", "school_admin"].includes(profile?.role)) {
  $("denied").classList.remove("hidden");
} else {
  $("accountAccessLink").classList.add("hidden");
  $("signOutBtn").classList.remove("hidden");
  $("managementHeading").classList.remove("hidden");

  if (profile.role === "admin") {
    $("pageTitle").textContent = "Դպրոցների կառավարում";
    $("pageLede").textContent = "Դպրոցների գործառնական պատկերը, առաջին ադմինիստրատորների հրավերները և սպասվող հարցումները։";
    $("masterPanel").classList.remove("hidden");
  }

  const schools = await loadOverview();
  if (profile.role === "school_admin") {
    if (!schools.length) {
      $("denied").classList.remove("hidden");
    } else {
      $("teacherSchool").replaceChildren(...schools.map((school) => new Option(school.name, school.id)));
      const subjectsLoaded = await loadTeacherSubjects(schools[0].id);
      if (subjectsLoaded) $("teacherPanel").classList.remove("hidden");
      else message("teacherMessage", "Այս դպրոցի համար հրապարակված առարկա չի գտնվել։", true);
    }
  }

  if (profile.role === "admin" || schools.length) {
    $("pendingPanel").classList.remove("hidden");
    await loadPendingInvites();
  }
}
