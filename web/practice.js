import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let dashboard = null;
let masteryCheckStatus = null;
let currentSession = null;
let current = null;
let questionStartedAt = null;
let starting = false;

const PRACTICE_BOOTSTRAP_KEY = "amp:practice-bootstrap";

function readPracticeBootstrap(userId) {
  try {
    const raw = sessionStorage.getItem(PRACTICE_BOOTSTRAP_KEY);
    sessionStorage.removeItem(PRACTICE_BOOTSTRAP_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (
      cached?.userId !== userId
      || !cached?.dashboard
      || !Number.isFinite(cached?.expiresAt)
      || cached.expiresAt < Date.now()
    ) {
      return null;
    }
    return cached.dashboard;
  } catch {
    sessionStorage.removeItem(PRACTICE_BOOTSTRAP_KEY);
    return null;
  }
}

const statusLabels = {
  insufficient_evidence: "Տվյալները քիչ են",
  needs_support: "Աջակցություն է պետք",
  developing: "Զարգացող",
  secure: "Ամրապնդված",
};

const recommendationLabels = {
  review_prerequisite: "Համակարգը խորհուրդ է տալիս վերադառնալ անհրաժեշտ նախապայման հմտությանը։",
  continue_current_skill: "Շարունակեք աշխատել ընթացիկ հմտության վրա։",
  advance_skill: "Ընթացիկ հմտությունը կայուն է. կարելի է անցնել հաջորդ հմտությանը։",
  collect_more_evidence: "Պետք են ևս մի քանի ինքնուրույն պատասխաններ՝ հմտության վիճակը վստահ գնահատելու համար։",
};

const schedulerLabels = {
  new_item: ["Նոր հարց", "Նոր առաջադրանք է ընտրվել՝ ձեր ընթացիկ մակարդակին համապատասխան։"],
  bridge: ["Քայլ առ քայլ", "Համակարգը ժամանակավորապես ընտրել է ավելի մատչելի հարց՝ գաղափարը վերականգնելու համար։"],
  remediation: ["Սխալի վերականգնում", "Համակարգը վերադառնում է դժվարություն առաջացրած գաղափարին՝ այլ ձևակերպմամբ։"],
  spaced_review: ["Ամրապնդում", "Ավելի վաղ տեսած գաղափարը վերադառնում է ժամանակային ընդմիջումից հետո։"],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dispatchStatus(message, error = false) {
  window.dispatchEvent(new CustomEvent("amp-status", { detail: { message, error } }));
}

function showGate(title, text, actions = []) {
  $("practicePanel").classList.add("hidden");
  $("completionPanel").classList.add("hidden");
  const gate = $("practiceGate");
  gate.classList.remove("hidden");
  gate.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "practice-blocked";
  const heading = document.createElement("h2");
  heading.textContent = title;
  const paragraph = document.createElement("p");
  paragraph.className = "subtle";
  paragraph.textContent = text;
  wrapper.append(heading, paragraph);

  if (actions.length) {
    const row = document.createElement("div");
    row.className = "row";
    for (const action of actions) {
      const link = document.createElement("a");
      link.className = action.primary ? "button-link" : "ghost button-link";
      link.href = action.href;
      link.textContent = action.label;
      row.appendChild(link);
    }
    wrapper.appendChild(row);
  }
  gate.appendChild(wrapper);
}

function showPractice() {
  $("practiceGate").classList.add("hidden");
  $("completionPanel").classList.add("hidden");
  $("practicePanel").classList.remove("hidden");
}

function requestedSkillId() {
  return new URLSearchParams(window.location.search).get("skill");
}

function matchingSkill(skillId) {
  return (dashboard?.skills ?? []).find((skill) => skill.id === skillId) ?? null;
}

function currentTargetSkill() {
  const id = currentSession?.targetSkill?.id ?? currentSession?.target_skill_id ?? current?.skill?.id ?? null;
  return id ? matchingSkill(id) : null;
}

function renderInitialMastery(skill) {
  const mastery = skill?.mastery;
  if (!mastery) {
    $("masteryText").textContent = "Տվյալներ դեռ չկան";
    $("masteryStatus").textContent = "Սկսելու փուլ";
    $("masteryBar").style.width = "0%";
    $("masteryBar").parentElement?.setAttribute("aria-valuenow", "0");
    return;
  }
  updateMastery({ score: mastery.score, evidenceCount: mastery.evidenceCount, status: mastery.status }, null);
}

function blockForActiveNonPractice(session) {
  if (!session) return false;
  if (session.mode === "practice") return false;

  if (session.mode === "diagnostic") {
    showGate(
      "Ախտորոշիչը դեռ ընթացքի մեջ է",
      "Նոր վարժանք սկսելուց առաջ ավարտեք կամ շարունակեք ընթացիկ Գլուխ I-ի ախտորոշիչը։ Գործող սեսիան չի ջնջվել։",
      [
        { href: "./index.html?resume=1", label: "Շարունակել ախտորոշիչը", primary: true },
        { href: "./index.html", label: "Վերադառնալ Գլխավոր", primary: false },
      ],
    );
    return true;
  }

  if (session.mode === "mastery_check") {
    showGate(
      "Յուրացման ստուգումը դեռ ընթացքի մեջ է",
      "Վարժանք սկսելուց առաջ ավարտեք ընթացիկ անկախ ստուգումը։ Գործող ստուգումը չի ջնջվել։",
      [
        { href: "./mastery.html", label: "Շարունակել ստուգումը", primary: true },
        { href: "./index.html", label: "Վերադառնալ Գլխավոր", primary: false },
      ],
    );
    return true;
  }

  showGate("Այլ սեսիա է ընթացքի մեջ", "Սկզբում վերադարձեք Գլխավոր էջ և ավարտեք ընթացիկ ուսուցման գործողությունը։", [
    { href: "./index.html", label: "Վերադառնալ Գլխավոր", primary: true },
  ]);
  return true;
}

async function startOrResumePractice() {
  if (starting) return;
  starting = true;

  const active = dashboard?.activeSession ?? null;
  if (active) {
    if (blockForActiveNonPractice(active)) {
      starting = false;
      return;
    }
    currentSession = active;
    showPractice();
    renderInitialMastery(currentTargetSkill());
    await loadSessionItem();
    starting = false;
    return;
  }

  const masteryActive = masteryCheckStatus?.activeSession?.mode === "mastery_check"
    ? masteryCheckStatus.activeSession
    : null;
  if (masteryActive && blockForActiveNonPractice(masteryActive)) {
    starting = false;
    return;
  }

  const requested = requestedSkillId();
  let targetSkill = requested ? matchingSkill(requested) : null;
  if (requested && !targetSkill) {
    showGate("Հմտությունը չի գտնվել", "Այս հղումը չի համապատասխանում Գլուխ I-ի հասանելի հմտությանը։", [
      { href: "./physics-7.html", label: "Բացել Ֆիզիկա 7", primary: true },
    ]);
    starting = false;
    return;
  }

  if (!targetSkill && dashboard?.recommendation?.action === "practice_skill") {
    targetSkill = dashboard.recommendation.skill ?? null;
  }

  const body = targetSkill?.id
    ? { mode: "practice", targetSkillId: targetSkill.id }
    : { mode: "practice" };
  const { data, error } = await supabase.functions.invoke("start-learning-session", { body });
  starting = false;

  if (error) {
    showGate("Չհաջողվեց սկսել վարժանքը", error.message, [
      { href: "./physics-7.html", label: "Վերադառնալ Ֆիզիկա 7", primary: true },
    ]);
    return;
  }

  if (data?.unitComplete) {
    renderUnitComplete(data);
    return;
  }

  if (!data?.session) {
    showGate("Վարժանքը հասանելի չէ", data?.messageHy ?? "Այս պահին նոր վարժանքի սեսիա չի ստեղծվել։", [
      { href: "./index.html", label: "Տեսնել հաջորդ քայլը", primary: true },
    ]);
    return;
  }

  currentSession = data.session;
  history.replaceState({}, "", "./practice.html");
  showPractice();
  renderInitialMastery(targetSkill ?? currentTargetSkill());
  await loadSessionItem();
}

async function loadSessionItem() {
  if (!currentSession?.id) return;
  const nextBtn = $("nextBtn");
  const submitBtn = $("submitBtn");
  nextBtn.disabled = true;
  submitBtn.disabled = true;
  $("feedback").className = "feedback hidden";
  $("feedback").innerHTML = "";
  $("prompt").textContent = "Հարցը բեռնվում է…";
  $("answerArea").innerHTML = "";
  $("stimulus").innerHTML = "";
  $("stimulus").classList.add("hidden");
  $("nextExplanation").textContent = "Հաջորդ հարցը կընտրվի ձեր պատասխանի հիման վրա։";

  const { data, error } = await supabase.functions.invoke("get-session-item", {
    body: { sessionId: currentSession.id },
  });

  if (error) {
    $("prompt").textContent = "Չհաջողվեց բեռնել հարցը։";
    $("feedback").className = "feedback bad";
    $("feedback").textContent = error.message;
    nextBtn.disabled = false;
    nextBtn.textContent = "Կրկին փորձել";
    nextBtn.dataset.action = "retry";
    return;
  }

  if (data?.complete) {
    current = null;
    questionStartedAt = null;
    renderCompletion(data);
    return;
  }

  current = data;
  currentSession = { ...currentSession, ...data.session };
  questionStartedAt = performance.now();
  renderQuestion(data);
}

function renderQuestion(data) {
  const { skill, item, session } = data;
  $("skillCode").textContent = skill?.code ?? "—";
  $("skillName").textContent = skill?.nameHy ?? "—";
  $("itemCode").textContent = item.code;
  $("difficulty").textContent = `Դժվարություն ${item.difficulty}/5`;
  $("prompt").textContent = item.promptHy;
  $("sessionProgress").textContent = `${session.position} / ${session.total}`;

  const before = Math.max(0, ((session.position - 1) / session.total) * 100);
  $("sessionProgressBar").style.width = `${before}%`;
  $("sessionProgressBar").parentElement?.setAttribute("aria-valuenow", String(Math.round(before)));

  const selectionMode = data.scheduler?.selectionMode ?? data.remediation?.selectionReason ?? "new_item";
  const [badge, note] = schedulerLabels[selectionMode] ?? schedulerLabels.new_item;
  $("adaptiveBadge").textContent = badge;
  $("adaptiveNote").textContent = note;

  renderStimulus(item.stimulus);
  renderAnswerInput(item);
  $("submitBtn").disabled = false;
  $("nextBtn").disabled = true;
  $("nextBtn").textContent = "Հաջորդ հարց";
  $("nextBtn").dataset.action = "next";
}

function renderAnswerInput(item) {
  const answerArea = $("answerArea");
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

function lockAnswerControls() {
  $("answerArea").querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = true;
  });
}

async function submitAnswer(event) {
  event.preventDefault();
  if (!current || !currentSession) return;

  const response = collectResponse();
  if (!response) {
    $("feedback").className = "feedback bad";
    $("feedback").textContent = "Նախ ընտրեք կամ մուտքագրեք պատասխան։";
    return;
  }

  $("submitBtn").disabled = true;
  const responseTimeMs = questionStartedAt ? Math.round(performance.now() - questionStartedAt) : null;
  const { data, error } = await supabase.functions.invoke("submit-answer", {
    body: {
      sessionId: currentSession.id,
      sessionItemId: current.sessionItemId,
      itemId: current.item.id,
      response,
      responseTimeMs,
      hintUsed: false,
    },
  });

  if (error) {
    $("submitBtn").disabled = false;
    $("feedback").className = "feedback bad";
    $("feedback").textContent = `Չհաջողվեց ստուգել պատասխանը․ ${error.message}`;
    return;
  }

  lockAnswerControls();
  const total = current.session.total;
  const done = Math.min(100, (current.session.position / total) * 100);
  $("sessionProgressBar").style.width = `${done}%`;
  $("sessionProgressBar").parentElement?.setAttribute("aria-valuenow", String(Math.round(done)));

  const nextBtn = $("nextBtn");
  nextBtn.disabled = false;
  nextBtn.textContent = data.session?.status === "completed" ? "Ավարտել սեսիան" : "Հաջորդ հարց";
  nextBtn.dataset.action = "next";

  const correct = Boolean(data.grading?.correct);
  const usedHelp = Boolean(data.grading?.usedHelp);
  const remediation = data.remediation?.messageHy ?? "";
  const feedback = $("feedback");
  feedback.className = `feedback ${correct ? "good" : "bad"}`;

  if (correct && usedHelp) {
    feedback.innerHTML = `<strong>Ճիշտ է՝ օգնությամբ։</strong><div>${escapeHtml(remediation || "Հմտությունը հետագայում պետք է հաստատվի նաև ինքնուրույն պատասխանով։")}</div>`;
    $("nextExplanation").textContent = "Հաջորդ հարցերը կօգնեն ստուգել՝ կարողանո՞ւմ եք նույն գաղափարը կիրառել նաև առանց օգնության։";
  } else if (correct) {
    feedback.innerHTML = `<strong>Ճիշտ է։</strong><div>${escapeHtml(remediation || "Այս պատասխանը գրանցվել է որպես ինքնուրույն դրական ապացույց։")}</div>`;
    $("nextExplanation").textContent = "Համակարգը կընտրի հաջորդ հարցը՝ հաշվի առնելով այս ինքնուրույն պատասխանը։";
  } else {
    feedback.innerHTML = `<strong>Դեռ ոչ։</strong><div>${escapeHtml(remediation || "Կարող եք բացել օգնությունը կամ անցնել հաջորդ հարմարեցված հարցին։")}</div>`;
    $("nextExplanation").textContent = "Կարող եք նախ բացել սխալի բացատրությունը, ապա շարունակել հաջորդ հարմարեցված հարցին։";
  }

  updateMastery(data.mastery, data.recommendation);
}

function updateMastery(mastery, recommendation) {
  if (!mastery) return;
  const pct = Math.max(0, Math.min(100, Math.round(Number(mastery.score) * 100)));
  $("masteryText").textContent = `${pct}% · ${mastery.evidenceCount} պատասխան`;
  $("masteryStatus").textContent = statusLabels[mastery.status] ?? mastery.status;
  $("masteryBar").style.width = `${pct}%`;
  $("masteryBar").parentElement?.setAttribute("aria-valuenow", String(pct));
  $("recommendation").textContent = recommendationLabels[recommendation?.action]
    ?? recommendation?.reason
    ?? "Այս ցուցանիշը ուսուցման ընթացիկ ապացույցն է, ոչ վերջնական հաստատում։";
}

function renderCompletion(data) {
  $("practiceGate").classList.add("hidden");
  $("practicePanel").classList.add("hidden");
  const panel = $("completionPanel");
  panel.classList.remove("hidden");

  const summary = data.summary ?? {};
  const answered = Number(summary.answered ?? data.session?.answered_count ?? 0);
  const planned = Number(summary.planned ?? data.session?.planned_item_count ?? answered);
  const correct = Number(summary.correct ?? data.session?.correct_count ?? 0);
  const percent = Number(summary.percent ?? (answered ? Math.round((correct / answered) * 100) : 0));
  const reason = summary.reason ?? data.session?.metadata?.completionReason ?? "completed";

  $("completionAnswered").textContent = `${answered} / ${planned}`;
  $("completionCorrect").textContent = String(correct);
  $("completionPercent").textContent = `${percent}%`;

  const messages = {
    mastery_reached: ["Հմտությունն ամրապնդվել է", "Սեսիան ավարտվեց շուտ, քանի որ ընթացիկ mastery ապացույցը հասավ փորձնական ամրապնդման շեմին։"],
    independent_recovery: ["Ինքնուրույն վերականգնում", "Սեսիան ավարտվեց շուտ՝ վերջին բազմազան հարցերում բավարար ինքնուրույն հաջողությունից հետո։"],
    item_limit_reached: ["Սեսիայի սահմանը հասել է", "8 հարցանոց սահմանը պահպանվել է։ Գլխավոր էջը կորոշի հաջորդ քայլը՝ կուտակված ապացույցի հիման վրա։"],
    completed: ["Վարժանքն ավարտվեց", "Սեսիայի արդյունքը պահպանվել է ընդհանուր առաջընթացում։"],
  };
  const [title, text] = messages[reason] ?? messages.completed;
  $("completionTitle").textContent = title;
  $("completionText").textContent = text;
  $("completionReason").textContent = `Ավարտման պատճառ՝ ${reason}`;
}

function renderUnitComplete(data) {
  $("practiceGate").classList.add("hidden");
  $("practicePanel").classList.add("hidden");
  const panel = $("completionPanel");
  panel.classList.remove("hidden");
  $("completionTitle").textContent = "Նոր վարժանք պետք չէ";
  $("completionText").textContent = data.messageHy ?? "Գլուխ I-ի ընթացիկ հմտությունները ամրապնդված են։";
  $("completionAnswered").textContent = "—";
  $("completionCorrect").textContent = "—";
  $("completionPercent").textContent = "—";
  $("completionReason").textContent = "Գլխավոր էջում տեսեք հաջորդ առաջարկվող քայլը կամ յուրացման ստուգման կարգավիճակը։";
}

function renderStimulus(stimulus) {
  const stimulusEl = $("stimulus");
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
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Չափիչ սարքի սանդղակ");
  const x1 = 50, x2 = 590, y = 58;
  const lower = Number(spec.lower ?? spec.base ?? 0);
  const divisions = Number(spec.divisions ?? Math.max(5, Number(spec.mark_offset ?? 0) + 2));
  const upper = spec.upper !== undefined ? Number(spec.upper) : lower + Number(spec.division_value ?? 1) * divisions;

  const axis = document.createElementNS(svgNS, "line");
  axis.setAttribute("x1", x1); axis.setAttribute("x2", x2); axis.setAttribute("y1", y); axis.setAttribute("y2", y);
  axis.setAttribute("stroke", "#495668"); axis.setAttribute("stroke-width", "3");
  svg.appendChild(axis);

  for (let i = 0; i <= divisions; i += 1) {
    const x = x1 + (x2 - x1) * (i / divisions);
    const tick = document.createElementNS(svgNS, "line");
    tick.setAttribute("x1", x); tick.setAttribute("x2", x); tick.setAttribute("y1", y - 15); tick.setAttribute("y2", y + 15);
    tick.setAttribute("stroke", "#495668"); tick.setAttribute("stroke-width", i === 0 || i === divisions ? "3" : "1.5");
    svg.appendChild(tick);
  }

  for (const [x, text] of [[x1, String(lower)], [x2, String(upper)]]) {
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", x); label.setAttribute("y", 100); label.setAttribute("text-anchor", "middle"); label.textContent = text;
    svg.appendChild(label);
  }

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
  for (let i = 0; i < visualCount; i += 1) stack.appendChild(document.createElement("div"));
  outer.appendChild(stack);
  const caption = document.createElement("p");
  caption.className = "cylinder-label";
  caption.textContent = spec.count
    ? `${spec.count} հատ · ընդհանուր հաստություն ${spec.total_thickness} ${spec.unit}`
    : "Անուղղակի չափում՝ մի քանի նույնական շերտ միասին";
  outer.appendChild(caption);
  return outer;
}

async function initialize() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.replace("./index.html");
    return;
  }

  const cachedDashboard = readPracticeBootstrap(sessionData.session.user.id);
  if (cachedDashboard) {
    dashboard = cachedDashboard;
    await startOrResumePractice();
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("./index.html");
    return;
  }

  const [{ data: dash, error: dashError }, { data: check, error: checkError }] = await Promise.all([
    supabase.functions.invoke("get-student-dashboard", { body: {} }),
    supabase.functions.invoke("get-mastery-check-status", { body: {} }),
  ]);

  if (dashError) {
    showGate("Չհաջողվեց բեռնել ուսուցման վիճակը", dashError.message, [
      { href: "./index.html", label: "Վերադառնալ Գլխավոր", primary: true },
    ]);
    return;
  }

  dashboard = dash;
  masteryCheckStatus = checkError ? null : check;
  if (checkError) dispatchStatus("Յուրացման ստուգման վիճակը ժամանակավորապես չբեռնվեց։", true);
  await startOrResumePractice();
}

$("answerForm")?.addEventListener("submit", submitAnswer);
$("nextBtn")?.addEventListener("click", () => loadSessionItem());

initialize();
