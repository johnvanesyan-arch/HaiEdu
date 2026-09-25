import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let factors = [];
let pendingFactorId = null;

function setMessage(text, bad = false) {
  $("securityMessage").textContent = text || "";
  $("securityMessage").style.color = bad ? "#8a3342" : "#356246";
}

function factorName(factor, index) {
  return factor.friendly_name || `Authenticator ${index + 1}`;
}

async function loadSecurityState() {
  setMessage("Անվտանգության վիճակը ստուգվում է…");
  const [{ data:aal, error:aalError }, { data:list, error:listError }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (aalError) throw aalError;
  if (listError) throw listError;
  factors = [...(list?.totp || []), ...(list?.phone || [])].filter((factor) => factor.status === "verified");
  const ready = aal?.currentLevel === "aal2";
  $("aalBadge").textContent = ready ? "AAL2 · հաստատված" : "AAL1 · լրացուցիչ քայլ";
  $("aalBadge").classList.toggle("ready", ready);
  $("securityState").textContent = ready ? "Master admin սեսիան պաշտպանված է" : factors.length ? "Պահանջվում է երկրորդ գործոնի հաստատում" : "MFA-ն դեռ միացված չէ";
  $("securitySummary").textContent = factors.length >= 2 ? `${factors.length} հաստատված գործոն կա, ներառյալ պահուստային տարբերակը։` : factors.length === 1 ? "Մեկ գործոն կա։ Ավելացրեք երկրորդը՝ սարքի կորստի ռիսկը նվազեցնելու համար։" : "Ստեղծեք առաջին TOTP գործոնը՝ կառավարման աշխատասեղանը բացելու համար։";
  $("challengePanel").classList.toggle("hidden", ready || !factors.length);
  $("enrollPanel").classList.toggle("hidden", Boolean(factors.length));
  $("factorPanel").classList.toggle("hidden", !ready);
  if (!ready && factors.length) {
    $("challengeFactor").innerHTML = factors.map((factor, index) => `<option value="${factor.id}">${factorName(factor, index)}</option>`).join("");
  }
  if (ready) renderFactors();
  setMessage("");
}

function renderFactors() {
  $("factorList").innerHTML = factors.map((factor, index) => `<article class="factor-row"><div><strong>${factorName(factor, index)}</strong><p class="subtle small">${factor.factor_type === "totp" ? "Authenticator հավելված" : "Հեռախոս"} · հաստատված</p></div>${factors.length > 1 ? `<button type="button" class="ghost" data-remove-factor="${factor.id}">Հեռացնել</button>` : '<span class="protected-note">Միակ գործոնը պաշտպանված է</span>'}</article>`).join("");
  $("factorList").querySelectorAll("[data-remove-factor]").forEach((button) => button.addEventListener("click", () => removeFactor(button.dataset.removeFactor)));
}

async function beginEnrollment() {
  try {
    setMessage("QR կոդը ստեղծվում է…");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType:"totp", friendlyName:factors.length ? "HaiEdu backup" : "HaiEdu master admin" });
    if (error) throw error;
    pendingFactorId = data.id;
    $("enrollmentQr").src = data.totp.qr_code;
    $("enrollmentSecret").textContent = data.totp.secret;
    $("enrollmentDetails").classList.remove("hidden");
    $("startEnrollBtn").classList.add("hidden");
    setMessage("Սկանավորեք QR կոդը և հաստատեք հավելվածի կոդով։");
  } catch (error) { setMessage(error.message, true); }
}

async function verifyFactor(event) {
  event.preventDefault();
  if (!pendingFactorId) return;
  try {
    const code = $("enrollCode").value.trim();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId:pendingFactorId, code });
    if (error) throw error;
    pendingFactorId = null;
    $("enrollmentDetails").classList.add("hidden");
    $("startEnrollBtn").classList.remove("hidden");
    await loadSecurityState();
    setMessage("Գործոնը հաստատված է։");
  } catch (error) { setMessage(error.message, true); }
}

async function verifyChallenge(event) {
  event.preventDefault();
  try {
    const factorId = $("challengeFactor").value;
    const code = $("challengeCode").value.trim();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) throw error;
    window.location.assign("./admin.html");
  } catch (error) { setMessage(error.message, true); }
}

async function removeFactor(factorId) {
  if (factors.length <= 1 || !confirm("Հեռացնե՞լ այս պահուստային գործոնը։ Մնացած գործոնը պետք է հասանելի լինի։")) return;
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
    await supabase.auth.refreshSession();
    await loadSecurityState();
    setMessage("Գործոնը հեռացված է։");
  } catch (error) { setMessage(error.message, true); }
}

async function enter(session) {
  $("authPanel").classList.add("hidden");
  $("securityConsole").classList.add("hidden");
  if (!session) {
    $("authPanel").classList.remove("hidden");
    return;
  }
  const { data:profile, error } = await supabase.from("profiles").select("role,account_status").eq("id", session.user.id).maybeSingle();
  if (error || profile?.role !== "admin" || profile.account_status !== "active") {
    $("authPanel").classList.remove("hidden");
    $("authMessage").textContent = "Այս հաշիվը չունի ակտիվ master admin իրավունք։";
    return;
  }
  $("securityConsole").classList.remove("hidden");
  await loadSecurityState();
}

$("challengeForm").addEventListener("submit", verifyChallenge);
$("startEnrollBtn").addEventListener("click", beginEnrollment);
$("enrollVerifyForm").addEventListener("submit", verifyFactor);
$("addBackupBtn").addEventListener("click", () => { $("enrollPanel").classList.remove("hidden"); $("enrollTitle").textContent = "Ավելացնել պահուստային authenticator"; $("enrollPanel").scrollIntoView({ behavior:"smooth" }); });
$("signOutBtn").addEventListener("click", async () => { await supabase.auth.signOut({ scope:"global" }); window.location.assign("./account-access.html"); });
supabase.auth.onAuthStateChange((_event, session) => setTimeout(() => enter(session), 0));
const { data:sessionData } = await supabase.auth.getSession();
await enter(sessionData.session);
