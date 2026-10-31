import { signOutAccount } from './account-signout.mjs';
import { renderEvidenceGroups } from "./analytics-provenance.mjs";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { schoolMembershipStatus } from "./school-membership-status.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const dashboardState = {
  schools: [], invitations: [], years: new Map(), teachers: new Map(), analyticsOptions: null,
};
let teacherRosterLoadVersion = 0;
let analyticsLoadVersion = 0;


function message(id, text, error = false) {
  const element = $(id);
  element.textContent = text;
  element.classList.toggle("is-error", error);
  element.classList.toggle("is-success", Boolean(text) && !error);
}

async function emailLimitExceeded(error) {
  if (error?.context?.status !== 429) return false;
  try { return (await error.context.clone().json())?.error === "email_rate_limited"; }
  catch { return false; }
}

async function functionErrorCode(error) {
  try { return (await error?.context?.clone().json())?.error || ""; }
  catch { return ""; }
}

function setButtonBusy(button, busy, busyText) {
  if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
  button.disabled = busy;
  if (busy) button.setAttribute("aria-busy", "true");
  else button.removeAttribute("aria-busy");
  button.textContent = busy ? busyText : button.dataset.defaultLabel;
}

function renderOverview() {
  const schoolId = $("overviewSchool")?.value;
  const school = dashboardState.schools.find((item) => item.id === schoolId);
  const years = dashboardState.years.get(schoolId);
  const teachers = dashboardState.teachers.get(schoolId);
  const invitations = dashboardState.invitations.filter((invite) => invite.school_id === schoolId);
  $("overviewSchoolCode").textContent = school?.school_code ? `Դպրոցի կոդ՝ ${school.school_code}` : "";
  $("overviewYear").textContent = years
    ? (years.find((year) => year.status === "active")?.label || "Չկա") : "—";
  $("overviewTeachers").textContent = teachers
    ? String(teachers.filter((teacher) => teacher.membership_status === "active"
      && teacher.account_status === "active").length) : "—";
  $("overviewClasses").textContent = teachers
    ? String(teachers.filter((teacher) => teacher.membership_status === "active"
      && teacher.account_status === "active")
      .flatMap((teacher) => Array.isArray(teacher.classes) ? teacher.classes : [])
      .filter((klass) => klass.isActive).length) : "—";
  $("overviewInvites").textContent = dashboardState.invitations.length
    ? String(invitations.length) : (schoolId ? "0" : "—");
  if (!schoolId) return message("overviewMessage", "Դպրոց ընտրեք ամփոփումը տեսնելու համար։", true);
  if (years && !years.some((year) => year.status === "active"))
    return message("overviewMessage", "Առաջին քայլը՝ բացեք ընթացիկ ուսումնական տարին։");
  if (teachers && !teachers.some((teacher) => teacher.membership_status === "active"))
    return message("overviewMessage", "Ուսումնական տարին բաց է։ Այժմ կարող եք հրավիրել ուսուցիչների։");
  message("overviewMessage", "Դպրոցի հիմնական կարգավորումները պատրաստ են։");
}

function displayPercent(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value))
    ? `${Number(value).toLocaleString("hy-AM", { maximumFractionDigits: 1 })}%` : "—";
}

function renderRateMetric(valueId, detailId, progressId, rate, detail) {
  const numeric = Number(rate);
  const available = rate !== null && rate !== undefined && Number.isFinite(numeric);
  $(valueId).textContent = available ? displayPercent(numeric) : "—";
  $(detailId).textContent = detail;
  const progress = $(progressId);
  if (!progress) return;
  progress.hidden = !available;
  progress.value = available ? Math.min(100, Math.max(0, numeric)) : 0;
}

function replaceAnalyticsOptions(select, rows, allLabel, selectedValue = "") {
  select.replaceChildren();
  if (allLabel) select.add(new Option(allLabel, ""));
  for (const row of rows) select.add(new Option(row.label || row.name, row.id));
  const available = [...select.options].some((option) => option.value === selectedValue);
  select.value = available ? selectedValue : "";
}

