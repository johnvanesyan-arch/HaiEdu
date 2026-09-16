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
    '.amp-nav-link[href="./assessment.html"]',
    '.amp-nav-link[href="./progress.html"]',
    '.amp-mobile-link[href="./physics-7.html"]',
    '.amp-mobile-link[href="./assessment.html"]',
    '.amp-mobile-link[href="./progress.html"]',
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

function ensureEmptyState(classes) {
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

  const hasOtherClasses = classes.length > 0;
  panel.innerHTML = `
    <div class="home-next-copy">
      <span class="mode-kicker">ԻՄ ԴԱՍԸՆԹԱՑՆԵՐԸ</span>
      <h2>${hasOtherClasses ? "Այս պահին հասանելի դասընթաց չկա" : "Դեռ դասընթացներ չունեք"}</h2>
      <p class="subtle">${hasOtherClasses
        ? "Դուք միացված եք դասարանի, սակայն այդ դասարանի դասընթացը դեռ հասանելի չէ հարթակում։ Կարող եք միանալ մեկ այլ դասարանի ուսուցչի կոդով։"
        : "Դասընթաց սկսելու համար միացեք ձեր ուսուցչի դասարանին։ Դասարանի առարկան և դասարանը կորոշեն, թե որ դասընթացները կբացվեն ձեզ համար։"}</p>
    </div>
    <a class="button-link" href="./join.html">Միանալ դասարանին</a>`;

  const subtitle = document.querySelector(".topbar p.subtle");
  if (subtitle) subtitle.textContent = "Միացեք դասարանին՝ ձեր դասընթացները բացելու համար։";
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
      if (hasPhysics7) clearEmptyState();
      else ensureEmptyState(classes);
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
