import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { recordRecommendationTelemetry } from "./recommendation-telemetry.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let dashboard = null;
let masteryStatus = null;
let loading = false;
let visibleRecommendation = null;

const layerLabels = {
  knowledge: "Գիտելիք",
  application: "Կիրառում",
  reasoning: "Դատողություն",
  transfer: "Փոխանցում",
};

const stateLabels = {
  not_started: "Չսկսված",
  needs_support: "Աջակցություն է պետք",
  developing: "Զարգացող",
  recovered: "Վերջին փորձերում կայուն",
  secure: "Ամրապնդված",
  verified: "Հաստատված",
};

const stateTones = {
  not_started: "neutral",
  needs_support: "danger",
  developing: "warning",
  recovered: "info",
  secure: "success",
  verified: "success",
};

const diagnosticLabels = {
  strong: "Ուժեղ",
  developing: "Զարգացող",
  needs_support: "Աջակցություն է պետք",
  not_assessed: "Չգնահատված",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function skillState(skill) {
  if (masteryStatus?.unitComplete) return "verified";
  if (skill.complete && skill.completionSource === "mastery") return "secure";
  if (skill.complete && skill.completionSource === "recent_recovery") return "recovered";
  if (skill.mastery?.status === "needs_support") return "needs_support";
  if (skill.mastery?.status === "developing") return "developing";
  if (skill.mastery?.status === "insufficient_evidence") {
    return Number(skill.mastery?.evidenceCount ?? 0) > 0 ? "developing" : "not_started";
  }
  if (skill.complete) return "secure";
  if (skill.diagnostic?.band === "needs_support") return "needs_support";
  if (skill.diagnostic?.band === "developing") return "developing";
  if (Number(skill.diagnostic?.total ?? 0) > 0 || Number(skill.mastery?.evidenceCount ?? 0) > 0) return "developing";
  return "not_started";
}

function activeRoute(session) {
  if (!session) return null;
  if (session.mode === "practice") return { href: "./practice.html", label: "Շարունակել վարժանքը" };
  if (session.mode === "diagnostic") return { href: "./diagnostic.html", label: "Շարունակել ախտորոշիչը" };
  if (session.mode === "mastery_check") return { href: "./mastery.html", label: "Շարունակել յուրացման ստուգումը" };
  return null;
}

function renderSummary() {
  const progress = dashboard?.progress ?? { completedSkills: 0, totalSkills: 10, percent: 0 };
  const bar = $("chapterProgressBar");
  bar.style.width = `${progress.percent ?? 0}%`;
  bar.parentElement?.setAttribute("aria-valuenow", String(progress.percent ?? 0));

  if (masteryStatus?.unitComplete) {
    $("chapterState").textContent = "Հաստատված";
    $("chapterProgressMeta").textContent = "Գլուխ I-ի յուրացումը հաստատված է անկախ ստուգմամբ։";
  } else {
    $("chapterState").textContent = `${progress.completedSkills} / ${progress.totalSkills} ընթացիկ չափանիշը բավարարած`;
    $("chapterProgressMeta").textContent = `${progress.percent}% հմտություն բավարարել է ընթացիկ առաջընթացի չափանիշը։`;
  }

  const diagnostic = dashboard?.latestDiagnostic;
  if (diagnostic) {
    $("diagnosticSummary").textContent = `${diagnostic.correct}/${diagnostic.answered} · ${diagnostic.percent}%`;
    $("diagnosticSummaryMeta").textContent = "Գլուխ I-ի սկզբնական ախտորոշիչ · սա գնահատական կամ վերջնական յուրացման հաստատում չէ։";
  } else {
    $("diagnosticSummary").textContent = "Դեռ չկա";
    $("diagnosticSummaryMeta").textContent = "Գլուխ I-ի հմտությունների սկզբնական քարտեզ դեռ չկա։";
  }

  const latestCheck = masteryStatus?.latestCheck;
  if (masteryStatus?.unitComplete) {
    $("masterySummary").textContent = "Հաստատված";
    $("masterySummaryMeta").textContent = latestCheck?.percent != null
      ? `Վերջին անկախ ստուգում՝ ${latestCheck.correct}/${latestCheck.answered} · ${latestCheck.percent}%`
      : "Անկախ յուրացման ստուգումն անցած է։";
  } else if (masteryStatus?.activeSession?.mode === "mastery_check") {
    $("masterySummary").textContent = "Ընթացքի մեջ";
    $("masterySummaryMeta").textContent = `${masteryStatus.activeSession.answered_count ?? 0}/${masteryStatus.activeSession.planned_item_count ?? 20} հարց պատասխանված է։`;
  } else if (latestCheck?.result === "failed") {
    $("masterySummary").textContent = "Դեռ չի հաստատվել";
    $("masterySummaryMeta").textContent = `Վերջին փորձ՝ ${latestCheck.correct}/${latestCheck.answered} · ${latestCheck.percent ?? 0}%։ Պահանջվում է ամրապնդող վարժանք։`;
  } else if (masteryStatus?.eligible) {
    $("masterySummary").textContent = "Պատրաստ է";
    $("masterySummaryMeta").textContent = "Բոլոր ընթացիկ հմտությունները պատրաստ են անկախ ստուգման։";
  } else {
    $("masterySummary").textContent = "Դեռ փակ է";
    $("masterySummaryMeta").textContent = masteryStatus?.messageHy ?? "Նախ ամրապնդեք անհրաժեշտ հմտությունները։";
  }
}

function recommendedAction() {
  if (masteryStatus?.unitComplete) {
    return {
      title: "Գլուխ I-ը հաստատված է",
      telemetryRecommendation: dashboard?.recommendation?.action === "unit_complete" ? dashboard.recommendation : null,
      reason: "Անկախ յուրացման ստուգումը հաջողությամբ անցել եք։ Կարող եք դիտել արդյունքը կամ վերանայել հմտությունները։",
      href: "./mastery.html",
      label: "Դիտել արդյունքը",
    };
  }

  const masteryActive = masteryStatus?.activeSession?.mode === "mastery_check" ? masteryStatus.activeSession : null;
  const active = masteryActive ?? dashboard?.activeSession;
  const activeDestination = activeRoute(active);
  if (activeDestination) {
    return {
      title: active.mode === "practice" ? "Շարունակեք ընթացիկ վարժանքը" : active.mode === "diagnostic" ? "Շարունակեք Գլուխ I-ի ախտորոշիչը" : "Շարունակեք յուրացման ստուգումը",
      telemetryRecommendation: dashboard?.recommendation?.action === "resume_session" ? dashboard.recommendation : null,
      reason: "Դուք ունեք չավարտված սեսիա։ Այս էջի հմտությունների ցանկը միայն ցույց է տալիս ապացույցները, իսկ ընթացիկ սեսիան շարունակվում է այստեղից մեկ ընդհանուր գործողությամբ։",
      ...activeDestination,
    };
  }

  if (!dashboard?.latestDiagnostic) {
    return {
      title: "Սկսեք Գլուխ I-ի ախտորոշիչից",
      telemetryRecommendation: dashboard?.recommendation?.action === "take_diagnostic" ? dashboard.recommendation : null,
      reason: "Ախտորոշիչը կստեղծի 10 հմտությունների սկզբնական քարտեզ և կօգնի ընտրել առաջին վարժանքի հմտությունը։",
      href: "./diagnostic.html",
      label: "Սկսել ախտորոշիչը",
    };
  }

  if (masteryStatus?.retryBlocked && masteryStatus.requiredSkills?.length) {
    const skill = masteryStatus.requiredSkills[0];
    return {
      title: `${skill.code} — ${skill.nameHy}`,
      reason: "Յուրացման ստուգման կրկնակի փորձից առաջ այս հմտության ամրապնդող վարժանքը պարտադիր է։",
      href: `./practice.html?skill=${encodeURIComponent(skill.id)}`,
      label: "Սկսել ամրապնդումը",
    };
  }

  if (masteryStatus?.eligible) {
    return {
      title: "Պատրաստ եք անկախ յուրացման ստուգմանը",
      reason: "Բոլոր ընթացիկ հմտությունները բավարարել են պատրաստվածության կանոնը։ Անցողիկ շեմը դեռ փորձնական է։",
      href: "./mastery.html",
      label: "Բացել ստուգումը",
    };
  }

  const skill = dashboard?.recommendation?.skill;
  if (dashboard?.recommendation?.action === "practice_skill" && skill?.id) {
    return {
      title: `${skill.code} — ${skill.nameHy}`,
      telemetryRecommendation: dashboard.recommendation,
      reason: dashboard.recommendation.reasonHy ?? "Սա ձեր հաջորդ առաջարկվող հմտությունն է։",
      href: `./practice.html?skill=${encodeURIComponent(skill.id)}`,
      label: "Սկսել վարժանքը",
    };
  }

  return {
    title: "Դիտեք Գլուխ I-ի հմտությունները",
    telemetryRecommendation: dashboard?.recommendation ?? null,
    reason: dashboard?.recommendation?.reasonHy ?? "Ընտրեք հաջորդ հասանելի ուսումնական քայլը։",
    href: "./physics-7.html",
    label: "Բացել Ֆիզիկա 7-ը",
  };
}

function renderRecommendedAction() {
  const action = recommendedAction();
  visibleRecommendation = action.telemetryRecommendation ?? null;
  $("progressNextTitle").textContent = action.title;
  $("progressNextReason").textContent = action.reason;
  $("progressNextAction").href = action.href;
  $("progressNextAction").textContent = action.label;
}

function renderSkills() {
  const list = $("progressSkillList");
  const recommendedId = dashboard?.recommendation?.skill?.id ?? null;
  list.innerHTML = "";

  for (const skill of dashboard?.skills ?? []) {
    const state = skillState(skill);
    const masteryPercent = Number(skill.mastery?.percent ?? 0);
    const diagnostic = skill.diagnostic ?? { correct: 0, total: 0, band: "not_assessed" };
    const historyCount = Number(skill.mastery?.evidenceCount ?? 0);
    const row = document.createElement("article");
    row.className = `progress-skill-row${skill.id === recommendedId && !masteryStatus?.unitComplete ? " recommended" : ""}`;
    row.innerHTML = `
      <div class="progress-skill-copy">
        <div class="progress-skill-meta">
          <span class="skill-code">${escapeHtml(skill.code)}</span>
          <span class="status-badge neutral">${escapeHtml(layerLabels[skill.layer] ?? skill.layer)}</span>
          <span class="status-badge ${stateTones[state]}">${escapeHtml(stateLabels[state])}</span>
          ${skill.id === recommendedId && !masteryStatus?.unitComplete ? '<span class="status-badge info">Առաջարկվող քայլ</span>' : ""}
        </div>
        <h3>${escapeHtml(skill.nameHy)}</h3>
        <span class="subtle small">Վարժանքի գրանցված պատասխաններ՝ ${historyCount}</span>
        <a class="text-link progress-skill-detail" href="./physics-7.html#skill-${encodeURIComponent(skill.code)}">Դիտել դասընթացում</a>
      </div>
      <div class="progress-skill-evidence">
        <span class="progress-skill-label">Ախտորոշիչ</span>
        <strong>${diagnostic.total ? `${diagnostic.correct}/${diagnostic.total}` : "Տվյալ չկա"}</strong>
        <span class="subtle small">${escapeHtml(diagnosticLabels[diagnostic.band] ?? "Չգնահատված")}</span>
      </div>
      <div class="progress-skill-mastery">
        <span class="progress-skill-label">Յուրացման միավոր</span>
        <strong>${skill.mastery ? `${masteryPercent}/100` : "Դեռ չկա"}</strong>
        <div class="mini-progress" role="progressbar" aria-label="${escapeHtml(skill.code)} յուրացման միավոր" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${masteryPercent}">
          <div class="mini-progress-bar" style="width:${masteryPercent}%"></div>
        </div>
      </div>`;
    list.appendChild(row);
  }
}

async function loadProgress() {
  if (loading) return;
  loading = true;
  $("progressError").classList.add("hidden");
  $("progressLoading").classList.remove("hidden");
  $("progressContent").classList.add("hidden");

  const [{ data: dash, error: dashError }, { data: status, error: statusError }] = await Promise.all([
    supabase.functions.invoke("get-student-dashboard", { body: {} }),
    supabase.functions.invoke("get-mastery-check-status", { body: {} }),
  ]);
  loading = false;

  if (dashError || !dash) {
    $("progressLoading").classList.add("hidden");
    $("progressError").textContent = dashError?.message ?? "Չհաջողվեց բեռնել առաջընթացը։";
    $("progressError").classList.remove("hidden");
    return;
  }

  dashboard = dash;
  masteryStatus = statusError ? null : status;
  renderSummary();
  renderRecommendedAction();
  if (visibleRecommendation?.instanceId) {
    await recordRecommendationTelemetry(
      supabase,
      visibleRecommendation,
      "shown",
      "progress",
    );
  }
  renderSkills();
  $("progressLoading").classList.add("hidden");
  $("progressContent").classList.remove("hidden");
}

async function initialize() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.replace("./index.html");
    return;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("./index.html");
    return;
  }
  await loadProgress();
}

$("refreshProgressBtn")?.addEventListener("click", loadProgress);
$("progressNextAction")?.addEventListener("click", async (event) => {
  if (!visibleRecommendation?.instanceId) return;
  event.preventDefault();
  const href = event.currentTarget.href;
  await recordRecommendationTelemetry(
    supabase,
    visibleRecommendation,
    "clicked",
    "progress",
  );
  sessionStorage.setItem("pendingRecommendationInstanceId", visibleRecommendation.instanceId);
  window.location.assign(href);
});
initialize();

