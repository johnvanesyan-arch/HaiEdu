/* Navigation only: visibility follows each dashboard's existing role check.
   Never use a hidden link or this menu as an authorization decision. */
const page = document.body.dataset.roleWorkspace;
const configs = {
  teacher: {
    gate: "dashboardPanel", label: "Ուսուցիչ", links: [
      ["Գլխավոր", "./teacher.html?view=home", "home"],
      ["Իմ պրոֆիլը", "./teacher.html?view=profile"],
      ["Դասարաններ", "./teacher.html?view=classes"],
      ["Արխիվացված դասարաններ", "./teacher.html?view=archive"]
    ]
  },
  school: {
    gate: "overviewPanel", label: "Դպրոցի ադմին", links: [
      ["Գլխավոր", "./school-admin.html", "home"],
      ["Ուսումնական տարի", "#yearPanel"],
      ["Ուսուցիչներ", "#teachersPanel"],
      ["Ուսուցչի հրավեր", "#teacherPanel"],
      ["Սպասվող հրավերներ", "#pendingPanel"]
    ]
  },
  schoolTeacher: {
    gate: "teacherDetailPanel", label: "Դպրոցի ադմին", links: [
      ["Գլխավոր", "./school-admin.html"],
      ["Ուսումնական տարի", "./school-admin.html#yearPanel"],
      ["Ուսուցիչներ", "./school-admin.html#teachersPanel", "home"],
      ["Ուսուցչի հրավեր", "./school-admin.html#teacherPanel"],
      ["Սպասվող հրավերներ", "./school-admin.html#pendingPanel"]
    ]
  },
  platformSchools: {
    gate: "masterPanel", label: "Հարթակի ադմին", links: [
      ["Գլխավոր", "./admin.html"],
      ["Դպրոցի հրավեր", "./school-admin.html", "home"],
      ["Դպրոցների կառավարում", "./admin.html#schoolsSection"],
      ["Հաշիվներ և դերեր", "./admin.html#accountsSection"],
      ["Արխիվ", "./admin.html#archiveSection"],
      ["Ջնջման հարցումներ", "./admin.html#deletionsSection"],
      ["Աուդիտ", "./admin.html#auditSection"],
      ["Անվտանգություն", "./admin-security.html"]
    ]
  },
  platform: {
    gate: "console", label: "Հարթակի ադմին", links: [
      ["Գլխավոր", "./admin.html", "home"],
      ["Դպրոցի հրավեր", "./school-admin.html"],
      ["Դպրոցների կառավարում", "#schoolsSection"],
      ["Հաշիվներ և դերեր", "#accountsSection"],
      ["Արխիվ", "#archiveSection"],
      ["Ջնջման հարցումներ", "#deletionsSection"],
      ["Աուդիտ", "#auditSection"],
      ["Անվտանգություն", "./admin-security.html"]
    ]
  },
  platformSecurity: {
    gate: "securityConsole", label: "Հարթակի ադմին", links: [
      ["Գլխավոր", "./admin.html"],
      ["Դպրոցի հրավեր", "./school-admin.html"],
      ["Դպրոցների կառավարում", "./admin.html#schoolsSection"],
      ["Հաշիվներ և դերեր", "./admin.html#accountsSection"],
      ["Արխիվ", "./admin.html#archiveSection"],
      ["Ջնջման հարցումներ", "./admin.html#deletionsSection"],
      ["Աուդիտ", "./admin.html#auditSection"],
      ["Անվտանգություն", "./admin-security.html", "home"]
    ]
  },
  content: {
    gate: "console", label: "Բովանդակության թիմ", links: [
      ["Գլխավոր", "./content.html", "home"],
      ["Ստուգման հերթ", "./content-review.html"],
      ["Հարցերի բանկ", "./content-bank.html"],
      ["Ուսումնական ծրագիր", "./content-curriculum.html"],
      ["Փորձնական տվյալներ", "./content-evidence.html"],
      ["Օգնության ուղեցույցներ", "./content-guides.html"]
    ]
  },
  contentReview: {
    gate: "console", label: "Բովանդակության թիմ", links: [
      ["Գլխավոր", "./content.html"],
      ["Ստուգման հերթ", "./content-review.html", "home"],
      ["Հարցերի բանկ", "./content-bank.html"],
      ["Ուսումնական ծրագիր", "./content-curriculum.html"],
      ["Փորձնական տվյալներ", "./content-evidence.html"],
      ["Օգնության ուղեցույցներ", "./content-guides.html"]
    ]
  },
  contentBank: {
    gate: "console", label: "Բովանդակության թիմ", links: [
      ["Գլխավոր", "./content.html"],
      ["Ստուգման հերթ", "./content-review.html"],
      ["Հարցերի բանկ", "./content-bank.html", "home"],
      ["Ուսումնական ծրագիր", "./content-curriculum.html"],
      ["Փորձնական տվյալներ", "./content-evidence.html"],
      ["Օգնության ուղեցույցներ", "./content-guides.html"]
    ]
  },
  contentItem: {
    gate: "console", label: "Բովանդակության թիմ", links: [
      ["Գլխավոր", "./content.html"],
      ["Ստուգման հերթ", "./content-review.html"],
      ["Հարցերի բանկ", "./content-bank.html", "home"],
      ["Ուսումնական ծրագիր", "./content-curriculum.html"],
      ["Փորձնական տվյալներ", "./content-evidence.html"],
      ["Օգնության ուղեցույցներ", "./content-guides.html"]
    ]
  },
  contentCurriculum: {
    gate: "console", label: "Բովանդակության թիմ", links: [
      ["Գլխավոր", "./content.html"],
      ["Ստուգման հերթ", "./content-review.html"],
      ["Հարցերի բանկ", "./content-bank.html"],
      ["Ուսումնական ծրագիր", "./content-curriculum.html", "home"],
      ["Փորձնական տվյալներ", "./content-evidence.html"],
      ["Օգնության ուղեցույցներ", "./content-guides.html"]
    ]
  },
  contentEvidence: {
    gate: "console", label: "Բովանդակության թիմ", links: [
      ["Գլխավոր", "./content.html"],
      ["Ստուգման հերթ", "./content-review.html"],
      ["Հարցերի բանկ", "./content-bank.html"],
      ["Ուսումնական ծրագիր", "./content-curriculum.html"],
      ["Փորձնական տվյալներ", "./content-evidence.html", "home"],
      ["Օգնության ուղեցույցներ", "./content-guides.html"]
    ]
  },
  contentGuides: {
    gate: "guideConsole", label: "Բովանդակության թիմ", links: [
      ["Գլխավոր", "./content.html"],
      ["Ստուգման հերթ", "./content-review.html"],
      ["Հարցերի բանկ", "./content-bank.html"],
      ["Ուսումնական ծրագիր", "./content-curriculum.html"],
      ["Փորձնական տվյալներ", "./content-evidence.html"],
      ["Օգնության ուղեցույցներ", "./content-guides.html", "home"]
    ]
  }
};

