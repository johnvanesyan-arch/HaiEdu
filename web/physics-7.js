import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { recordRecommendationTelemetry } from "./recommendation-telemetry.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let dashboard = null;
let masteryStatus = null;
let busySkillId = null;

const topics = [
  { code: "PHY7-U01-T01", title: "Ֆիզիկայի ուսումնասիրման առարկան և ֆիզիկական երևույթները", sections: "§1", skillCodes: ["PHY7-U01-S01", "PHY7-U01-S02"] },
  { code: "PHY7-U01-T02", title: "Ֆիզիկոսներ և հայ անվանի ֆիզիկոսներ", sections: "§2", skillCodes: ["PHY7-U01-S03"] },
  { code: "PHY7-U01-T03", title: "Դիտումներ, փորձեր և գիտական հետազոտություն", sections: "§3", skillCodes: ["PHY7-U01-S04", "PHY7-U01-S05"] },
  { code: "PHY7-U01-T04", title: "Ֆիզիկական մեծություններ և չափումներ", sections: "§4", skillCodes: ["PHY7-U01-S06", "PHY7-U01-S07", "PHY7-U01-S08", "PHY7-U01-S09"] },
  { code: "PHY7-U01-T05", title: "Չափման փորձ և խնդիրների լուծում", sections: "§5–§6", skillCodes: ["PHY7-U01-S10"] },
];

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(message, isError = false) {
  const el = $("subjectMessage");
  if (!el) return;
  el.textContent = message;
  el.style.color = isError ? "#8a3342" : "#356246";
}

function skillState(skill) {
  if (masteryStatus?.unitComplete) return "verified";
  if (skill.complete && skill.completionSource === "mastery") return "secure";
  if (skill.complete && skill.completionSource === "recent_recovery") return "recovered";
  if (skill.mastery?.status === "needs_support") return "needs_support";
  if (skill.mastery?.status === "developing") return "developing";
  if (skill.mastery?.status === "insufficient_evidence") return skill.mastery.evidenceCount > 0 ? "developing" : "not_started";
  if (skill.complete) return "secure";
  if (skill.diagnostic?.band === "needs_support") return "needs_support";
  if (skill.diagnostic?.band === "developing") return "developing";
  if (skill.diagnostic?.total > 0 || skill.mastery?.evidenceCount > 0) return "developing";
  return "not_started";
}