function renderSchoolAnalytics(payload) {
  const analytics = payload?.analytics;
  if (!analytics) return;
  const enrolledStudents = Number(analytics.enrollment?.students ?? 0);
  const enrollmentContexts = Number(analytics.enrollment?.contexts ?? 0);
  renderRateMetric("analyticsParticipation", "analyticsParticipationDetail", "analyticsParticipationBar",
    analytics.participation?.rate,
    `${Number(analytics.participation?.students ?? 0)} մասնակցած · ${enrolledStudents} ընդգրկված աշակերտ`);
  const diagnosticAccuracy = analytics.diagnostic?.averageAccuracy;
  renderRateMetric("analyticsDiagnostic", "analyticsDiagnosticDetail", "analyticsDiagnosticBar",
    analytics.diagnostic?.completionRate,
    `${Number(analytics.diagnostic?.completedContexts ?? 0)}/${Number(analytics.diagnostic?.eligibleContexts ?? enrollmentContexts)} համատեքստ${diagnosticAccuracy !== null && diagnosticAccuracy !== undefined && Number.isFinite(Number(diagnosticAccuracy)) ? ` · պատասխանների ճշտությունը՝ ${displayPercent(diagnosticAccuracy)}` : ""}`);
  renderRateMetric("analyticsMastery", "analyticsMasteryDetail", "analyticsMasteryBar",
    analytics.mastery?.passRate,
    `${Number(analytics.mastery?.passedContexts ?? 0)}/${Number(analytics.mastery?.attemptedContexts ?? 0)} ավարտված համատեքստ`);
  $("analyticsReview").textContent = String(Number(analytics.chapterReview?.completedSessions ?? 0));
  $("analyticsReviewDetail").textContent = `${Number(analytics.chapterReview?.students ?? 0)} աշակերտ · ${Number(analytics.chapterReview?.qualifyingSessions ?? 0)} պարտադիր կրկնություն`;

  renderEvidenceGroups($("analyticsEvidenceGroups"),payload);
  if (!enrollmentContexts) message("analyticsMessage", "Ընտրված համատեքստում ընդգրկված աշակերտ չկա։");
  else if (!Number(analytics.evidence?.exactSessions ?? 0)) message("analyticsMessage", "Ընտրված համատեքստում դեռ հաստատված ուսումնական աշխատանք չկա։");
  else message("analyticsMessage", "");
}

