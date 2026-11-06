import {learnerAccess} from './learner-access.mjs';
import { createClient } from "./supabase-browser.bundle.mjs";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const access=learnerAccess(supabase);
let version=0,joining=false,redirectTimer,actorId=null;
const joinBtn = document.getElementById("joinBtn");
const joinCode = document.getElementById("joinCode");
const message = document.getElementById("message");
const loginLink = document.getElementById("joinLoginLink");
const registerLink = document.getElementById("joinRegisterLink");

function updateAuthLinks() {
  const code = joinCode.value.trim().toUpperCase();
  const suffix = /^[A-Z0-9]{8}$/.test(code) ? `&code=${code}` : "";
  loginLink.href = `./account-access?next=join${suffix}`;
  registerLink.href = `./account-access?view=register&next=join${suffix}`;
}

function setMessage(text, bad = false) {
  message.textContent = text;
  message.style.color = bad ? "#8a3342" : "#356246";
}

const inviteCode = new URLSearchParams(window.location.search).get("code")?.trim().toUpperCase() ?? "";
if (/^[A-Z0-9]{8}$/.test(inviteCode)) {
  joinCode.value = inviteCode;
}
joinCode.addEventListener("input", updateAuthLinks);
updateAuthLinks();

function authState(session){
 actorId=session?.user?.id??null;joinBtn.disabled=!actorId||joining;
 document.getElementById('joinAuthLinks').classList.toggle('hidden',Boolean(actorId));
 if(!actorId)setMessage('Նախ ստեղծեք աշակերտի հաշիվ կամ մուտք գործեք։ Այնուհետև կարող եք միանալ դասարանին։');
}
access.subscribe(({reason,session})=>{
 if(!['SIGNED_OUT','SIGNED_IN','session','USER_UPDATED','TOKEN_REFRESHED','pagehide'].includes(reason))return;
 if(reason==='TOKEN_REFRESHED'&&actorId===session?.user?.id)return;
 ++version;clearTimeout(redirectTimer);redirectTimer=null;joining=false;setMessage('');authState(session);
});
const initialVersion=version;
const {data:sessionData}=await supabase.auth.getSession();
if(initialVersion===version){authState(sessionData.session);if(actorId&&inviteCode)setMessage('Ուսուցչի հրավերի կոդը լրացված է։ Սեղմեք «Միանալ»։');}

joinBtn.addEventListener("click", async () => {
  if(joining||!actorId)return;
  const code = joinCode.value.trim().toUpperCase();
  if (!code) return setMessage("Մուտքագրեք միանալու կոդը։", true);

  const request=++version;joining=true;joinBtn.disabled = true;
  const valid=()=>request===version;
  setMessage("Միանում ենք…");
  try {

  const {data:auth,error:authError}=await supabase.auth.getSession();
  if(!valid())return;
  if(authError||!auth?.session||!access.matchesSession(auth.session))return setMessage('Մուտքը ստուգել չհաջողվեց։ Թարմացրեք էջը։',true);
  const { data, error } = await supabase.functions.invoke("join-class", { body: { joinCode: code } });
  if(!valid())return;
  if (error || !data?.joined || !data?.class?.id) {
    joinBtn.disabled = false;
    return setMessage("Չհաջողվեց հաստատել դասարանին միացումը։ Ստուգեք կոդը և փորձեք կրկին։", true);
  }

  // Double-check through the read endpoint used by the course gate. A learner
  // should never see a success message for a membership that the dashboard
  // cannot resolve immediately afterwards.
  access.invalidate("join");
  const {data:classData,error:classError,stale}=await access.read();
  if(!valid())return;
  if(stale)return setMessage('Հասանելիությունը փոխվել է։ Ստուգեք դասարանների ցանկը՝ նորից փորձելուց առաջ։',true);
  const classes = Array.isArray(classData?.classes) ? classData.classes : [];
  const verified = !classError && classes.some((klass) => String(klass.id) === String(data.class.id));
  if (!verified) {
    joinBtn.disabled = false;
    return setMessage("Դասարանին միացումը դեռ չի հաստատվել համակարգում։ Խնդրում ենք փորձել կրկին։", true);
  }

  joinCode.value = "";
  const courseName = data.course?.subjectNameHy && data.course?.gradeLabelHy
    ? `${data.course.subjectNameHy} · ${data.course.gradeLabelHy}`
    : "դասընթացը";
  setMessage(data.alreadyMember
    ? `Դուք արդեն ${data.class.name} դասարանի անդամ եք։ Բացվում է ${courseName}։`
    : `Միացաք ${data.class.name} դասարանին։ Բացվում է ${courseName}։`);

  redirectTimer=setTimeout(()=>{if(valid())window.location.replace("./index.html?joined=1");},500);
  }catch{if(valid())setMessage("Չհաջողվեց հաստատել դասարանին միացումը։ Ստուգեք դասարանների ցանկը՝ նորից փորձելուց առաջ։",true);}
  finally{if(valid()&&!redirectTimer){joining=false;joinBtn.disabled=!actorId;}}
});
