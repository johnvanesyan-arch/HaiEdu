import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let currentSession = null;
let current = null;
let startedAt = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function status() {
  const { data, error } = await supabase.functions.invoke("get-mastery-check-status", { body: {} });
  if (error) throw error;
  return data;
}

function renderRequired(skills = []) {
  $("requiredSkills").innerHTML = skills.length
    ? `<div class="skill-map">${skills.map((s) => `<article class="skill-tile"><div class="skill-code">${escapeHtml(s.code)}</div><div class="skill-title">${escapeHtml(s.nameHy)}</div></article>`).join("")}</div>`
    : "";
}

async function prepare() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.href = "./";
    return;
  }

  try {
    const s = await status();
    if (s.unitComplete && s.latestCheck) {
      return renderStoredResult(s.latestCheck, true);
    }
    if (s.activeSession?.mode === "mastery_check") {
      currentSession = s.activeSession;
      return openQuestionPanel();
    }
    if (s.retryBlocked) {
      $("stateTitle").textContent = "Կրկնակի փորձը դեռ փակ է";
      $("stateText").textContent = s.messageHy;
      renderRequired(s.requiredSkills);
      return;
    }
    if (!s.eligible) {
      $("stateTitle").textContent = "Mastery check-ը դեռ հասանելի չէ";
      $("stateText").textContent = s.messageHy;
      renderRequired(s.requiredSkills);
      return;
    }

    $("stateTitle").textContent = "Պատրաստ եք mastery check-ին";
    $("stateText").textContent = "20 հարց։ Անցնելու համար պետք է առնվազն 80% ընդհանուր արդյունք և յուրաքանչյուր հմտությունից առնվազն 1 ճիշտ պատասխան 2-ից։";
    $("startBtn").classList.remove("hidden");
  } catch (err) {
    $("stateTitle").textContent = "Չհաջողվեց ստուգել պատրաստվածությունը";
    $("stateText").textContent = err.message ?? String(err);
  }
}

async function startCheck() {
  $("startBtn").disabled = true;
  $("stateText").textContent = "Mastery check-ը կազմվում է…";
  const { data, error } = await supabase.functions.invoke("start-learning-session", { body: { mode: "mastery_check" } });
  $("startBtn").disabled = false;
  if (error) {
    $("stateText").textContent = error.message;
    return;
  }
  if (data.unitComplete) return prepare();
  if (data.masteryEligible === false) {
    $("stateTitle").textContent = "Mastery check-ը դեռ հասանելի չէ";
    $("stateText").textContent = data.messageHy ?? "Նախ անհրաժեշտ է լրացուցիչ վարժանք։";
    renderRequired(data.requiredSkills ?? []);
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
  $("nextBtn").classList.add("hidden");
  $("submitBtn").disabled = true;

  const { data, error } = await supabase.functions.invoke("get-session-item", { body: { sessionId: currentSession.id } });
  if (error) {
    $("prompt").textContent = "Չհաջողվեց բեռնել հարցը։";
    $("feedback").className = "feedback bad";
    $("feedback").textContent = error.message;
    return;
  }
  if (data?.complete) {
    const s = await status();
    if (s.latestCheck) return renderStoredResult(s.latestCheck, s.unitComplete);
    return;
  }
  current = data;
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
  $("progressBar").style.width = `${Math.max(0, ((session.position - 1) / session.total) * 100)}%`;
  $("prompt").textContent = item.promptHy;
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
  if (type === "single_choice") {
    const selected = document.querySelector('input[name="answer"]:checked');
    return selected ? { value: selected.value } : null;
  }
  if (type === "true_false") {
    const selected = document.querySelector('input[name="answer"]:checked');
    return selected ? { value: selected.value === "true" } : null;
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
  const response = collectResponse();
  if (!response) {
    $("feedback").className = "feedback bad";
    $("feedback").textContent = "Նախ մուտքագրեք պատասխանը։";
    return;
  }
  $("submitBtn").disabled = true;
  const responseTimeMs = startedAt ? Math.round(performance.now() - startedAt) : null;
  const { data, error } = await supabase.functions.invoke("submit-mastery-answer", {
    body: {
      sessionId: currentSession.id,
      sessionItemId: current.sessionItemId,
      itemId: current.item.id,
      response,
      responseTimeMs,
    },
  });
  if (error) {
    $("submitBtn").disabled = false;
    $("feedback").className = "feedback bad";
    $("feedback").textContent = error.message;
    return;
  }

  const position = current.session.position;
  const total = current.session.total;
  $("progressBar").style.width = `${Math.min(100, (position / total) * 100)}%`;
  if (data.finalResult) return renderFinalResult(data.finalResult);

  $("feedback").className = "feedback neutral";
  $("feedback").innerHTML = "<strong>Պատասխանն ընդունվեց։</strong><div>Արդյունքը չի ցուցադրվում մինչև mastery check-ի ավարտը։</div>";
  $("nextBtn").classList.remove("hidden");
}

function renderFinalResult(result) {
  $("questionPanel").classList.add("hidden");
  $("stateCard").classList.add("hidden");
  $("resultPanel").classList.remove("hidden");
  $("resultTitle").textContent = result.passed ? "Mastery check-ը անցել եք" : "Mastery check-ը դեռ չի անցել";
  $("resultScore").innerHTML = `<strong>${result.score.correct} / ${result.score.answered} · ${result.score.percent}%</strong>`;
  $("resultRule").textContent = "Փորձնական անցողիկ կանոն՝ ≥80% ընդհանուր արդյունք և յուրաքանչյուր հմտությունից առնվազն 1/2։";
  renderSkillResults(result.skillResults ?? []);
  if (!result.passed) {
    const failed = result.failedSkills ?? [];
    $("resultRule").textContent += ` Կրկին փորձելուց առաջ պետք է ավարտել remediation վարժանք՝ ${failed.map((s) => s.code).join(", ") || "առաջարկվող հմտությունների"} համար։`;
  }
}

function renderStoredResult(check, passed) {
  $("stateCard").classList.add("hidden");
  $("questionPanel").classList.add("hidden");
  $("resultPanel").classList.remove("hidden");
  $("resultTitle").textContent = passed ? "Mastery check-ը անցել եք" : "Վերջին mastery check-ը չի անցել";
  $("resultScore").innerHTML = `<strong>${check.correct} / ${check.answered} · ${check.percent ?? 0}%</strong>`;
  $("resultRule").textContent = passed
    ? "Այս բաժնի unit-completion չափանիշը կատարված է։"
    : "Կրկնակի փորձը բացվում է միայն պահանջվող remediation վարժանքներից հետո։";
  renderSkillResults(check.skillResults ?? []);
}

function renderSkillResults(results) {
  $("resultSkills").innerHTML = results.map((r) => `
    <article class="skill-tile">
      <div class="skill-top"><div><div class="skill-code">${escapeHtml(r.code)}</div><div class="skill-title">${escapeHtml(r.nameHy)}</div></div><strong>${r.correct}/${r.total}</strong></div>
    </article>`).join("");
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
  const divisions = Number(spec.divisions ?? 5);
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
  const unit = document.createElementNS(svgNS, "text");
  unit.setAttribute("x", 320); unit.setAttribute("y", 116); unit.setAttribute("text-anchor", "middle"); unit.textContent = spec.unit ?? ""; svg.appendChild(unit);
  wrap.appendChild(svg);
  return wrap;
}

$("startBtn").addEventListener("click", startCheck);
$("answerForm").addEventListener("submit", submit);
$("nextBtn").addEventListener("click", loadItem);
prepare();