async function loadSchoolAnalytics({ resetFilters = false } = {}) {
  const version = ++analyticsLoadVersion;
  const schoolId = $("overviewSchool")?.value;
  if (!schoolId) return;
  const refresh = $("refreshAnalyticsBtn");
  if (resetFilters) {
    for (const id of ["analyticsYearFilter", "analyticsProgrammeFilter", "analyticsClassFilter","analyticsReleaseFilter","analyticsUnitFilter"]) $(id).replaceChildren();
    dashboardState.analyticsOptions = null;
  }
  const requestedYearId = resetFilters ? "" : $("analyticsYearFilter").value;
  const requestedProgrammeId = resetFilters ? "" : $("analyticsProgrammeFilter").value;
  const requestedClassId = resetFilters ? "" : $("analyticsClassFilter").value;
  const requestedReleaseId = resetFilters ? "" : $("analyticsReleaseFilter").value;
  const requestedUnitId = resetFilters ? "" : $("analyticsUnitFilter").value;
  for (const id of ["analyticsParticipation","analyticsDiagnostic","analyticsMastery","analyticsReview","analyticsParticipationDetail","analyticsDiagnosticDetail","analyticsMasteryDetail","analyticsReviewDetail"]) $(id).textContent = "—";
  for (const id of ["analyticsParticipationBar","analyticsDiagnosticBar","analyticsMasteryBar"]) $(id).hidden=true;
  $("analyticsEvidenceGroups").replaceChildren();
  message("analyticsMessage", "Տվյալները բեռնվում են…");
  setButtonBusy(refresh, true, "Թարմացվում է…");

  let data, error;
  try {
    ({ data, error } = await supabase.functions.invoke("get-school-performance-analytics", {
      body: {
        schoolId,
        academicYearId: requestedYearId || undefined,
        subjectProgramId: requestedProgrammeId || undefined,
        classId: requestedClassId || undefined,
        curriculumReleaseId: requestedReleaseId || undefined, unitId: requestedUnitId || undefined,
      },
    }));
  } catch (requestError) {
    error = requestError;
  } finally {
    if (version === analyticsLoadVersion) setButtonBusy(refresh, false, "Թարմացվում է…");
  }
  if (version !== analyticsLoadVersion || $("overviewSchool").value !== schoolId) return;
  if (error || !data?.analytics || !data?.options) {
    const code = await functionErrorCode(error);
    if (version !== analyticsLoadVersion || $("overviewSchool").value !== schoolId) return;
    message("analyticsMessage", code === "analytics_scope_unavailable"
      ? "Ընտրված վերլուծական համատեքստը հասանելի չէ։"
      : "Վերլուծական տվյալները չբեռնվեցին։ Փորձեք ավելի ուշ։", true);
    return;
  }

  dashboardState.analyticsOptions = data.options;
  replaceAnalyticsOptions($("analyticsYearFilter"), data.options.academicYears ?? [], null, data.scope?.academicYearId ?? "");
  replaceAnalyticsOptions($("analyticsProgrammeFilter"), data.options.programmes ?? [], "Բոլոր առարկաները և դասարանները", data.scope?.subjectProgramId ?? "");
  const selectedProgrammeId = data.scope?.subjectProgramId ?? "";
  const classRows = (data.options.classes ?? []).filter((row) =>
    !selectedProgrammeId || row.subjectProgramIds?.includes(selectedProgrammeId));
  replaceAnalyticsOptions($("analyticsClassFilter"), classRows, "Բոլոր դասարանները", data.scope?.classId ?? "");
  replaceAnalyticsOptions($("analyticsReleaseFilter"),data.options.releases ?? [],"Բոլոր թողարկումները",data.scope?.curriculumReleaseId ?? "");
  replaceAnalyticsOptions($("analyticsUnitFilter"),(data.options.units ?? []).filter(row=>row.curriculumReleaseId===data.scope?.curriculumReleaseId),"Բոլոր գլուխները",data.scope?.unitId ?? "");
  renderSchoolAnalytics(data);
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
    if (await functionErrorCode(error) === "mfa_required") {
      message(messageId, "Master admin գործողությունների համար անհրաժեշտ է հաստատել MFA-ն։", true);
      window.setTimeout(() => location.assign("./admin-security.html"), 700);
      return;
    }
    if (await emailLimitExceeded(error))
      return message(messageId,
        "Հրավերը չուղարկվեց․ էլ. նամակների ժամային սահմանաչափը սպառվել է։ Փորձեք ավելի ուշ։", true);
    return message(messageId,
      "Հրավերը չուղարկվեց։ Ստուգեք թույլտվությունը, հասցեն և կրկնվող հաշիվները։", true);
  }

  form.reset();
  message(messageId, "Հրավերի հարցումն ընդունվել է։ Ստուգեք նաև Spam բաժինը. նամակի ստացումը դեռ հաստատված չէ։");
  await loadPendingInvites();
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
  dashboardState.invitations = invitations;
  renderOverview();
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
        let result, resendError;
        try {
          ({ data: result, error: resendError } = await supabase.functions.invoke("manage-staff-invitation", {
            body: { action: "resend", invitationId: invite.invitation_id },
          }));
        } catch (requestError) {
          resendError = requestError;
        }
        if (resendError || result?.resendRequested !== true) {
          setButtonBusy(resendButton, false, "Ուղարկվում է…");
          if (await emailLimitExceeded(resendError))
            return message("pendingMessage", "Վերաուղարկումը սահմանափակվել է․ էլ. նամակների ժամային սահմանաչափը սպառվել է։ Փորձեք ավելի ուշ։", true);
          return message("pendingMessage", "Վերաուղարկման հարցումը չհաջողվեց։ Ստուգեք էլ. փոստի կարգավորումները կամ փորձեք ավելի ուշ։", true);
        }
        await loadPendingInvites();
        message("pendingMessage", "Վերաուղարկման հարցումն ընդունվել է։ Բացեք միայն ամենավերջին նամակի հղումը. նախորդ հղումներն այլևս չեն գործում։ Ստուգեք նաև Spam բաժինը։");
      });
      actions.append(resendButton);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost danger-ghost";
    button.textContent = "Չեղարկել";
    button.addEventListener("click", async () => {
      if (!window.confirm("Չեղարկե՞լ այս հրավերը։")) return;
      setButtonBusy(button, true, "Չեղարկվում է…");
      const { data: result, error: revokeError } = await supabase.functions.invoke("manage-staff-invitation", {
        body: { action: "revoke", invitationId: invite.invitation_id },
      });
      if (revokeError || result?.revoked !== true) {
        setButtonBusy(button, false, "Չեղարկվում է…");
        return message("pendingMessage", "Հրավերը չչեղարկվեց։ Թարմացրեք ցանկը։", true);
      }
      await loadPendingInvites();
      message("pendingMessage", "Հրավերը չեղարկված է։");
    });

    actions.append(button);
    row.append(main, actions);
    list.append(row);
  }
}