function renderSummary() {
  const progress = dashboard?.progress ?? { completedSkills: 0, totalSkills: 10, percent: 0 };
  $("chapterProgressText").textContent = `${progress.completedSkills} / ${progress.totalSkills}`;
  $("chapterProgressMeta").textContent = masteryStatus?.unitComplete
    ? "Գլուխ I-ի յուրացման ստուգարքն անցած է։"
    : "Ընթացիկ առաջընթացի չափանիշը բավարարած հմտություններ";
  $("chapterProgressBar").style.width = `${progress.percent}%`;
  $("chapterProgressBar")?.parentElement?.setAttribute("aria-valuenow", String(progress.percent));

  const diagnostic = dashboard?.latestDiagnostic;
  $("subjectDiagnostic").textContent = diagnostic ? `${diagnostic.correct}/${diagnostic.answered} · ${diagnostic.percent}%` : "Դեռ չկա";
  $("subjectDiagnosticMeta").textContent = diagnostic ? "Գլուխ I-ի սկզբնական ախտորոշիչ" : "Սկսեք ախտորոշիչը Գլխավոր էջից";

  let assessmentTitle = "Դեռ փակ է";
  let assessmentMeta = masteryStatus?.messageHy ?? "Ամրապնդեք բոլոր հմտությունները։";
  if (!masteryStatus) {
    assessmentTitle = "Կարգավիճակը հասանելի չէ";
    assessmentMeta = "Չհաջողվեց ստուգել պատրաստվածությունը։ Թարմացրեք էջը՝ կրկին փորձելու համար։";
  } else if (masteryStatus?.unitComplete || masteryStatus?.lifecycleState === "mastery_passed") {
    assessmentTitle = "Գլխի յուրացման ստուգարքն անցած է";
    assessmentMeta = `Անցած է${masteryStatus.passedOnAttempt ? ` · փորձ ${masteryStatus.passedOnAttempt}/3` : ""}${masteryStatus.latestCheck?.percent != null ? ` · ${masteryStatus.latestCheck.percent}%` : ""}։ Գլխի կրկնությունը լրացուցիչ է։`;
  } else if (masteryStatus?.finalFailure || masteryStatus?.lifecycleState === "mastery_failed_final") {
    assessmentTitle = "Փորձերն ավարտված են";
    assessmentMeta = "Յուրացման ստուգման բոլոր երեք փորձերն ավարտված են։ Գլխի կրկնությունը շարունակում է հասանելի մնալ։";
  } else if (masteryStatus?.activeSession?.mode === "mastery_check") {
    assessmentTitle = "Ընթացքի մեջ";
    assessmentMeta = `${masteryStatus.activeSession.answered_count ?? 0}/${masteryStatus.activeSession.planned_item_count ?? 20} հարց`;
  } else if (masteryStatus?.eligible) {
    const nextAttempt = Number(masteryStatus.nextAttemptNumber ?? 1);
    assessmentTitle = nextAttempt > 1 ? `Փորձ ${nextAttempt} / 3` : "Պատրաստ է";
    assessmentMeta = nextAttempt > 1 ? "Պահանջվող Գլխի կրկնությունն ավարտված է։ Կարող եք կրկին անցնել յուրացման ստուգումը։" : "Բոլոր հմտությունները պատրաստ են անկախ ստուգման։";
  } else if (masteryStatus?.retryBlocked) {
    assessmentTitle = "Գլխի կրկնություն է պետք";
  }
  $("subjectAssessment").textContent = assessmentTitle;
  $("subjectAssessmentMeta").textContent = assessmentMeta;
  const reviewLink = $("chapterReviewLink");
  const reviewAvailable = Boolean(masteryStatus?.reviewAvailable || masteryStatus?.retryBlocked);
  reviewLink.classList.toggle("hidden", !reviewAvailable);
  reviewLink.textContent = masteryStatus?.retryBlocked ? "Անցնել Գլխի կրկնություն" : "Կրկնել գլուխը";

  const chapterBadge = $("chapterStateBadge");
  if (!masteryStatus) {
    chapterBadge.textContent = "Կարգավիճակը հասանելի չէ";
    chapterBadge.className = "status-badge warning";
  } else if (masteryStatus?.unitComplete || masteryStatus?.lifecycleState === "mastery_passed") {
    chapterBadge.textContent = "Ստուգարքն անցած է";
    chapterBadge.className = "status-badge success";
  } else if (masteryStatus?.finalFailure || masteryStatus?.lifecycleState === "mastery_failed_final") {
    chapterBadge.textContent = "Փորձերն ավարտված են";
    chapterBadge.className = "status-badge warning";
  } else if (progress.completedSkills === progress.totalSkills && progress.totalSkills > 0) {
    chapterBadge.textContent = "Պատրաստ է ստուգման";
    chapterBadge.className = "status-badge info";
  } else if (progress.completedSkills > 0) {
    chapterBadge.textContent = `${progress.completedSkills}/${progress.totalSkills} ընթացիկ չափանիշը բավարարած`;
    chapterBadge.className = "status-badge warning";
  } else {
    chapterBadge.textContent = "Սկսելու փուլ";
    chapterBadge.className = "status-badge neutral";
  }
}

function renderActiveSession() {
  const learningSession = dashboard?.latestDiagnostic || dashboard?.activeSession?.mode === "diagnostic" ? dashboard?.activeSession : null;
  const masterySession = masteryStatus?.activeSession?.mode === "mastery_check" ? masteryStatus.activeSession : null;
  const session = masterySession ?? learningSession;
  const banner = $("activeSessionBanner");
  if (!session) {
    banner.classList.add("hidden");
    return;
  }

  banner.classList.remove("hidden");
  const link = $("activeSessionLink");
  if (session.mode === "mastery_check") {
    $("activeSessionTitle").textContent = "Շարունակել յուրացման ստուգումը";
    $("activeSessionText").textContent = `${session.answered_count ?? 0}/${session.planned_item_count ?? 20} հարց արդեն պատասխանված է։ Մինչև ավարտելը նոր վարժանք սկսել հնարավոր չէ։`;
    link.href = "./mastery.html";
    link.textContent = "Շարունակել ստուգումը";
    return;
  }

  if (session.mode === "chapter_review") {
    const answered = Number(session.answered ?? session.answered_count ?? 0);
    const planned = Number(session.planned ?? session.planned_item_count ?? 12);
    $("activeSessionTitle").textContent = "Շարունակել Գլխի կրկնությունը";
    $("activeSessionText").textContent = `${answered}/${planned} հարց արդեն պատասխանված է։`;
    link.href = "./practice.html?mode=chapter_review";
    link.textContent = "Շարունակել կրկնությունը";
    return;
  }

  const answered = Number(session.answered ?? session.answered_count ?? 0);
  const planned = Number(session.planned ?? session.planned_item_count ?? 0);
  $("activeSessionTitle").textContent = session.mode === "diagnostic" ? "Շարունակել ախտորոշիչը" : "Շարունակել վարժանքը";
  $("activeSessionText").textContent = `${answered}/${planned} հարց արդեն պատասխանված է։ Մինչև ավարտելը այլ հմտության նոր վարժանք սկսել հնարավոր չէ։`;
  link.href = session.mode === "practice" ? "./practice.html" : "./index.html?resume=1";
  link.textContent = "Շարունակել";
}

