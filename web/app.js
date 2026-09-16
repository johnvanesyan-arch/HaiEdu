import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

const authPanel = $("authPanel");
const modePanel = $("modePanel");
const practicePanel = $("practicePanel");
const authMessage = $("authMessage");
const modeMessage = $("modeMessage");
const signOutBtn = $("signOutBtn");
const answerForm = $("answerForm");
const submitBtn = $("submitBtn");
const nextBtn = $("nextBtn");
const backBtn = $("backBtn");
const answerArea = $("answerArea");
const feedback = $("feedback");
const stimulusEl = $("stimulus");
const masteryCard = $("masteryCard");

let currentSession = null;
let current = null;
let questionStartedAt = null;
let dashboardData = null;

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

const bandLabels = {
  strong: "Ուժեղ",
  developing: "Զարգացող",
  needs_support: "Աջակցություն է պետք",
  not_assessed: "Չի գնահատվել"
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

function setModeMessage(message, isError = false) {
  modeMessage.textContent = message;
  modeMessage.style.color = isError ? "#8a3342" : "#356246";
}

function setAuthenticated(isAuthenticated) {
  authPanel.classList.toggle("hidden", isAuthenticated);
  signOutBtn.classList.toggle("hidden", !isAuthenticated);
  if (isAuthenticated) showDashboard();
  else {
    modePanel.classList.add("hidden");
    practicePanel.classList.add("hidden");
  }
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
  if (!data.session) setAuthMessage("Հաշիվը ստեղծվել է։ Եթե պահանջվում է էլ. փոստի հաստատում, հաստատեք նամակը, ապա մուտք գործեք։");
  else setAuthMessage("");
}

async function signOut() {
  await supabase.auth.signOut();
  current = null;
  currentSession = null;
  dashboardData = null;
  clearQuestion();
}

async function showDashboard() {
  current = null;
  currentSession = null;
  practicePanel.classList.add("hidden");
  modePanel.classList.remove("hidden");
  $("dashboardLoading").classList.remove("hidden");
  $("dashboardContent").classList.add("hidden");
  setModeMessage("");

  const { data, error } = await supabase.functions.invoke("get-student-dashboard", { body: {} });
  if (error) {
    $("dashboardLoading").textContent = "Չհաջողվեց բեռնել առաջընթացը։";
    return setModeMessage(error.message, true);
  }

  dashboardData = data;
  renderDashboard(data);
  $("dashboardLoading").classList.add("hidden");
  $("dashboardContent").classList.remove("hidden");
}

function renderDashboard(data) {
  const diagnostic = data.latestDiagnostic;
  $("diagnosticScore").textContent = diagnostic ? `${diagnostic.correct} / ${diagnostic.answered} · ${diagnostic.percent}%` : "Դեռ չկա";
  $("diagnosticMeta").textContent = diagnostic
    ? "Վերջին ավարտված 20-հարցանոց ախտորոշիչ"
    : "Անցեք ախտորոշիչը՝ հմտությունների քարտեզ ստանալու համար";

  const progress = data.progress ?? { completedSkills: 0, totalSkills: 10, percent: 0 };
  $("completedSkills").textContent = `${progress.completedSkills} / ${progress.totalSkills}`;
  $("overallProgressBar").style.width = `${progress.percent}%`;

  const recommendation = data.recommendation ?? {};
  const skill = recommendation.skill;
  const actionText = {
    resume_session: "Շարունակել սեսիան",
    take_diagnostic: "Անցնել ախտորոշիչ",
    practice_skill: "Սկսել առաջարկվող վարժանքը",
    unit_complete: "Բաժնի ընթացիկ չափանիշները բավարարված են"
  }[recommendation.action] ?? "Հաջորդ քայլ";

  $("nextStepLabel").textContent = actionText;
  $("nextStepSkill").textContent = skill ? `${skill.code} · ${skill.nameHy}` : "—";
  $("recommendationTitle").textContent = skill ? `${skill.code} — ${skill.nameHy}` : actionText;
  $("recommendationText").textContent = recommendation.reasonHy ?? "—";

  const resumeBtn = $("resumeLearningBtn");
  resumeBtn.disabled = recommendation.action === "unit_complete";
  resumeBtn.textContent = actionText;

  if (recommendation.action === "resume_session" && data.activeSession) {
    const active = data.activeSession;
    $("recommendationTitle").textContent = active.mode === "diagnostic" ? "Շարունակել ախտորոշիչը" : "Շարունակել վարժանքը";
    $("recommendationText").textContent = `${active.answered} / ${active.planned} հարց արդեն պատասխանված է։`;
  }

  if (skill) {
    $("practiceCardText").textContent = `Առաջարկվող մեկնարկ՝ ${skill.code} — ${skill.nameHy}`;
  } else {
    $("practiceCardText").textContent = "Սկսեք սահմանափակ adaptive practice սեսիա։";
  }

  $("startDiagnosticBtn").textContent = diagnostic ? "Կրկնել ախտորոշիչը" : "Սկսել ախտորոշիչը";
  renderSkillMap(data.skills ?? [], skill?.id ?? null);
}

function completionBadge(skill) {
  if (!skill.complete) return "";
  if (skill.completionSource === "recent_recovery") {
    return '<span class="check-chip recent-recovery">✓ Վերջին փորձերում կայուն</span>';
  }
  if (skill.completionSource === "mastery") {
    return '<span class="check-chip">✓ Ամրապնդված</span>';
  }
  return '<span class="check-chip completion-neutral">✓ Ընթացիկ չափանիշը բավարարված է</span>';
}

function renderSkillMap(skills, recommendedSkillId) {
  const container = $("skillMap");
  container.innerHTML = "";
  for (const skill of skills) {
    const tile = document.createElement("article");
    tile.className = `skill-tile${skill.id === recommendedSkillId ? " recommended" : ""}`;
    const diag = skill.diagnostic ?? { band: "not_assessed", correct: 0, total: 0, percent: null };
    const mastery = skill.mastery;
    const diagnosticText = diag.total ? `${diag.correct}/${diag.total}` : "—";
    const masteryText = mastery
      ? `Յուրացում՝ ${mastery.percent}% · ${statusLabels[mastery.status] ?? mastery.status}`
      : "Յուրացման տվյալներ չկան";
    tile.innerHTML = `
      <div class="skill-top">
        <div>
          <div class="skill-code">${escapeHtml(skill.code)}</div>
          <div class="skill-title">${escapeHtml(skill.nameHy)}</div>
        </div>
        ${completionBadge(skill)}
      </div>
      <div class="skill-meta">
        <span class="band-badge ${escapeHtml(diag.band)}">Ախտորոշիչ՝ ${escapeHtml(bandLabels[diag.band] ?? diag.band)} · ${escapeHtml(diagnosticText)}</span>
        <span class="mastery-chip">${escapeHtml(masteryText)}</span>
        <span class="mastery-chip">${escapeHtml(layerLabels[skill.layer] ?? skill.layer)}</span>
      </div>`;
    container.appendChild(tile);
  }
}

async function resumeRecommendedAction() {
  if (!dashboardData?.recommendation) return;
  const action = dashboardData.recommendation.action;
  if (action === "resume_session" && dashboardData.activeSession) {
    return resumeSession(dashboardData.activeSession);
  }
  if (action === "take_diagnostic") return startSession("diagnostic");
  if (action === "practice_skill") return startSession("practice", dashboardData.recommendation.skill?.id ?? null);
}

async function resumeSession(session) {
  currentSession = session;
  modePanel.classList.add("hidden");
  practicePanel.classList.remove("hidden");
  await loadSessionItem();
}

async function startSession(mode, targetSkillId = null) {
  setModeMessage(mode === "diagnostic" ? "Ախտորոշիչը պատրաստվում է…" : "Վարժանքը պատրաստվում է…");
  $("startDiagnosticBtn").disabled = true;
  $("startPracticeBtn").disabled = true;
  $("resumeLearningBtn").disabled = true;

  const body = mode === "practice" && targetSkillId ? { mode, targetSkillId } : { mode };
  const { data, error } = await supabase.functions.invoke("start-learning-session", { body });

  $("startDiagnosticBtn").disabled = false;
  $("startPracticeBtn").disabled = false;
  $("resumeLearningBtn").disabled = false;

  if (error) return setModeMessage(`Չհաջողվեց սկսել․ ${error.message}`, true);
  if (data?.unitComplete) {
    modePanel.classList.add("hidden");
    practicePanel.classList.remove("hidden");
    renderUnitComplete(data);
    return;
  }

  currentSession = data.session;
  modePanel.classList.add("hidden");
  practicePanel.classList.remove("hidden");
  await loadSessionItem();
}

function clearQuestion() {
  $("sessionMode").textContent = "—";
  $("sessionProgress").textContent = "—";
  $("skillCode").textContent = "—";
  $("skillName").textContent = "—";
  $("itemCode").textContent = "—";
  $("difficulty").textContent = "—";
  $("sessionProgressBar").style.width = "0%";
  $("prompt").textContent = "Ընտրեք ռեժիմ և սկսեք։";
  answerArea.innerHTML = "";
  stimulusEl.innerHTML = "";
  stimulusEl.classList.add("hidden");
  feedback.className = "feedback hidden";
  feedback.innerHTML = "";
  submitBtn.disabled = true;
  nextBtn.disabled = true;
  nextBtn.dataset.action = "next";
}

async function loadSessionItem() {
  if (!currentSession?.id) return;
  nextBtn.disabled = true;
  nextBtn.dataset.action = "next";
  submitBtn.disabled = true;
  feedback.className = "feedback hidden";
  feedback.innerHTML = "";
  $("prompt").textContent = "Հարցը բեռնվում է…";
  answerArea.innerHTML = "";
  stimulusEl.innerHTML = "";
  stimulusEl.classList.add("hidden");

  const { data, error } = await supabase.functions.invoke("get-session-item", { body: { sessionId: currentSession.id } });
  if (error) {
    $("prompt").textContent = "Չհաջողվեց բեռնել հարցը։";
    feedback.className = "feedback bad";
    feedback.textContent = error.message;
    return;
  }

  if (data?.complete) {
    current = null;
    questionStartedAt = null;
    renderSessionCompletion(data);
    return;
  }

  current = data;
  currentSession = { ...currentSession, ...data.session };
  questionStartedAt = performance.now();
  renderQuestion(data);
}

function renderQuestion(data) {
  const { skill, item, session } = data;
  const isDiagnostic = session.mode === "diagnostic";
  $("sessionMode").textContent = isDiagnostic ? "Ախտորոշիչ" : "Վարժանք";
  $("sessionProgress").textContent = `${session.position} / ${session.total}`;
  $("skillCode").textContent = skill?.code ?? "—";
  $("skillName").textContent = skill?.nameHy ?? "—";
  $("itemCode").textContent = item.code;
  $("difficulty").textContent = `${item.difficulty}/5`;
  $("prompt").textContent = item.promptHy;
  $("sessionProgressBar").style.width = `${Math.max(0, ((session.position - 1) / session.total) * 100)}%`;
  masteryCard.classList.toggle("hidden", isDiagnostic);
  renderStimulus(item.stimulus);
  renderAnswerInput(item);
  submitBtn.disabled = false;
  nextBtn.disabled = true;
  nextBtn.textContent = "Հաջորդ հարց";
  nextBtn.dataset.action = "next";
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
    for (const [value, text] of [["true", "Ճիշտ է"], ["false", "Սխալ է"]]) {
      const label = document.createElement("label");
      label.className = "option";
      label.innerHTML = `<input type="radio" name="answer" value="${value}" required><span>${text}</span>`;
      answerArea.appendChild(label);
    }
    return;
  }
  if (item.type === "numeric") {
    answerArea.innerHTML = `<label>Պատասխան<input id="numericAnswer" inputmode="decimal" autocomplete="off" placeholder="Մուտքագրեք թիվը"></label>`;
    return;
  }
  if (item.type === "quantity") {
    answerArea.innerHTML = `
      <div class="quantity-row">
        <label>Թվային արժեք<input id="numericAnswer" inputmode="decimal" autocomplete="off" placeholder="Մուտքագրեք թիվը"></label>
        <label>Միավոր<input id="unitAnswer" autocomplete="off" placeholder="Մուտքագրեք միավորը"></label>
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

async function submitAnswer(event) {
  event.preventDefault();
  if (!current || !currentSession) return;
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
      sessionId: currentSession.id,
      sessionItemId: current.sessionItemId,
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

  const total = current.session.total;
  $("sessionProgressBar").style.width = `${Math.min(100, (current.session.position / total) * 100)}%`;
  nextBtn.disabled = false;
  nextBtn.textContent = data.session?.status === "completed" ? "Ավարտել" : "Հաջորդ հարց";

  if (current.session.mode === "diagnostic") {
    feedback.className = "feedback neutral";
    feedback.innerHTML = "<strong>Պատասխանն ընդունվեց։</strong><div>Ճիշտ/սխալ արդյունքը կերևա ախտորոշիչի ավարտից հետո։</div>";
    return;
  }

  const correct = data.grading?.correct;
  feedback.className = `feedback ${correct ? "good" : "bad"}`;
  feedback.innerHTML = `<strong>${correct ? "Ճիշտ է։" : "Սխալ է։"}</strong><div>${correct ? "Mastery-ի ապացույցը թարմացվեց։" : "Սխալը գրանցվեց։ Սեսիան սահմանափակ է և անվերջ չի շարունակվի։"}</div>`;
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

function renderSessionCompletion(data) {
  const mode = data.session?.mode ?? currentSession?.mode;
  const diagnostic = mode === "diagnostic";
  const summary = data.summary ?? {};
  const answered = Number(summary.answered ?? data.session?.answered_count ?? 0);
  const planned = Number(summary.planned ?? data.session?.planned_item_count ?? answered);
  const correct = Number(summary.correct ?? data.session?.correct_count ?? 0);
  const percent = Number(summary.percent ?? (answered ? Math.round((correct / answered) * 100) : 0));

  $("sessionMode").textContent = diagnostic ? "Ախտորոշիչ" : "Վարժանք";
  $("sessionProgress").textContent = `${answered} / ${planned}`;
  $("skillCode").textContent = "Ավարտված";
  $("skillName").textContent = diagnostic ? "Ախտորոշիչ ստուգումն ավարտված է" : "Վարժանքի սեսիան ավարտված է";
  $("itemCode").textContent = "—";
  $("difficulty").textContent = "—";
  $("sessionProgressBar").style.width = "100%";
  $("prompt").textContent = diagnostic
    ? "Արդյունքները պատրաստ են։ Վերադարձեք առաջընթացի էջ՝ հմտություն առ հմտություն քարտեզը տեսնելու համար։"
    : "Այս վարժանքի սեսիան ավարտվեց։ Առաջընթացի էջը կթարմացնի հաջորդ առաջարկվող քայլը։";
  answerArea.innerHTML = "";
  stimulusEl.innerHTML = "";
  stimulusEl.classList.add("hidden");
  submitBtn.disabled = true;
  masteryCard.classList.add("hidden");
  feedback.className = "feedback good";
  feedback.innerHTML = `<strong>${correct} / ${answered} ճիշտ (${percent}%)</strong><div>${diagnostic ? "Հմտությունների քարտեզը հաշվարկվել է վերջին ախտորոշիչից։" : "Սեսիայի արդյունքը պահպանվել է ընդհանուր առաջընթացում։"}</div>`;
  nextBtn.disabled = false;
  nextBtn.textContent = diagnostic ? "Դիտել արդյունքները" : "Վերադառնալ առաջընթացին";
  nextBtn.dataset.action = "dashboard";
}

function renderUnitComplete(data) {
  clearQuestion();
  $("sessionMode").textContent = "Վարժանք";
  $("sessionProgress").textContent = "Ավարտված";
  $("skillCode").textContent = data.unitCode ?? "PHY7-U01";
  $("skillName").textContent = "Բաժնի հմտությունները ավարտված են";
  $("prompt").textContent = data.messageHy ?? "Բաժինն ավարտված է։";
  $("sessionProgressBar").style.width = "100%";
  feedback.className = "feedback good";
  feedback.innerHTML = "<strong>Այս պահին նոր remediation սեսիա պետք չէ։</strong>";
  masteryCard.classList.add("hidden");
  nextBtn.disabled = false;
  nextBtn.textContent = "Վերադառնալ առաջընթացին";
  nextBtn.dataset.action = "dashboard";
}

async function handleNext() {
  if (nextBtn.dataset.action === "dashboard") return showDashboard();
  return loadSessionItem();
}

function renderStimulus(stimulus) {
  stimulusEl.innerHTML = "";
  if (!stimulus || Object.keys(stimulus).length === 0) {
    stimulusEl.classList.add("hidden");
    return;
  }
  stimulusEl.classList.remove("hidden");
  switch (stimulus.kind) {
    case "scale_spec": stimulusEl.appendChild(renderScale(stimulus)); break;
    case "displacement": stimulusEl.appendChild(renderDisplacement(stimulus)); break;
    case "unit_conversion": stimulusEl.innerHTML = `<div class="conversion"><span>${escapeHtml(stimulus.from_value)} ${escapeHtml(stimulus.from_unit)}</span><span>→</span><span>? ${escapeHtml(stimulus.to_unit)}</span></div>`; break;
    case "measurement_result": stimulusEl.innerHTML = `<div class="conversion"><span>${escapeHtml(stimulus.value)} ± ${escapeHtml(stimulus.error)} ${escapeHtml(stimulus.unit)}</span></div>`; break;
    case "stack_measurement": stimulusEl.appendChild(renderStack(stimulus)); break;
    case "displacement_procedure": stimulusEl.innerHTML = `<div class="conversion"><span>V₁</span><span>→</span><span>մարմինը ջրում</span><span>→</span><span>V₂</span><span>→</span><span>V₂ − V₁</span></div>`; break;
    default: stimulusEl.innerHTML = `<pre>${escapeHtml(JSON.stringify(stimulus, null, 2))}</pre>`;
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
  axis.setAttribute("x1", x1); axis.setAttribute("x2", x2); axis.setAttribute("y1", y); axis.setAttribute("y2", y); axis.setAttribute("stroke", "#495668"); axis.setAttribute("stroke-width", "3"); svg.appendChild(axis);
  for (let i = 0; i <= divisions; i++) {
    const x = x1 + (x2 - x1) * (i / divisions);
    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", x); tick.setAttribute("x2", x); tick.setAttribute("y1", y - 15); tick.setAttribute("y2", y + 15); tick.setAttribute("stroke", "#495668"); tick.setAttribute("stroke-width", i === 0 || i === divisions ? "3" : "1.5"); svg.appendChild(tick);
  }
  for (const [x, text] of [[x1, String(lower)], [x2, String(upper)]]) {
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", x); label.setAttribute("y", 100); label.setAttribute("text-anchor", "middle"); label.textContent = text; svg.appendChild(label);
  }
  if (spec.mark_offset !== undefined) {
    const x = x1 + (x2 - x1) * (Number(spec.mark_offset) / divisions);
    const marker = document.createElementNS(svgNS, "polygon"); marker.setAttribute("points", `${x - 9},18 ${x + 9},18 ${x},38`); marker.setAttribute("fill", "#263a55"); svg.appendChild(marker);
  }
  const unitText = document.createElementNS(svgNS, "text");
  unitText.setAttribute("x", 320); unitText.setAttribute("y", 116); unitText.setAttribute("text-anchor", "middle"); unitText.textContent = spec.unit ?? ""; svg.appendChild(unitText);
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
$("startDiagnosticBtn").addEventListener("click", () => startSession("diagnostic"));
$("startPracticeBtn").addEventListener("click", () => startSession("practice", dashboardData?.recommendation?.skill?.id ?? null));
$("resumeLearningBtn").addEventListener("click", resumeRecommendedAction);
$("refreshDashboardBtn").addEventListener("click", showDashboard);
signOutBtn.addEventListener("click", signOut);
backBtn.addEventListener("click", showDashboard);
nextBtn.addEventListener("click", handleNext);
answerForm.addEventListener("submit", submitAnswer);

supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
const { data: sessionData } = await supabase.auth.getSession();
setAuthenticated(Boolean(sessionData.session));