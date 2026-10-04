import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { recordRecommendationTelemetry } from "./recommendation-telemetry.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let currentSession = null;
let current = null;
let answerSubmission = null;
let startedAt = null;
let dashboard = null;

const bandLabels = {
  strong: "Ուժեղ",
  developing: "Զարգացող",
  needs_support: "Աջակցություն է պետք",
  not_assessed: "Չի գնահատվել",
};

const bandTones = {
  strong: "success",
  developing: "warning",
  needs_support: "danger",
  not_assessed: "neutral",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function routeForActive(active) {
  if (active?.mode === "practice") return "./practice.html";
  if (active?.mode === "mastery_check") return "./mastery.html";
  return "./diagnostic.html";
}

async function loadDashboard() {
  const { data, error } = await supabase.functions.invoke("get-student-dashboard", { body: {} });
  if (error) throw error;
  dashboard = data;
  return data;
}

async function prepare() {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return window.location.replace("./index.html");

  try {
    const data = await loadDashboard();
    if (data.latestDiagnostic) {
      renderResults(data, false);
      return;
    }

    if (data.activeSession?.mode === "diagnostic") {
      currentSession = data.activeSession;
      $("stateTitle").textContent = "Շարունակեք չավարտված ախտորոշիչը";
      $("stateText").textContent = `${data.activeSession.answered}/${data.activeSession.planned} հարց արդեն պատասխանված է։`;
      $("startBtn").textContent = "Շարունակել ախտորոշիչը";
      $("startBtn").classList.remove("hidden");
      return;
    }

    if (data.activeSession && !["practice", "chapter_review"].includes(data.activeSession.mode)) {
      $("stateTitle").textContent = "Նախ ավարտեք ընթացիկ սեսիան";
      $("stateText").textContent = "Նոր ախտորոշիչը չի սկսվի, որպեսզի ընթացիկ ուսուցման սեսիան չփոխարինվի։";
      $("blockingLink").href = routeForActive(data.activeSession);
      $("blockingLink").classList.remove("hidden");
      return;
    }


    $("stateTitle").textContent = "Պատրաստ եք Գլուխ I-ի ախտորոշիչին";
    $("stateText").textContent = "Ախտորոշիչն ունի 20 հարց և կատարվում է մեկ անգամ։ Փորձեք պատասխանել, նույնիսկ եթե դեռ չեք սովորել նյութը։ Սա անցնել/չանցնել ստուգում չէ․ այն ցույց է տալիս ձեր մեկնարկային գիտելիքները։";
    $("startBtn").textContent = "Սկսել ախտորոշիչը";
    $("startBtn").classList.remove("hidden");
  } catch (err) {
    $("stateTitle").textContent = "Չհաջողվեց պատրաստել ախտորոշիչը";
    $("stateText").textContent = err?.message ?? String(err);
  }
}

async function startDiagnostic() {
  if (currentSession?.id) return openQuestionPanel();
  $("startBtn").disabled = true;
  $("stateText").textContent = "Ախտորոշիչը կազմվում է…";

  const latest = await loadDashboard();
  if (latest.latestDiagnostic) {
    $("startBtn").disabled = false;
    return renderResults(latest, false);
  }
  if (latest.activeSession && !["diagnostic", "practice", "chapter_review"].includes(latest.activeSession.mode)) {
    $("startBtn").disabled = false;
    $("stateTitle").textContent = "Նախ ավարտեք ընթացիկ սեսիան";
    $("stateText").textContent = "Ընթացիկ սեսիան չի փոխարինվել։";
    $("blockingLink").href = routeForActive(latest.activeSession);
    $("blockingLink").classList.remove("hidden");
    return;
  }

  const { data, error } = await supabase.functions.invoke("start-learning-session", { body: { mode: "diagnostic" } });
  $("startBtn").disabled = false;
  if (data?.diagnosticCompleted) return showFreshResults();
  if (error || !data?.session) {
    $("stateText").textContent = error?.message ?? data?.messageHy ?? "Չհաջողվեց սկսել ախտորոշիչը։";
    return;
  }

  currentSession = data.session;
  openQuestionPanel();
}

async function openQuestionPanel() {
  $("stateCard").classList.add("hidden");
  $("resultPanel").classList.add("hidden");
  $("questionPanel").classList.remove("hidden");
  await loadItem();
}

async function loadItem() {
  if (!currentSession?.id) return;
  $("prompt").textContent = "Հարցը բեռնվում է…";
  $("answerArea").innerHTML = "";
  $("feedback").className = "feedback hidden";
  $("feedback").innerHTML = "";
  $("nextBtn").classList.add("hidden");
  $("submitBtn").disabled = true;

  const { data, error } = await supabase.functions.invoke("get-session-item", { body: { sessionId: currentSession.id } });
  if (error) {
    $("prompt").textContent = "Չհաջողվեց բեռնել հարցը։";
    $("feedback").className = "feedback bad";
    $("feedback").textContent = error.message;
    $("nextBtn").textContent = "Կրկին փորձել";
    $("nextBtn").classList.remove("hidden");
    return;
  }

  if (data?.complete) {
    await showFreshResults();
    return;
  }

  current = data;
  currentSession = { ...currentSession, ...data.session };
  startedAt = performance.now();
  renderQuestion(data);
}

function renderQuestion(data) {
  const { skill, item, session } = data;
  $("progressText").textContent = `${session.position} / ${session.total}`;
  $("skillCode").textContent = skill?.code ?? "—";
  $("skillName").textContent = skill?.nameHy ?? "—";
  $("itemCode").textContent = item.code;
  $("difficulty").textContent = `${item.difficulty}/5`;
  $("prompt").textContent = item.promptHy;
  const progress = Math.max(0, ((session.position - 1) / session.total) * 100);
  $("progressBar").style.width = `${progress}%`;
  $("progressBar").parentElement?.setAttribute("aria-valuenow", String(Math.round(progress)));
  renderStimulus(item.stimulus);
  renderAnswer(item);
  $("submitBtn").disabled = false;
}

function renderAnswer(item) {
  const area = $("answerArea");
  area.innerHTML = "";
  if (item.type === "single_choice") {
    for (const option of item.options ?? []) {
      const label = document.createElement("label");
      label.className = "option";
      label.innerHTML = `<input type="radio" name="answer" value="${escapeHtml(option.option_key)}" required><span><strong>${escapeHtml(option.option_key)}.</strong> ${escapeHtml(option.content_hy)}</span>`;
      area.appendChild(label);
    }
    return;
  }
  if (item.type === "true_false") {
    area.innerHTML = `<label class="option"><input type="radio" name="answer" value="true" required><span>Ճիշտ է</span></label><label class="option"><input type="radio" name="answer" value="false" required><span>Սխալ է</span></label>`;
    return;
  }
  if (item.type === "numeric") {
    area.innerHTML = `<label>Պատասխան<input id="numericAnswer" inputmode="decimal" autocomplete="off" placeholder="Մուտքագրեք թիվը"></label>`;
    return;
  }
  if (item.type === "quantity") {
    area.innerHTML = `<div class="quantity-row"><label>Թվային արժեք<input id="numericAnswer" inputmode="decimal" autocomplete="off" placeholder="Մուտքագրեք թիվը"></label><label>Միավոր<input id="unitAnswer" autocomplete="off" placeholder="Մուտքագրեք միավորը"></label></div>`;
  }
}

function collectResponse() {
  const type = current?.item?.type;
  if (type === "single_choice" || type === "true_false") {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return null;
    return { value: type === "true_false" ? selected.value === "true" : selected.value };
  }
  if (type === "numeric") {
    const value = $("numericAnswer")?.value?.trim();
    return value ? { value } : null;
  }
  if (type === "quantity") {
    const value = $("numericAnswer")?.value?.trim();
    const unit = $("unitAnswer")?.value?.trim();
    return value && unit ? { value, unit } : null;
  }
  return null;
}

async function submit(event) {
  event.preventDefault();
  if (answerSubmission || !current || !currentSession?.id) return;
  const response = collectResponse();
  if (!response) {
    $("feedback").className = "feedback bad";
    $("feedback").textContent = "Նախ ընտրեք կամ մուտքագրեք պատասխանը։";
    return;
  }

  const form = $("answerForm");
  const submission = { item: current, sessionId: currentSession.id };
  const isCurrentSubmission = () => answerSubmission === submission
    && current === submission.item && currentSession?.id === submission.sessionId;
  answerSubmission = submission;
  form.dataset.answerSubmitting = "true";
  $("submitBtn").disabled = true;
  try {
    const responseTimeMs = startedAt ? Math.round(performance.now() - startedAt) : null;
    const { data, error } = await supabase.functions.invoke("submit-answer", {
      body: {
        sessionId: submission.sessionId,
        sessionItemId: submission.item.sessionItemId,
        itemId: submission.item.item.id,
        response,
        responseTimeMs,
        hintUsed: false,
      },
    }).catch((error) => ({ error }));
    if (!isCurrentSubmission()) return;

    if (error) {
      $("submitBtn").disabled = false;
      $("feedback").className = "feedback bad";
      $("feedback").textContent = error.message;
      return;
    }

    const position = current.session.position;
    const total = current.session.total;
    const progress = Math.min(100, (position / total) * 100);
    $("progressBar").style.width = `${progress}%`;
    $("progressBar").parentElement?.setAttribute("aria-valuenow", String(Math.round(progress)));
    $("feedback").className = "feedback neutral";
    $("feedback").innerHTML = "<strong>Պատասխանն ընդունվեց։</strong><div>Այս փուլում ճիշտ/սխալ արդյունքը չի բացահայտվում։</div>";
    $("nextBtn").textContent = data.session?.status === "completed" ? "Տեսնել արդյունքները" : "Հաջորդ հարց";
    $("nextBtn").classList.remove("hidden");
  } finally {
    if (answerSubmission === submission) {
      answerSubmission = null;
      delete form.dataset.answerSubmitting;
      if (current !== submission.item || currentSession?.id !== submission.sessionId) {
        form.dispatchEvent(new Event("haiedu-answer-controls-refresh", { bubbles: true }));
      }
    }
  }
}

async function showFreshResults() {
  const data = await loadDashboard();
  renderResults(data, true);
}

function renderResults(data, fresh) {
  const latest = data.latestDiagnostic;
  if (!latest) return;
  $("stateCard").classList.add("hidden");
  $("questionPanel").classList.add("hidden");
  $("resultPanel").classList.remove("hidden");
  $("resultScore").textContent = `${latest.correct}/${latest.answered} · ${latest.percent}%`;
  $("resultText").textContent = fresh
    ? "Ախտորոշիչն ավարտված է։ Ստորև երևում են Գլուխ I-ի 10 հմտությունների արդյունքները։"
    : "Սա Գլուխ I-ի ձեր սկզբնական ախտորոշիչն է։ Այն կատարվում է մեկ անգամ և պահպանվում է որպես ելակետ։";

  $("resultSkills").innerHTML = (data.skills ?? []).map((skill) => {
    const diag = skill.diagnostic ?? { band: "not_assessed", correct: 0, total: 0 };
    return `<article class="assessment-skill-result">
      <div class="skill-top">
        <div><div class="skill-code">${escapeHtml(skill.code)}</div><div class="skill-title">${escapeHtml(skill.nameHy)}</div></div>
        <span class="status-badge ${bandTones[diag.band] ?? "neutral"}">${escapeHtml(bandLabels[diag.band] ?? diag.band)}</span>
      </div>
      <p class="subtle small">Ախտորոշիչ՝ ${diag.total ? `${diag.correct}/${diag.total}` : "—"}</p>
    </article>`;
  }).join("");

  const action = $("recommendedAction");
  if (data.recommendation?.instanceId) {
    void recordRecommendationTelemetry(
      supabase,
      data.recommendation,
      "shown",
      "diagnostic_result",
    );
  }
  if (data.recommendation?.action === "practice_skill" && data.recommendation.skill?.id) {
    action.href = `./practice.html?skill=${encodeURIComponent(data.recommendation.skill.id)}`;
    action.textContent = `Սկսել ${data.recommendation.skill.code} վարժանքը`;
  } else {
    action.href = "./physics-7.html";
    action.textContent = "Տեսնել Ֆիզիկա 7 հմտությունները";
  }
}

function renderStimulus(stimulus) {
  const el = $("stimulus");
  el.innerHTML = "";
  if (!stimulus || Object.keys(stimulus).length === 0) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");

  if (stimulus.kind === "unit_conversion") {
    el.innerHTML = `<div class="conversion"><span>${escapeHtml(stimulus.from_value)} ${escapeHtml(stimulus.from_unit)}</span><span>→</span><span>? ${escapeHtml(stimulus.to_unit)}</span></div>`;
    return;
  }
  if (stimulus.kind === "measurement_result") {
    el.innerHTML = `<div class="conversion"><span>${escapeHtml(stimulus.value)} ± ${escapeHtml(stimulus.error)} ${escapeHtml(stimulus.unit)}</span></div>`;
    return;
  }
  if (stimulus.kind === "displacement" || stimulus.kind === "displacement_procedure") {
    const v1 = stimulus.V1 ?? "V₁";
    const v2 = stimulus.V2 ?? "V₂";
    el.innerHTML = `<div class="conversion"><span>V₁ = ${escapeHtml(v1)} ${escapeHtml(stimulus.unit ?? "")}</span><span>→</span><span>V₂ = ${escapeHtml(v2)} ${escapeHtml(stimulus.unit ?? "")}</span></div>`;
    return;
  }
  if (stimulus.kind === "stack_measurement") {
    el.innerHTML = `<div class="conversion"><span>${escapeHtml(stimulus.count ?? "") } հատ</span><span>→</span><span>${escapeHtml(stimulus.total_thickness ?? "?")} ${escapeHtml(stimulus.unit ?? "")}</span></div>`;
    return;
  }
  if (stimulus.kind === "scale_spec") {
    el.appendChild(renderScale(stimulus));
    return;
  }
  el.innerHTML = `<pre>${escapeHtml(JSON.stringify(stimulus, null, 2))}</pre>`;
}

function renderScale(spec) {
  const wrap = document.createElement("div");
  wrap.className = "scale-wrap";
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 640 120");
  svg.setAttribute("class", "scale-svg");
  const x1 = 50, x2 = 590, y = 58;
  const lower = Number(spec.lower ?? spec.base ?? 0);
  const divisions = Number(spec.divisions ?? Math.max(5, Number(spec.mark_offset ?? 0) + 2));
  const upper = spec.upper !== undefined ? Number(spec.upper) : lower + Number(spec.division_value ?? 1) * divisions;
  const axis = document.createElementNS(svgNS, "line");
  axis.setAttribute("x1", x1); axis.setAttribute("x2", x2); axis.setAttribute("y1", y); axis.setAttribute("y2", y); axis.setAttribute("stroke", "#495668"); axis.setAttribute("stroke-width", "3"); svg.appendChild(axis);
  for (let i = 0; i <= divisions; i++) {
    const x = x1 + (x2 - x1) * (i / divisions);
    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", x); tick.setAttribute("x2", x); tick.setAttribute("y1", y - 15); tick.setAttribute("y2", y + 15); tick.setAttribute("stroke", "#495668"); svg.appendChild(tick);
  }
  for (const [x, text] of [[x1, String(lower)], [x2, String(upper)]]) {
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", x); label.setAttribute("y", 100); label.setAttribute("text-anchor", "middle"); label.textContent = text; svg.appendChild(label);
  }
  if (spec.mark_offset !== undefined) {
    const x = x1 + (x2 - x1) * (Number(spec.mark_offset) / divisions);
    const marker = document.createElementNS(svgNS, "polygon");
    marker.setAttribute("points", `${x - 9},18 ${x + 9},18 ${x},38`);
    marker.setAttribute("fill", "#263a55");
    svg.appendChild(marker);
  }
  const unit = document.createElementNS(svgNS, "text");
  unit.setAttribute("x", 320); unit.setAttribute("y", 116); unit.setAttribute("text-anchor", "middle"); unit.textContent = spec.unit ?? ""; svg.appendChild(unit);
  wrap.appendChild(svg);
  return wrap;
}

$("startBtn").addEventListener("click", startDiagnostic);
$("answerForm").addEventListener("submit", submit);
$("nextBtn").addEventListener("click", loadItem);
$("recommendedAction")?.addEventListener("click", async (event) => {
  const recommendation = dashboard?.recommendation;
  if (!recommendation?.instanceId) return;
  event.preventDefault();
  const href = event.currentTarget.href;
  await recordRecommendationTelemetry(
    supabase,
    recommendation,
    "clicked",
    "diagnostic_result",
  );
  sessionStorage.setItem("pendingRecommendationInstanceId", recommendation.instanceId);
  window.location.assign(href);
});
prepare();
