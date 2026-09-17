import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const page = document.body.dataset.studentPage || "";
const protectedPages = new Set(["physics", "assessment", "progress"]);
let checking = false;

function isPhysics7Class(klass) {
  return String(klass?.subjectCode || "").toLowerCase() === "physics" && Number(klass?.gradeNumber) === 7;
}

function syncCourseNavigation(hasPhysics7) {
  const selectors = [
    '.amp-nav-link[href="./physics-7.html"]',
    '.amp-course-sublink[href="./physics-7.html"]',
    '.amp-course-sublink[href="./assessment.html"]',
    '.amp-course-sublink[href="./progress.html"]',
    '.amp-mobile-link[href="./physics-7.html"]',
  ];
  for (const selector of selectors) {
    for (const link of document.querySelectorAll(selector)) {
      link.classList.toggle("hidden", !hasPhysics7);
      link.setAttribute("aria-hidden", hasPhysics7 ? "false" : "true");
      if (!hasPhysics7) link.setAttribute("tabindex", "-1");
      else link.removeAttribute("tabindex");
    }
  }
}

function ensureEmptyState() {
  if (page !== "home") return;
  const modePanel = document.getElementById("modePanel");
  if (!modePanel) return;

  document.getElementById("dashboardLoading")?.classList.add("hidden");
  document.getElementById("dashboardContent")?.classList.add("hidden");

  let panel = document.getElementById("noCoursesPanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "noCoursesPanel";
    panel.className = "card home-next-card";
    const loading = document.getElementById("dashboardLoading");
    if (loading) modePanel.insertBefore(panel, loading);
    else modePanel.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="home-next-copy">
      <span class="mode-kicker">ԻՄ ԱՌԱՐԿԱՆԵՐԸ</span>
      <h2>Դեռ դասընթացներ չունեք</h2>
      <p class="subtle">Դասընթաց սկսելու համար միացեք ձեր ուսուցչի դասարանին։ Դասարանի առարկան և դասարանը կորոշեն, թե որ դասընթացները կբացվեն ձեզ համար։</p>
    </div>
    <a class="button-link" href="./join.html">Միանալ դասարանին</a>`;
}

function clearEmptyState() {
  document.getElementById("noCoursesPanel")?.remove();
}

async function refreshCourseAccess() {
  if (checking) return;
  checking = true;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      syncCourseNavigation(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("get-student-classes", { body: {} });
    if (error) {
      console.error("course access check failed", error);
      return;
    }

    const classes = Array.isArray(data?.classes) ? data.classes : [];
    const hasPhysics7 = classes.some(isPhysics7Class);
    document.body.dataset.physics7Access = hasPhysics7 ? "true" : "false";
    window.HaiEduCourseAccess = { physics7: hasPhysics7, classes };
    syncCourseNavigation(hasPhysics7);

    if (page === "home") {
      if (classes.length) clearEmptyState();
      else ensureEmptyState();
    } else if (protectedPages.has(page) && !hasPhysics7) {
      window.location.replace("./index.html?course=required");
      return;
    }

    window.dispatchEvent(new CustomEvent("haiedu-course-access", {
      detail: { physics7: hasPhysics7, classes },
    }));
  } finally {
    checking = false;
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(refreshCourseAccess, 0);
  else syncCourseNavigation(false);
});

setTimeout(refreshCourseAccess, 0);
