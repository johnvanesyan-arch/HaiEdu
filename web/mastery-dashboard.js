import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let busy = false;
let lastStatus = null;

function ensureCard() {
  const grid = document.querySelector(".actions-grid");
  if (!grid) return null;
  let card = document.getElementById("masteryCheckCard");
  if (card) return card;
  card = document.createElement("article");
  card.id = "masteryCheckCard";
  card.className = "card mode-card";
  card.innerHTML = `
    <span class="mode-kicker">Mastery check</span>
    <h3 id="masteryCheckTitle">Բեռնվում է…</h3>
    <p id="masteryCheckText">Ստուգվում է պատրաստվածությունը։</p>
    <button id="masteryCheckBtn" disabled>Բացել mastery check-ը</button>`;
  grid.appendChild(card);
  document.getElementById("masteryCheckBtn").addEventListener("click", () => {
    window.location.href = "./mastery.html";
  });
  return card;
}

async function startRequiredRemediation(skillId) {
  const { data, error } = await supabase.functions.invoke("start-learning-session", {
    body: { mode: "practice", targetSkillId: skillId },
  });
  if (error) {
    alert(`Չհաջողվեց սկսել remediation վարժանքը․ ${error.message}`);
    return;
  }
  if (!data?.session) {
    alert(data?.messageHy ?? "Չհաջողվեց սկսել remediation վարժանքը։");
    return;
  }
  window.location.reload();
}

function render(data) {
  lastStatus = data;
  ensureCard();
  const title = $("masteryCheckTitle");
  const text = $("masteryCheckText");
  const btn = $("masteryCheckBtn");
  if (!title || !text || !btn) return;

  const resume = $("resumeLearningBtn");
  if (resume) {
    resume.dataset.masteryRoute = "false";
    delete resume.dataset.masteryRemediationSkill;
  }

  if (data.unitComplete) {
    title.textContent = `Անցած է · ${data.latestCheck?.percent ?? 0}%`;
    text.textContent = "Բաժնի unit-completion չափանիշը կատարված է։";
    btn.disabled = false;
    btn.textContent = "Դիտել արդյունքը";
    patchRecommendation("Բաժինը ավարտված է", "Mastery check-ը հաջողությամբ անցել եք։", false);
    return;
  }

  if (data.activeSession?.mode === "mastery_check") {
    title.textContent = `Շարունակել · ${data.activeSession.answered_count ?? 0}/${data.activeSession.planned_item_count ?? 20}`;
    text.textContent = "Mastery check-ը դեռ ավարտված չէ։";
    btn.disabled = false;
    btn.textContent = "Շարունակել mastery check-ը";
    patchRecommendation("Շարունակել mastery check-ը", "Դուք ունեք չավարտված անկախ ստուգում։", true);
    return;
  }

  if (data.eligible) {
    title.textContent = "Պատրաստ է · 20 հարց";
    text.textContent = "Անցողիկ կանոն՝ ≥80% ընդհանուր արդյունք և յուրաքանչյուր հմտությունից առնվազն 1/2։";
    btn.disabled = false;
    btn.textContent = data.latestCheck?.result === "failed" ? "Կրկին փորձել" : "Սկսել mastery check-ը";
    patchRecommendation("Սկսել mastery check-ը", "Բոլոր ընթացիկ հմտությունները պատրաստ են անկախ ստուգման։", true);
    return;
  }

  const required = (data.requiredSkills ?? []).map((s) => s.code).join(", ");
  title.textContent = data.retryBlocked ? "Remediation է պետք" : "Դեռ փակ է";
  text.textContent = `${data.messageHy ?? "Նախ շարունակեք վարժանքը։"}${required ? ` Պետք է աշխատել՝ ${required}.` : ""}`;
  btn.disabled = true;
  btn.textContent = "Դեռ հասանելի չէ";

  if (data.retryBlocked && data.requiredSkills?.length) {
    const first = data.requiredSkills[0];
    patchRecommendation(
      `Վարժանք՝ ${first.code}`,
      "Mastery check-ի կրկնակի փորձից առաջ պետք է ավարտել պահանջվող remediation սեսիաները։",
      false,
    );
    if (resume) {
      resume.disabled = false;
      resume.textContent = `Սկսել ${first.code} remediation-ը`;
      resume.dataset.masteryRemediationSkill = first.id;
    }
  }
}

function patchRecommendation(title, text, routeToMastery) {
  const nextStepLabel = $("nextStepLabel");
  const nextStepSkill = $("nextStepSkill");
  const recommendationTitle = $("recommendationTitle");
  const recommendationText = $("recommendationText");
  const resume = $("resumeLearningBtn");
  if (nextStepLabel) nextStepLabel.textContent = title;
  if (nextStepSkill && routeToMastery) nextStepSkill.textContent = "PHY7-U01 · Mastery check";
  if (recommendationTitle) recommendationTitle.textContent = title;
  if (recommendationText) recommendationText.textContent = text;
  if (resume) {
    resume.dataset.masteryRoute = routeToMastery ? "true" : "false";
    if (routeToMastery) {
      resume.disabled = false;
      resume.textContent = title;
    }
  }
}

async function refresh() {
  if (busy) return;
  const panel = $("dashboardContent");
  if (!panel || panel.classList.contains("hidden")) return;
  busy = true;
  ensureCard();
  const { data, error } = await supabase.functions.invoke("get-mastery-check-status", { body: {} });
  busy = false;
  if (error || !data) {
    lastStatus = null;
    const title = $("masteryCheckTitle");
    const text = $("masteryCheckText");
    if (title) title.textContent = "Mastery check-ի վիճակը չբեռնվեց";
    if (text) text.textContent = "Յուրացման ստուգման կարգավիճակը ժամանակավորապես հասանելի չէ։";
    const btn = $("masteryCheckBtn");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Կրկին ստուգել պատրաստվածությունը";
    }
    const resume = $("resumeLearningBtn");
    if (resume) {
      resume.dataset.masteryRoute = "false";
      delete resume.dataset.masteryRemediationSkill;
    }
    return;
  }
  render(data);
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
    if (!dashboard.classList.contains("hidden")) queueMicrotask(refresh);
  });
  observer.observe(dashboard, { attributes: true, attributeFilter: ["class"] });
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(refresh, 300);
});
setTimeout(refresh, 600);

