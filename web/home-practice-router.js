import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

/* Sprint 10.5D transition adapter.
   Diagnostic remains in the legacy Home state machine until 10.5E, while all
   practice entry/resume actions are moved to practice.html. */

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const resumeBtn = document.getElementById("resumeLearningBtn");
const practiceBtn = document.getElementById("startPracticeBtn");
const dashboardContent = document.getElementById("dashboardContent");

let dashboard = null;
let loading = null;
let bypassResumeOnce = false;

async function loadDashboard() {
  if (loading) return loading;
  loading = supabase.functions.invoke("get-student-dashboard", { body: {} })
    .then(({ data, error }) => {
      if (!error) dashboard = data;
      return { data, error };
    })
    .finally(() => { loading = null; });
  return loading;
}

function practiceHref(data) {
  const active = data?.activeSession;
  if (active?.mode === "practice") return "./practice.html";
  if (data?.recommendation?.action === "practice_skill" && data.recommendation.skill?.id) {
    return `./practice.html?skill=${encodeURIComponent(data.recommendation.skill.id)}`;
  }
  return "./practice.html";
}

practiceBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.href = practiceHref(dashboard);
}, true);

resumeBtn?.addEventListener("click", async (event) => {
  if (bypassResumeOnce) {
    bypassResumeOnce = false;
    return;
  }

  // mastery-specific routing is registered earlier by home-dashboard.js and
  // stops propagation before this handler when it owns the action.
  if (resumeBtn.dataset.masteryRoute === "true" || resumeBtn.dataset.masteryRemediationSkill) return;

  let data = dashboard;
  if (!data) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const result = await loadDashboard();
    data = result.data;
    if (result.error || !data) {
      window.dispatchEvent(new CustomEvent("amp-status", {
        detail: { message: "Չհաջողվեց որոշել հաջորդ ուսուցման քայլը։", error: true },
      }));
      return;
    }
  }

  const active = data.activeSession;
  const practiceOwned = active?.mode === "practice" || (!active && data.recommendation?.action === "practice_skill");
  if (practiceOwned) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = practiceHref(data);
    return;
  }

  // Diagnostic is still owned by app.js in 10.5D.
  if (event.defaultPrevented) {
    bypassResumeOnce = true;
    resumeBtn.click();
  }
}, true);

if (dashboardContent) {
  const sync = () => {
    if (!dashboardContent.classList.contains("hidden")) queueMicrotask(loadDashboard);
  };
  const observer = new MutationObserver(sync);
  observer.observe(dashboardContent, { attributes: true, attributeFilter: ["class"] });
  sync();
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(loadDashboard, 200);
});
