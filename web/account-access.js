import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const flowHint = new URLSearchParams(location.hash.slice(1)).get("type") ||
  new URLSearchParams(location.search).get("type");
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
const redirect = `${location.origin}/account-access`;
function show(panel) {
  for (const id of ["loginPanel", "resetPanel", "passwordPanel"])
    $(id).classList.toggle("hidden", id !== panel);
}
function message(id, text, error = false) {
  $(id).textContent = text;
  $(id).style.color = error ? "#8a3342" : "#356246";
}
async function routeByRole() {
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) { show("loginPanel"); return; }
  const { data: profile } = await supabase.from("profiles")
    .select("role,account_status").eq("id", id).maybeSingle();
  if (profile?.account_status !== "active") {
    message("passwordMessage", "Հաշիվն ակտիվ չէ։ Կապվեք ադմինիստրատորի հետ։", true); return;
  }
  const paths = { school_admin: "school-admin", teacher: "teacher", admin: "admin",
    content_admin: "content", student: "index" };
  location.replace(`./${paths[profile.role] ?? "index"}`);
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
$("showResetBtn").addEventListener("click", () => {
  $("resetEmail").value = $("loginEmail").value;
  show("resetPanel");
});
$("backBtn").addEventListener("click", () => show("loginPanel"));
$("resetForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button"); button.disabled = true;
  await supabase.auth.resetPasswordForEmail($("resetEmail").value.trim(), { redirectTo: redirect });
  button.disabled = false;
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
  await routeByRole();
});

supabase.auth.onAuthStateChange((event, session) => {
  if ((event === "PASSWORD_RECOVERY" || flowHint === "invite" || flowHint === "recovery") && session)
    show("passwordPanel");
});
const { data: initial } = await supabase.auth.getSession();
if (initial.session && (flowHint === "invite" || flowHint === "recovery")) show("passwordPanel");
