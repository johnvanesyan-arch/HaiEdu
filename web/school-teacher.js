import { signOutAccount } from './account-signout.mjs';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

function showDenied(text) {
  $("loading").classList.add("hidden");
  $("teacherDetailPanel").classList.add("hidden");
  $("deniedMessage").textContent = text;
  $("denied").classList.remove("hidden");
}

function appendSubjects(teacher) {
  const container = $("teacherSubjects");
  container.replaceChildren();
  const subjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];
  if (!subjects.length) {
    const empty = document.createElement("span");
    empty.className = "teacher-subject";
    empty.textContent = "Առարկա չի նշված";
    container.append(empty);
    return;
  }
  for (const subject of subjects) {
    const chip = document.createElement("span");
    chip.className = "teacher-subject";
    chip.textContent = subject.name || subject.code || "Առարկա";
    container.append(chip);
  }
}

function studentRoster(klass) {
  if (!klass.students?.length) {
    const empty = document.createElement("p");
    empty.className = "teacher-class-empty";
    empty.textContent = "Այս դասարանում հաստատված աշակերտ դեռ չկա։";
    return empty;
  }
  const list = document.createElement("ul");
  list.className = "teacher-student-roster";
  for (const student of klass.students) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = student.displayName || "Աշակերտ";
    const email = document.createElement("span");
    email.textContent = student.email || "Էլ. հասցեն հասանելի չէ";
    item.append(name, email);
    list.append(item);
  }
  return list;
}

function classAccordion(klass) {
  const details = document.createElement("details");
  details.className = "teacher-class-accordion";
  const summary = document.createElement("summary");
  const title = document.createElement("span");
  title.className = "teacher-class-title";
  const name = document.createElement("strong");
  name.textContent = klass.name || "Դասարան";
  const context = document.createElement("span");
  context.textContent = [klass.grade?.label, klass.subject?.name, klass.academicYear]
    .filter(Boolean).join(" · ") || "Դասարանի համատեքստը լրացվում է";
  title.append(name, context);
  const count = document.createElement("span");
  count.className = "teacher-class-count";
  count.textContent = `${klass.students?.length ?? 0} աշակերտ`;
  summary.append(title, count);
  details.append(summary, studentRoster(klass));
  return details;
}

function renderTeacher(school, teacher) {
  $("teacherName").textContent = teacher.displayName || "Ուսուցիչ";
  $("teacherEmail").textContent = teacher.email || "Էլ. հասցեն հասանելի չէ";
  $("schoolName").textContent = school.name;
  appendSubjects(teacher);
  const classes = $("teacherClasses");
  classes.replaceChildren();
  if (!teacher.classes?.length) {
    const empty = document.createElement("div");
    empty.className = "teacher-detail-empty";
    empty.textContent = "Այս ուսուցչին ակտիվ դասարան դեռ չի վերագրվել։";
    classes.append(empty);
  } else {
    for (const klass of teacher.classes) classes.append(classAccordion(klass));
  }
  $("loading").classList.add("hidden");
  $("denied").classList.add("hidden");
  $("teacherDetailPanel").classList.remove("hidden");
}

$("signOutBtn").addEventListener("click", async () => {
  await signOutAccount(supabase, { redirect: "./account-access" });
});

const { data: auth } = await supabase.auth.getUser();
const userId = auth.user?.id;
const { data: profile } = userId ? await supabase.from("profiles")
  .select("role,account_status").eq("id", userId).maybeSingle() : { data: null };

if (profile?.account_status !== "active" || profile?.role !== "school_admin") {
  showDenied("Այս էջը հասանելի է միայն ակտիվ դպրոցի ադմինիստրատորին։");
} else {
  $("accountAccessLink").classList.add("hidden");
  $("signOutBtn").classList.remove("hidden");
  const params = new URLSearchParams(location.search);
  const schoolId = params.get("school");
  const membershipId = params.get("membership");
  if (!schoolId || !membershipId) {
    showDenied("Ուսուցիչ ընտրված չէ։ Վերադարձեք ուսուցիչների ցանկին։");
  } else {
    const { data, error } = await supabase.functions.invoke("get-school-admin-overview", { body: {} });
    const school = data?.schools?.find((item) => item.id === schoolId);
    const teacher = school?.teachers?.find((item) => item.membershipId === membershipId);
    if (error || !school || !teacher) {
      showDenied("Այս ուսուցչի տվյալները հասանելի չեն ձեր դպրոցի հաշվին։");
    } else {
      renderTeacher(school, teacher);
    }
  }
}
