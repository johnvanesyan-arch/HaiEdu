import {invokeRateAware,rateLimitMessage} from './rate-budget-feedback.mjs';
import {taskPrivacyRows,erasurePresentation} from './task-privacy-view.mjs';
import {roleLabel,statusLabel,inventoryPresentation,deletionLabel,normalizeDisplayName,displayNameError,displayNameMessage} from './account-core.mjs';
import { signOutAccount, showSessionReadFailure, clearSessionReadFailure } from './account-signout.mjs';
import { createClient } from "./supabase-browser.bundle.mjs";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { authErrorMessage } from "./auth-feedback.mjs";
import { AUTH_CHALLENGE } from "./auth-challenge-config.mjs";
import { createAuthChallenge } from "./auth-challenge.mjs";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const passwordChallenge = createAuthChallenge(AUTH_CHALLENGE, { document, window });
window.addEventListener("pagehide", () => passwordChallenge.destroy());
let state = null;
let accountEpoch = 0;
let accountRequest = 0;
let accountActor;
const accountHomes = {student:"./index.html",teacher:"./teacher.html?view=home",school_admin:"./school-admin.html",admin:"./admin.html",content_admin:"./content.html"};

function clearAccount(signedOut = false) {
  passwordChallenge.destroy();
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
  const { data, error } = await withinAccount(() => invokeRateAware(supabase,name, { body }));
  if (error) throw (rateLimitMessage(error) ? error : (new Error(data?.detail || data?.error || error.message)));
  if (data?.error) throw (rateLimitMessage(data?.error) ? data?.error : (new Error(data.detail || data.error)));
  return data;
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
  $("accountStatus").textContent = erasurePresentation(data.latestDeletionRequest).started && data.account.status === "deletion_pending"
    ? "Ջնջումն ընթացքի մեջ է" : statusLabel(data.account.status);
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
    // The same rule for every role: a name is required, 2–80 characters. The server repeats the check.
    const displayName = normalizeDisplayName($("displayNameInput").value), invalid = displayNameError(displayName);
    if (invalid) $("displayNameInput").setAttribute("aria-invalid", "true"); else $("displayNameInput").removeAttribute("aria-invalid");
    if (invalid) { setMessage("nameMessage", displayNameMessage(invalid), true); $("displayNameInput").focus(); return; }
    setMessage("nameMessage", "Պահվում է…");
    const result = await invoke("manage-my-privacy", { action: "update_display_name", displayName });
    setMessage("nameMessage", "Անունը պահպանվեց։");
    if (state) state.account.displayName = result.profile.display_name;
    $("displayNameInput").value = result.profile.display_name ?? displayName;
  } catch (err) { setMessage("nameMessage", (rateLimitMessage(err) ?? displayNameMessage(err.message) ?? (err.message)), true); }
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
    setMessage("emailChangeMessage", (rateLimitMessage(err) ?? (authErrorMessage(err, "email"))), true);
  } finally {
    if (epoch === accountEpoch) button.disabled = false;
  }
});

$("changePasswordBtn").addEventListener("click", async () => {
  const epoch = accountEpoch;
  const button = $("changePasswordBtn");
  if (button.disabled) return;
  button.disabled = true;
  setMessage("passwordChangeMessage", "Հղումն ուղարկվում է…");
  let challenge;
  try {
    passwordChallenge.mount(button.parentElement, $("passwordChangeMessage"));
    challenge = passwordChallenge.take();
    const { data, error: userError } = await withinAccount(() => supabase.auth.getUser());
    if (userError || !data.user?.email) throw userError || new Error("Մուտքի էլ. հասցեն չի գտնվել։");
    const { error } = await withinAccount(() => supabase.auth.resetPasswordForEmail(data.user.email, {
      redirectTo: `${location.origin}/account-access`,
      ...(challenge.token ? { captchaToken: challenge.token } : {}),
    }));
    if (error) throw error;
    setMessage("passwordChangeMessage", "Հղումն ուղարկվեց ձեր ընթացիկ էլ. հասցեին։ Ստուգեք վերջին նամակը։");
  } catch (err) {
    setMessage("passwordChangeMessage", (rateLimitMessage(err) ?? (authErrorMessage(err, "reset"))), true);
  } finally {
    challenge?.finish();
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
  } catch (err) { setMessage("privacyMessage", (rateLimitMessage(err) ?? (err.message)), true); }
});

$("requestDeletionBtn").addEventListener("click", async () => {
  if (!confirm("Ուղարկե՞լ հաշվի ջնջման հարցում։ Այն նախ կստուգվի ադմինի կողմից, և մինչև վերջնական ջնջումը դուք կարող եք չեղարկել հարցումը։")) return;
  try {
    setMessage("deletionMessage", "Հարցումն ուղարկվում է…");
    await invoke("manage-my-privacy", { action: "request_deletion" });
    setMessage("deletionMessage", "Ջնջման հարցումն ուղարկվեց։");
    await refresh();
  } catch (err) { setMessage("deletionMessage", (rateLimitMessage(err) ?? (err.message)), true); }
});

$("cancelDeletionBtn").addEventListener("click", async () => {
  if (!confirm("Չեղարկե՞լ հաշվի ջնջման հարցումը։")) return;
  try {
    setMessage("deletionMessage", "Հարցումը չեղարկվում է…");
    await invoke("manage-my-privacy", { action: "cancel_deletion" });
    setMessage("deletionMessage", "Ջնջման հարցումը չեղարկվեց։");
    await refresh();
  } catch (err) { setMessage("deletionMessage", (rateLimitMessage(err) ?? (err.message)), true); }
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
