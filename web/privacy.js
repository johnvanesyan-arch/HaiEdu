import {taskPrivacyRows,erasurePresentation} from './task-privacy-view.mjs';
import { signOutAccount, showSessionReadFailure, clearSessionReadFailure } from './account-signout.mjs';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let state = null;
let accountEpoch = 0;
let accountRequest = 0;
let accountActor;
const accountHomes = {student:"./index.html",teacher:"./teacher.html?view=home",school_admin:"./school-admin.html",admin:"./admin.html",content_admin:"./content.html"};

function clearAccount(signedOut = false) {
  clearSessionReadFailure();
  state = null;
  for (const id of ['displayNameInput', 'newEmailInput']) $(id).value = '';
  for (const id of ['analyticsOptIn', 'researchOptIn']) $(id).checked = false;
  for (const id of ['accountTitle', 'accountRole', 'accountStatus', 'accountEmail', 'inventory',
    'nameMessage', 'emailChangeMessage', 'passwordChangeMessage', 'privacyMessage', 'deletionMessage']) $(id).textContent = '';
  document.body.removeAttribute("data-haiedu-student");
  document.body.removeAttribute("data-staff-account");
  document.documentElement.removeAttribute("data-haiedu-student-root");
  document.body.toggleAttribute("data-forest-surface", signedOut);
  document.body.toggleAttribute("data-account-pending", !signedOut);
  $("accountHomeLink").href = "./index.html";
  $("content").classList.add("hidden");
  $("signOutBtn").classList.add("hidden");
  $("signedOut").classList.toggle("hidden", !signedOut);
  $("loading").classList.toggle("hidden", signedOut);
  $("loading").textContent = "Տվյալները բեռնվում են…";
}


function setMessage(id, text, bad = false) {
  if (text === 'account_session_changed') return;
  const el = $(id);
  el.textContent = text || "";
  el.style.color = bad ? "#8a3342" : "#356246";
}

async function withinAccount(action) {
  const epoch = accountEpoch, actor = accountActor;
  const changed = () => epoch !== accountEpoch || actor !== accountActor;
  try {
    const result = await action();
    if (changed()) throw Error('account_session_changed');
    return result;
  } catch (error) {
    if (changed()) throw Error('account_session_changed');
    throw error;
  }
}

async function invoke(name, body = {}) {
  const { data, error } = await withinAccount(() => supabase.functions.invoke(name, { body }));
  if (error) throw new Error(data?.detail || data?.error || error.message);
  if (data?.error) throw new Error(data.detail || data.error);
  return data;
}

function roleLabel(role) {
  return ({ student: "Աշակերտ", teacher: "Ուսուցիչ", school_admin: "Դպրոցի ադմին", content_admin: "Բովանդակության ստուգող", admin: "Master admin", parent: "Ծնող" })[role] || role;
}

function statusLabel(status) {
  return ({ active: "Ակտիվ", suspended: "Կասեցված", deletion_pending: "Ջնջման հաստատման փուլում" })[status] || status;
}

