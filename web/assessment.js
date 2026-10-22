import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

function fmtDate(value) {
  if (!value) return "Դեռ չկա";
  try { return new Intl.DateTimeFormat("hy-AM", { dateStyle: "medium" }).format(new Date(value)); }
  catch { return "—"; }
}

function setBadge(id, text, tone = "neutral") {
  const el = $(id);
  el.textContent = text;
  el.className = `status-badge ${tone}`;
}

function activeRoute(active) {
  if (!active) return null;
  if (active.mode === "practice") return "./practice.html";
  if (active.mode === "diagnostic") return "./diagnostic.html";
  if (active.mode === "mastery_check") return "./mastery.html";
  return "./index.html";
}

function renderActive(dashboard, mastery) {
  const active = mastery?.activeSession ?? dashboard?.activeSession ?? null;
  const banner = $("assessmentActiveBanner");
  if (!active) {
    banner.classList.add("hidden");
    return;
  }

  const answered = Number(active.answered ?? active.answered_count ?? 0);
  const planned = Number(active.planned ?? active.planned_item_count ?? 0);
  const title = active.mode === "diagnostic"
    ? "Շարունակել Գլուխ I-ի ախտորոշիչը"
    : active.mode === "mastery_check"
      ? "Շարունակել յուրացման ստուգումը"
      : "Շարունակել վարժանքը";

  $("assessmentActiveTitle").textContent = title;
  $("assessmentActiveText").textContent = `${answered}/${planned} հարց արդեն պատասխանված է։ Այլ գնահատում մի սկսեք, մինչև այս սեսիան չավարտվի։`;
  $("assessmentActiveLink").href = activeRoute(active);
  banner.classList.remove("hidden");
}

function renderDiagnostic(dashboard, mastery) {
  const latest = dashboard?.latestDiagnostic;
  const active = dashboard?.activeSession;
  const masteryActive = mastery?.activeSession?.mode === "mastery_check" ? mastery.activeSession : null;
  const action = $("diagnosticAction");

  if (latest) {
    setBadge("diagnosticStatus", "Ավարտված", "success");
    $("diagnosticSummary").textContent = `Սկզբնական արդյունքը՝ ${latest.correct}/${latest.answered} (${latest.percent}%)։ Ախտորոշիչը կատարվում է մեկ անգամ և պահպանվում է որպես ելակետ։`;
    action.textContent = "Դիտել սկզբնական արդյունքը";
    action.href = "./diagnostic.html";
  } else if (active?.mode === "diagnostic") {
    setBadge("diagnosticStatus", "Ընթացքի մեջ", "info");
    $("diagnosticSummary").textContent = `${active.answered}/${active.planned} հարց պատասխանված է։ Շարունակեք նույն սեսիան։`;
    action.textContent = "Շարունակել ախտորոշիչը";
    action.href = "./diagnostic.html";
  } else if (active || masteryActive) {
    setBadge("diagnosticStatus", "Ժամանակավորապես փակ", "warning");
    $("diagnosticSummary").textContent = "Նախ ավարտեք ընթացիկ ուսումնական կամ գնահատման սեսիան։";
    action.textContent = "Տեսնել ընթացիկ սեսիան";
    action.href = activeRoute(masteryActive ?? active);
  } else {
    setBadge("diagnosticStatus", "Հասանելի", "info");
    $("diagnosticSummary").textContent = "Սկսեք այստեղից, եթե դեռ չունեք Գլուխ I-ի հմտությունների ախտորոշիչ քարտեզ։";
    action.textContent = "Սկսել ախտորոշիչը";
    action.href = "./diagnostic.html";
  }

  $("diagnosticMeta").textContent = latest ? `Սկզբնական փորձ՝ ${fmtDate(latest.completedAt)}` : "Դեռ փորձ չկա";
  $("latestDiagnosticScore").textContent = latest ? `${latest.correct}/${latest.answered} · ${latest.percent}%` : "Դեռ չկա";
  $("latestDiagnosticDate").textContent = latest ? fmtDate(latest.completedAt) : "Գլուխ I-ի ախտորոշիչ դեռ չի ավարտվել";
}

