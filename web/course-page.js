import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const params = new URLSearchParams(window.location.search);
const requestedKey = params.get("course") || "";

function courseKey(klass) {
  return String(klass?.courseKey || `${klass?.subjectCode}:${klass?.gradeNumber}`);
}

function courseLabel(klass) {
  return `${klass?.subjectNameHy || "Առարկա"} ${klass?.gradeNumber || ""}`.trim();
}

function showUnavailable(message) {
  document.getElementById("courseLoading")?.classList.add("hidden");
  const content = document.getElementById("courseContent");
  content?.classList.remove("hidden");
  const title = document.getElementById("courseContentTitle");
  const body = document.getElementById("courseMessage");
  if (title) title.textContent = "Դասընթացը հասանելի չէ";
  if (body) body.textContent = message;
}

async function load() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.replace("./index.html");
    return;
  }

  const { data, error } = await supabase.functions.invoke("get-student-classes", { body: {} });
  if (error) {
    showUnavailable("Չհաջողվեց ստուգել ձեր դասընթացները։ Փորձեք նորից։");
    return;
  }

  const classes = Array.isArray(data?.classes) ? data.classes : [];
  const matches = classes.filter((klass) => courseKey(klass) === requestedKey);
  if (!requestedKey || !matches.length) {
    window.location.replace("./index.html?course=required");
    return;
  }

  const first = matches[0];
  if (requestedKey === "physics:7") {
    window.location.replace("./physics-7.html");
    return;
  }

  const label = courseLabel(first);
  document.title = `${label} — HaiEdu`;
  const heading = document.getElementById("courseTitle");
  const subtitle = document.getElementById("courseSubtitle");
  if (heading) heading.textContent = label;
  if (subtitle) subtitle.textContent = `${first.gradeLabelHy || ""} · ${first.subjectNameHy || ""}`;

  const list = document.getElementById("courseClasses");
  if (list) {
    list.innerHTML = "";
    for (const klass of matches) {
      const row = document.createElement("span");
      row.textContent = `${klass.name}${klass.academicYear ? ` · ${klass.academicYear}` : ""}`;
      list.appendChild(row);
    }
  }

  document.getElementById("courseLoading")?.classList.add("hidden");
  document.getElementById("courseContent")?.classList.remove("hidden");
}

load();