function inventoryPresentation(role, inventory) {
  const minimization = "Ծննդյան ամսաթիվ, տան հասցե, հեռախոսահամար, ծնողի էլ. հասցե և պետական նույնականացուցիչ այս պրոֆիլում չենք պահում։ Հաշվի էլ. հասցեն պահվում է Supabase Auth-ում։";
  const views = {
    student: {
      title: "Ինչ տվյալներ ենք պահում աշակերտի մասին",
      description: "Աշակերտի պրոֆիլում պահվում են հաշվի տվյալները և ուսուցման համար անհրաժեշտ դասարանային, հրավերների ու առաջընթացի գրառումները։",
      rows: [
        ["Դասարանային անդամակցություններ", inventory.classMemberships ?? 0],
        ["Ստացված հրավերների գրառումներ", inventory.invitationsReceived ?? 0],
        ["Ուսուցչից ստացված նյութային առաջադրանքներ", inventory.materialAssignmentsReceived ?? 0],
        ["Ուսուցչից ստացված գրավոր առաջադրանքներ", inventory.writingAssignmentsReceived ?? 0],
        ["Պատասխանների փորձեր", inventory.attempts ?? 0],
        ["Ուսուցման սեսիաներ", inventory.learningSessions ?? 0],
        ["Հմտությունների առաջընթացի գրառումներ", inventory.masteryRows ?? 0],
        ["Ամրապնդման իրադարձություններ", inventory.remediationEvents ?? 0],
        ["Գրավոր աշխատանքներ՝ սևագրերով, ներկայացված տարբերակներով և մեկնաբանություններով", inventory.writtenWork ?? 0],
        ["Չուղարկված պատասխանների սևագրեր", inventory.responseDrafts ?? 0],
        ["Ձայնագրությունների օգտագործման գրառումներ", inventory.audioDeliveries ?? 0],
        ["Գնահատման ընթացքում ձայնագրությունների օգտագործման գրառումներ", inventory.assessedAudioRecordings ?? 0],
        ["Ընդհանուր նյութերի դիտման գրառումներ", inventory.sourceFamilyExposures ?? 0],
      ],
    },
    teacher: {
      title: "Ինչ տվյալներ ենք պահում ուսուցչի մասին",
      description: "Ուսուցչի պրոֆիլում պահվում են հաշվի տվյալները, դպրոցի անդամակցության պատմությունը, դասավանդման նշանակումները, ստեղծված հրավերներն ու կոդերը և գործողությունների աուդիտը։ Աշակերտների արդյունքները այստեղ չեն ներկայացվում։",
      rows: [
        ["Դպրոցի անդամակցության գրառումներ", inventory.institutionalMemberships ?? 0],
        ["Դասավանդման նշանակումներ", inventory.teachingAssignments ?? 0],
        ["Ուղարկված նյութային առաջադրանքներ", inventory.materialAssignmentsSent ?? 0],
        ["Ուղարկված գրավոր առաջադրանքներ", inventory.writingAssignmentsSent ?? 0],
        ["Գրավոր աշխատանքների գնահատումներ և մեկնաբանություններ", inventory.writtenReviews ?? 0],
        ["Գնահատման անձնական սևագրեր", inventory.feedbackDrafts ?? 0],
        ["Պատրաստի անձնական մեկնաբանություններ՝ ներառյալ արխիվը", inventory.feedbackSnippets ?? 0],
        ["Գնահատման ուղարկման հաստատումներ", inventory.feedbackReceipts ?? 0],
        ["Ստեղծված հրավերներ և կոդեր", inventory.invitationRecords ?? 0],
        ["Աուդիտային գործողություններ", inventory.auditEvents ?? 0],
      ],
    },
    school_admin: {
      title: "Ինչ տվյալներ ենք պահում դպրոցի ադմինի մասին",
      description: "Դպրոցի ադմինի պրոֆիլում պահվում են հաշվի տվյալները, դպրոցի անդամակցության պատմությունը, ուղարկված հրավերները և վարչական գործողությունների աուդիտը։",
      rows: [
        ["Դպրոցի անդամակցության գրառումներ", inventory.institutionalMemberships ?? 0],
        ["Ուղարկված հրավերներ", inventory.invitationRecords ?? 0],
        ["Աուդիտային գործողություններ", inventory.auditEvents ?? 0],
      ],
    },
    content_admin: {
      title: "Ինչ տվյալներ ենք պահում բովանդակության ստուգողի մասին",
      description: "Բովանդակության ստուգողի պրոֆիլում պահվում են հաշվի տվյալները, կատարված ստուգումների և գործողությունների աուդիտային գրառումները։",
      rows: [
        ["Բովանդակության ստուգումներ", inventory.contentReviews ?? 0],
        ["Գրավոր առաջադրանքների ստուգումներ", inventory.writtenTaskReviews ?? 0],
        ["Ուսումնական նյութերի տարբերակներ", inventory.materialVersions ?? 0],
        ["Ուսումնական նյութերի հաստատումներ", inventory.materialReviews ?? 0],
        ["Նյութերի ստուգման գործողություններ", inventory.materialEvents ?? 0],
        ["Աուդիտային գործողություններ", inventory.auditEvents ?? 0],
      ],
    },
    admin: {
      title: "Ինչ տվյալներ ենք պահում Master admin-ի մասին",
      description: "Master admin-ի պրոֆիլում պահվում են հաշվի տվյալները և անվտանգության ու վարչական գործողությունների աուդիտային գրառումները։",
      rows: [["Գրավոր առաջադրանքների ստուգումներ", inventory.writtenTaskReviews ?? 0],
        ["Ուսումնական նյութերի տարբերակներ", inventory.materialVersions ?? 0],
        ["Ուսումնական նյութերի հաստատումներ", inventory.materialReviews ?? 0],
        ["Նյութերի ստուգման գործողություններ", inventory.materialEvents ?? 0], ["Աուդիտային գործողություններ", inventory.auditEvents ?? 0]],
    },
  };
  return views[role] || {
    title: "Ինչ տվյալներ ենք պահում հաշվի մասին",
    description: "Պահվում են հաշվի հիմնական տվյալները և անվտանգության համար անհրաժեշտ աուդիտային գրառումները։",
    rows: [["Աուդիտային գործողություններ", inventory.auditEvents ?? 0]],
    minimization,
  };
}

