/* Sprint 10.5B–10.5F — authenticated student navigation shell.
   Presentation/navigation only. It does not own authentication, mastery,
   recommendation, grading, session eligibility, or authorization truth. */

const page = document.body.dataset.studentPage || "";
const focusedByPage = document.body.dataset.focusedTask === "true";

const destinations = [
  { key: "home", href: "./index.html", label: "Գլխավոր", icon: "⌂", enabled: true },
  { key: "physics", href: "./physics-7.html", label: "Ֆիզիկա 7", icon: "Φ", enabled: true },
  { key: "assessment", href: "./assessment.html", label: "Գնահատում", icon: "✓", enabled: true },
  { key: "progress", href: "./progress.html", label: "Առաջընթաց", icon: "↗", enabled: true }
];

function ensureQaStylesheet() {
  if (document.querySelector('link[data-amp-responsive-qa="true"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./responsive-qa.css";
  link.dataset.ampResponsiveQa = "true";
  document.head.appendChild(link);
}

function ensureRoleAccess() {
  if (page !== "home") return;
  const authPanel = document.getElementById("authPanel");
  if (!authPanel) return;

  const loginTitle = document.getElementById("loginTitle");
  if (loginTitle) loginTitle.textContent = "Աշակերտի մուտք";
  const loginIntro = authPanel.querySelector("p.subtle");
  if (loginIntro) loginIntro.textContent = "Մուտք գործեք կամ ստեղծեք աշակերտի հաշիվ՝ սովորելու, վարժվելու և առաջընթացին հետևելու համար։";

  let layout = document.getElementById("preAuthLayout");
  if (!layout) {
    layout = document.createElement("div");
    layout.id = "preAuthLayout";
    layout.className = "pre-auth-layout";
    authPanel.parentNode.insertBefore(layout, authPanel);
    layout.appendChild(authPanel);
  }

  let section = document.getElementById("roleAccessPanel");
  if (!section) {
    section = document.createElement("section");
    section.id = "roleAccessPanel";
    section.className = "card role-access-panel";
    section.setAttribute("aria-labelledby", "roleAccessTitle");
    section.innerHTML = `
      <div class="role-access-heading">
        <span class="mode-kicker">ՄՈՒՏՔ ԸՍՏ ԴԵՐԻ</span>
        <h2 id="roleAccessTitle">Ինչպե՞ս եք օգտագործում հարթակը</h2>
        <p class="subtle">Ընտրեք ձեր աշխատասեղանը։ Յուրաքանչյուր բաժնի հասանելիությունը շարունակում է վերահսկվել ձեր հաշվին տրված դերով։</p>
      </div>
      <div class="role-access-grid">
        <a class="role-access-card student" href="#authPanel">
          <span class="role-access-icon" aria-hidden="true">◉</span>
          <span><strong>Աշակերտ</strong><small>Սովորել, վարժվել և հետևել առաջընթացին</small></span>
          <b aria-hidden="true">→</b>
        </a>
        <a class="role-access-card teacher" href="./teacher.html">
          <span class="role-access-icon" aria-hidden="true">▦</span>
          <span><strong>Ուսուցիչ</strong><small>Դասարաններ, աշակերտներ և առաջընթաց</small></span>
          <b aria-hidden="true">→</b>
        </a>
        <a class="role-access-card content" href="./content.html">
          <span class="role-access-icon" aria-hidden="true">✓</span>
          <span><strong>Բովանդակության ադմին</strong><small>Հարցերի բանկ, QA և review</small></span>
          <b aria-hidden="true">→</b>
        </a>
        <a class="role-access-card admin" href="./admin.html">
          <span class="role-access-icon" aria-hidden="true">⚙</span>
          <span><strong>Ադմին</strong><small>Հաշիվներ, դերեր և համակարգի կառավարում</small></span>
          <b aria-hidden="true">→</b>
        </a>
      </div>
      <p class="role-access-note">Դերի ընտրությունը մուտքի իրավասություն չի տալիս․ անհրաժեշտ է համապատասխան դեր ունեցող հաշիվ։</p>`;
  }
  if (!section.parentNode || section.parentNode !== layout) layout.appendChild(section);
}

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
      <a href="./join.html">Միանալ դասարանին</a>
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

function syncHomeHeader(authenticated) {
  if (page !== "home") return;
  const heading = document.querySelector(".topbar h1");
  const subtitle = document.querySelector(".topbar p.subtle");
  if (heading) heading.textContent = authenticated ? "Գլխավոր" : "Ուսուցման հարթակ";
  if (subtitle) {
    subtitle.textContent = authenticated
      ? "Ֆիզիկա 7 · Գլուխ I — Բնության ուսումնասիրության ֆիզիկական մեթոդները"
      : "Ընտրեք ձեր դերը կամ մուտք գործեք որպես աշակերտ։";
  }
}

function syncShellState() {
  const authenticated = inferAuthenticated();
  document.body.classList.toggle("amp-student-shell-active", authenticated);
  document.body.classList.toggle("amp-focused-task", authenticated && inferFocusedTask());
  const roleAccess = document.getElementById("roleAccessPanel");
  if (roleAccess) roleAccess.classList.toggle("hidden", authenticated);
  const preAuthLayout = document.getElementById("preAuthLayout");
  if (preAuthLayout) preAuthLayout.classList.toggle("hidden", authenticated);
  syncHomeHeader(authenticated);
}

ensureQaStylesheet();
ensureRoleAccess();
ensureNavigation();
syncShellState();

const observed = [
  document.getElementById("authPanel"),
  document.getElementById("modePanel"),
  document.getElementById("practicePanel"),
  document.getElementById("questionPanel"),
  document.getElementById("resultPanel"),
  document.getElementById("subjectPanel"),
  document.getElementById("assessmentContent"),
  document.getElementById("progressContent")
].filter(Boolean);

if (observed.length) {
  const observer = new MutationObserver(syncShellState);
  observed.forEach((node) => observer.observe(node, { attributes: true, attributeFilter: ["class"] }));
}

window.addEventListener("pageshow", syncShellState);