function rosterField(label, value) {
  const line = document.createElement("p");
  line.className = "roster-field";
  const heading = document.createElement("strong");
  heading.textContent = label;
  const text = document.createElement("span");
  text.textContent = value;
  line.append(heading, text);
  return line;
}

async function offboardTeacher(teacher, schoolId, button) {
  setButtonBusy(button, true, "Ստուգվում է…");
  try {
    const body = { schoolId, membershipId: teacher.membership_id, reason: "administrative" };
    const preview = await supabase.functions.invoke("manage-school-teacher", {
      body: { ...body, action: "preview_offboard" },
    });
    const impact = preview.data?.offboarding;
    if (preview.error || !impact?.revision) throw new Error("preview_failed");
    if ($("rosterSchool").value !== schoolId) return;
    const confirmed = window.confirm(
      `Դադարեցնե՞լ ${teacher.display_name || "այս ուսուցչի"} աշխատանքը այս դպրոցում։\n\n`
      + `Կավարտվեն ${impact.activeAssignments} դասարանային նշանակումներ և ${impact.activeSubjectGrants} առարկայի թույլտվություններ։\n`
      + `Կչեղարկվեն ${impact.unusedInvitations} չօգտագործված հրավերներ և ${impact.unusedJoinCodes} մուտքի կոդեր։\n\n`
      + "Հաշիվը, դասարանները, աշակերտներն ու արդյունքները կպահպանվեն։ Դասարանների ուսուցումը կարող է դադարել մինչև նոր ուսուցչի նշանակումը։ Այս գործողությունը չի վերականգնվում «Վերականգնել» կոճակով։",
    );
    if (!confirmed || $("rosterSchool").value !== schoolId) return;
    setButtonBusy(button, true, "Դադարեցվում է…");
    const result = await supabase.functions.invoke("manage-school-teacher", {
      body: { ...body, action: "offboard", revision: impact.revision },
    });
    if (result.error || result.data?.offboarding?.ended !== true) {
      let code = result.data?.error;
      try { code = (await result.error?.context?.clone().json())?.error ?? code; } catch { /* Fall back to general message. */ }
      if (code === "teacher_offboarding_preview_changed") {
        return message("rosterMessage", "Ուսուցչի նշանակումները կամ հրավերները փոխվել են։ Թարմացրեք ցանկը և կրկին ստուգեք գործողությունը։", true);
      }
      throw new Error("offboarding_failed");
    }
    if ($("rosterSchool").value !== schoolId) return;
    await loadTeacherRoster();
    message("rosterMessage", "Անդամակցությունն այս դպրոցում ավարտված է։ Դասարաններն ու ուսուցման պատմությունը պահպանված են։");
  } catch {
    if ($("rosterSchool").value === schoolId)
      message("rosterMessage", "Գործողությունը չհաջողվեց հաստատել։ Թարմացրեք ցանկը և ստուգեք ուսուցչի վիճակը։", true);
  } finally {
    setButtonBusy(button, false, "");
  }
}