function deletionLabel(request) {
  if (!request) return "Ակտիվ ջնջման հարցում չկա։";
  if(request.status==="processing"&&erasurePresentation(request).started)return erasurePresentation(request).progress;
  const labels = {
    pending: "Հարցումն ուղարկված է և սպասում է ադմինի ստուգմանը։ Մինչև վերջնական ջնջումը կարող եք չեղարկել այն։",
    processing: "Ադմինը հաստատել է հարցումը, բայց վերջնական ջնջումը դեռ չի իրականացվել։ Դուք դեռ կարող եք չեղարկել այն։",
    completed: "Վերջին ջնջման հարցումն ավարտվել է։",
    rejected: "Վերջին ջնջման հարցումը մերժվել է։",
    cancelled: "Վերջին ջնջման հարցումը չեղարկվել է։",
  };
  return labels[request.status] || request.status;
}

function render(data) {
  clearSessionReadFailure();
  state = data;
  document.body.removeAttribute("data-account-pending");
  document.body.removeAttribute("data-forest-surface");
  $("accountHomeLink").href = accountHomes[data.account.role] || "./index.html";
  document.body.toggleAttribute("data-haiedu-student", data.account.role === "student");
  document.body.toggleAttribute("data-staff-account", Object.hasOwn(accountHomes, data.account.role) && data.account.role !== "student");
  document.documentElement.toggleAttribute("data-haiedu-student-root", data.account.role === "student");
  $("loading").classList.add("hidden");
  $("signedOut").classList.add("hidden");
  $("content").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");

  $("accountTitle").textContent = data.account.displayName || "Իմ հաշիվը";
  $("accountRole").textContent = roleLabel(data.account.role);
  $("accountStatus").textContent = statusLabel(data.account.status);
  $("accountEmail").textContent = data.account.email || "—";
  $("displayNameInput").value = data.account.displayName || "";

  $("analyticsOptIn").checked = data.preferences?.product_analytics_opt_in === true;
  $("researchOptIn").checked = data.preferences?.research_use_opt_in === true;

  const inventory = data.dataInventory || {};
  const presentation = inventoryPresentation(data.account.role, inventory);
  $("inventoryTitle").textContent = presentation.title;
  $("inventoryDescription").textContent = presentation.description;
  $("inventoryMinimization").textContent = presentation.minimization || "Ծննդյան ամսաթիվ, տան հասցե, հեռախոսահամար, ծնողի էլ. հասցե և պետական նույնականացուցիչ այս պրոֆիլում չենք պահում։ Հաշվի էլ. հասցեն պահվում է Supabase Auth-ում։";
  $("inventory").innerHTML = [...presentation.rows,...taskPrivacyRows(inventory.teacherTasks)].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");

  const request = data.latestDeletionRequest;
  $("deletionState").textContent = deletionLabel(request);
  const deletion=erasurePresentation(request);
  $("requestDeletionBtn").classList.toggle("hidden",deletion.open);
  $("cancelDeletionBtn").classList.toggle("hidden",!deletion.canCancel);

  const deletionPending = data.account.status === "deletion_pending";
  $("displayNameInput").disabled = deletionPending;
  $("saveNameBtn").disabled = deletionPending;
  $("analyticsOptIn").disabled = deletionPending;
  $("researchOptIn").disabled = deletionPending;
  $("savePrivacyBtn").disabled = deletionPending;
  $("newEmailInput").disabled = deletionPending;
  $("changeEmailBtn").disabled = deletionPending;
  $("changePasswordBtn").disabled = deletionPending;
}

async function refresh() {
  const epoch = accountEpoch, request = ++accountRequest;
  const current = () => epoch === accountEpoch && request === accountRequest;
  try {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (!current()) return;
    if (error) throw error;
    const actor = sessionData.session?.user?.id || null;
    if (!actor) { accountActor = null; clearAccount(true); return; }
    accountActor = actor;
    const data = await invoke("get-my-privacy");
    if (current() && accountActor === actor) render(data);
  } catch (err) {
    if (!current()) return;
    clearAccount();
    $("loading").textContent = "Հաշվի տվյալները չբեռնվեցին։";
    showSessionReadFailure(refresh);
  }
}

$("saveNameBtn").addEventListener("click", async () => {
  try {
    setMessage("nameMessage", "Պահվում է…");
    const result = await invoke("manage-my-privacy", { action: "update_display_name", displayName: $("displayNameInput").value });
    setMessage("nameMessage", "Անունը պահպանվեց։");
    if (state) state.account.displayName = result.profile.display_name;
  } catch (err) { setMessage("nameMessage", err.message, true); }
});

