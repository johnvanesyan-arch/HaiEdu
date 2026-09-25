import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { roleDestination, studentDestination } from "./account-roles.js";

const hashParams = new URLSearchParams(location.hash.slice(1));
const searchParams = new URLSearchParams(location.search);
const flowHint = hashParams.get("type") || searchParams.get("type");
const linkError = hashParams.get("error_code") || searchParams.get("error_code") ||
  (hashParams.get("error") === "access_denied" || searchParams.get("error") === "access_denied"
    ? "access_denied" : null);
const resetView = searchParams.get("view") === "reset";
const registerView = searchParams.get("view") === "register";
const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const redirect = `${location.origin}/account-access`;
if (linkError) {
  messageForLinkError();
  // Drop the one-time error fragment without retaining or exposing any link tokens.
  history.replaceState(null, "", location.pathname);
}
function messageForLinkError() {
  const notice = $("linkErrorMessage");
  notice.textContent = linkError === "otp_expired"
    ? "Էլ. փոստի հղումը չի գործում կամ ժամկետանց է։ Հրավերի դեպքում բացեք ամենավերջին նամակի հղումը. վերաուղարկելուց հետո հինը չի գործում։ Եթե նոր նամակ չկա, խնդրեք հրավիրող ադմինիստրատորին վերաուղարկել հրավերը։"
    : "Էլ. փոստի հղումը չհաստատվեց։ Հրավերի համար խնդրեք նոր հղում, իսկ գաղտնաբառը վերականգնելու համար նորից ուղարկեք վերականգնման հղումը։";
  notice.classList.remove("hidden");
}
function show(panel) {
  for (const id of ["loginPanel", "registerPanel", "resetPanel", "passwordPanel"])
    $(id).classList.toggle("hidden", id !== panel);
}
function message(id, text, error = false) {
  $(id).textContent = text;
  $(id).style.color = error ? "#8a3342" : "#356246";
}
async function routeByRole(messageId = "loginMessage") {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (authError || !id) { show("loginPanel"); return message("loginMessage", "Չհաջողվեց հաստատել մուտքը։ Փորձեք կրկին։", true); }
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role,account_status").eq("id", id).maybeSingle();
  if (profileError || !profile || !roleDestination(profile.role)) {
    message(messageId, "Չհաջողվեց հաստատել հաշվի դերը։ Փորձեք կրկին կամ կապվեք ադմինիստրատորի հետ։", true); return;
  }
  if (profile.account_status !== "active") {
    message(messageId, "Հաշիվն ակտիվ չէ։ Կապվեք ադմինիստրատորի հետ։", true); return;
  }
  location.replace(profile.role === "student" ? studentDestination(location.search) : roleDestination(profile.role));
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button"); button.disabled = true;
  const { error } = await supabase.auth.signInWithPassword({
    email: $("loginEmail").value.trim(), password: $("loginPassword").value,
  });
  button.disabled = false;
  if (error) return message("loginMessage", "Մուտքը չհաջողվեց։ Ստուգեք հասցեն և գաղտնաբառը։", true);
  await routeByRole();
});
$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("registerPassword").value;
  if (password.length < 12 || password !== $("registerConfirm").value)
    return message("registerMessage", "Գաղտնաբառերը պետք է համընկնեն և պարունակեն առնվազն 12 նիշ։", true);
  const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true;
  const { data, error } = await supabase.auth.signUp({
    email: $("registerEmail").value.trim(), password,
    options: { emailRedirectTo: redirect },
  });
  button.disabled = false;
  if (error) return message("registerMessage", "Հաշիվը չստեղծվեց։ Ստուգեք հասցեն և փորձեք կրկին։", true);
  if (!data.session) return message("registerMessage", "Եթե հաստատման նամակ է պահանջվում, բացեք այն, ապա մուտք գործեք։");
  await routeByRole("registerMessage");
});
$("registerBackBtn").addEventListener("click", () => {
  searchParams.delete("view");
  history.replaceState(null, "", `${location.pathname}${searchParams.size ? `?${searchParams}` : ""}`);
  show("loginPanel");
});
$("showResetBtn").addEventListener("click", () => {
  $("resetEmail").value = $("loginEmail").value;
  history.replaceState(null, "", `${location.pathname}?view=reset`);
  show("resetPanel");
});
$("backBtn").addEventListener("click", () => {
  history.replaceState(null, "", location.pathname);
  show("loginPanel");
});
$("resetForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button"); button.disabled = true;
  const { error } = await supabase.auth.resetPasswordForEmail($("resetEmail").value.trim(), { redirectTo: redirect });
  button.disabled = false;
  if (error) return message("resetMessage", "Հղումը չուղարկվեց։ Խնդրում ենք փորձել ավելի ուշ։", true);
  message("resetMessage", "Եթե այս էլ. հասցեով հաշիվ կա, ստուգեք փոստը՝ վերականգնման հղման համար։");
});
$("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("newPassword").value;
  if (password.length < 12 || password !== $("confirmPassword").value)
    return message("passwordMessage", "Գաղտնաբառերը պետք է համընկնեն և պարունակեն առնվազն 12 նիշ։", true);
  const button = event.currentTarget.querySelector("button"); button.disabled = true;
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    button.disabled = false;
    return message("passwordMessage", "Գաղտնաբառը չպահպանվեց։ Փորձեք նորից։", true);
  }
  const { error: activationError } = await supabase.functions.invoke("accept-staff-account", { body: {} });
  if (activationError) {
    const { data: auth } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("role")
      .eq("id", auth.user?.id ?? "00000000-0000-0000-0000-000000000000").maybeSingle();
    if (flowHint === "invite" || (flowHint !== "recovery" && profile?.role === "student")) {
      button.disabled = false;
      return message("passwordMessage", "Գաղտնաբառը պահվեց, բայց հրավերը չի ակտիվացել։ Կապվեք հրավիրող ադմինիստրատորի հետ։", true);
    }
  }
  await routeByRole("passwordMessage");
});

supabase.auth.onAuthStateChange((event, session) => {
  if (!linkError && (event === "PASSWORD_RECOVERY" || flowHint === "invite" || flowHint === "recovery") && session)
    show("passwordPanel");
});
const { data: initial } = await supabase.auth.getSession();
if (linkError) show("loginPanel");
else if (initial.session && (flowHint === "invite" || flowHint === "recovery")) show("passwordPanel");
else if (resetView && !flowHint) show("resetPanel");
else if (initial.session) await routeByRole();
else if (registerView && !flowHint) show("registerPanel");