function teacherCard(teacher, schoolId) {
    const card = document.createElement("article");
    card.className = "roster-card";
    const membership = schoolMembershipStatus(teacher.membership_status);
    const active = membership.key === "active" && teacher.account_status === "active";
    const head = document.createElement("div");
    head.className = "roster-card-head";
    const identity = document.createElement("div");
    const name = document.createElement("h3");
    const nameText = teacher.display_name || "Ուսուցչի անունը նշված չէ";
    if (active) {
      const detailLink = document.createElement("a");
      detailLink.className = "roster-teacher-link";
      detailLink.href = `./school-teacher.html?school=${encodeURIComponent(schoolId)}&membership=${encodeURIComponent(teacher.membership_id)}`;
      detailLink.textContent = nameText;
      detailLink.setAttribute("aria-label", `${nameText}՝ բացել դասարանները`);
      name.append(detailLink);
    } else {
      name.textContent = nameText;
    }
    const email = document.createElement("p");
    email.className = "roster-email";
    email.textContent = teacher.email || "Էլ. հասցեն անհասանելի է";
    identity.append(name, email);
    const stateBox = document.createElement("div");
    stateBox.className = "roster-state-actions";
    const state = document.createElement("span");
    state.className = `roster-status roster-status-${membership.key}`;
    state.textContent = membership.label;
    stateBox.append(state);
    if (teacher.account_status !== "active") {
      const accountState = document.createElement("span");
      accountState.className = "roster-account-status";
      accountState.textContent = teacher.account_status === "suspended"
        ? "Հաշիվը կասեցված է"
        : teacher.account_status === "archived"
          ? "Հաշիվը արխիվացված է"
          : "Հաշիվը ակտիվ չէ";
      stateBox.append(accountState);
    }
    if (teacher.membership_status === "active" || teacher.membership_status === "archived") {
      const archiveButton = document.createElement("button");
      const archived = teacher.membership_status === "archived";
      archiveButton.type = "button";
      archiveButton.className = `ghost roster-archive-button${archived ? "" : " danger-ghost"}`;
      archiveButton.textContent = archived ? "Վերականգնել" : "Արխիվացնել";
      archiveButton.disabled = archived && teacher.account_status !== "active";
      if (archiveButton.disabled) archiveButton.title = "Հաշիվը նախ պետք է ակտիվացնի հարթակի ադմինիստրատորը։";
      archiveButton.addEventListener("click", async () => {
        if (!archived && !window.confirm(
          "Արխիվացնե՞լ այս ուսուցչին։ Այս դպրոցի մուտքը կդադարեցվի, իսկ հաշիվը, առարկաները, դասարաններն ու պատմությունը կպահպանվեն։",
        )) return;
        setButtonBusy(archiveButton, true, archived ? "Վերականգնվում է…" : "Արխիվացվում է…");
        const { data, error } = await supabase.functions.invoke("manage-school-teacher", {
          body: { action: archived ? "restore" : "archive", schoolId, membershipId: teacher.membership_id },
        });
        if (error || data?.updated !== true) {
          setButtonBusy(archiveButton, false, "");
          return message("rosterMessage", archived
            ? "Ուսուցիչը չվերականգնվեց։ Ստուգեք հաշվի վիճակը կամ փորձեք ավելի ուշ։"
            : "Ուսուցիչը չարխիվացվեց։ Թարմացրեք ցանկը և կրկին փորձեք։", true);
        }
        await loadTeacherRoster();
        message("rosterMessage", archived
          ? "Ուսուցիչը կրկին ակտիվ է այս դպրոցում։"
          : "Ուսուցիչն արխիվացված է այս դպրոցում։ Հաշիվն ու ամբողջ պատմությունը պահպանված են։");
      });
      stateBox.append(archiveButton);
      const offboardButton = document.createElement("button");
      offboardButton.type = "button";
      offboardButton.className = "ghost danger-ghost roster-archive-button";
      offboardButton.textContent = "Դադարեցնել աշխատանքը";
      offboardButton.addEventListener("click", () => offboardTeacher(teacher, schoolId, offboardButton));
      stateBox.append(offboardButton);
    }
    head.append(identity, stateBox);
    card.append(head);

    const subjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];
    card.append(rosterField("Հաստատված առարկաներ", subjects.length
      ? subjects.map((subject) => subject.nameHy).filter(Boolean).join(" · ")
      : "Ակտիվ առարկայի թույլտվություն չկա"));

    const classes = Array.isArray(teacher.classes) ? teacher.classes : [];
    const classList = document.createElement("div");
    classList.className = "roster-classes";
    const title = document.createElement("strong");
    title.textContent = "Դասարաններ";
    classList.append(title);
    if (!classes.length) {
      const empty = document.createElement("p");
      empty.textContent = "Ակտիվ դասարանային նշանակում չկա։";
      classList.append(empty);
    } else {
      const listElement = document.createElement("ul");
      for (const klass of classes) {
        const item = document.createElement("li");
        const scope = [klass.subjectName, klass.gradeNumber ? `${klass.gradeNumber}-րդ դասարան` : ""]
          .filter(Boolean).join(" · ");
        item.textContent = `${klass.name || "Դասարան"}${scope ? ` — ${scope}` : ""}${klass.isActive ? "" : " · Արխիվացված"}`;
        listElement.append(item);
      }
      classList.append(listElement);
    }
    card.append(classList);
    return card;
}

