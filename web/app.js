import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const authPanel = $("authPanel");
const practicePanel = $("practicePanel");
const authMessage = $("authMessage");
const signOutBtn = $("signOutBtn");
const answerForm = $("answerForm");
const submitBtn = $("submitBtn");
const nextBtn = $("nextBtn");
const answerArea = $("answerArea");
const feedback = $("feedback");
const stimulusEl = $("stimulus");

let current = null;
let questionStartedAt = null;

const layerLabels = {
  knowledge: "Գիտելիք",
  application: "Կիրառում",
  reasoning: "Դատողություն",
  transfer: "Փոխանցում"
};

const statusLabels = {
  insufficient_evidence: "Տվյալները քիչ են",
  needs_support: "Աջակցություն է պետք",
  developing: "Զարգացող",
  secure: "Կայուն mastery"
};

const recommendationLabels = {
  review_prerequisite: "Համակարգը խորհուրդ է տալիս վերադառնալ անհրաժեշտ նախապայման հմտությանը։",
  continue_current_skill: "Շարունակեք աշխատել ընթացիկ հմտության վրա։",
  advance_skill: "Ընթացիկ հմտությունը կայուն է. կարելի է անցնել հաջորդ հմտությանը։",
  collect_more_evidence: "Պետք են ևս մի քանի պատասխաններ, որպեսզի համակարգը վստահ գնահատի mastery-ն։"
};

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? "#8a3342" : "#356246";
}

function setAuthenticated(isAuthenticated) {
  authPanel.classList.toggle("hidden", isAuthenticated);
  practicePanel.classList.toggle("hidden", !isAuthenticated);
  signOutBtn.classList.toggle("hidden", !isAuthenticated);
  if (isAuthenticated && !current) loadNextQuestion();
}

async function signIn() {
  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;
  setAuthMessage("Մուտք ենք գործում…");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return setAuthMessage(error.message, true);
  setAuthMessage("");
}

async function signUp() {
  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;
  setAuthMessage("Հաշիվը ստեղծվում է…");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return setAuthMessage(error.message, true);
  if (!data.session) {
    setAuthMessage("Հաշիվը ստեղծվել է։ Եթե համակարգը պահանջում է էլ. փոստի հաստատում, հաստատեք նամակը, ապա մուտք գործեք։");
  } else {
    setAuthMessage("");
  }
}

async function signOut() {
  await supabase.auth.signOut();
  current = null;
  clearQuestion();
}

function clearQuestion() {
  $("skillCode").textContent = "—";
  $("skillLayer").textContent = "—";
  $("difficulty").textContent = "—";
  $("skillName").textContent = "—";
  $("itemCode").textContent = "—";
  $("prompt").textContent = "Սեղմեք «Հաջորդ հարց»։";
  answerArea.innerHTML = "";
  stimulusEl.innerHTML = "";
  stimulusEl.classList.add("hidden");
  feedback.className = "feedback hidden";
  feedback.innerHTML = "";
  submitBtn.disabled = true;
}

async function loadNextQuestion() {
  nextBtn.disabled = true;
  submitBtn.disabled = true;
  feedback.className = "feedback hidden";
  feedback.innerHTML = "";
  $("prompt").textContent = "Հարցը բեռնվում է…";
  answerArea.innerHTML = "";
  stimulusEl.innerHTML = "";
  stimulusEl.classList.add("hidden");

  const { data, error } = await supabase.functions.invoke("get-practice-item", { body: {} });
  if (error) {
    nextBtn.disabled = false;
    $("prompt").textContent = "Չհաջողվեց բեռնել հարցը։";
    feedback.className = "feedback bad";
    feedback.textContent = error.message;
    return;
  }

  if (data?.complete) {
    current = null;
    questionStartedAt = null;
    renderCompletion(data);
    return;
  }

  nextBtn.disabled = false;
  current = data;
  questionStartedAt = performance.now();
  renderQuestion(data);
}