function activeBlocksNewPractice(skill) {
  const masterySession = masteryStatus?.activeSession?.mode === "mastery_check" ? masteryStatus.activeSession : null;
  if (masterySession) {
    return {
      blocked: true,
      same: false,
      reason: "Սկզբում ավարտեք յուրացման ստուգումը",
      label: "Ավարտեք ստուգումը",
    };
  }
  const active = dashboard?.activeSession;
  if (!active) return { blocked: false, same: false, reason: "", label: "" };
  const same = active.mode === "practice" && active.targetSkill?.id === skill.id;
  if (same) return { blocked: false, same: true, reason: "", label: "" };
  if (active.mode === "diagnostic") {
    return {
      blocked: true,
      same: false,
      reason: "Սկզբում ավարտեք ընթացիկ ախտորոշիչը",
      label: "Ավարտեք ախտորոշիչը",
    };
  }
  if (active.mode === "chapter_review") {
    return {
      blocked: true,
      same: false,
      reason: "Սկզբում ավարտեք ընթացիկ Գլխի կրկնությունը",
      label: "Ավարտեք կրկնությունը",
    };
  }
  return {
    blocked: true,
    same: false,
    reason: "Սկզբում ավարտեք ընթացիկ վարժանքը",
    label: "Ավարտեք ընթացիկ վարժանքը",
  };
}

function renderSkillAction(skill, state) {
  if (!dashboard?.latestDiagnostic) return `<a class="button-link secondary skill-browser-action" href="./diagnostic.html">Նախ ավարտեք ախտորոշիչը</a>`;
  const active = activeBlocksNewPractice(skill);
  if (active.same) return `<a class="button-link skill-browser-action" href="./practice.html">Շարունակել</a>`;
  if (active.blocked) return `<button class="secondary skill-browser-action" disabled title="${escapeHtml(active.reason)}">${escapeHtml(active.label)}</button>`;
  if (state === "verified") return `<button class="secondary skill-browser-action" disabled>Հաստատված</button>`;
  if ((state === "secure" || state === "recovered") && masteryStatus?.eligible) return `<a class="button-link skill-browser-action" href="./mastery.html">Պատրաստ է ստուգման</a>`;
  if (state === "secure") return `<button class="secondary skill-browser-action" disabled>Ամրապնդված</button>`;
  if (state === "recovered") return `<button class="secondary skill-browser-action" disabled>Վերջին փորձերում կայուն</button>`;
  const label = state === "not_started" ? "Սկսել" : "Վարժվել";
  return `<button class="skill-browser-action" data-practice-skill="${escapeHtml(skill.id)}">${label}</button>`;
}