function appendRosterGroup(container, titleText, teachers, schoolId, archived = false) {
  if (!teachers.length) return;
  const group = document.createElement(archived ? "details" : "section");
  group.className = `roster-group${archived ? " roster-group-archived" : ""}`;
  const title = document.createElement(archived ? "summary" : "h3");
  title.className = "roster-group-title";
  title.textContent = `${titleText} · ${teachers.length}`;
  group.append(title);
  for (const teacher of teachers) group.append(teacherCard(teacher, schoolId));
  container.append(group);
}

function appendRosterHistory(container, teachers, schoolId) {
  if (!teachers.length) return;
  const details = document.createElement("details");
  details.className = "roster-history";
  const summary = document.createElement("summary");
  summary.textContent = `Նախկին ուսուցիչներ · ավարտված անդամակցություններ (${teachers.length})`;
  const body = document.createElement("div");
  body.className = "roster-history-body";
  for (const teacher of teachers) body.append(teacherCard(teacher, schoolId));
  details.append(summary, body);
  container.append(details);
}

async function loadTeacherRoster() {
  const version = ++teacherRosterLoadVersion;
  const schoolId = $("rosterSchool").value;
  const list = $("teacherRoster");
  const refresh = $("refreshTeachersBtn");
  list.replaceChildren();
  if (!schoolId) {
    setButtonBusy(refresh, false, "");
    return;
  }
  message("rosterMessage", "Բեռնվում է…");
  setButtonBusy(refresh, true, "Թարմացվում է…");
  let data, error;
  try {
    ({ data, error } = await supabase.functions.invoke("get-school-teachers", {
      body: { schoolId },
    }));
  } catch (requestError) {
    error = requestError;
  } finally {
    if (version === teacherRosterLoadVersion) setButtonBusy(refresh, false, "Թարմացվում է…");
  }
  if (version !== teacherRosterLoadVersion) return;
  if ($("rosterSchool").value !== schoolId) return;
  if (error || !Array.isArray(data?.teachers)) {
    message("rosterMessage", "Ուսուցիչների ցանկը հասանելի չէ։ Փորձեք ավելի ուշ։", true);
    return;
  }
  dashboardState.teachers.set(schoolId, data.teachers);
  renderOverview();
  message("rosterMessage", data.teachers.length ? "" : "Այս դպրոցի համար հաստատված ուսուցիչներ չկան։");
  appendRosterGroup(list, "Ակտիվ ուսուցիչներ",
    data.teachers.filter((teacher) => teacher.membership_status === "active"), schoolId);
  appendRosterGroup(list, "Արխիվացված ուսուցիչներ",
    data.teachers.filter((teacher) => teacher.membership_status === "archived"), schoolId, true);
  appendRosterHistory(list,
    data.teachers.filter((teacher) => !["active", "archived"].includes(teacher.membership_status)), schoolId);
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

  for (const subject of subjects) {
    subjectSelect.add(new Option(subject.nameHy || subject.code, subject.id));
  }
  subjectSelect.disabled = false;
  return true;
}

