/* Sprint 10.5B–10.5E — authenticated student navigation shell.
   Presentation/navigation only. It does not own authentication, mastery,
   recommendation, grading, session eligibility, or authorization truth. */

const page = document.body.dataset.studentPage || "";
const focusedByPage = document.body.dataset.focusedTask === "true";

const destinations = [
  { key: "home", href: "./index.html", label: "Գլխավոր", icon: "⌂", enabled: true },
  { key: "physics", href: "./physics-7.html", label: "Ֆիզիկա 7", icon: "Φ", enabled: true },
  { key: "assessment", href: "./assessment.html", label: "Գնահատում", icon: "✓", enabled: true },
  { key: "progress", href: "./progress.html", label: "Առաջընթաց", icon: "↗", enabled: false }
];

function navItem(item, mobile = false) {
  const current = item.key === page ? ' aria-current="page"' : "";
  const className = mobile ? "amp-mobile-link" : "amp-nav-link";
  const contents = `<span class="amp-nav-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span>`;

  if (!item.enabled) {
    return `<span class="${className} amp-nav-disabled" aria-disabled="true" title="Կհասանելի լինի հաջորդ Sprint 10.5 փուլերում">${contents}</span>`;
  }

  return `<a class="${className}" href="${item.href}"${current}>${contents}</a>`;
}

function ensureNavigation() {
  if (document.querySelector(".amp-side-nav")) return;

  const side = document.createElement("nav");
  side.className = "amp-side-nav";
  side.setAttribute("aria-label", "Հիմնական ուսումնական նավարկում");
  side.innerHTML = `
    <div class="amp-nav-brand">
      <strong>Ուսուցման հարթակ</strong>
      <span>Հայկական հանրակրթական ծրագիր</span>
    </div>
    <div class="amp-nav-list">
      ${destinations.map((item) => navItem(item)).join("")}
    </div>
    <div class="amp-nav-utility">
      <a href="./privacy.html">Գաղտնիություն և հաշիվ</a>
    </div>`;

  const mobile = document.createElement("nav");
  mobile.className = "amp-mobile-nav";
  mobile.setAttribute("aria-label", "Բջջային ուսումնական նավարկում");
  mobile.innerHTML = destinations.map((item) => navItem(item, true)).join("");

  document.body.prepend(side);
  document.body.append(mobile);
}

function inferAuthenticated() {
  if (document.body.dataset.shellAuth === "always") return true;

  const authPanel = document.getElementById("authPanel");
  if (!authPanel) return true;

  return authPanel.classList.contains("hidden");
}

function inferFocusedTask() {
  if (focusedByPage) return true;

  const practice = document.getElementById("practicePanel");
  if (practice && !practice.classList.contains("hidden")) return true;

  const questionPanel = document.getElementById("questionPanel");
  if (questionPanel && !questionPanel.classList.contains("hidden")) return true;

  return false;
}

function syncShellState() {
  const authenticated = inferAuthenticated();
  document.body.classList.toggle("amp-student-shell-active", authenticated);
  document.body.classList.toggle("amp-focused-task", authenticated && inferFocusedTask());
}

ensureNavigation();
syncShellState();

const observed = [
  document.getElementById("authPanel"),
  document.getElementById("modePanel"),
  document.getElementById("practicePanel"),
  document.getElementById("questionPanel"),
  document.getElementById("resultPanel"),
  document.getElementById("subjectPanel"),
  document.getElementById("assessmentContent")
].filter(Boolean);

if (observed.length) {
  const observer = new MutationObserver(syncShellState);
  observed.forEach((node) => observer.observe(node, { attributes: true, attributeFilter: ["class"] }));
}

window.addEventListener("pageshow", syncShellState);
