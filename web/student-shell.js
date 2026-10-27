/* Sprint 10.5B–11G — authenticated student navigation shell.
   Presentation/navigation only. It does not own authentication, mastery,
   recommendation, grading, session eligibility, or authorization truth. */

import { studentIcon } from './student-visuals.mjs';
import { signOutStudent } from './student-signout.mjs';
const page = document.body.dataset.studentPage || "";
const focusedByPage = document.body.dataset.focusedTask === "true";

const destinations = [
  { key: "home", href: "./index.html", label: "Գլխավոր", icon: "⌂", enabled: true }
];

function ensureBrandAssets() {
  if (!document.querySelector('link[rel~="icon"]')) {
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/svg+xml";
    icon.sizes = "any";
    icon.href = "/assets/haiedu-icon.svg?v=20260928";
    icon.dataset.haieduFavicon = "true";
    document.head.appendChild(icon);
  }
}

function ensurePublicBrand() {
  if (page !== "home") return;
  const topbarCopy = document.querySelector(".topbar > div:first-child");
  if (!topbarCopy || topbarCopy.querySelector(".haiedu-public-brand")) return;

  const brand = document.createElement("a");
  brand.className = "haiedu-public-brand";
  brand.href = "./index.html";
  brand.setAttribute("aria-label", "HaiEdu գլխավոր էջ");
  brand.innerHTML = '<img src="./assets/haiedu-primary.svg" alt="HaiEdu" />';
  topbarCopy.prepend(brand);
}

function ensureQaStylesheet() {
  if (document.querySelector('link[data-amp-responsive-qa="true"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "./responsive-qa.css";
  link.dataset.ampResponsiveQa = "true";
  document.head.appendChild(link);
}

function ensureStudentStylesheet() {
  if (document.querySelector('link[data-student-forest]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = './student-forest.css'; link.dataset.studentForest = 'true';
  document.head.appendChild(link);
}

function ensureAccountEntry() {
  const topbar = document.querySelector('main.shell .topbar');
  if (!topbar || topbar.querySelector('.student-account-link')) return;
  let actions = topbar.querySelector(':scope > .row');
  if (!actions) { actions = document.createElement('div'); actions.className = 'row'; topbar.append(actions); }
  const account = actions.querySelector('a[href="./privacy.html"]') || document.createElement('a');
  account.href = './privacy.html';
  account.className = 'student-account-link';
  account.setAttribute('aria-label', 'Իմ հաշիվը');
  account.innerHTML = studentIcon('account') + '<span>Իմ հաշիվը</span>';
  actions.append(account);
}

function navItem(item, mobile = false) {
  const current = item.key === page ? ' aria-current="page"' : "";
  const className = mobile ? "amp-mobile-link" : "amp-nav-link";
  const contents = `<span class="amp-nav-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span>`;

  if (!item.enabled) {
    return `<span class="${className} amp-nav-disabled" aria-disabled="true">${contents}</span>`;
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
      <a class="amp-brand-link" href="./index.html" aria-label="HaiEdu գլխավոր էջ">
        <img src="./assets/haiedu-primary.svg" alt="HaiEdu" />
      </a>
      <span>Հայկական հանրակրթական ծրագիր</span>
    </div>
    <div class="amp-nav-list">
      ${destinations.map((item) => navItem(item)).join("")}
    </div>
    <div class="amp-nav-utility">
      <a href="./join.html">Միանալ դասարանին՝ կոդով</a>
      <a href="./privacy.html">Իմ հաշիվը</a>
      <button type="button" data-student-signout>${studentIcon('logout')}<span>Դուրս գալ</span></button>
    </div>`;

  const mobile = document.createElement("nav");
  mobile.className = "amp-mobile-nav";
  mobile.setAttribute("aria-label", "Բջջային ուսումնական նավարկում");
  mobile.innerHTML = destinations.map((item) => navItem(item, true)).join("");

  document.body.prepend(side);
  document.body.append(mobile);
  side.querySelector('[data-student-signout]').addEventListener('click', async () => {
    const existing = document.getElementById('signOutBtn');
    if (existing) { existing.click(); return; }
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await import('./config.js');
    const client = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    await signOutStudent(client);
  });
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
  const skip = document.querySelector('.skip-link');
  const target = authenticated ? '#mainContent' : '#publicEntry';
  if (skip && skip.getAttribute('href') !== target) skip.setAttribute('href', target);
  document.getElementById('mainContent')?.setAttribute('tabindex', '-1');
  const heading = document.querySelector(".topbar h1");
  const subtitle = document.querySelector(".topbar p.subtle");
  const view = new URLSearchParams(location.search).get('view');
  const titles = { courses: 'Դասընթացներ', work: 'Իմ աշխատանքները' };
  if (heading) heading.textContent = authenticated ? (titles[view] || "Գլխավոր") : "Ուսուցման հարթակ";
  if (subtitle) {
    subtitle.textContent = !authenticated
      ? "Ստեղծեք աշակերտի հաշիվ կամ մուտք գործեք ձեր առկա հաշվով։"
      : "Ձեր ուսուցումը՝ քայլ առ քայլ։";
  }
}

function syncShellState() {
  const authenticated = inferAuthenticated();
  document.body.classList.toggle("amp-student-shell-active", authenticated);
  document.body.toggleAttribute('data-haiedu-student', authenticated);
  document.documentElement.toggleAttribute('data-haiedu-student-root', authenticated);
  document.body.classList.toggle("amp-focused-task", authenticated && inferFocusedTask());
  const publicEntry = document.getElementById("publicEntry");
  if (publicEntry) publicEntry.classList.toggle("hidden", authenticated);
  syncHomeHeader(authenticated);
}

ensureBrandAssets();
ensurePublicBrand();
ensureQaStylesheet();
ensureStudentStylesheet();
ensureNavigation();
ensureAccountEntry();
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

window.addEventListener("haiedu-course-access", syncShellState);
window.addEventListener("pageshow", syncShellState);
window.addEventListener("DOMContentLoaded", syncShellState);

import("./student-courses.js").then(() => import("./course-gate.js"));