async function loadYears() {
  const schoolId = $("yearSchool").value;
  const list = $("yearList");
  list.replaceChildren();
  if (!schoolId) return;
  const { data, error } = await supabase.functions.invoke("manage-school-academic-year", {
    body: { action: "list", schoolId },
  });
  if (error || !Array.isArray(data?.years)) {
    message("yearMessage", "Ուսումնական տարիների ցանկը հասանելի չէ։", true);
    return;
  }
  dashboardState.years.set(schoolId, data.years);
  renderOverview();
  if (!data.years.length) {
    const empty = document.createElement("p");
    empty.className = "subtle";
    empty.textContent = "Դեռ բացված ուսումնական տարի չկա։";
    list.append(empty);
  }
  const groups = [
    ["Ակտիվ ուսումնական տարիներ", data.years.filter((year) => year.status === "active"), false],
    ["Արխիվացված տարիներ", data.years.filter((year) => year.status !== "active"), true],
  ];
  const today = new Date().toISOString().slice(0, 10);
  for (const [titleText, years, archived] of groups) {
    if (!years.length) continue;
    const group = document.createElement(archived ? "details" : "section");
    group.className = `year-group${archived ? " year-group-archived" : ""}`;
    const title = document.createElement(archived ? "summary" : "h3");
    title.className = "year-group-title";
    title.textContent = `${titleText} · ${years.length}`;
    group.append(title);
    for (const year of years) {
      const item = document.createElement("article");
      item.className = "year-row";
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = year.label;
      const dates = document.createElement("span");
      dates.textContent = `${year.starts_on} – ${year.ends_on}`;
      details.append(name, dates);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `ghost${archived ? "" : " danger-ghost"}`;
      button.textContent = archived ? "Վերականգնել" : "Արխիվացնել";
      const canRestore = year.starts_on <= today && today <= year.ends_on;
      button.disabled = archived && !canRestore;
      if (button.disabled) button.title = "Անցած ուսումնական տարին պահպանվում է որպես պատմություն և այլևս չի կարող ակտիվացվել։";
      button.addEventListener("click", async () => {
        if (!archived && !window.confirm(
          "Արխիվացնե՞լ ուսումնական տարին։ Այդ տարվա դասարանները կդառնան անհասանելի, բայց բոլոր տվյալները կպահպանվեն։",
        )) return;
        setButtonBusy(button, true, archived ? "Վերականգնվում է…" : "Արխիվացվում է…");
        const { data: result, error: updateError } = await supabase.functions.invoke("manage-school-academic-year", {
          body: { action: archived ? "restore" : "archive", schoolId, yearId: year.id },
        });
        if (updateError || result?.updated !== true) {
          setButtonBusy(button, false, "");
          return message("yearMessage", archived
            ? "Տարին չվերականգնվեց։ Համոզվեք, որ այն ընթացիկ է և չի համընկնում մեկ այլ ակտիվ տարվա հետ։"
            : "Տարին չարխիվացվեց։ Թարմացրեք ցանկը և կրկին փորձեք։", true);
        }
        await loadYears();
        if ($("rosterSchool").value === schoolId) await loadTeacherRoster();
        else {
          dashboardState.teachers.delete(schoolId);
          renderOverview();
        }
        if ($("overviewSchool").value === schoolId) await loadSchoolAnalytics({ resetFilters: true });
        message("yearMessage", archived
          ? "Ուսումնական տարին և դրա նախկինում ակտիվ դասարանները կրկին հասանելի են։"
          : "Ուսումնական տարին արխիվացված է։ Դասարանների պատմությունը պահպանված է։");
      });
      item.append(details, button);
      group.append(item);
    }
    list.append(group);
  }
}