function renderTopics() {
  const byCode = new Map((dashboard?.skills ?? []).map((skill) => [skill.code, skill]));
  const recommendedId = dashboard?.recommendation?.skill?.id ?? null;
  const list = $("topicList");
  list.innerHTML = "";

  for (const topic of topics) {
    const section = document.createElement("section");
    section.className = "topic-block";
    const skills = topic.skillCodes.map((code) => byCode.get(code)).filter(Boolean);
    section.innerHTML = `
      <div class="topic-head">
        <div>
          <div class="topic-code">${escapeHtml(topic.code)} · ${escapeHtml(topic.sections)}</div>
          <h3>${escapeHtml(topic.title)}</h3>
        </div>
        <span class="subtle small">${skills.length} հմտություն</span>
      </div>
      <div class="skill-browser-list"></div>`;

    const skillList = section.querySelector(".skill-browser-list");
    for (const skill of skills) {
      const state = skillState(skill);
      const masteryPercent = skill.mastery?.percent ?? 0;
      const diagnosticText = skill.diagnostic?.total ? `Ախտորոշիչ՝ ${skill.diagnostic.correct}/${skill.diagnostic.total}` : "Ախտորոշիչ տվյալ չկա";
      const row = document.createElement("article");
      row.id = `skill-${skill.code}`;
      row.tabIndex = -1;
      row.className = `skill-browser-row${skill.id === recommendedId ? " recommended" : ""}`;
      row.innerHTML = `
        <div class="skill-browser-copy">
          <div class="skill-browser-meta">
            <span class="skill-code">${escapeHtml(skill.code)}</span>
            <span class="status-badge neutral">${escapeHtml(layerLabels[skill.layer] ?? skill.layer)}</span>
            ${skill.id === recommendedId ? '<span class="status-badge info">Առաջարկվող հաջորդ քայլ</span>' : ""}
          </div>
          <h4>${escapeHtml(skill.nameHy)}</h4>
          <span class="subtle small">${escapeHtml(diagnosticText)}</span>
        </div>
        <div class="skill-browser-state">
          <div class="skill-browser-meta">
            <span class="status-badge ${stateTones[state]}">${stateLabels[state]}</span>
            <span class="skill-browser-score">Յուրացման միավոր՝ ${skill.mastery ? `${masteryPercent}/100` : "դեռ չկա"}</span>
          </div>
          <div class="mini-progress" role="progressbar" aria-label="${escapeHtml(skill.code)} յուրացման առաջընթաց" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${masteryPercent}">
            <div class="mini-progress-bar" style="width:${masteryPercent}%"></div>
          </div>
        </div>
        ${renderSkillAction(skill, state)}`;
      skillList.appendChild(row);
    }
    list.appendChild(section);
  }

  list.querySelectorAll("[data-practice-skill]").forEach((button) => {
    button.addEventListener("click", async () => {
      const skillId = button.dataset.practiceSkill;
      if (skillId && skillId === dashboard?.recommendation?.skill?.id) {
        await recordRecommendationTelemetry(
          supabase,
          dashboard.recommendation,
          "clicked",
          "physics_course",
        );
        sessionStorage.setItem("pendingRecommendationInstanceId", dashboard.recommendation.instanceId);
      }
      startPractice(skillId);
    });
  });
}

function focusRequestedSkill() {
  if (!window.location.hash) return;
  let targetId = "";
  try {
    targetId = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    targetId = window.location.hash.slice(1);
  }
  if (!targetId.startsWith("skill-")) return;
  const target = document.getElementById(targetId);
  if (!target) return;
  requestAnimationFrame(() => {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.focus({ preventScroll: true });
  });
}

function startPractice(skillId) {
  if (!skillId || busySkillId) return;
  busySkillId = skillId;
  window.location.href = `./practice.html?skill=${encodeURIComponent(skillId)}`;
}

async function loadSubject() {
  setMessage("");
  $("subjectLoading").classList.remove("hidden");
  $("subjectContent").classList.add("hidden");

  const [{ data: dash, error: dashError }, { data: status, error: statusError }, { data: lifecycle, error: lifecycleError }] = await Promise.all([
    supabase.functions.invoke("get-student-dashboard", { body: {} }),
    supabase.functions.invoke("get-mastery-check-status", { body: {} }),
    supabase.functions.invoke("get-chapter-mastery-lifecycle", { body: {} }),
  ]);

  if (dashError) {
    $("subjectLoading").textContent = "Չհաջողվեց բեռնել ֆիզիկայի հմտությունները։";
    setMessage(dashError.message, true);
    return;
  }
  dashboard = dash;
  masteryStatus = statusError || !status ? null : { ...status, ...(lifecycle ?? {}) };
  if (statusError) setMessage("Յուրացման ստուգման կարգավիճակը ժամանակավորապես չբեռնվեց։", true);
  else if (lifecycleError) setMessage("Յուրացման փորձերի վիճակը ժամանակավորապես չբեռնվեց։", true);

  renderSummary();
  renderActiveSession();
  renderTopics();
  if (dashboard?.recommendation?.instanceId) {
    await recordRecommendationTelemetry(
      supabase,
      dashboard.recommendation,
      "shown",
      "physics_course",
    );
  }
  $("subjectLoading").classList.add("hidden");
  $("subjectContent").classList.remove("hidden");
  focusRequestedSkill();
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

  $("authPanel").classList.add("hidden");
  $("subjectPanel").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  await loadSubject();
}

$("refreshSubjectBtn")?.addEventListener("click", loadSubject);
$("signOutBtn")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.replace("./index.html");
});

initialize();

