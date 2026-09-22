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

function setStateBadge(text, tone = "neutral") {
  const badge = $("masteryStateBadge");
  if (!badge) return;
  badge.textContent = text;
  badge.className = `status-badge ${tone}`;
}

function routeForActive(active) {
  if (active?.mode === "diagnostic") return "./diagnostic.html";
  if (active?.mode === "practice") return "./practice.html";
  if (active?.mode === "chapter_review") return "./practice.html?mode=chapter_review";
  return "./mastery.html";
}

async function status() {
  const [{ data, error }, { data: lifecycle, error: lifecycleError }] = await Promise.all([
    supabase.functions.invoke("get-mastery-check-status", { body: {} }),
    supabase.functions.invoke("get-chapter-mastery-lifecycle", { body: {} }),
  ]);
  if (error) throw error;
  if (lifecycleError) console.warn("mastery lifecycle unavailable", lifecycleError);
  return { ...data, ...(lifecycle ?? {}) };
}

function renderRequired(skills = []) {
  $("requiredSkills").innerHTML = skills.length
    ? `<div class="assessment-skill-results" style="margin-top:1rem">${skills.map((s) => `<article class="assessment-skill-result"><div class="skill-code">${escapeHtml(s.code)}</div><div class="skill-title">${escapeHtml(s.nameHy)}</div></article>`).join("")}</div>`
    : "";
}

function lifecycleState(statusPayload) {
  return statusPayload?.lifecycleState ?? statusPayload?.masteryState?.lifecycleState ?? statusPayload?.masteryState?.lifecycle_state ?? null;
}

function attemptNumber(value) {
  return Number(value?.attemptNumber ?? value?.attempt_number ?? value?.masteryAttemptNumber ?? value?.mastery_attempt_number ?? 0);
}

function isFinalFailure(value) {
  return lifecycleState(value) === "mastery_failed_final"
    || value?.finalFailure === true
    || (!value?.passed && attemptNumber(value) === 3);
}

function setResultActions({ primaryHref, primaryText, showReview = false, secondaryHref = "./physics-7.html", secondaryText = "Դիտել արդյունքները" }) {
  const primary = $("resultPrimaryAction");
  primary.href = primaryHref;
  primary.textContent = primaryText;
  const review = $("resultReviewAction");
  review.classList.toggle("hidden", !showReview);
  const secondary = $("resultSecondaryAction");
  secondary.href = secondaryHref;
  secondary.textContent = secondaryText;
}

async function prepare() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.href = "./index.html";
    return;
  }

  try {
    const s = await status();
    const active = s.activeSession;

    if ((s.unitComplete || lifecycleState(s) === "mastery_passed") && s.latestCheck) {
      return renderStoredResult(s.latestCheck, true, s);
    }

    if (lifecycleState(s) === "mastery_failed_final" || s.finalFailure) {
      return renderStoredResult(s.latestCheck ?? {}, false, s);
    }

    if (active?.mode === "mastery_check") {
      setStateBadge("Ընթացքի մեջ", "info");
      currentSession = active;
      return openQuestionPanel();
    }

    if (active) {
      setStateBadge("Ժամանակավորապես փակ", "warning");
      $("stateTitle").textContent = "Նախ ավարտեք ընթացիկ սեսիան";
      $("stateText").textContent = "Յուրացման ստուգումը չի սկսվի, որպեսզի ընթացիկ ուսուցման կամ ախտորոշիչ սեսիան չփոխարինվի։";
      $("blockingLink").href = routeForActive(active);
      $("blockingLink").textContent = active.mode === "diagnostic" ? "Շարունակել ախտորոշիչը" : active.mode === "chapter_review" ? "Շարունակել Գլխի կրկնությունը" : "Շարունակել վարժանքը";
      $("blockingLink").classList.remove("hidden");
      return;
    }

    if (s.retryBlocked) {
      setStateBadge("Վերականգնում է պետք", "warning");
      $("stateTitle").textContent = "Յուրացման ստուգումը դեռ հաստատված չէ";
      $("stateText").textContent = s.messageHy ?? "Հաջորդ փորձից առաջ պետք է ավարտեք Գլխի կրկնությունը։";
      renderRequired(s.requiredSkills);
      $("blockingLink").href = "./practice.html?mode=chapter_review";
      $("blockingLink").textContent = "Անցնել Գլխի կրկնություն";
      $("blockingLink").classList.remove("hidden");
      return;
    }

    if (!s.eligible) {
      setStateBadge("Դեռ փակ է", "neutral");
      $("stateTitle").textContent = "Յուրացման ստուգումը դեռ հասանելի չէ";
      $("stateText").textContent = s.messageHy;
      renderRequired(s.requiredSkills);
      if (s.requiredSkills?.[0]?.id) {
        const first = s.requiredSkills[0];
        $("blockingLink").href = `./practice.html?skill=${encodeURIComponent(first.id)}`;
        $("blockingLink").textContent = `Վարժվել ${first.code}`;
        $("blockingLink").classList.remove("hidden");
      }
      return;
    }

    setStateBadge("Պատրաստ է", "info");
    const nextAttempt = Number(s.nextAttemptNumber ?? s.attemptNumber ?? 1);
    $("stateTitle").textContent = nextAttempt > 1 ? "Կրկին անցնել յուրացման ստուգումը" : "Պատրաստ եք յուրացման ստուգմանը";
    $("stateText").textContent = `${nextAttempt > 1 ? `Փորձ ${nextAttempt} / 3։ ` : ""}20 հարց։ Արդյունքը կբացահայտվի միայն ավարտից հետո։ Անցողիկ կանոնը փորձնական է՝ առնվազն 80% ընդհանուր և յուրաքանչյուր հմտությունից առնվազն 1 ճիշտ պատասխան 2-ից։`;
    $("startBtn").classList.remove("hidden");
  } catch (err) {
    setStateBadge("Սխալ", "danger");
    $("stateTitle").textContent = "Չհաջողվեց ստուգել պատրաստվածությունը";
    $("stateText").textContent = err?.message ?? String(err);
  }
}

