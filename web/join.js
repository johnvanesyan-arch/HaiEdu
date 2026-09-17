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
  if (error || !data?.joined || !data?.class?.id) {
    joinBtn.disabled = false;
    return setMessage("Չհաջողվեց հաստատել դասարանին միացումը։ Ստուգեք կոդը և փորձեք կրկին։", true);
  }

  // Double-check through the read endpoint used by the course gate. A learner
  // should never see a success message for a membership that the dashboard
  // cannot resolve immediately afterwards.
  const { data: classData, error: classError } = await supabase.functions.invoke("get-student-classes", { body: {} });
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

  setTimeout(() => window.location.replace("./index.html?joined=1"), 500);
});