function renderCompletion(data) {
  $("skillCode").textContent = data.unitCode ?? "PHY7-U01";
  $("skillLayer").textContent = "Ավարտված";
  $("difficulty").textContent = "—";
  $("skillName").textContent = "Բաժնի ամփոփում";
  $("itemCode").textContent = "—";
  $("prompt").textContent = data.messageHy ?? "Բաժինն ավարտված է։";
  answerArea.innerHTML = "";
  stimulusEl.innerHTML = "";
  stimulusEl.classList.add("hidden");
  submitBtn.disabled = true;
  nextBtn.disabled = true;

  const completedSkills = Array.isArray(data.summary) ? data.summary.length : 10;
  $("masteryText").textContent = `${completedSkills} հմտություն ավարտված`;
  $("masteryStatus").textContent = "Բաժինն ավարտված է";
  $("masteryBar").style.width = "100%";
  $("recommendation").textContent = "Կարելի է անցնել հաջորդ բաժնին կամ կատարել ամփոփիչ վերանայում։";

  feedback.className = "feedback good";
  feedback.innerHTML = "<strong>Ավարտված է։</strong><div>Այս բաժնի adaptive practice-ը այլևս նոր հարց չի պահանջում։</div>";
}

function renderQuestion(data) {
  const { skill, item, progress } = data;
  $("skillCode").textContent = skill.code;
  $("skillLayer").textContent = layerLabels[skill.layer] ?? skill.layer;
  $("difficulty").textContent = `${item.difficulty}/5`;
  $("skillName").textContent = skill.nameHy;
  $("itemCode").textContent = item.code;
  $("prompt").textContent = item.promptHy;
  renderStimulus(item.stimulus);
  renderAnswerInput(item);
  renderCurrentProgress(progress);
  submitBtn.disabled = false;
}

function renderCurrentProgress(progress) {
  if (!progress) {
    $("masteryText").textContent = "Տվյալներ դեռ չկան";
    $("masteryStatus").textContent = "—";
    $("masteryBar").style.width = "0%";
    return;
  }
  const pct = Math.max(0, Math.min(100, Math.round(Number(progress.score) * 100)));
  const recent = progress.recentWindow
    ? ` · վերջին ${progress.recentWindow}-ից ${progress.recentCorrect ?? 0} ճիշտ`
    : "";
  $("masteryText").textContent = `${pct}% · ${progress.evidenceCount ?? 0} պատասխան${recent}`;
  $("masteryStatus").textContent = statusLabels[progress.status] ?? progress.status ?? "—";
  $("masteryBar").style.width = `${pct}%`;
}