function currentConfig() {
  if (page === "school") {
    const master = document.getElementById("masterPanel");
    if (master && !master.classList.contains("hidden")) return configs.platformSchools;
  }
  return configs[page];
}

function syncTeacherSections() {
  if (page !== "teacher") return;
  const sidebar = document.querySelector(".hm-role-sidebar");
  if (sidebar?.dataset.workspace !== configs.teacher.label) return;
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("view");
  const selected = requested === "class"
    ? (params.get("source") === "archive" ? "archive" : "classes")
    : (["home", "profile", "classes", "archive", "create"].includes(requested) ? requested : "home");
  for (const link of sidebar.querySelectorAll(".hm-role-nav a")) {
    const linkUrl = new URL(link.href, window.location.href);
    const linkView = linkUrl.searchParams.get("view") || "home";
    if (linkView === selected) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

function syncSchoolSections() {
  if (page !== "school") return;
  const sidebar = document.querySelector(".hm-role-sidebar");
  if (sidebar?.dataset.workspace !== configs.school.label) return;
  const views = ["overviewPanel", "yearPanel", "teachersPanel", "teacherPanel", "pendingPanel"];
  const requested = window.location.hash.slice(1);
  const selected = views.includes(requested) ? requested : "overviewPanel";
  for (const id of views) {
    const section = document.getElementById(id);
    if (section) section.hidden = selected !== id;
  }
  for (const link of sidebar.querySelectorAll(".hm-role-nav a")) {
    const current = selected === "overviewPanel"
      ? link.getAttribute("href") === "./school-admin.html"
      : link.getAttribute("href") === `#${selected}`;
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

function syncPlatformSections() {
  if (page !== "platform") return;
  const sidebar = document.querySelector(".hm-role-sidebar");
  if (sidebar?.dataset.workspace !== configs.platform.label) return;
  const views = ["overviewSection", "schoolsSection", "accountsSection", "archiveSection", "deletionsSection", "auditSection"];
  const requested = window.location.hash.slice(1);
  const selected = views.includes(requested) ? requested : "overviewSection";
  for (const id of views) {
    const section = document.getElementById(id);
    if (section) section.hidden = selected !== id;
  }
  for (const link of sidebar.querySelectorAll(".hm-role-nav a")) {
    const href = link.getAttribute("href");
    const current = selected === "overviewSection" ? href === "./admin.html" : href === `#${selected}`;
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

function syncRoleSidebar() {
  const config = currentConfig();
  const gate = config && document.getElementById(config.gate);
  const authorized = gate && !gate.classList.contains("hidden");
  let sidebar = document.querySelector(".hm-role-sidebar");
  if (!authorized) {
    sidebar?.remove();
    document.body.classList.remove("hm-has-role-sidebar");
    document.querySelector(".hm-role-chip")?.remove();
    return;
  }
  if (sidebar?.dataset.workspace === config.label) {
    syncTeacherSections();
    syncSchoolSections();
    syncPlatformSections();
    return;
  }
  sidebar?.remove();
  document.querySelector(".hm-role-chip")?.remove();
  sidebar = document.createElement("aside");
  sidebar.className = "hm-role-sidebar";
  sidebar.dataset.workspace = config.label;
  const brand = document.createElement("a");
  brand.className = "hm-role-brand";
  // Staff logos return to the same workspace without loading the student entry page.
  brand.href = config.links[0][1];
  brand.setAttribute("aria-label", `${config.label}՝ գլխավոր էջ`);
  const logo = document.createElement("img");
  logo.src = "./assets/haiedu-primary.svg";
  logo.alt = "HaiEdu";
  brand.append(logo);
  const caption = document.createElement("span");
  caption.className = "hm-workspace-label";
  caption.textContent = "ԱՇԽԱՏԱՍԵՂԱՆ";
  const nav = document.createElement("nav");
  nav.className = "hm-role-nav";
  nav.setAttribute("aria-label", "Աշխատասեղանի նավարկություն");
  config.links.forEach(([label, href, home]) => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    if (home) link.setAttribute("aria-current", "page");
    nav.append(link);
  });
  const footer = document.createElement("div");
  footer.className = "hm-role-foot";
  const pilot = document.createElement("span");
  pilot.textContent = "Փորձնական տարբերակ";
  const account = document.createElement("a");
  account.href = "./privacy.html";
  account.textContent = "Հաշիվ և գաղտնիություն";
  footer.append(pilot, account);
  const existingSignOut = document.getElementById("signOutBtn");
  if (existingSignOut) {
    if (page === "platform") {
      existingSignOut.classList.add("hm-sidebar-signout");
      footer.append(existingSignOut);
    } else {
      const signOut = document.createElement("button");
      signOut.type = "button";
      signOut.className = "ghost hm-sidebar-signout";
      signOut.textContent = "Դուրս գալ";
      signOut.addEventListener("click", () => existingSignOut.click());
      footer.append(signOut);
    }
  }
  sidebar.append(brand, caption, nav, footer);
  document.body.prepend(sidebar);
  document.body.classList.add("hm-has-role-sidebar");
  const chip = document.createElement("span");
  chip.className = "hm-role-chip";
  chip.textContent = config.label;
  const topbar = document.querySelector(".teacher-topbar, .school-admin-header, .admin-topbar, .content-topbar, .guide-topbar");
  topbar?.append(chip);
  syncTeacherSections();
  syncSchoolSections();
  syncPlatformSections();
}

const gates = ["dashboardPanel", "masterPanel", "overviewPanel", "teacherPanel", "teacherDetailPanel", "console", "guideConsole", "securityConsole"]
  .map(id => document.getElementById(id)).filter(Boolean);
const observer = new MutationObserver(syncRoleSidebar);
gates.forEach(gate => observer.observe(gate, { attributes: true, attributeFilter: ["class"] }));
syncRoleSidebar();
window.addEventListener("haiedu:teacher-view", syncTeacherSections);
window.addEventListener("popstate", syncTeacherSections);
window.addEventListener("hashchange", () => {
  syncSchoolSections();
  syncPlatformSections();
  if (page === "school" && document.querySelector(".hm-role-sidebar")?.dataset.workspace === configs.school.label) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  if (page === "platform") window.scrollTo({ top: 0, behavior: "auto" });
});
