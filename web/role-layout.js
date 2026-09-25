/* Navigation only: visibility follows each dashboard's existing role check.
   Never use a hidden link or this menu as an authorization decision. */
const page = document.body.dataset.roleWorkspace;
const configs = {
  teacher: {
    gate: "dashboardPanel", label: "Ուսուցիչ", links: [
      ["Գլխավոր", "./teacher.html", "home"],
      ["Իմ պրոֆիլը", "#profileCard"],
      ["Դասարաններ", "#classList"],
      ["Նոր դասարան", "#createClassCard"]
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
  platformSchools: {
    gate: "masterPanel", label: "Հարթակի ադմին", links: [
      ["Գլխավոր", "./admin.html"],
      ["Դպրոցներ", "./school-admin.html", "home"],
      ["Հաշիվներ և դերեր", "./admin.html#usersSection"],
      ["Աուդիտ", "./admin.html#auditSection"]
    ]
  },
  platform: {
    gate: "console", label: "Հարթակի ադմին", links: [
      ["Գլխավոր", "./admin.html", "home"],
      ["Դպրոցներ", "./school-admin.html"],
      ["Հաշիվներ և դերեր", "#usersSection"],
      ["Ջնջման հարցումներ", "#deletionsSection"],
      ["Աուդիտ", "#auditSection"]
    ]
  },
  content: {
    gate: "console", label: "Բովանդակության թիմ", links: [
      ["Գլխավոր", "./content.html", "home"],
      ["Հարցերի բանկ", "#bankTitle"],
      ["Որակի ստուգում", "#detailPanel"]
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
  if (sidebar?.dataset.workspace === config.label) { syncSchoolSections(); return; }
  sidebar?.remove();
  document.querySelector(".hm-role-chip")?.remove();
  sidebar = document.createElement("aside");
  sidebar.className = "hm-role-sidebar";
  sidebar.dataset.workspace = config.label;
  const brand = document.createElement("a");
  brand.className = "hm-role-brand";
  brand.href = "./index.html";
  brand.setAttribute("aria-label", "HaiEdu գլխավոր էջ");
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
    const signOut = document.createElement("button");
    signOut.type = "button";
    signOut.className = "ghost hm-sidebar-signout";
    signOut.textContent = "Դուրս գալ";
    signOut.addEventListener("click", () => existingSignOut.click());
    footer.append(signOut);
  }
  sidebar.append(brand, caption, nav, footer);
  document.body.prepend(sidebar);
  document.body.classList.add("hm-has-role-sidebar");
  const chip = document.createElement("span");
  chip.className = "hm-role-chip";
  chip.textContent = config.label;
  const topbar = document.querySelector(".teacher-topbar, .school-admin-header, .admin-topbar, .content-topbar");
  topbar?.append(chip);
  syncSchoolSections();
}

const gates = ["dashboardPanel", "masterPanel", "overviewPanel", "teacherPanel", "console"]
  .map(id => document.getElementById(id)).filter(Boolean);
const observer = new MutationObserver(syncRoleSidebar);
gates.forEach(gate => observer.observe(gate, { attributes: true, attributeFilter: ["class"] }));
syncRoleSidebar();
window.addEventListener("hashchange", () => {
  syncSchoolSections();
  if (page === "school" && document.querySelector(".hm-role-sidebar")?.dataset.workspace === configs.school.label) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
});