$("changeEmailForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const epoch = accountEpoch;
  const email = $("newEmailInput").value.trim();
  const button = $("changeEmailBtn");
  if (!email || email.toLowerCase() === state?.account?.email?.toLowerCase()) {
    setMessage("emailChangeMessage", "Մուտքագրեք նոր էլ. հասցե։", true);
    return;
  }
  button.disabled = true;
  setMessage("emailChangeMessage", "Հաստատման նամակն ուղարկվում է…");
  try {
    const { error } = await withinAccount(() => supabase.auth.updateUser(
      { email },
      { emailRedirectTo: `${location.origin}/account-access` },
    ));
    if (error) throw error;
    $("newEmailInput").value = "";
    setMessage("emailChangeMessage", "Ստուգեք նոր և ներկայիս էլ. հասցեների փոստարկղերը և հաստատեք փոփոխությունը։ Մինչ այդ մուտք գործեք ներկայիս հասցեով։");
  } catch (err) {
    setMessage("emailChangeMessage", err.message || "Չհաջողվեց ուղարկել հաստատման նամակը։", true);
  } finally {
    if (epoch === accountEpoch) button.disabled = false;
  }
});

$("changePasswordBtn").addEventListener("click", async () => {
  const epoch = accountEpoch;
  const button = $("changePasswordBtn");
  button.disabled = true;
  setMessage("passwordChangeMessage", "Հղումն ուղարկվում է…");
  try {
    const { data, error: userError } = await withinAccount(() => supabase.auth.getUser());
    if (userError || !data.user?.email) throw userError || new Error("Մուտքի էլ. հասցեն չի գտնվել։");
    const { error } = await withinAccount(() => supabase.auth.resetPasswordForEmail(data.user.email, {
      redirectTo: `${location.origin}/account-access`,
    }));
    if (error) throw error;
    setMessage("passwordChangeMessage", "Հղումն ուղարկվեց ձեր ընթացիկ էլ. հասցեին։ Ստուգեք վերջին նամակը։");
  } catch (err) {
    setMessage("passwordChangeMessage", err.message || "Հղումը չուղարկվեց։ Փորձեք կրկին։", true);
  } finally {
    if (epoch === accountEpoch) button.disabled = false;
  }
});

$("savePrivacyBtn").addEventListener("click", async () => {
  const preferences = { productAnalytics: $("analyticsOptIn").checked, researchUse: $("researchOptIn").checked };
  try {
    setMessage("privacyMessage", "Պահվում է…");
    await invoke("manage-my-privacy", {
      action: "save_preferences",
      ...preferences,
    });
    if (state) state.preferences = { ...state.preferences, product_analytics_opt_in: preferences.productAnalytics, research_use_opt_in: preferences.researchUse };
    setMessage("privacyMessage", "Ընտրությունները պահպանվեցին։");
  } catch (err) { setMessage("privacyMessage", err.message, true); }
});

$("requestDeletionBtn").addEventListener("click", async () => {
  if (!confirm("Ուղարկե՞լ հաշվի ջնջման հարցում։ Այն նախ կստուգվի ադմինի կողմից, և մինչև վերջնական ջնջումը դուք կարող եք չեղարկել հարցումը։")) return;
  try {
    setMessage("deletionMessage", "Հարցումն ուղարկվում է…");
    await invoke("manage-my-privacy", { action: "request_deletion" });
    setMessage("deletionMessage", "Ջնջման հարցումն ուղարկվեց։");
    await refresh();
  } catch (err) { setMessage("deletionMessage", err.message, true); }
});

$("cancelDeletionBtn").addEventListener("click", async () => {
  if (!confirm("Չեղարկե՞լ հաշվի ջնջման հարցումը։")) return;
  try {
    setMessage("deletionMessage", "Հարցումը չեղարկվում է…");
    await invoke("manage-my-privacy", { action: "cancel_deletion" });
    setMessage("deletionMessage", "Ջնջման հարցումը չեղարկվեց։");
    await refresh();
  } catch (err) { setMessage("deletionMessage", err.message, true); }
});

$("signOutBtn").addEventListener("click", async () => {
  await signOutAccount(supabase, { redirect: "./index.html", canLeave: () => {
    const dirty = state && ($("displayNameInput").value !== (state.account.displayName || "")
      || $("newEmailInput").value.trim() || $("analyticsOptIn").checked !== (state.preferences?.product_analytics_opt_in === true)
      || $("researchOptIn").checked !== (state.preferences?.research_use_opt_in === true));
    return !dirty || window.confirm("Հաշվի չպահպանված փոփոխությունները կկորչեն։ Դուրս գա՞լ։");
  } });
});

supabase.auth.onAuthStateChange((_event, session) => {
  const actor = session?.user?.id || null;
  if (actor === accountActor) return;
  accountActor = actor;
  accountEpoch++;
  accountRequest++;
  clearAccount(!actor);
  // Do not await Supabase methods from its authentication callback.
  if (actor) queueMicrotask(() => { void refresh(); });
});

refresh();