async function startCheck() {
  $("startBtn").disabled = true;
  $("stateText").textContent = "Յուրացման ստուգումը կազմվում է…";
  const { data, error } = await supabase.functions.invoke("start-learning-session", { body: { mode: "mastery_check" } });
  $("startBtn").disabled = false;
  if (error) {
    $("stateText").textContent = error.message;
    return;
  }
  if (data.unitComplete) return prepare();
  if (data.masteryEligible === false) {
    setStateBadge("Դեռ փակ է", "neutral");
    $("stateTitle").textContent = "Յուրացման ստուգումը դեռ հասանելի չէ";
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
    $("nextBtn").textContent = "Կրկին փորձել";
    $("nextBtn").classList.remove("hidden");
    return;
  }
  if (data?.complete) {
    const s = await status();
    if (s.latestCheck) return renderStoredResult(s.latestCheck, s.unitComplete, s);
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
  const progress = Math.max(0, ((session.position - 1) / session.total) * 100);
  $("progressBar").style.width = `${progress}%`;
  $("progressBar").parentElement?.setAttribute("aria-valuenow", String(Math.round(progress)));
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
  const response = collectResponse();
  if (!response) {
    $("feedback").className = "feedback bad";
    $("feedback").textContent = "Նախ ընտրեք կամ մուտքագրեք պատասխանը։";
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
  const progress = Math.min(100, (position / total) * 100);
  $("progressBar").style.width = `${progress}%`;
  $("progressBar").parentElement?.setAttribute("aria-valuenow", String(Math.round(progress)));
  if (data.finalResult) {
    const currentStatus = await status();
    return renderFinalResult({ ...data.finalResult, ...currentStatus });
  }

  $("feedback").className = "feedback neutral";
  $("feedback").innerHTML = "<strong>Պատասխանն ընդունվեց։</strong><div>Արդյունքը չի ցուցադրվում մինչև յուրացման ստուգման ավարտը։</div>";
  $("nextBtn").textContent = "Հաջորդ հարց";
  $("nextBtn").classList.remove("hidden");
}

function renderFinalResult(result) {
  $("questionPanel").classList.add("hidden");
  $("stateCard").classList.add("hidden");
  $("resultPanel").classList.remove("hidden");
  const finalFailure = isFinalFailure(result);
  $("resultTitle").textContent = result.passed
    ? "Գլխի յուրացումը հաստատված է"
    : finalFailure ? "Յուրացման ստուգման փորձերն ավարտված են" : "Յուրացման ստուգումը դեռ հաստատված չէ";
  $("resultScore").textContent = `${result.score.correct}/${result.score.answered} · ${result.score.percent}%`;
  $("resultRule").textContent = "Փորձնական անցողիկ կանոն՝ ≥80% ընդհանուր արդյունք և յուրաքանչյուր հմտությունից առնվազն 1/2։";
  renderSkillResults(result.skillResults ?? []);

  if (result.passed) {
    $("resultRule").textContent += ` Յուրացումը հաստատվել է ${attemptNumber(result) || 1}-րդ փորձով։ Գլխի կրկնությունն այժմ լրացուցիչ է և չի փոխի հաստատված արդյունքը։`;
    setResultActions({ primaryHref: "./physics-7.html", primaryText: "Շարունակել", showReview: true });
  } else if (finalFailure) {
    $("resultRule").textContent = "Դուք ավարտել եք այս գլխի յուրացման ստուգման բոլոր երեք փորձերը։ Կարող եք շարունակել կրկնել գլուխը և ամրապնդել ուշադրություն պահանջող հմտությունները։";
    setResultActions({ primaryHref: "./practice.html?mode=chapter_review", primaryText: "Կրկնել գլուխը" });
  } else {
    $("resultRule").textContent += ` Կրկին փորձելուց առաջ պետք է ավարտել Գլխի կրկնությունը։ Ավելի շատ ուշադրություն կդարձվի՝ ${result.failedSkills?.map((s) => s.code).join(", ") || "ուշադրություն պահանջող հմտություններին"}։`;
    setResultActions({ primaryHref: "./practice.html?mode=chapter_review", primaryText: "Անցնել Գլխի կրկնություն" });
  }
}

function renderStoredResult(check, passed, statusPayload = {}) {
  $("stateCard").classList.add("hidden");
  $("questionPanel").classList.add("hidden");
  $("resultPanel").classList.remove("hidden");
  const finalFailure = !passed && isFinalFailure({ ...check, ...statusPayload });
  $("resultTitle").textContent = passed
    ? "Գլխի յուրացումը հաստատված է"
    : finalFailure ? "Յուրացման ստուգման փորձերն ավարտված են" : "Յուրացման ստուգումը դեռ հաստատված չէ";
  $("resultScore").textContent = `${check.correct}/${check.answered} · ${check.percent ?? 0}%`;
  $("resultRule").textContent = passed
    ? `Այս գլխի յուրացումը հաստատված է${attemptNumber(check) ? ` ${attemptNumber(check)}-րդ փորձով` : ""}։ Գլխի կրկնությունը լրացուցիչ է և չի փոխի հաստատված արդյունքը։`
    : finalFailure
      ? "Դուք ավարտել եք այս գլխի յուրացման ստուգման բոլոր երեք փորձերը։ Կարող եք շարունակել կրկնել գլուխը և ամրապնդել ուշադրություն պահանջող հմտությունները։"
      : "Հաջորդ փորձը բացվում է միայն պահանջվող Գլխի կրկնությունն ավարտելուց հետո։";
  renderSkillResults(check.skillResults ?? []);
  if (passed) setResultActions({ primaryHref: "./physics-7.html", primaryText: "Շարունակել", showReview: true });
  else setResultActions({
    primaryHref: "./practice.html?mode=chapter_review",
    primaryText: finalFailure ? "Կրկնել գլուխը" : "Անցնել Գլխի կրկնություն",
  });
}

function renderSkillResults(results) {
  $("resultSkills").innerHTML = results.map((r) => {
    const passed = Number(r.correct) >= 1;
    return `<article class="assessment-skill-result">
      <div class="skill-top">
        <div><div class="skill-code">${escapeHtml(r.code)}</div><div class="skill-title">${escapeHtml(r.nameHy)}</div></div>
        <span class="status-badge ${passed ? "success" : "danger"}">${r.correct}/${r.total}</span>
      </div>
    </article>`;
  }).join("");
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
    el.innerHTML = `<div class="conversion"><span>${escapeHtml(stimulus.count ?? "")} հատ</span><span>→</span><span>${escapeHtml(stimulus.total_thickness ?? "?")} ${escapeHtml(stimulus.unit ?? "")}</span></div>`;
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

$("startBtn").addEventListener("click", startCheck);
$("answerForm").addEventListener("submit", submit);
$("nextBtn").addEventListener("click", loadItem);
prepare();
