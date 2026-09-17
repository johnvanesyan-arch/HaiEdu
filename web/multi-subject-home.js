import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const modePanel = document.getElementById("modePanel");
let rendering = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ensureStylesheet() {
  if (document.querySelector('link[data-amp-multisubject="true"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./multi-subject.css";
  link.dataset.ampMultisubject = "true";
  document.head.appendChild(link);
}

function groupCourses(classes = []) {
  const map = new Map();
  for (const klass of classes) {
    const key = String(klass?.courseKey || `${klass?.subjectCode}:${klass?.gradeNumber}`);
    if (!key || key === "undefined:undefined") continue;
    if (!map.has(key)) {
      map.set(key, {
        courseKey: key,
        subjectCode: String(klass?.subjectCode || ""),
        subjectNameHy: String(klass?.subjectNameHy || klass?.subjectCode || "Առարկա"),
        gradeNumber: Number(klass?.gradeNumber || 0),
        gradeLabelHy: String(klass?.gradeLabelHy || ""),
        classes: [],
      });
    }
    map.get(key).classes.push(klass);
  }
  return [...map.values()].sort((a, b) =>
    a.gradeNumber - b.gradeNumber || a.subjectNameHy.localeCompare(b.subjectNameHy, "hy")
  );
}

function courseLabel(course) {
  return `${course.subjectNameHy} ${course.gradeNumber}`.trim();
}

function courseIcon(course) {
  if (course.subjectCode === "physics") return "Φ";
  if (course.subjectCode === "mathematics") return "∑";
  return "•";
}

function courseHref(course) {
  if (course.subjectCode === "physics" && course.gradeNumber === 7) return "./physics-7.html";
  return `./course.html?course=${encodeURIComponent(course.courseKey)}`;
}

function ensureRoot() {
  if (!modePanel) return null;
  let root = document.getElementById("multiSubjectHome");
  if (!root) {
    root = document.createElement("div");
    root.id = "multiSubjectHome";
    root.className = "amp-multisubject-home";
    const loading = document.getElementById("dashboardLoading");
    if (loading) modePanel.insertBefore(root, loading);
    else modePanel.appendChild(root);
  }
  return root;
}

function assessmentText(physicsData, masteryData) {
  if (masteryData?.activeSession?.mode === "mastery_check") {
    return `Յուրացման ստուգում՝ ${masteryData.activeSession.answered_count ?? 0}/${masteryData.activeSession.planned_item_count ?? 20}`;
  }
  if (masteryData?.unitComplete) return "Գլուխ I-ի յուրացումը հաստատված է";
  if (masteryData?.eligible) return "Յուրացման ստուգումը հասանելի է";
  if (physicsData?.latestDiagnostic) return `Ախտորոշիչ՝ ${physicsData.latestDiagnostic.percent}%`;
  return "Ախտորոշիչը դեռ չի ավարտվել";
}

function nextAction(physicsData, masteryData, courses) {
  const active = physicsData?.activeSession || masteryData?.activeSession;
  if (active) {
    if (active.mode === "mastery_check") {
      return {
        subject: "Ֆիզիկա 7",
        title: "Շարունակել յուրացման ստուգումը",
        text: `${active.answered_count ?? active.answered ?? 0}/${active.planned_item_count ?? active.planned ?? 20} հարց պատասխանված է։`,
        href: "./mastery.html",
        cta: "Շարունակել",
      };
    }
    const diagnostic = active.mode === "diagnostic";
    return {
      subject: "Ֆիզիկա 7",
      title: diagnostic ? "Շարունակել ախտորոշիչը" : "Շարունակել վարժանքը",
      text: `${active.answered ?? active.answered_count ?? 0}/${active.planned ?? active.planned_item_count ?? "—"} հարց պատասխանված է։`,
      href: "./index.html?resume=1",
      cta: "Շարունակել",
    };
  }

  if (masteryData?.unitComplete) {
    return {
      subject: "Ֆիզիկա 7",
      title: "Գլուխ I-ի յուրացումը հաստատված է",
      text: "Դիտեք արդյունքը կամ շարունակեք առարկայի էջից։",
      href: "./assessment.html",
      cta: "Դիտել արդյունքը",
    };
  }

  if (masteryData?.eligible) {
    return {
      subject: "Ֆիզիկա 7",
      title: "Յուրացման ստուգումը պատրաստ է",
      text: "Գլուխ I-ի անկախ ստուգումը հասանելի է։",
      href: "./mastery.html",
      cta: "Սկսել ստուգումը",
    };
  }

  const rec = physicsData?.recommendation;
  if (rec) {
    if (rec.action === "take_diagnostic") {
      return { subject: "Ֆիզիկա 7", title: "Անցնել ախտորոշիչը", text: rec.reasonHy || "Սկսեք Գլուխ I-ի ախտորոշիչը։", href: "./index.html?resume=1", cta: "Սկսել" };
    }
    if (rec.action === "practice_skill") {
      const skill = rec.skill;
      return {
        subject: "Ֆիզիկա 7",
        title: skill ? `${skill.code} — ${skill.nameHy}` : "Շարունակել վարժանքը",
        text: rec.reasonHy || "Շարունակեք առաջարկվող վարժանքը։",
        href: "./index.html?resume=1",
        cta: "Սկսել վարժանքը",
      };
    }
    if (rec.action === "unit_complete") {
      return { subject: "Ֆիզիկա 7", title: "Ընթացիկ չափանիշները բավարարված են", text: rec.reasonHy || "Բացեք առարկան՝ հաջորդ քայլը տեսնելու համար։", href: "./physics-7.html", cta: "Բացել Ֆիզիկան" };
    }
  }

  const first = courses[0];
  if (!first) return null;
  return {
    subject: courseLabel(first),
    title: `Բացել ${courseLabel(first)} դասընթացը`,
    text: "Շարունակեք աշխատանքը ձեր առարկայի էջից։",
    href: courseHref(first),
    cta: "Բացել առարկան",
  };
}

function weakPhysicsSkills(physicsData) {
  return (physicsData?.skills ?? [])
    .filter((skill) => ["needs_support", "developing"].includes(skill?.diagnostic?.band))
    .sort((a, b) => (a?.diagnostic?.percent ?? 999) - (b?.diagnostic?.percent ?? 999))
    .slice(0, 3);
}

function subjectCard(course, physicsData, masteryData) {
  const isPhysics7 = course.courseKey === "physics:7";
  const progress = isPhysics7 ? physicsData?.progress : null;
  const classNames = course.classes.map((klass) => klass.name).filter(Boolean);
  const years = [...new Set(course.classes.map((klass) => klass.academicYear).filter(Boolean))];
  const progressValue = progress ? `${progress.percent ?? 0}%` : "—";
  const assessment = isPhysics7 ? assessmentText(physicsData, masteryData) : "Դեռ հասանելի չէ";
  const status = isPhysics7
    ? "Ուսումնական մոդուլը ակտիվ է"
    : "Դասընթացը միացված է · բովանդակությունը պատրաստման փուլում է";

  return `<article class="card amp-subject-card">
    <div class="amp-subject-card-head">
      <div>
        <span class="mode-kicker">${escapeHtml(course.gradeLabelHy || `${course.gradeNumber}-րդ դասարան`)}</span>
        <h3>${escapeHtml(courseLabel(course))}</h3>
      </div>
      <span class="amp-subject-icon" aria-hidden="true">${escapeHtml(courseIcon(course))}</span>
    </div>
    <p class="subtle">${escapeHtml(status)}</p>
    <div class="amp-subject-stats">
      <div class="amp-subject-stat"><span>Առաջընթաց</span><strong>${escapeHtml(progressValue)}</strong></div>
      <div class="amp-subject-stat"><span>Գնահատում</span><strong>${escapeHtml(assessment)}</strong></div>
    </div>
    <div class="amp-subject-class-list">
      ${classNames.map((name) => `<span>${escapeHtml(name)}</span>`).join("")}
      ${years.length ? `<span>${escapeHtml(years.join(" · "))}</span>` : ""}
    </div>
    <a class="button-link" href="${escapeHtml(courseHref(course))}">${isPhysics7 ? "Բացել դասընթացը" : "Բացել առարկան"}</a>
  </article>`;
}

function renderNoCourses(root) {
  root.innerHTML = `<section class="card amp-no-courses">
    <div>
      <span class="mode-kicker">ԻՄ ԱՌԱՐԿԱՆԵՐԸ</span>
      <h2>Դեռ դասընթացներ չունեք</h2>
      <p class="subtle">Դասընթացները բացվում են ձեր դասարանային անդամակցություններից։ Միացեք ուսուցչի դասարանին՝ համապատասխան առարկան ստանալու համար։</p>
    </div>
    <a class="button-link" href="./join.html">Միանալ դասարանին</a>
  </section>`;
}

async function fetchPhysicsData(hasPhysics7) {
  if (!hasPhysics7) return { dashboard: null, mastery: null };
  const [dashboardResult, masteryResult] = await Promise.all([
    supabase.functions.invoke("get-student-dashboard", { body: {} }),
    supabase.functions.invoke("get-mastery-check-status", { body: {} }),
  ]);
  return {
    dashboard: dashboardResult.error ? null : dashboardResult.data,
    mastery: masteryResult.error ? null : masteryResult.data,
  };
}

async function render(classes = []) {
  if (rendering || !modePanel) return;
  rendering = true;
  ensureStylesheet();
  const root = ensureRoot();
  const courses = groupCourses(classes);
  document.body.classList.add("amp-multisubject-ready");

  const subtitle = document.querySelector(".topbar p.subtle");
  if (subtitle) subtitle.textContent = courses.length
    ? "Ձեր առարկաները, հաջորդ քայլերը և կարևոր ուսումնական ազդակները մեկ վայրում։"
    : "Միացեք դասարանին՝ ձեր առարկաները բացելու համար։";

  if (!root) {
    rendering = false;
    return;
  }
  if (!courses.length) {
    renderNoCourses(root);
    rendering = false;
    return;
  }

  const hasPhysics7 = courses.some((course) => course.courseKey === "physics:7");
  const { dashboard: physicsData, mastery: masteryData } = await fetchPhysicsData(hasPhysics7);
  const next = nextAction(physicsData, masteryData, courses);
  const weak = weakPhysicsSkills(physicsData);

  root.innerHTML = `${next ? `<section class="card amp-global-next" aria-labelledby="globalNextTitle">
    <div>
      <span class="mode-kicker">ՀԱՋՈՐԴ ԱՌԱՋԱՐԿՎՈՂ ՔԱՅԼԸ</span>
      <h3 id="globalNextTitle">${escapeHtml(next.title)}</h3>
      <p class="subtle">${escapeHtml(next.text)}</p>
      <div class="amp-global-next-meta"><span class="amp-course-chip">${escapeHtml(next.subject)}</span></div>
    </div>
    <a class="button-link" href="${escapeHtml(next.href)}">${escapeHtml(next.cta)}</a>
  </section>` : ""}

  <section id="mySubjects" aria-labelledby="mySubjectsTitle">
    <div class="amp-subjects-heading">
      <div><span class="mode-kicker">ԻՄ ԱՌԱՐԿԱՆԵՐԸ</span><h2 id="mySubjectsTitle">Դասընթացներ</h2></div>
      <a class="ghost button-link" href="./join.html">Միանալ դասարանին</a>
    </div>
    <div class="amp-subject-grid">${courses.map((course) => subjectCard(course, physicsData, masteryData)).join("")}</div>
  </section>

  ${weak.length ? `<section aria-labelledby="attentionTitle">
    <div class="amp-attention-heading"><div><span class="mode-kicker">ՈՒՇԱԴՐՈՒԹՅՈՒՆ Է ՊԵՏՔ</span><h2 id="attentionTitle">Առաջնահերթ հմտություններ</h2></div></div>
    <div class="amp-attention-list">${weak.map((skill) => `<div class="amp-attention-item"><span class="amp-course-chip">Ֆիզիկա 7</span><div><strong>${escapeHtml(`${skill.code} — ${skill.nameHy}`)}</strong><span>${skill.diagnostic?.percent == null ? "Ավելի շատ տվյալ է պետք" : `Ախտորոշիչ՝ ${skill.diagnostic.percent}%`}</span></div></div>`).join("")}</div>
  </section>` : ""}`;

  rendering = false;
}

window.addEventListener("haiedu-course-access", (event) => {
  render(Array.isArray(event.detail?.classes) ? event.detail.classes : []);
});

window.addEventListener("haiedu-courses-rendered", () => {
  const classes = window.HaiEduCourseAccess?.classes;
  if (Array.isArray(classes)) render(classes);
});

const initial = window.HaiEduCourseAccess?.classes;
if (Array.isArray(initial)) render(initial);
