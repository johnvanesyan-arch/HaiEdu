import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

/* Sprint 10.5E transition adapter.
   Diagnostic now has a canonical dedicated route. Legacy diagnostic markup remains
   on Home only until the final 10.5F cleanup, but intended Home actions no longer
   enter that state machine. */

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const diagnosticBtn = document.getElementById("startDiagnosticBtn");
const resumeBtn = document.getElementById("resumeLearningBtn");
const dashboardContent = document.getElementById("dashboardContent");
let dashboard = null;
let loading = null;

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

diagnosticBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.href = "./diagnostic.html";
}, true);

resumeBtn?.addEventListener("click", async (event) => {
  if (resumeBtn.dataset.masteryRoute === "true" || resumeBtn.dataset.masteryRemediationSkill) return;
  let data = dashboard;
  if (!data) {
    const result = await loadDashboard();
    data = result.data;
    if (result.error || !data) return;
  }

  const activeDiagnostic = data.activeSession?.mode === "diagnostic";
  const needsDiagnostic = !data.activeSession && data.recommendation?.action === "take_diagnostic";
  if (activeDiagnostic || needsDiagnostic) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = "./diagnostic.html";
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
