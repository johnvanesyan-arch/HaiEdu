import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

function message(id, text, error = false) {
  const element = $(id);
  element.textContent = text;
  element.classList.toggle("is-error", error);
  element.classList.toggle("is-success", Boolean(text) && !error);
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

async function loadTeacherRoster() {
  const schoolId = $("rosterSchool").value;
  const list = $("teacherRoster");
  const refresh = $("refreshTeachersBtn");
  list.replaceChildren();
  if (!schoolId) return;
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
    setButtonBusy(refresh, false, "Թարմացվում է…");
  }
  if ($("rosterSchool").value !== schoolId) return;
  if (error || !Array.isArray(data?.teachers)) {
    message("rosterMessage", "Ուսուցիչների ցանկը հասանելի չէ։ Փորձեք ավելի ուշ։", true);
    return;
  }
  message("rosterMessage", data.teachers.length ? "" : "Այս դպրոցի համար հաստատված ուսուցիչներ չկան։");
  for (const teacher of data.teachers) {
    const card = document.createElement("article");
    card.className = "roster-card";
    const head = document.createElement("div");
    head.className = "roster-card-head";
    const identity = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = teacher.display_name || "Ուսուցչի անունը նշված չէ";
    const email = document.createElement("p");
    email.className = "roster-email";
    email.textContent = teacher.email || "Էլ. հասցեն անհասանելի է";
    identity.append(name, email);
    const state = document.createElement("span");
    const active = teacher.membership_status === "active" && teacher.account_status === "active";
    state.className = `roster-status${active ? "" : " roster-status-ended"}`;
    state.textContent = active ? "Ակտիվ" : "Մուտքը դադարեցված է";
    head.append(identity, state);
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
      empty.textContent = "Դասարան դեռ չի ստեղծվել։";
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
    list.append(card);
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
  if (!data.years.length) {
    const empty = document.createElement("p");
    empty.className = "subtle";
    empty.textContent = "Դեռ բացված ուսումնական տարի չկա։";
    list.append(empty);
  }
  for (const year of data.years) {
    const item = document.createElement("p");
    item.textContent = `${year.label} · ${year.starts_on} – ${year.ends_on} · ${year.status === "active" ? "Ակտիվ" : "Փակված"}`;
    list.append(item);
  }
}

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

  if (profile.role === "admin") $("masterPanel").classList.remove("hidden");

  if (profile.role === "school_admin") {
    const { data: schools, error: schoolError } = await supabase.from("schools")
      .select("id,name,school_code").order("name");

    if (schoolError || !schools?.length) {
      $("denied").classList.remove("hidden");
    } else {
      for (const school of schools) {
        $("teacherSchool").add(new Option(school.name, school.id));
        $("yearSchool").add(new Option(school.name, school.id));
        $("rosterSchool").add(new Option(school.name, school.id));
      }
      $("yearPanel").classList.remove("hidden");
      await loadYears();
      const subjectsLoaded = await loadTeacherSubjects(schools[0].id);
      $("teacherPanel").classList.remove("hidden");
      $("teachersPanel").classList.remove("hidden");
      await loadTeacherRoster();
      if (!subjectsLoaded) message("teacherMessage", "Այս դպրոցի համար հրապարակված առարկա չի գտնվել։", true);
    }
  }

  if (profile.role === "admin" || !$("teacherPanel").classList.contains("hidden")) {
    $("pendingPanel").classList.remove("hidden");
    await loadPendingInvites();
  }
}
