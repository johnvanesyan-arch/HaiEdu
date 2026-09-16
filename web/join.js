import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const joinBtn = document.getElementById("joinBtn");
const joinCode = document.getElementById("joinCode");
const message = document.getElementById("message");

function setMessage(text, bad = false) {
  message.textContent = text;
  message.style.color = bad ? "#8a3342" : "#356246";
}

const inviteCode = new URLSearchParams(window.location.search).get("code")?.trim().toUpperCase() ?? "";
if (/^[A-Z0-9]{8}$/.test(inviteCode)) {
  joinCode.value = inviteCode;
}

const { data: sessionData } = await supabase.auth.getSession();
if (!sessionData.session) {
  joinBtn.disabled = true;
  setMessage("Նախ մուտք գործեք աշակերտի էջում, ապա վերադարձեք այստեղ։ Կոդը պահպանված է այս հղման մեջ։", true);
} else if (inviteCode) {
  setMessage("Ուսուցչի հրավերի կոդը լրացված է։ Սեղմեք «Միանալ»։");
}

joinBtn.addEventListener("click", async () => {
  const code = joinCode.value.trim().toUpperCase();
  if (!code) return setMessage("Մուտքագրեք միանալու կոդը։", true);
  joinBtn.disabled = true;
  setMessage("Միանում ենք…");
  const { data, error } = await supabase.functions.invoke("join-class", { body: { joinCode: code } });
  if (error) {
    joinBtn.disabled = false;
    return setMessage("Չհաջողվեց միանալ։ Ստուգեք կոդը կամ դասարանի ակտիվությունը։", true);
  }
  joinCode.value = "";
  setMessage(data.alreadyMember ? `Դուք արդեն ${data.class.name} դասարանի անդամ եք։ Վերադառնում ենք գլխավոր էջ…` : `Միացաք ${data.class.name} դասարանին։ Բացվում են ձեր հասանելի դասընթացները…`);
  setTimeout(() => window.location.replace("./index.html"), 900);
});
