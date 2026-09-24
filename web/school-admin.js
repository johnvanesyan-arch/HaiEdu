import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
function message(id, text, error = false) {
  $(id).textContent = text;
  $(id).style.color = error ? "#8a3342" : "#356246";
}
async function invite(kind, values, messageId, form) {
  const button = form.querySelector("button[type=submit]"); button.disabled = true;
  const { error } = await supabase.functions.invoke("provision-staff-account", {
    body: { kind, ...values },
  });
  button.disabled = false;
  if (error) return message(messageId,
    "Հրավերը չուղարկվեց։ Ստուգեք թույլտվությունը, հասցեն և կրկնվող հաշիվները։", true);
  form.reset();
  message(messageId, "Հրավերն ուղարկվել է։ Հաշիվը կակտիվանա միայն ստացողի հաստատումից հետո։");
}
$("schoolForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await invite("school_admin", {
    schoolName: $("schoolName").value, schoolCode: $("schoolCode").value.trim(),
    email: $("schoolAdminEmail").value,
  }, "schoolMessage", event.currentTarget);
});
$("teacherForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  await invite("teacher", {
    schoolId: $("teacherSchool").value, subjectId: $("teacherSubject").value,
    email: $("teacherEmail").value,
  }, "teacherMessage", event.currentTarget);
});
$("signOutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut(); location.replace("./account-access");
});

const { data: auth } = await supabase.auth.getUser();
const id = auth.user?.id;
const { data: profile } = id ? await supabase.from("profiles")
  .select("role,account_status").eq("id", id).maybeSingle() : { data: null };
$("loading").classList.add("hidden");
if (profile?.account_status !== "active" || !["admin", "school_admin"].includes(profile?.role)) {
  $("denied").classList.remove("hidden");
} else {
  $("signOutBtn").classList.remove("hidden");
  if (profile.role === "admin") $("masterPanel").classList.remove("hidden");
  if (profile.role === "school_admin") {
    const { data: schools, error: schoolError } = await supabase.from("schools")
      .select("id,name,school_code").order("name");
    const { data: options, error: subjectError } = schools?.length
      ? await supabase.functions.invoke("get-school-subject-options", { body: { schoolId: schools[0].id } })
      : { data: null, error: true };
    const subjects = options?.subjects;
    if (schoolError || subjectError || !schools?.length || !subjects?.length) {
      $("denied").classList.remove("hidden");
    } else {
      for (const school of schools) $("teacherSchool").add(new Option(school.name, school.id));
      for (const subject of subjects) $("teacherSubject").add(new Option(subject.nameHy || subject.code, subject.id));
      $("teacherPanel").classList.remove("hidden");
    }
  }
}