function renderAnswerInput(item) {
  answerArea.innerHTML = "";

  if (item.type === "single_choice") {
    for (const option of item.options ?? []) {
      const label = document.createElement("label");
      label.className = "option";
      label.innerHTML = `<input type="radio" name="answer" value="${escapeHtml(option.option_key)}" required><span><strong>${escapeHtml(option.option_key)}.</strong> ${escapeHtml(option.content_hy)}</span>`;
      answerArea.appendChild(label);
    }
    return;
  }

  if (item.type === "true_false") {
    const values = [["true", "Ճիշտ է"], ["false", "Սխալ է"]];
    for (const [value, text] of values) {
      const label = document.createElement("label");
      label.className = "option";
      label.innerHTML = `<input type="radio" name="answer" value="${value}" required><span>${text}</span>`;
      answerArea.appendChild(label);
    }
    return;
  }

  if (item.type === "numeric") {
    answerArea.innerHTML = `<label>Պատասխան<input id="numericAnswer" inputmode="decimal" autocomplete="off" placeholder="Թվային արժեք"></label>`;
    return;
  }

  if (item.type === "quantity") {
    const suggestedUnit = item.stimulus?.to_unit ?? "";
    answerArea.innerHTML = `
      <div class="quantity-row">
        <label>Թվային արժեք<input id="numericAnswer" inputmode="decimal" autocomplete="off" placeholder="Օր.՝ 2.5"></label>
        <label>Միավոր<input id="unitAnswer" autocomplete="off" value="${escapeHtml(suggestedUnit)}" placeholder="Օր.՝ L"></label>
      </div>`;
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
    if (!selected) return null;
    return { value: selected.value === "true" };
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

async function submitAnswer(event) {
  event.preventDefault();
  if (!current) return;
  const response = collectResponse();
  if (!response) {
    feedback.className = "feedback bad";
    feedback.textContent = "Նախ ընտրեք կամ մուտքագրեք պատասխան։";
    return;
  }

  submitBtn.disabled = true;
  const responseTimeMs = questionStartedAt ? Math.round(performance.now() - questionStartedAt) : null;
  const { data, error } = await supabase.functions.invoke("submit-answer", {
    body: {
      itemId: current.item.id,
      response,
      responseTimeMs,
      hintUsed: false
    }
  });

  if (error) {
    submitBtn.disabled = false;
    feedback.className = "feedback bad";
    feedback.textContent = `Չհաջողվեց ստուգել պատասխանը․ ${error.message}`;
    return;
  }

  const correct = data.grading?.correct;
  feedback.className = `feedback ${correct ? "good" : "bad"}`;
  feedback.innerHTML = `<strong>${correct ? "Ճիշտ է։" : "Սխալ է։"}</strong><div>${correct ? "Mastery-ի ապացույցը թարմացվեց։" : "Պատասխանը գրանցվեց, և համակարգը կօգտագործի այն հաջորդ քայլը ընտրելիս։"}</div>`;
  updateMastery(data.mastery, data.recommendation);
}

function updateMastery(mastery, recommendation) {
  if (!mastery) return;
  const pct = Math.max(0, Math.min(100, Math.round(Number(mastery.score) * 100)));
  $("masteryText").textContent = `${pct}% · ${mastery.evidenceCount} պատասխան`;
  $("masteryStatus").textContent = statusLabels[mastery.status] ?? mastery.status;
  $("masteryBar").style.width = `${pct}%`;
  $("recommendation").textContent = recommendationLabels[recommendation?.action] ?? recommendation?.reason ?? "—";
}

function renderStimulus(stimulus) {
  stimulusEl.innerHTML = "";
  if (!stimulus || Object.keys(stimulus).length === 0) {
    stimulusEl.classList.add("hidden");
    return;
  }
  stimulusEl.classList.remove("hidden");

  switch (stimulus.kind) {
    case "scale_spec":
      stimulusEl.appendChild(renderScale(stimulus));
      break;
    case "displacement":
      stimulusEl.appendChild(renderDisplacement(stimulus));
      break;
    case "unit_conversion":
      stimulusEl.innerHTML = `<div class="conversion"><span>${escapeHtml(stimulus.from_value)} ${escapeHtml(stimulus.from_unit)}</span><span>→</span><span>? ${escapeHtml(stimulus.to_unit)}</span></div>`;
      break;
    case "measurement_result":
      stimulusEl.innerHTML = `<div class="conversion"><span>${escapeHtml(stimulus.value)} ± ${escapeHtml(stimulus.error)} ${escapeHtml(stimulus.unit)}</span></div>`;
      break;
    case "stack_measurement":
      stimulusEl.appendChild(renderStack(stimulus));
      break;
    case "displacement_procedure":
      stimulusEl.innerHTML = `<div class="conversion"><span>V₁</span><span>→</span><span>մարմինը ջրում</span><span>→</span><span>V₂</span><span>→</span><span>V₂ − V₁</span></div>`;
      break;
    default:
      stimulusEl.innerHTML = `<pre>${escapeHtml(JSON.stringify(stimulus, null, 2))}</pre>`;
  }
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
  axis.setAttribute("x1", x1); axis.setAttribute("x2", x2); axis.setAttribute("y1", y); axis.setAttribute("y2", y);
  axis.setAttribute("stroke", "#495668"); axis.setAttribute("stroke-width", "3");
  svg.appendChild(axis);

  for (let i = 0; i <= divisions; i++) {
    const x = x1 + (x2 - x1) * (i / divisions);
    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", x); tick.setAttribute("x2", x); tick.setAttribute("y1", y - 15); tick.setAttribute("y2", y + 15);
    tick.setAttribute("stroke", "#495668"); tick.setAttribute("stroke-width", i === 0 || i === divisions ? "3" : "1.5");
    svg.appendChild(tick);
  }

  const lowerText = document.createElementNS(svgNS, "text");
  lowerText.setAttribute("x", x1); lowerText.setAttribute("y", 100); lowerText.setAttribute("text-anchor", "middle");
  lowerText.textContent = String(lower);
  svg.appendChild(lowerText);

  const upperText = document.createElementNS(svgNS, "text");
  upperText.setAttribute("x", x2); upperText.setAttribute("y", 100); upperText.setAttribute("text-anchor", "middle");
  upperText.textContent = String(upper);
  svg.appendChild(upperText);

  if (spec.mark_offset !== undefined) {
    const x = x1 + (x2 - x1) * (Number(spec.mark_offset) / divisions);
    const marker = document.createElementNS(svgNS, "polygon");
    marker.setAttribute("points", `${x - 9},18 ${x + 9},18 ${x},38`);
    marker.setAttribute("fill", "#263a55");
    svg.appendChild(marker);
  }

  const unitText = document.createElementNS(svgNS, "text");
  unitText.setAttribute("x", 320); unitText.setAttribute("y", 116); unitText.setAttribute("text-anchor", "middle");
  unitText.textContent = spec.unit ?? "";
  svg.appendChild(unitText);

  wrap.appendChild(svg);
  return wrap;
}

function renderDisplacement(spec) {
  const outer = document.createElement("div");
  const max = Math.max(Number(spec.V2 ?? 1), Number(spec.V1 ?? 1));
  outer.className = "cylinders";
  outer.appendChild(cylinder("V₁", Number(spec.V1), max, spec.unit));
  outer.appendChild(cylinder("V₂", Number(spec.V2), max, spec.unit));
  return outer;
}

function cylinder(label, value, max, unit) {
  const box = document.createElement("div");
  const vessel = document.createElement("div");
  vessel.className = "cylinder";
  const water = document.createElement("div");
  water.className = "water";
  water.style.height = `${Math.max(15, Math.min(90, (value / max) * 82))}%`;
  vessel.appendChild(water);
  const caption = document.createElement("div");
  caption.className = "cylinder-label";
  caption.textContent = `${label} = ${value} ${unit ?? ""}`;
  box.append(vessel, caption);
  return box;
}

function renderStack(spec) {
  const outer = document.createElement("div");
  const stack = document.createElement("div");
  stack.className = "stack";
  const visualCount = Math.min(10, Number(spec.count ?? 8));
  for (let i = 0; i < visualCount; i++) stack.appendChild(document.createElement("div"));
  outer.appendChild(stack);
  const caption = document.createElement("p");
  caption.className = "cylinder-label";
  caption.textContent = spec.count ? `${spec.count} հատ · ընդհանուր հաստություն ${spec.total_thickness} ${spec.unit}` : "Անուղղակի չափում՝ մի քանի նույնական շերտ միասին";
  outer.appendChild(caption);
  return outer;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("signInBtn").addEventListener("click", signIn);
$("signUpBtn").addEventListener("click", signUp);
signOutBtn.addEventListener("click", signOut);
nextBtn.addEventListener("click", loadNextQuestion);
answerForm.addEventListener("submit", submitAnswer);

supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
const { data: sessionData } = await supabase.auth.getSession();
setAuthenticated(Boolean(sessionData.session));