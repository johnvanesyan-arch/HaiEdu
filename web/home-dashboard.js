import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let busy = false;
let resumeHandled = false;

function setAssessment(title, text, tone = "neutral", href = "./assessment.html", cta = "Դիտել գնահատումը") {
  const titleEl = $("homeAssessmentTitle");
  const textEl = $("homeAssessmentText");
  const badge = $("homeAssessmentBadge");
  const link = $("homeAssessmentLink");
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.textContent = text;
  if (badge) {
    badge.textContent = title;
    badge.className = `status-badge ${tone}`;
  }
  if (link) {
    link.href = href;
    link.textContent = cta;
  }
}

function patchPrimaryForMastery(data) {
  const resume = $("resumeLearningBtn");
  if (!resume) return;
  resume.dataset.masteryRoute = "false";
  delete resume.dataset.masteryRemediationSkill;

  if (data.unitComplete) {
    $("nextStepLabel").textContent = "Գլուխ I-ը հաստատված է";
    $("nextStepSkill").textContent = "Mastery check · հաջող";
    $("recommendationTitle").textContent = "Գլուխ I-ը ավարտված է";
    $("recommendationText").textContent = "Անկախ յուրացման ստուգումը հաջողությամբ անցել եք։";
    resume.disabled = false;
    resume.textContent = "Դիտել արդյունքը";
    resume.dataset.masteryRoute = "true";
    return;
  }

  if (data.activeSession?.mode === "mastery_check") {
    $("nextStepLabel").textContent = "Շարունակել յուրացման ստուգումը";
    $("nextStepSkill").textContent = `Mastery check · ${data.activeSession.answered_count ?? 0}/${data.activeSession.planned_item_count ?? 20}`;
    $("recommendationTitle").textContent = "Շարունակել յուրացման ստուգումը";
    $("recommendationText").textContent = "Դուք ունեք չավարտված անկախ ստուգում։";
    resume.disabled = false;
    resume.textContent = "Շարունակել ստուգումը";
    resume.dataset.masteryRoute = "true";
    return;
  }

  // An active diagnostic/practice session remains the highest-priority Home action.
  if (data.activeSession) return;

  if (data.eligible) {
    $("nextStepLabel").textContent = "Պատրաստ եք յուրացման ստուգմանը";
    $("nextStepSkill").textContent = "Գլուխ I · 20 հարց";
    $("recommendationTitle").textContent = "Հաստատեք Գլուխ I-ի յուրացումը";
    $("recommendationText").textContent = "Բոլոր ընթացիկ հմտությունները պատրաստ են անկախ ստուգման։ Անցողիկ կանոնը դեռ փորձնական է։";
    resume.disabled = false;
    resume.textContent = data.latestCheck?.result === "failed" ? "Կրկին փորձել" : "Սկսել ստուգումը";
    resume.dataset.masteryRoute = "true";
    return;
  }

  if (data.retryBlocked && data.requiredSkills?.length) {
    const first = data.requiredSkills[0];
    $("nextStepLabel").textContent = `Վարժանք՝ ${first.code}`;
    $("nextStepSkill").textContent = first.nameHy;
    $("recommendationTitle").textContent = `${first.code} — ${first.nameHy}`;
    $("recommendationText").textContent = "Յուրացման ստուգման կրկնակի փորձից առաջ ավարտեք պահանջվող վերականգնողական վարժանքը։";
    resume.disabled = false;
    resume.textContent = `Սկսել ${first.code} վարժանքը`;
    resume.dataset.masteryRemediationSkill = first.id;
  }
}

function renderAssessment(data) {
  if (data.unitComplete) {
    setAssessment(
      "Հաստատված",
      `Գլուխ I-ի յուրացումը հաստատված է${data.latestCheck?.percent != null ? ` · ${data.latestCheck.percent}%` : ""}։`,
      "success",
      "./assessment.html",
      "Դիտել գնահատումը",
    );
  } else if (data.activeSession?.mode === "mastery_check") {
    setAssessment(
      "Ընթացքի մեջ",
      `Յուրացման ստուգում՝ ${data.activeSession.answered_count ?? 0}/${data.activeSession.planned_item_count ?? 20} հարց։`,
      "info",
      "./assessment.html",
      "Բացել գնահատումը",
    );
  } else if (data.eligible) {
    setAssessment(
      "Պատրաստ է",
      "Գլուխ I-ի 20-հարցանոց անկախ ստուգումը հասանելի է։ Անցողիկ շեմը փորձնական է։",
      "info",
      "./assessment.html",
      "Բացել գնահատումը",
    );
  } else if (data.retryBlocked) {
    setAssessment(
      "Վերականգնում է պետք",
      data.messageHy ?? "Կրկնակի փորձից առաջ պետք է ավարտել նշված վարժանքները։",
      "warning",
      "./assessment.html",
      "Դիտել պահանջները",
    );
  } else {
    setAssessment(
      "Դեռ փակ է",
      data.messageHy ?? "Ամրապնդեք բոլոր հմտությունները՝ յուրացման ստուգումը բացելու համար։",
      "neutral",
      "./assessment.html",
      "Դիտել գնահատումը",
    );
  }
  patchPrimaryForMastery(data);
}

async function startRequiredRemediation(skillId) {
  const { data, error } = await supabase.functions.invoke("start-learning-session", {
    body: { mode: "practice", targetSkillId: skillId },
  });
  if (error || !data?.session) {
    const message = error?.message ?? data?.messageHy ?? "Չհաջողվեց սկսել վարժանքը։";
    const messageEl = $("modeMessage");
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.style.color = "#8a3342";
    }
    return;
  }
  window.location.href = "./practice.html";
}

function handleRequestedResume() {
  if (resumeHandled || new URLSearchParams(window.location.search).get("resume") !== "1") return;
  resumeHandled = true;
  history.replaceState({}, "", window.location.pathname);
  queueMicrotask(() => $("resumeLearningBtn")?.click());
}

async function refreshAssessment() {
  if (busy) return;
  const content = $("dashboardContent");
  if (!content || content.classList.contains("hidden")) return;
  busy = true;
  const { data, error } = await supabase.functions.invoke("get-mastery-check-status", { body: {} });
  busy = false;
  if (error) {
    setAssessment("Չհաջողվեց բեռնել", "Յուրացման ստուգման վիճակը հիմա հասանելի չէ։", "danger", "./assessment.html", "Բացել");
    handleRequestedResume();
    return;
  }
  renderAssessment(data);
  handleRequestedResume();
}

const resume = $("resumeLearningBtn");
resume?.addEventListener("click", (event) => {
  if (resume.dataset.masteryRoute === "true") {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href = "./mastery.html";
    return;
  }
  if (resume.dataset.masteryRemediationSkill) {
    event.preventDefault();
    event.stopImmediatePropagation();
    startRequiredRemediation(resume.dataset.masteryRemediationSkill);
  }
}, true);

const dashboard = $("dashboardContent");
if (dashboard) {
  const observer = new MutationObserver(() => {
    if (!dashboard.classList.contains("hidden")) queueMicrotask(refreshAssessment);
  });
  observer.observe(dashboard, { attributes: true, attributeFilter: ["class"] });
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(refreshAssessment, 250);
});
setTimeout(refreshAssessment, 500);

import("./home-practice-router.js");
import("./home-assessment-router.js");
