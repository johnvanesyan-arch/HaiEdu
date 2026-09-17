/* Sprint 11G — derive learner navigation from actual class/course entitlements. */

const page = document.body.dataset.studentPage || "";

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

function currentCourseKey() {
  if (["physics", "assessment", "progress"].includes(page)) return "physics:7";
  if (page === "course") return new URLSearchParams(window.location.search).get("course") || "";
  return "";
}

function desktopHomeLink() {
  const current = page === "home" ? ' aria-current="page"' : "";
  return `<a class="amp-nav-link" href="./index.html"${current}><span class="amp-nav-icon" aria-hidden="true">⌂</span><span>Գլխավոր</span></a>`;
}

function renderDesktop(courses) {
  const list = document.querySelector(".amp-nav-list");
  if (!list) return;
  const activeKey = currentCourseKey();
  const items = [desktopHomeLink()];

  if (courses.length) items.push('<div class="amp-nav-section-label">Իմ առարկաները</div>');

  for (const course of courses) {
    const key = course.courseKey;
    const active = key === activeKey;
    items.push(`<a class="amp-nav-link amp-course-link" data-course-key="${escapeHtml(key)}" href="${escapeHtml(courseHref(course))}"${active ? ' aria-current="page"' : ""}><span class="amp-nav-icon" aria-hidden="true">${escapeHtml(courseIcon(course))}</span><span>${escapeHtml(courseLabel(course))}</span></a>`);

    if (active && key === "physics:7") {
      items.push(`<div class="amp-course-sublinks" aria-label="Ֆիզիկա 7 բաժիններ">
        <a class="amp-course-sublink" href="./physics-7.html"${page === "physics" ? ' aria-current="page"' : ""}>Դասընթաց</a>
        <a class="amp-course-sublink" href="./assessment.html"${page === "assessment" ? ' aria-current="page"' : ""}>Գնահատումներ</a>
        <a class="amp-course-sublink" href="./progress.html"${page === "progress" ? ' aria-current="page"' : ""}>Առաջընթաց</a>
      </div>`);
    }
  }

  list.innerHTML = items.join("");
}

function renderMobile(courses) {
  const nav = document.querySelector(".amp-mobile-nav");
  if (!nav) return;
  const activeKey = currentCourseKey();
  const activeCourse = courses.find((course) => course.courseKey === activeKey);
  const links = [
    `<a class="amp-mobile-link" href="./index.html"${page === "home" ? ' aria-current="page"' : ""}><span class="amp-nav-icon" aria-hidden="true">⌂</span><span>Գլխավոր</span></a>`,
    `<a class="amp-mobile-link" href="./index.html#mySubjects"><span class="amp-nav-icon" aria-hidden="true">▦</span><span>Առարկաներ</span></a>`,
  ];
  if (activeCourse && page !== "home") {
    links.push(`<a class="amp-mobile-link" href="${escapeHtml(courseHref(activeCourse))}" aria-current="page"><span class="amp-nav-icon" aria-hidden="true">${escapeHtml(courseIcon(activeCourse))}</span><span>${escapeHtml(courseLabel(activeCourse))}</span></a>`);
  }
  nav.innerHTML = links.join("");
}

function render(classes = []) {
  ensureStylesheet();
  const courses = groupCourses(classes);
  window.HaiEduCourses = courses;
  renderDesktop(courses);
  renderMobile(courses);
  window.dispatchEvent(new CustomEvent("haiedu-courses-rendered", { detail: { courses } }));
}

window.addEventListener("haiedu-course-access", (event) => {
  render(Array.isArray(event.detail?.classes) ? event.detail.classes : []);
});

window.addEventListener("pageshow", () => {
  const known = window.HaiEduCourseAccess?.classes;
  if (Array.isArray(known)) render(known);
});

ensureStylesheet();
if (page === "home") import("./multi-subject-home.js");
const initial = window.HaiEduCourseAccess?.classes;
if (Array.isArray(initial)) render(initial);