$("overviewSchool").addEventListener("change", async (event) => {
  const schoolId = event.currentTarget.value;
  for (const id of ["yearSchool", "rosterSchool", "teacherSchool"]) $(id).value = schoolId;
  message("overviewMessage", "Թարմացվում է…");
  const [subjectsLoaded] = await Promise.all([
    loadTeacherSubjects(schoolId), loadYears(), loadTeacherRoster(), loadSchoolAnalytics({ resetFilters: true }),
  ]);
  if (!subjectsLoaded) message("teacherMessage", "Այս դպրոցի համար հրապարակված առարկա չի գտնվել։", true);
  renderOverview();
});
$("refreshAnalyticsBtn").addEventListener("click", () => loadSchoolAnalytics());
$("analyticsYearFilter").addEventListener("change", () => {
  $("analyticsProgrammeFilter").value = "";
  $("analyticsClassFilter").value = "";
  $("analyticsReleaseFilter").value = ""; $("analyticsUnitFilter").value = "";
  loadSchoolAnalytics();
});
$("analyticsProgrammeFilter").addEventListener("change", () => {
  $("analyticsClassFilter").value = "";
  $("analyticsReleaseFilter").value = ""; $("analyticsUnitFilter").value = "";
  loadSchoolAnalytics();
});
$("analyticsClassFilter").addEventListener("change", () => { $("analyticsReleaseFilter").value="";$("analyticsUnitFilter").value="";loadSchoolAnalytics(); });
$("analyticsReleaseFilter").addEventListener("change", () => { $("analyticsUnitFilter").value="";loadSchoolAnalytics(); });
$("analyticsUnitFilter").addEventListener("change", () => loadSchoolAnalytics());
$("yearSchool").addEventListener("change", () => { message("yearMessage", ""); loadYears(); });
$("yearForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type=submit]");
  setButtonBusy(button, true, "Բացվում է…");
  message("yearMessage", "");
  const { data, error } = await supabase.functions.invoke("manage-school-academic-year", {
    body: {
      action: "create", schoolId: $("yearSchool").value,
      label: $("yearLabel").value.trim(), startsOn: $("yearStart").value, endsOn: $("yearEnd").value,
    },
  });
  setButtonBusy(button, false, "Բացվում է…");
  if (error || !data?.yearId) {
    message("yearMessage", data?.error === "school_year_overlap"
      ? "Այս դպրոցի համար այդ ժամանակահատվածում արդեն ակտիվ տարի կա։"
      : "Ուսումնական տարին չբացվեց։ Ստուգեք ամսաթվերը և թույլտվությունը։", true);
    return;
  }
  message("yearMessage", "Ուսումնական տարին բացվեց։ Ուսուցիչները կարող են ստեղծել համապատասխան դասարաններ։");
  await loadYears();
  if ($("overviewSchool").value === $("yearSchool").value) await loadSchoolAnalytics({ resetFilters: true });
});

$("refreshTeachersBtn").addEventListener("click", loadTeacherRoster);
$("rosterSchool").addEventListener("change", loadTeacherRoster);
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
supabase.auth.onAuthStateChange((event) => {
  if(event === "SIGNED_OUT") { ++analyticsLoadVersion; ++teacherRosterLoadVersion; $("analyticsEvidenceGroups").replaceChildren(); for(const id of ["overviewPanel","teachersPanel","yearPanel","teacherPanel","pendingPanel"]) $(id).classList.add("hidden"); }
});
$("signOutBtn").addEventListener("click", async () => {
  await signOutAccount(supabase, { redirect: "./account-access" });
});

const { data: sessionData } = await supabase.auth.getSession();
const id = sessionData.session?.user?.id;
const { data: profile } = id ? await supabase.from("profiles")
  .select("role,account_status").eq("id", id).maybeSingle() : { data: null };
$("loading").classList.add("hidden");

if (profile?.account_status !== "active" || !["admin", "school_admin"].includes(profile?.role)) {
  $("denied").classList.remove("hidden");
} else {
  $("accountAccessLink").classList.add("hidden");
  $("signOutBtn").classList.remove("hidden");

  if (profile.role === "admin") {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== "aal2") {
      location.replace("./admin-security.html");
    } else {
      $("masterPanel").classList.remove("hidden");
    }
  }

  if (profile.role === "school_admin") {
    const { data: schools, error: schoolError } = await supabase.from("schools")
      .select("id,name,school_code").order("name");

    if (schoolError || !schools?.length) {
      $("denied").classList.remove("hidden");
    } else {
      dashboardState.schools = schools;
      for (const school of schools) {
        $("overviewSchool").add(new Option(school.name, school.id));
        $("teacherSchool").add(new Option(school.name, school.id));
        $("yearSchool").add(new Option(school.name, school.id));
        $("rosterSchool").add(new Option(school.name, school.id));
      }
      $("overviewPanel").classList.remove("hidden");
      $("yearPanel").classList.remove("hidden");
      $("teacherPanel").classList.remove("hidden");
      $("teachersPanel").classList.remove("hidden");
      const [, subjectsLoaded] = await Promise.all([
        loadYears(),
        loadTeacherSubjects(schools[0].id),
        loadTeacherRoster(),
        loadSchoolAnalytics({ resetFilters: true }),
      ]);
      if (!subjectsLoaded) message("teacherMessage", "Այս դպրոցի համար հրապարակված առարկա չի գտնվել։", true);
    }
  }

  if (profile.role === "admin" || !$("teacherPanel").classList.contains("hidden")) {
    $("pendingPanel").classList.remove("hidden");
    void loadPendingInvites();
  }
}