function renderMastery(mastery) {
  const action = $("masteryAction");
  if (!mastery) {
    setBadge("masteryStatus", "Կարգավիճակը հասանելի չէ", "warning");
    $("masterySummary").textContent = "Չհաջողվեց ստուգել պատրաստվածությունը։ Կրկին փորձեք։";
    action.textContent = "Կրկին փորձել";
    action.href = "./assessment.html";
    $("masteryMeta").textContent = "Փորձերի տվյալները չեն բեռնվել։";
    $("latestMasteryScore").textContent = "—";
    $("latestMasteryDate").textContent = "Արդյունքի տվյալները ժամանակավորապես հասանելի չեն։";
    return;
  }
  const latest = mastery.latestCheck;

  if (mastery?.unitComplete) {
    setBadge("masteryStatus", "Ստուգարքն անցած է", "success");
    $("masterySummary").textContent = "Գլուխ I-ի յուրացման ստուգարքն անցած է։";
    action.textContent = "Դիտել արդյունքը";
  } else if (mastery?.activeSession?.mode === "mastery_check") {
    setBadge("masteryStatus", "Ընթացքի մեջ", "info");
    $("masterySummary").textContent = `${mastery.activeSession.answered_count ?? 0}/${mastery.activeSession.planned_item_count ?? 20} հարց պատասխանված է։`;
    action.textContent = "Շարունակել ստուգումը";
  } else if (mastery?.retryBlocked) {
    setBadge("masteryStatus", "Վերականգնում է պետք", "warning");
    $("masterySummary").textContent = mastery.messageHy ?? "Կրկնակի փորձից առաջ ավարտեք պահանջվող վարժանքը։";
    action.textContent = "Դիտել պահանջները";
  } else if (mastery?.eligible) {
    setBadge("masteryStatus", "Պատրաստ է", "info");
    $("masterySummary").textContent = "Բոլոր ընթացիկ հմտությունները պատրաստ են անկախ ստուգման։";
    action.textContent = latest?.result === "failed" ? "Կրկին փորձել" : "Սկսել ստուգումը";
  } else {
    setBadge("masteryStatus", "Դեռ փակ է", "neutral");
    $("masterySummary").textContent = mastery?.messageHy ?? "Ամրապնդեք բոլոր հմտությունները՝ ստուգումը բացելու համար։";
    action.textContent = "Դիտել պատրաստվածությունը";
  }

  action.href = "./mastery.html";
  $("masteryMeta").textContent = latest ? `Վերջին փորձ՝ ${fmtDate(latest.completedAt)}` : "Դեռ փորձ չկա";
  $("latestMasteryScore").textContent = latest ? `${latest.correct}/${latest.answered} · ${latest.percent ?? 0}%` : "Դեռ չկա";
  $("latestMasteryDate").textContent = latest ? `${fmtDate(latest.completedAt)} · ${latest.result === "passed" ? "անցած" : "չանցած"}` : "Յուրացման ստուգում դեռ չի ավարտվել";
}

async function initialize() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return window.location.replace("./index.html");

  const [{ data: dashboard, error: dashError }, { data: mastery, error: masteryError }] = await Promise.all([
    supabase.functions.invoke("get-student-dashboard", { body: {} }),
    supabase.functions.invoke("get-mastery-check-status", { body: {} }),
  ]);

  if (dashError) {
    $("assessmentLoading").textContent = "Չհաջողվեց բեռնել գնահատման տվյալները։";
    $("assessmentMessage").textContent = dashError.message;
    return;
  }

  renderActive(dashboard, masteryError ? null : mastery);
  renderDiagnostic(dashboard, masteryError ? null : mastery);
  renderMastery(masteryError ? null : mastery);
  if (masteryError) $("assessmentMessage").textContent = "Յուրացման ստուգման կարգավիճակը ժամանակավորապես հասանելի չէ։";

  $("assessmentLoading").classList.add("hidden");
  $("assessmentContent").classList.remove("hidden");
}

initialize();


