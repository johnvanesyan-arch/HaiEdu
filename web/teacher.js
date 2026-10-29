import {mountTeacherReview,mountTeacherToday,todayRequest,rememberTeacherClass,clearTeacherRecent,subjectArtwork,renderArchive,mountWrittenWork,assessmentResultMarkup,contractMarkup,SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,roleDestination,createClient} from "./teacher-dependencies.bundle.mjs";

// A delayed async head entry must not start a second read after SDK startup.
window.__haieduTeacherHomeStartup ||= Object.freeze({claim:()=>null,cancel:()=>{}});
const supabase = window.__haieduSupabaseClient ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);

let dashboard = null;
let disposeToday=()=>{};
let disposeReview=()=>{};
let todayBoot=null;
let lastTeacherUrl=(window.location?.pathname??"")+(window.location?.search??"");
function hasUnsavedWork(){return Boolean(disposeWriting.hasUnsaved?.()||disposeToday.hasUnsaved?.()||disposeReview.hasUnsaved?.());}
function allowTeacherLeave(){if(!hasUnsavedWork()||window.confirm("Չպահպանված գնահատականը չեղարկե՞լ։"))return true;history.replaceState({},"",lastTeacherUrl);return false;}
let actorId = null;
let teacherAuthGeneration = 0;
let directoryPages = {};
let directoryRequestVersion = 0;
let invitationRequestVersion = 0;
let archiveSearchTimer;
let retryClass=()=>{};
const pendingReads = new Map();
function readOnce(fn,body) {
  const key=JSON.stringify([actorId,dashboardLoadVersion,fn,body]);
  if (!pendingReads.has(key)) pendingReads.set(key, supabase.functions.invoke(fn,{body})
    .catch(()=>({error:new Error("dashboard_read_failed")})).finally(()=>pendingReads.delete(key)));
  return pendingReads.get(key);
}
const dashboardRead=body=>readOnce("get-teacher-dashboard",body);
function clearDetail() {
  disposeReview();disposeReview=()=>{};
  disposeToday();disposeToday=()=>{};todayBoot=null;
  clearTimeout(archiveSearchTimer);directoryRequestVersion++;
  institutionalUnitLoadVersion++; invitationRequestVersion++;
  disposeWriting(); disposeWriting=()=>{}; closeDrawer();
  for(const id of ["rosterAnalyticsCard","matrixAnalyticsCard","teacherWrittenWorkCard","teacherWorkflowEntries"]) $(id)?.classList.add("hidden");
  for(const id of ["teacherResourcesLink","teacherAssignResourceLink"]) $(id)?.removeAttribute("href");
}
function directoryKey(archive) { return archive ? "archive" : "active"; }
async function loadDirectory(archive=false,{more=false,search=""}={}) {
  if (!dashboard?.directoryMode) return;
  const key=directoryKey(archive),previous=directoryPages[key];
  const request=++directoryRequestVersion, version=dashboardLoadVersion;
  const offset=more ? previous?.nextOffset??0 : 0;
  const message=$(archive?"archiveLoadMessage":"classesLoadMessage");
  message.textContent="Դասարանները բեռնվում են…";
  const {data,error}=await dashboardRead({readMode:"directory",archive,offset,search});
  if(request!==directoryRequestVersion || version!==dashboardLoadVersion || !dashboard)return;
  if(error||!data?.directory) {message.textContent="Դասարանները չբեռնվեցին։ Փորձեք կրկին։";return;}
  const prior=more ? previous?.items??[] : [];
  directoryPages[key]={...data.directory,items:[...prior,...data.classes],nextOffset:offset+data.classes.length};
  dashboard.classes=[...dashboard.classes.filter(c=>c.isActive===archive),...directoryPages[key].items];
  dashboard.institutionalOptions=data.institutionalOptions;
  dashboard.directory=data.directory;
  message.textContent="";
  renderClassList();
}

let disposeWriting = () => {};
let selectedClassId = null;
let selectedAssignmentId=null;
let rosterQuery = "";
let matrixStudentFilter = "all";
let dashboardLoadVersion = 0;
let institutionalUnitLoadVersion = 0;
let dashboardBootstrapPromise = null;
let latestInstitutionalJoinCode = "";
const MAX_STUDENT_INVITE_BATCH = 20;
const institutionalStudentEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEACHER_VIEWS = new Set(["home", "profile", "classes", "archive", "create", "class", "review"]);
const TEACHER_VIEW_META = {
  home: ["Ուսուցչի գլխավոր", "Այսօրվա ամփոփ պատկերը, արագ գործողությունները և աշխատանքի հաջորդ քայլերը։"],
  review: ["Գրավորի ստուգում", "Ներկայացված աշխատանքներ, գնահատում և մեկնաբանություններ՝ ըստ դասարանի ու բաժնի։"],
  profile: ["Իմ պրոֆիլը", "Ցուցադրվող անունը և մուտքի պաշտպանված կարգավորումները։"],
  classes: ["Իմ դասարանները", "Միայն ակտիվ դասարանները՝ աշակերտներով, հրավերներով և առաջընթացով։"],
  archive: ["Արխիվացված դասարաններ", "Ավարտված դասարանների պատմությունը՝ ընթացիկ աշխատանքից առանձին։"],
  create: ["Նոր դասարան", "Ստեղծեք դասարան ձեր թույլատրված դպրոցի, տարվա և առարկայի շրջանակում։"],
  class: ["Դասարանի աշխատատարածք", "Աշակերտներ, հրավերներ և իրական առաջընթացի տվյալներ մեկ տեղում։"],
};

function navigationSelection() {
  if (typeof window.location?.search !== "string") {
    return { view: "home", source: "classes", classId: null, selection: null };
  }
  const params = new URLSearchParams(window.location.search);
  const assignmentId = params.get("assignment");
  const curriculumReleaseId = params.get("release");
  const unitId = params.get("unit");
  const requested = params.get("view");
  const classId = params.get("class");
  return {
    view: requested === "review" ? "review" : requested === "class" || classId
      ? "class"
      : (TEACHER_VIEWS.has(requested) ? requested : "home"),
    source: params.get("source") === "archive" ? "archive" : "classes",
    classId,
    selection: assignmentId && curriculumReleaseId && unitId
      ? { assignmentId, curriculumReleaseId, unitId }
      : null,
  };
}

function teacherViewUrl(view,clearToday=false) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", TEACHER_VIEWS.has(view) ? view : "home");
  if (view !== "class" && !(view === "review" && ["class","review"].includes(navigationSelection().view))) {
    ["class", "assignment", "release", "unit", "source", "state"].forEach((key) => url.searchParams.delete(key));
  }
  if(clearToday||view!=="home")["todayWork","queueAssignment"].forEach(k=>url.searchParams.delete(k));
  url.hash = "";
  return `${url.pathname}${url.search}`;
}

function renderTeacherView(view = navigationSelection().view) {
  const selected = TEACHER_VIEWS.has(view) ? view : "home";
  document.querySelectorAll("[data-teacher-view]").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.teacherView !== selected);
  });
  const [title, subtitle] = TEACHER_VIEW_META[selected];
  if ($("teacherPageTitle")) $("teacherPageTitle").textContent = title;
  if ($("teacherPageSubtitle")) $("teacherPageSubtitle").textContent = subtitle;
  document.title = `${title} · HaiEdu`;
  window.dispatchEvent(new CustomEvent("haiedu:teacher-view", { detail: { view: selected } }));
  window.scrollTo({ top: 0, behavior: "auto" });
  lastTeacherUrl=window.location.pathname+window.location.search;
  if(selected==="review"&&dashboard){disposeReview();const version=dashboardLoadVersion;const key=directoryKey(navigationSelection().source==="archive");const page=directoryPages[key];disposeReview=mountTeacherReview({root:$("teacherReviewRoot"),supabase,actorId,initialDirectory:page?{classes:page.items,directory:page}:null,isCurrent:()=>Boolean(dashboard)&&version===dashboardLoadVersion,onRoute:()=>{lastTeacherUrl=window.location.pathname+window.location.search;}});}
  if(selected==="home"&&dashboard&&$("teacherToday")){disposeToday();const version=dashboardLoadVersion;disposeToday=mountTeacherToday({root:$("teacherToday"),supabase,actorId,isCurrent:()=>Boolean(dashboard)&&version===dashboardLoadVersion,initialResponse:todayBoot,onRoute:()=>{lastTeacherUrl=window.location.pathname+window.location.search;}});todayBoot=null;}
}

function navigateTeacherView(view, push = true) {
  if (!allowTeacherLeave()) return;
  clearDetail();
  const next = teacherViewUrl(view,push);
  const current = `${window.location.pathname}${window.location.search}`;
  if (next !== current) window.history[push ? "pushState" : "replaceState"]({}, "", next);
  renderTeacherView(view);
  if(dashboard?.directoryMode && ["classes","archive"].includes(view) && !directoryPages[directoryKey(view==="archive")]) void loadDirectory(view==="archive");
}

function syncNavigation(klass, push = false) {
  if (!klass) return;
  rememberTeacherClass(actorId,klass.id);
  const url = new URL(window.location.href);
  url.searchParams.set("view", "class");
  url.searchParams.set("class", klass.id);
  url.searchParams.set("source", klass.isActive ? "classes" : "archive");
  url.hash = "";
  if (dashboard?.institutionalTeacher && klass.selectedUnit) {
    url.searchParams.set("assignment", klass.assignmentId);
    url.searchParams.set("release", klass.selectedUnit.curriculumReleaseId);
    url.searchParams.set("unit", klass.selectedUnit.unitId);
  } else {
    url.searchParams.delete("assignment");
    url.searchParams.delete("release");
    url.searchParams.delete("unit");
  }
  ["todayWork","queueAssignment"].forEach(k=>url.searchParams.delete(k));
  const next = `${url.pathname}${url.search}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (next !== current) window.history[push ? "pushState" : "replaceState"]({}, "", next);
  lastTeacherUrl=window.location.pathname+window.location.search;
  if ($("classDetailBackLink")) {
    $("classDetailBackLink").href = klass.isActive ? "?view=classes" : "?view=archive";
    $("classDetailBackLink").textContent = klass.isActive
      ? "Վերադառնալ ակտիվ դասարաններին"
      : "Վերադառնալ արխիվին";
  }
}

function showTeacherClassAfterMutation(classId) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "class");
  url.searchParams.set("class", classId);
  url.searchParams.set("source", "classes");
  ["assignment", "release", "unit"].forEach((key) => url.searchParams.delete(key));
  url.hash = "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(id, text, bad = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? "#8a3342" : "#356246";
}

function friendlyError(error, fallback) {
  const message = String(error?.message ?? "");
  if (message.includes("teacher_role_required")) return "Այս հաշիվը ուսուցչի դեր չունի։";
  if (message.includes("display_name_too_short")) return "Անունը պետք է պարունակի առնվազն 2 նիշ։";
  if (message.includes("display_name_too_long")) return "Անունը չափազանց երկար է։";
  if (message.includes("class_name_required")) return "Մուտքագրեք դասարանի անունը։";
  if (message.includes("class_name_too_short")) return "Դասարանի անունը պետք է պարունակի առնվազն 2 նիշ։";
  if (message.includes("class_name_too_long")) return "Դասարանի անունը կարող է պարունակել առավելագույնը 120 նիշ։";
  if (message.includes("school_year_unavailable")) return "Դպրոցի ընթացիկ ուսումնական տարին հասանելի չէ։";
  if (message.includes("subject_program_unavailable")) return "Ընտրված առարկայի ծրագիրը հասանելի չէ։";
  if (message.includes("teacher_subject_unavailable")) return "Այս առարկայի ձեր թույլտվությունը հասանելի չէ։";
  if (message.includes("teacher_class_unavailable")) return "Այս դասարանի կառավարումը հասանելի չէ այս հաշվին։";
  return fallback || message || "Գործողությունը չհաջողվեց։";
}

function institutionalOptionKey(option) {
  return [
    option?.teacherMembershipId,
    option?.academicYearId,
    option?.subjectProgramId,
  ].filter(Boolean).join(":");
}

function renderInstitutionalClassCreator(data, institutional) {
  $("teacherLegacyOnboarding").classList.toggle("hidden", institutional);
  $("createClassCard").classList.toggle("hidden", institutional);
  $("institutionalTeacherNotice").classList.toggle("hidden", !institutional);
  $("institutionalCreateCard").classList.toggle("hidden", !institutional);

  const shortcut = $("createClassShortcut");
  shortcut.classList.remove("hidden");
  shortcut.href = "?view=create";

  if (institutional) $("teacherWelcomeText").textContent = data.directory?.activeCount===0
    ? "Ստեղծեք դասարան ձեր հասանելի դպրոցի, ուսումնական տարվա և առարկայի շրջանակում։"
    : "Բացեք ձեր դասարանները, շարունակեք գրավորների ստուգումը կամ հանձնարարեք նյութեր։";
  if (!institutional) return;
  const options = Array.isArray(data.institutionalOptions) ? data.institutionalOptions : [];
  const select = $("institutionalClassOption");
  select.replaceChildren();
  for (const option of options) {
    const item = document.createElement("option");
    item.value = institutionalOptionKey(option);
    item.textContent = [
      option.schoolName,
      option.academicYearLabel,
      option.gradeNumber ? `${option.gradeNumber}-րդ դասարան` : "",
      option.subjectName,
    ].filter(Boolean).join(" · ");
    select.appendChild(item);
  }
  if (!options.length) {
    const item = document.createElement("option");
    item.value = "";
    item.textContent = "Հասանելի ուսումնական համատեքստ չկա";
    item.disabled = true;
    item.selected = true;
    select.appendChild(item);
  }
  select.disabled = !options.length;
  $("institutionalCreateBtn").disabled = !options.length;
  setMessage("institutionalCreateMessage", options.length
    ? ""
    : "Դասարան ստեղծելու համար դպրոցը պետք է ունենա ընթացիկ ուսումնական տարի, իսկ ձեր առարկան՝ հրապարակված ծրագիր։",
    !options.length);
}

async function signOut() {
  if (!allowTeacherLeave()) return;
  await supabase.auth.signOut();
  window.location.reload();
}

function showDashboardReadFailure(message) {
  clearDetail(); dashboard=null;
  $("teacherLoading")?.classList.add("hidden");
  $("dashboardPanel").classList.add("hidden");
  $("authPanel").classList.remove("hidden");
  $("signOutBtn").classList.add("hidden");
  setMessage("authMessage", message, true);
  $("teacherDashboardRetry").classList.remove("hidden");
}
async function loadDashboard(sessionOverride = null) {
  if (!sessionOverride && !allowTeacherLeave()) return;
  const request=dashboardLoadVersion+1;
  try { await readTeacherDashboard(sessionOverride); }
  catch {
    // An old failure cannot replace the next account/context's workspace.
    if(request!==dashboardLoadVersion)return;
    window.__haieduTeacherHomeStartup?.cancel();
    showDashboardReadFailure("Չհաջողվեց բեռնել աշխատասեղանը։ Փորձեք կրկին։");
  }
}
async function readTeacherDashboard(sessionOverride = null) {
  const version = ++dashboardLoadVersion;
  clearDetail();
  directoryRequestVersion++;
  directoryPages={};
  $("dashboardPanel").classList.add("hidden");
  $("teacherLoading")?.classList.remove("hidden");
  $("teacherDashboardRetry")?.classList.add("hidden");
  setMessage("authMessage", "");
  let sessionData;
  let startup=null;
  try {
    let sessionError = null;
    if (sessionOverride?.user) sessionData = { session: sessionOverride };
    else ({ data: sessionData, error: sessionError } = await supabase.auth.getSession());
    if (version !== dashboardLoadVersion) return;
    if (sessionError || !sessionData?.session?.user) {
      $("teacherLoading")?.classList.add("hidden");
      $("authPanel").classList.remove("hidden");
      return;
    }
    startup=window.__haieduTeacherHomeStartup?.claim(sessionData.session)??null;
    const { data: profile, error: profileError } = (await startup?.profile)??await supabase
      .from("profiles").select("role, account_status")
      .eq("id", sessionData.session.user.id).maybeSingle();
    if (version !== dashboardLoadVersion) return;
    if (profileError || !profile) throw new Error("profile_lookup_failed");
    if (profile.account_status !== "active") {
      window.location.replace("./privacy.html");
      return;
    }
    if (profile.role !== "teacher") {
      $("teacherLoading")?.classList.add("hidden");
      const destination = roleDestination(profile.role);
      if (destination) window.location.replace(destination);
      else {
        $("authPanel").classList.remove("hidden");
        setMessage("authMessage", "Այս հաշիվը ուսուցչի դեր չունի։", true);
      }
      return;
    }
  } catch {
    if (version !== dashboardLoadVersion) return;
    $("teacherLoading")?.classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    setMessage("authMessage", "Չհաջողվեց ստուգել հաշվի դերը։ Փորձեք կրկին։", true);
    $("teacherDashboardRetry")?.classList.remove("hidden");
    return;
  }
  actorId=sessionData.session.user.id;
  setMessage("classMessage", "");
  const navigation = navigationSelection();
  if (navigation.classId) selectedClassId = navigation.classId;
  selectedAssignmentId=navigation.selection?.assignmentId??null;
  const body=navigation.view==="class" && (navigation.classId||navigation.selection)
    ? {readMode:"class",...(navigation.classId?{classId:navigation.classId}:{}),...(navigation.selection?{selection:navigation.selection}:{})}
    : {readMode:"directory",archive:navigation.view==="archive" || (navigation.view==="review"&&navigation.source==="archive")};
  const home=navigation.view==="home"&&Boolean($("teacherToday"));
  if(home)body.workspace=todayRequest(actorId);
  const {data:loaded,error}=(await startup?.dashboard(body))??await dashboardRead(body);
  if (version !== dashboardLoadVersion) return;
  if (error) {
    $("teacherLoading")?.classList.add("hidden");
    $("dashboardPanel").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    $("teacherDashboardRetry")?.classList.remove("hidden");
    return setMessage("authMessage", friendlyError(error, "Չհաջողվեց բեռնել ուսուցչի աշխատասեղանը։"), true);
  }

  const {workspace,workspaceError,...data}=loaded;
  if(home)todayBoot=workspace!==undefined||workspaceError
   ? Promise.resolve({data:workspaceError?{error:workspaceError}:workspace})
   : readOnce("get-teacher-workspace",todayRequest(actorId));
  dashboard = data;
  dashboard.directoryMode=data.progressive===true||data.institutionalTeacher===true||Boolean(data.directory);
  $("teacherLoading")?.classList.add("hidden");
  if(data.directory)directoryPages[directoryKey(data.directory.archive)]={...data.directory,items:data.classes,nextOffset:data.classes.length};
  $("authPanel").classList.add("hidden");
  $("dashboardPanel").classList.remove("hidden");
  $("signOutBtn").classList.remove("hidden");
  const institutional = data.institutionalTeacher === true;
  renderInstitutionalClassCreator(data, institutional);

  const displayName = data.teacher?.displayName || "Ուսուցիչ";
  $("teacherName").textContent = displayName;
  $("teacherDisplayNameInput").value = displayName === "Ուսուցիչ" ? "" : displayName;
  $("teacherEmail").value = sessionData.session?.user?.email ?? "";

  const classes = Array.isArray(data.classes) ? data.classes : [];
  $("classCount").textContent = data.directory?.activeCount ?? (institutional ? "—" : classes.filter(klass=>klass.isActive).length);
  $("studentCount").textContent = dashboard.directoryMode ? "—" : data.totals?.students ?? 0;
  $("supportCount").textContent = dashboard.directoryMode ? "—" : data.totals?.studentsNeedingSupport ?? 0;
  $("studentCountScope").textContent=dashboard.directoryMode?"Տվյալները՝ դասարանի էջում":"բոլոր դասարաններում";
  $("supportCountScope").textContent=dashboard.directoryMode?"Տվյալները՝ դասարանի էջում":"աջակցության կարիք ունեցող աշակերտ";

  $("summaryCards").classList.toggle("hidden",dashboard.directoryMode);
  renderClassList();
  const selected = classes.find((klass) => klass.id === selectedClassId)
    ?? classes.find((klass) => klass.isActive)
    ?? classes[0]
    ?? null;
  if (selected) {
    if(navigation.view==="class") selectClass(selected.id, {navigate:true,detailReady:true});
    else selectedClassId=selected.id;
  } else {
    selectedClassId = null;
    $("emptyClass").classList.toggle("hidden", institutional);
    $("institutionalEmpty").classList.toggle("hidden", !institutional);
    $("institutionalClassView").classList.add("hidden");
    $("classView").classList.add("hidden");
  }
  renderTeacherView(navigation.view === "class" && !selected
    ? (navigation.source === "archive" ? "archive" : "classes")
    : navigation.view);
}

function createClassListButton(klass) {
  const btn = document.createElement("button");
  btn.className = `teacher-class-button${klass.id === selectedClassId ? " active" : ""}${klass.isActive ? "" : " archived"}`;
  btn.type = "button";
  btn.innerHTML = `
    ${subjectArtwork(klass.subjectCode)}
    <strong>${escapeHtml(klass.name)}</strong>
    <span>${escapeHtml([klass.subjectName, klass.schoolName, klass.academicYear].filter(Boolean).join(" · "))}</span>
    <span class="class-list-meta"><span>${klass.studentCount==null?"Բացել դասարանը":klass.studentCount+" աշակերտ"}</span><span class="class-list-status">${klass.isActive ? "Ակտիվ" : "Արխիվացված"}</span></span>`;
  btn.addEventListener("click", () => selectClass(klass.id, { pushNavigation: true, navigate: true, assignmentId:klass.assignmentId }));
  return btn;
}

function renderClassList() {
  const activeList = $("classList");
  const archivedList = $("archivedClassList");
  activeList.innerHTML = "";
  archivedList.innerHTML = "";
  const classes = Array.isArray(dashboard?.classes) ? dashboard.classes : [];
  const activeClasses = classes.filter((klass) => klass.isActive);
  const archivedClasses = classes.filter((klass) => !klass.isActive);

  activeClasses.forEach((klass) => activeList.appendChild(createClassListButton(klass)));
  if (archivedClasses.length) renderArchive(archivedList, {
    items: archivedClasses,
    groupLabel: klass => klass.academicYear || "Տարին նշված չէ",
    searchText: klass => [klass.name, klass.academicYear, klass.subjectName, klass.schoolName].filter(Boolean).join(" "),
    renderItem: createClassListButton,
  });
  if(dashboard.directoryMode)archivedList.querySelector(".archive-search")?.remove();
  $("activeClassCount").textContent = dashboard.directory?.activeCount ?? activeClasses.length;
  $("archivedClassCount").textContent = dashboard.directory?.archiveCount ?? archivedClasses.length;
  for(const [key,id] of [["active","classesLoadMore"],["archive","archiveLoadMore"]]) $(id).classList.toggle("hidden",!directoryPages[key]?.hasMore);
  $("serverArchiveSearch").classList.toggle("hidden",!dashboard.directoryMode);

  if (!activeClasses.length) {
    activeList.innerHTML = dashboard?.institutionalTeacher
      ? '<div class="teacher-empty-state"><strong>Ակտիվ դասարան դեռ չկա</strong><p class="subtle small">Ստեղծեք դասարան ձեր հասանելի դպրոցի, ուսումնական տարվա և առարկայի շրջանակում։</p><a class="button-link" href="?view=create">+ Ստեղծել դասարան</a></div>'
      : '<div class="teacher-empty-state"><strong>Ակտիվ դասարան դեռ չկա</strong><p class="subtle small">Ստեղծեք ձեր առաջին դասարանը, հետո աշակերտներին տվեք միանալու կոդը։</p><a class="button-link" href="?view=create">+ Ստեղծել դասարան</a></div>';
  }
  if (!archivedClasses.length) {
    archivedList.innerHTML = '<div class="teacher-empty-state"><strong>Արխիվացված դասարաններ չկան</strong><p class="subtle small">Արխիվացված դասարանները կհայտնվեն միայն այս էջում և չեն ծանրաբեռնի ակտիվ դասարանների ցանկը։</p></div>';
  }
}

function selectedClass() {
  return dashboard?.classes?.find((c) => c.id === selectedClassId && (!selectedAssignmentId || c.assignmentId===selectedAssignmentId)) ?? null;
}

function setClassRenameEditor(kind, open) {
  const institutional = kind === "institutional";
  const form = $(institutional ? "institutionalRenameClassForm" : "renameClassForm");
  const button = $(institutional ? "institutionalRenameClassBtn" : "renameClassBtn");
  const input = $(institutional ? "institutionalRenameClassNameInput" : "renameClassNameInput");
  const messageId = institutional ? "institutionalRenameClassMessage" : "renameClassMessage";
  form.classList.toggle("hidden", !open);
  button.setAttribute("aria-expanded", String(open));
  if (!open) return;
  input.value = selectedClass()?.name ?? "";
  setMessage(messageId, "");
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function closeClassRenameEditors() {
  setClassRenameEditor("legacy", false);
  setClassRenameEditor("institutional", false);
}

async function renameSelectedClass(event, institutional) {
  event.preventDefault();
  const klass = selectedClass();
  if (!klass || Boolean(dashboard?.institutionalTeacher) !== institutional) return;
  const inputId = institutional ? "institutionalRenameClassNameInput" : "renameClassNameInput";
  const saveId = institutional ? "institutionalRenameClassSaveBtn" : "renameClassSaveBtn";
  const messageId = institutional ? "institutionalRenameClassMessage" : "renameClassMessage";
  const name = $(inputId).value.trim();
  if (name.length < 2) return setMessage(messageId, "Դասարանի անունը պետք է պարունակի առնվազն 2 նիշ։", true);
  if (name.length > 120) return setMessage(messageId, "Դասարանի անունը կարող է պարունակել առավելագույնը 120 նիշ։", true);
  if (name === klass.name) {
    setClassRenameEditor(institutional ? "institutional" : "legacy", false);
    return setMessage(messageId, "Անունը չի փոխվել։");
  }

  const button = $(saveId);
  button.disabled = true;
  setMessage(messageId, "Անունը պահպանվում է…");
  const functionName = institutional ? "manage-institutional-teacher-class" : "manage-teacher-class";
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { action: "rename", classId: klass.id, name },
  });
  button.disabled = false;
  if (error) {
    return setMessage(messageId, friendlyError(error, "Դասարանի անունը չհաջողվեց փոխել։"), true);
  }
  const savedName = data?.class?.name ?? data?.name;
  if (typeof savedName !== "string" || !savedName.trim()) {
    return setMessage(messageId, "Դասարանի անունը չհաջողվեց փոխել։", true);
  }

  klass.name = savedName;
  if (institutional) $("institutionalSelectedName").textContent = savedName;
  else $("selectedClassName").textContent = savedName;
  renderClassList();
  setClassRenameEditor(institutional ? "institutional" : "legacy", false);
  setMessage(messageId, "Դասարանի անունը փոխված է։");
}

async function selectClass(id, { pushNavigation = false, navigate = true, detailReady=false, selection=null, assignmentId=null } = {}) {
  if (!allowTeacherLeave()) return;
  disposeReview();disposeReview=()=>{};
  disposeToday();disposeToday=()=>{};todayBoot=null;
  clearTimeout(archiveSearchTimer);directoryRequestVersion++;
  disposeWriting(); disposeWriting = () => {};
  $("teacherWrittenWorkCard")?.classList.add("hidden");
  $("teacherWorkflowEntries")?.classList.add("hidden");
  for(const id of ["teacherResourcesLink","teacherAssignResourceLink"]) $(id)?.removeAttribute("href");
  institutionalUnitLoadVersion++;
  closeDrawer();
  selectedAssignmentId=selection?.assignmentId??assignmentId??(selectedClassId===id?selectedAssignmentId:null);
  selectedClassId = id;
  rosterQuery = "";
  closeClassRenameEditors();
  setMessage("renameClassMessage", "");
  setMessage("institutionalRenameClassMessage", "");
  if ($("studentSearchInput")) $("studentSearchInput").value = "";
  renderClassList();
  const klass = selectedClass();
  if (!klass) return;
  if (navigate) {
    syncNavigation(selection ? {...klass,selectedUnit:selection} : klass, pushNavigation);
    renderTeacherView("class");
  } else if ($("classDetailBackLink")) {
    $("classDetailBackLink").href = klass.isActive ? "?view=classes" : "?view=archive";
  }

  if (dashboard?.directoryMode && navigate && !detailReady) {
    const request=institutionalUnitLoadVersion,version=dashboardLoadVersion;
    directoryRequestVersion++;
    invitationRequestVersion++;
    const selectedAssignment=selectedAssignmentId;
    retryClass=()=>selectClass(id,{selection,assignmentId:selectedAssignment});
    $("institutionalClassView").classList.add("hidden");
    $("emptyClass").classList.add("hidden");
    $("institutionalEmpty").classList.add("hidden");
    $("classView").classList.add("hidden");
    $("classLoading").classList.remove("hidden");
    $("classLoadingMessage").textContent="Դասարանի տվյալները բեռնվում են…";
    $("teacherClassRetry").classList.add("hidden");
    const {data,error}=await dashboardRead({readMode:"class",classId:id,...(selectedAssignment?{assignmentId:selectedAssignment}:{}),...(selection?{selection}:{})});
    if(request!==institutionalUnitLoadVersion || version!==dashboardLoadVersion || selectedClassId!==id || !dashboard)return;
    const detail=data?.classes?.find(c=>c.id===id && (!selectedAssignment || c.assignmentId===selectedAssignment));
    if(error || !detail) {
      $("classLoadingMessage").textContent="Դասարանի տվյալները հասանելի չեն։ Թարմացրեք կամ փորձեք կրկին։";
      $("teacherClassRetry").classList.remove("hidden");
      return;
    }
    dashboard.classes=dashboard.classes.map(c=>c.id===id && (!selectedAssignment || c.assignmentId===selectedAssignment)?detail:c);
    if(!dashboard.institutionalTeacher)dashboard.skills=data.skills??[];
    return selectClass(id,{navigate:true,detailReady:true});
  }
  $("classLoading")?.classList.add("hidden");
  if (dashboard?.institutionalTeacher) {
    $("emptyClass").classList.add("hidden");
    $("institutionalEmpty").classList.add("hidden");
    $("classView").classList.remove("hidden");
    $("legacyClassHeader").classList.add("hidden");
    $("institutionalClassView").classList.remove("hidden");
    $("institutionalSelectedName").textContent = klass.name;
    $("institutionalRenameClassNameInput").value = klass.name;
    $("institutionalSelectedMeta").textContent = [
      klass.schoolName,
      klass.academicYear,
      klass.gradeNumber ? `${klass.gradeNumber}-րդ դասարան` : "",
      klass.subjectName,
    ].filter(Boolean).join(" · ");
    $("institutionalClassBadge").textContent = klass.isActive ? "Ակտիվ" : "Արխիվացված";
    $("institutionalClassBadge").className = `status-badge ${klass.isActive ? "success" : "neutral"}`;
    $("institutionalClassToggle").textContent = klass.isActive ? "Արխիվացնել դասարանը" : "Վերակտիվացնել դասարանը";
    $("institutionalStudentInviteBtn").disabled = !klass.isActive;
    $("institutionalStudentEmail").disabled = !klass.isActive;
    $("institutionalStudentEmail").value = "";
    $("institutionalGenerateJoinCodeBtn").disabled = !klass.isActive;
    latestInstitutionalJoinCode = "";
    $("institutionalJoinCodeValue").textContent = "—";
    $("institutionalGeneratedJoinCode").classList.add("hidden");
    setMessage("institutionalJoinCodeMessage", klass.isActive
      ? ""
      : "Արխիվացված դասարանի համար նոր կոդ ստեղծել հնարավոր չէ։", !klass.isActive);
    updateInstitutionalStudentEmailCount();
    renderInstitutionalStudentInviteResults([]);
    setMessage("institutionalStudentInviteMessage", klass.isActive
      ? ""
      : "Արխիվացված դասարանին նոր աշակերտ հրավիրել հնարավոր չէ։", !klass.isActive);
    $("rosterDescription").textContent = "Բացեք աշակերտի առաջընթացը՝ ախտորոշիչի, վարժությունների, կրկնության և յուրացման ստուգման ճշգրիտ տվյալները տեսնելու համար։";
    const unitFilter = $("teacherUnitFilter");
    unitFilter.replaceChildren(...(klass.unitOptions ?? []).map((unit) => {
      const option = document.createElement("option");
      option.value = `${unit.curriculumReleaseId}:${unit.unitId}`;
      option.textContent = `${unit.unitSequence}. ${unit.unitTitleHy} · Թողարկում ${unit.releaseNumber}`;
      option.selected = unit.unitId === klass.selectedUnit?.unitId
        && unit.curriculumReleaseId === klass.selectedUnit?.curriculumReleaseId;
      return option;
    }));
    $("teacherUnitFilterLabel").classList.toggle("hidden", !(klass.unitOptions?.length));
    unitFilter.disabled = (klass.unitOptions?.length ?? 0) < 2;
    const analyticsAvailable = klass.analyticsAvailable === true;
    $("teacherAnalyticsUnavailable").classList.toggle("hidden", analyticsAvailable);
    $("rosterAnalyticsCard").classList.toggle("hidden", !analyticsAvailable);
    $("matrixAnalyticsCard").classList.toggle("hidden", !analyticsAvailable);
    if (analyticsAvailable) {
      $("matrixContextKicker").textContent = [klass.subjectName, klass.gradeNumber ? `${klass.gradeNumber}-րդ դասարան` : "", klass.selectedUnit?.unitSequence ? `Գլուխ ${klass.selectedUnit.unitSequence}` : ""].filter(Boolean).join(" · ");
      $("matrixUnitTitle").textContent = klass.selectedUnit?.unitTitleHy ?? "—";
      renderMatrix(klass);
      renderRoster(klass);
    }
    if ($("teacherWrittenWorkCard") && klass.selectedUnit) {
      $("teacherWrittenWorkCard").classList.remove("hidden");
      $("teacherWorkflowEntries").classList.remove("hidden");
      const resourceParams = new URLSearchParams({assignment:klass.assignmentId,release:klass.selectedUnit.curriculumReleaseId,unit:klass.selectedUnit.unitId});
      $("teacherResourcesLink").href='./resource-library.html?'+resourceParams;
      $("teacherAssignResourceLink").href='./resource-library.html?'+resourceParams+'&intent=assign';
      $("teacherWorkflowContext").textContent=[klass.name,klass.subjectName,klass.selectedUnit.unitTitleHy,klass.schoolName,klass.academicYear].filter(Boolean).join(' · ');
      $("teacherOpenWrittenWork").onclick = () => {
        if (!allowTeacherLeave()) return;
        disposeWriting();
        const selected = klass.selectedUnit;
        const request = institutionalUnitLoadVersion;
        disposeWriting = mountWrittenWork({root:$("teacherWrittenWork"),supabase,teacher:true,actorId:dashboard.teacher.id,
          context:{assignmentId:klass.assignmentId,curriculumReleaseId:selected.curriculumReleaseId,unitId:selected.unitId},
          isCurrent:()=>request===institutionalUnitLoadVersion && selectedClassId===klass.id && Boolean(dashboard)});
      };
    }
    $("institutionalPendingInvites").replaceChildren();
    $("institutionalJoinCodeList").replaceChildren();
    $("institutionalInvitationHistory").open=false;
    $("institutionalCodeOption").open=false;
    return;
  }

  $("emptyClass").classList.add("hidden");
  $("institutionalEmpty").classList.add("hidden");
  $("institutionalClassView").classList.add("hidden");
  $("classView").classList.remove("hidden");
  $("legacyClassHeader").classList.remove("hidden");
  $("teacherAnalyticsUnavailable").classList.add("hidden");
  $("rosterAnalyticsCard").classList.remove("hidden");
  $("matrixAnalyticsCard").classList.remove("hidden");
  $("teacherUnitFilterLabel").classList.add("hidden");
  $("rosterDescription").textContent = "Բացեք աշակերտի առաջընթացը կամ հեռացրեք նրան այս դասարանից։ Նույն հաշվով կրկին միանալիս նրա նախկին տվյալները կպահպանվեն։";
  $("matrixContextKicker").textContent = "ՖԻԶԻԿԱ 7 · ԳԼՈՒԽ I";
  $("matrixUnitTitle").textContent = "Բնության ուսումնասիրության ֆիզիկական մեթոդները";
  $("selectedClassName").textContent = klass.name;
  $("renameClassNameInput").value = klass.name;
  $("selectedClassMeta").textContent = `${klass.academicYear ?? ""} · ${klass.studentCount} աշակերտ · ${klass.needingSupport} աջակցություն է պետք`;
  $("joinCode").textContent = klass.joinCode ?? "—";
  $("copyCodeStatus").textContent = "";

  const badge = $("classStatusBadge");
  badge.textContent = klass.isActive ? "Ակտիվ" : "Արխիվացված";
  badge.className = `status-badge ${klass.isActive ? "success" : "neutral"}`;
  $("toggleClassBtn").textContent = klass.isActive ? "Արխիվացնել դասարանը" : "Վերակտիվացնել դասարանը";

  const invite = buildInviteUrl(klass.joinCode);
  if ($("openJoinBtn")) $("openJoinBtn").href = invite || "./join.html";
  $("copyCodeBtn").disabled = !klass.isActive || !klass.joinCode;
  $("copyInviteBtn").disabled = !klass.isActive || !klass.joinCode;
  $("rotateCodeBtn").disabled = !klass.isActive;

  renderMatrix(klass);
  renderRoster(klass);
}

async function changeInstitutionalUnit(event) {
  const klass = selectedClass();
  if (!dashboard?.institutionalTeacher || !klass) return;
  const option = (klass.unitOptions ?? []).find((unit) =>
    `${unit.curriculumReleaseId}:${unit.unitId}` === event.target.value);
  if (!option || (option.unitId === klass.selectedUnit?.unitId
    && option.curriculumReleaseId === klass.selectedUnit?.curriculumReleaseId)) return;
  // Decide before invalidating the current writer or changing dashboard data.
  if (!allowTeacherLeave()) {
    event.target.value = `${klass.selectedUnit.curriculumReleaseId}:${klass.selectedUnit.unitId}`;
    return;
  }
  return selectClass(klass.id,{pushNavigation:true,selection:{assignmentId:klass.assignmentId,curriculumReleaseId:option.curriculumReleaseId,unitId:option.unitId}});
}

function renderInstitutionalRoster(klass) {
  const students = Array.isArray(klass.students) ? klass.students : [];
  $("institutionalRosterCount").textContent = `${students.length} աշակերտ`;
  const list = $("institutionalRoster");
  list.replaceChildren();
  if (!students.length) {
    const empty = document.createElement("li");
    empty.className = "institutional-student-empty";
    empty.textContent = "Այս դասարանում հաստատված աշակերտ դեռ չկա։";
    list.append(empty);
    return;
  }
  for (const student of students) {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    name.textContent = student.displayName || "Աշակերտ";
    item.append(name);
    list.append(item);
  }
}

function renderInstitutionalStudentInvitations(invitations) {
  const list = $("institutionalPendingInvites");
  list.replaceChildren();
  if (!invitations.length) {
    const empty = document.createElement("li");
    empty.className = "institutional-invitation-empty";
    empty.textContent = "Այս դասարանի համար սպասվող հրավեր չկա։";
    list.append(empty);
    return;
  }
  const dateFormat = new Intl.DateTimeFormat("hy-AM", {
    dateStyle: "medium", timeStyle: "short",
  });
  for (const invitation of invitations) {
    const item = document.createElement("li");
    const copy = document.createElement("div");
    copy.className = "institutional-invitation-copy";
    const email = document.createElement("strong");
    email.textContent = invitation.email || "Աշակերտի էլ. հասցեն անհասանելի է";
    const expiry = document.createElement("span");
    expiry.className = "subtle small";
    expiry.textContent = `Վավեր է մինչև ${dateFormat.format(new Date(invitation.expiresAt))}`;
    const revoke = document.createElement("button");
    revoke.type = "button";
    revoke.className = "ghost small-button";
    revoke.textContent = "Չեղարկել";
    revoke.dataset.revokeInstitutionalInvite = invitation.id;
    copy.append(email, expiry);
    item.append(copy, revoke);
    list.append(item);
  }
  list.querySelectorAll("[data-revoke-institutional-invite]").forEach((button) => {
    button.addEventListener("click", () => revokeInstitutionalStudentInvitation(button));
  });
}

async function loadInstitutionalStudentInvitations(klass = selectedClass()) {
  if (!klass || !dashboard?.institutionalTeacher) return;
  const requestedClassId = klass.id;
  const request=++invitationRequestVersion,version=dashboardLoadVersion;
  const list = $("institutionalPendingInvites");
  const codeList = $("institutionalJoinCodeList");
  list.innerHTML = '<li class="institutional-invitation-empty">Բեռնվում է…</li>';
  codeList.innerHTML = '<li class="institutional-invitation-empty">Բեռնվում է…</li>';
  const {data,error}=await readOnce("manage-student-invitation",{
    action:"list",schoolId:klass.schoolId,classId:klass.id,assignmentId:klass.assignmentId,
  });
  if (selectedClassId !== requestedClassId || request!==invitationRequestVersion || version!==dashboardLoadVersion || !dashboard) return;
  if (error || !Array.isArray(data?.invitations) || !Array.isArray(data?.joinCodes)) {
    list.innerHTML = '<li class="institutional-invitation-empty">Հրավերների ցանկը հասանելի չէ։</li>';
    codeList.innerHTML = '<li class="institutional-invitation-empty">Կոդերի ցանկը հասանելի չէ։</li>';
    return;
  }
  renderInstitutionalStudentInvitations(data.invitations);
  renderInstitutionalJoinCodes(data.joinCodes);
}

function parseInstitutionalStudentEmails(value) {
  const seen = new Set();
  return String(value ?? "")
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => {
      if (!email || seen.has(email)) return false;
      seen.add(email);
      return true;
    });
}

function updateInstitutionalStudentEmailCount() {
  const emails = parseInstitutionalStudentEmails($("institutionalStudentEmail")?.value);
  const counter = $("institutionalStudentEmailCount");
  if (!counter) return emails;
  counter.textContent = `${emails.length} / ${MAX_STUDENT_INVITE_BATCH}`;
  counter.style.color = emails.length > MAX_STUDENT_INVITE_BATCH ? "#8a3342" : "#607087";
  return emails;
}

function renderInstitutionalStudentInviteResults(results) {
  const list = $("institutionalStudentInviteResults");
  if (!list) return;
  list.replaceChildren();
  list.classList.toggle("hidden", !Array.isArray(results) || results.length === 0);
  for (const result of results ?? []) {
    const item = document.createElement("li");
    item.className = String(result.status ?? "failed").replaceAll("_", "-");
    const email = document.createElement("span");
    email.textContent = result.email || "—";
    const status = document.createElement("span");
    status.textContent = result.status === "sent"
      ? "Ուղարկված է"
      : result.status === "not_attempted" ? "Չի փորձարկվել" : "Չի ուղարկվել";
    item.append(email, status);
    list.append(item);
  }
}

async function submitInstitutionalStudentInvitation(event) {
  event.preventDefault();
  const klass = selectedClass();
  if (!klass || !dashboard?.institutionalTeacher || !klass.isActive) return;
  const button = $("institutionalStudentInviteBtn");
  const emailInput = $("institutionalStudentEmail");
  const emails = updateInstitutionalStudentEmailCount();
  renderInstitutionalStudentInviteResults([]);
  if (!emails.length) {
    return setMessage("institutionalStudentInviteMessage", "Մուտքագրեք առնվազն մեկ էլ. հասցե։", true);
  }
  if (emails.length > MAX_STUDENT_INVITE_BATCH) {
    return setMessage("institutionalStudentInviteMessage", "Մեկ խմբով կարելի է ուղարկել առավելագույնը 20 հրավեր։", true);
  }
  const invalidEmails = emails.filter((email) => email.length > 320
    || !institutionalStudentEmailPattern.test(email));
  if (invalidEmails.length) {
    return setMessage("institutionalStudentInviteMessage",
      `Սխալ էլ. հասցե՝ ${invalidEmails.join(", ")}։ Ոչ մի հրավեր չի ուղարկվել։`, true);
  }
  button.disabled = true;
  setMessage("institutionalStudentInviteMessage", `${emails.length} հրավեր է ուղարկվում…`);
  const { data, error } = await supabase.functions.invoke("provision-student-account", {
    body: {
      schoolId: klass.schoolId, classId: klass.id,
      assignmentId: klass.assignmentId, emails,
    },
  });
  button.disabled = false;
  if (error) {
    return setMessage("institutionalStudentInviteMessage",
      "Հրավերները չուղարկվեցին։ Ստուգեք հասցեները և դասարանի ձեր գործող նշանակումը։", true);
  }
  const results = Array.isArray(data?.results) ? data.results : [];
  renderInstitutionalStudentInviteResults(results);
  const retryEmails = results
    .filter((result) => result.status !== "sent")
    .map((result) => result.email)
    .filter(Boolean);
  emailInput.value = retryEmails.join("\n");
  updateInstitutionalStudentEmailCount();
  const succeeded = Number(data?.succeeded ?? 0);
  const failed = Number(data?.failed ?? 0);
  const notAttempted = Number(data?.notAttempted ?? 0);
  if (failed || notAttempted) {
    const quotaNote = data?.rateLimited
      ? " Էլ. փոստի ուղարկման սահմանաչափը սպառվել է. փորձեք մնացածը ավելի ուշ։"
      : " Չուղարկված հասցեները մնացել են դաշտում։";
    setMessage("institutionalStudentInviteMessage",
      `${succeeded} ուղարկվեց, ${failed} չուղարկվեց, ${notAttempted} չփորձարկվեց։${quotaNote}`, true);
  } else {
    const duplicateNote = Number(data?.duplicatesRemoved ?? 0) > 0
      ? ` ${data.duplicatesRemoved} կրկնվող հասցե բաց է թողնվել։` : "";
    setMessage("institutionalStudentInviteMessage", `${succeeded} հրավեր ուղարկվեց։${duplicateNote}`);
  }
  if (succeeded > 0) await loadInstitutionalStudentInvitations(klass);
}

async function revokeInstitutionalStudentInvitation(button) {
  const klass = selectedClass();
  const invitationId = button?.dataset?.revokeInstitutionalInvite;
  if (!klass || !invitationId || !klass.isActive) return;
  if (!window.confirm("Չեղարկե՞լ այս աշակերտի սպասվող հրավերը։")) return;
  button.disabled = true;
  const { data, error } = await supabase.functions.invoke("manage-student-invitation", {
    body: {
      action: "revoke", invitationId, schoolId: klass.schoolId,
      classId: klass.id, assignmentId: klass.assignmentId,
    },
  });
  if (error || data?.revoked !== true) {
    button.disabled = false;
    return setMessage("institutionalStudentInviteMessage", "Հրավերը չեղարկելը չհաջողվեց։", true);
  }
  setMessage("institutionalStudentInviteMessage", "Հրավերը չեղարկված է։");
  await loadInstitutionalStudentInvitations(klass);
}

function renderInstitutionalJoinCodes(codes) {
  const list = $("institutionalJoinCodeList");
  list.replaceChildren();
  if (!codes.length) {
    const empty = document.createElement("li");
    empty.className = "institutional-invitation-empty";
    empty.textContent = "Չօգտագործված կոդ չկա։";
    list.append(empty);
    return;
  }
  const dateFormat = new Intl.DateTimeFormat("hy-AM", {
    dateStyle: "medium", timeStyle: "short",
  });
  for (const code of codes) {
    const item = document.createElement("li");
    const copy = document.createElement("div");
    copy.className = "institutional-invitation-copy";
    const title = document.createElement("strong");
    title.textContent = "Մեկանգամյա կոդ";
    const expiry = document.createElement("span");
    expiry.className = "subtle small";
    expiry.textContent = `Ստեղծվել է ${dateFormat.format(new Date(code.createdAt))} · վավեր է մինչև ${dateFormat.format(new Date(code.expiresAt))}`;
    const revoke = document.createElement("button");
    revoke.type = "button";
    revoke.className = "ghost small-button";
    revoke.textContent = "Չեղարկել";
    revoke.dataset.revokeInstitutionalCode = code.id;
    copy.append(title, expiry);
    item.append(copy, revoke);
    list.append(item);
  }
  list.querySelectorAll("[data-revoke-institutional-code]").forEach((button) => {
    button.addEventListener("click", () => revokeInstitutionalJoinCode(button));
  });
}

async function generateInstitutionalJoinCode() {
  const klass = selectedClass();
  if (!klass || !dashboard?.institutionalTeacher || !klass.isActive) return;
  const button = $("institutionalGenerateJoinCodeBtn");
  button.disabled = true;
  setMessage("institutionalJoinCodeMessage", "Մեկանգամյա կոդը ստեղծվում է…");
  const { data, error } = await supabase.functions.invoke("manage-student-invitation", {
    body: {
      action: "create_code", schoolId: klass.schoolId, classId: klass.id,
      assignmentId: klass.assignmentId,
    },
  });
  button.disabled = false;
  if (error || typeof data?.joinCode !== "string") {
    return setMessage("institutionalJoinCodeMessage",
      "Կոդը չստեղծվեց։ Ստուգեք դասարանի ձեր գործող նշանակումը։", true);
  }
  latestInstitutionalJoinCode = data.joinCode;
  $("institutionalJoinCodeValue").textContent = latestInstitutionalJoinCode;
  $("institutionalGeneratedJoinCode").classList.remove("hidden");
  setMessage("institutionalJoinCodeMessage",
    "Կոդը պատրաստ է։ Այն ցուցադրվում է միայն հիմա, գործում է 72 ժամ և կարող է օգտագործվել մեկ անգամ։");
  await loadInstitutionalStudentInvitations(klass);
}

async function copyInstitutionalJoinCode() {
  if (!latestInstitutionalJoinCode) return;
  await copyText(latestInstitutionalJoinCode, "Կոդը պատճենված է։", "institutionalJoinCodeMessage");
}

async function copyInstitutionalJoinLink() {
  const invite = buildInviteUrl(latestInstitutionalJoinCode);
  if (!invite) return;
  await copyText(invite, "Հղումը պատճենված է։", "institutionalJoinCodeMessage");
}

async function revokeInstitutionalJoinCode(button) {
  const klass = selectedClass();
  const codeId = button?.dataset?.revokeInstitutionalCode;
  if (!klass || !codeId || !klass.isActive) return;
  if (!window.confirm("Չեղարկե՞լ այս չօգտագործված կոդը։")) return;
  button.disabled = true;
  const { data, error } = await supabase.functions.invoke("manage-student-invitation", {
    body: {
      action: "revoke_code", codeId, schoolId: klass.schoolId,
      classId: klass.id, assignmentId: klass.assignmentId,
    },
  });
  if (error || data?.revoked !== true) {
    button.disabled = false;
    return setMessage("institutionalJoinCodeMessage", "Կոդը չեղարկելը չհաջողվեց։", true);
  }
  setMessage("institutionalJoinCodeMessage", "Կոդը չեղարկված է։");
  await loadInstitutionalStudentInvitations(klass);
}

function matrixCell(skill) {
  const label = skill.percent === null ? "—" : `${skill.percent}%`;
  return `<td class="matrix-cell ${escapeHtml(skill.band)}" title="${escapeHtml(skill.nameHy)}">${escapeHtml(label)}</td>`;
}

function shortSkillCode(code, unitCode = selectedClass()?.selectedUnit?.unitCode || dashboard?.unitCode || "") {
  const prefix = unitCode ? `${unitCode}-` : "";
  return prefix && String(code).startsWith(prefix) ? String(code).slice(prefix.length) : String(code);
}

function studentHasNeedsSupport(student) {
  return (student.matrix ?? []).some((skill) => skill.band === "needs_support");
}

function studentHasRequiredReview(student) {
  return ["review_required_attempt_2", "review_required_attempt_3"].includes(student.chapterReview?.lifecycleState);
}

function studentMasteryConfirmed(student) {
  return student.chapterReview?.masteryStatus === "confirmed" || student.masteryCheck?.passed === true;
}

function matchesMatrixFilter(student) {
  if (matrixStudentFilter === "needs_support") return studentHasNeedsSupport(student);
  if (matrixStudentFilter === "required_review") return studentHasRequiredReview(student);
  if (matrixStudentFilter === "mastery_confirmed") return studentMasteryConfirmed(student);
  if (matrixStudentFilter === "no_activity") return !student.latestActivityAt;
  return true;
}

function renderMatrixSummary(klass) {
  const students = klass.students ?? [];
  $("matrixStudentTotal").textContent = String(students.length);
  $("matrixMasteredTotal").textContent = String(students.filter(studentMasteryConfirmed).length);
  $("matrixNeedsSupportTotal").textContent = String(students.filter(studentHasNeedsSupport).length);
  $("matrixRequiredReviewTotal").textContent = String(students.filter(studentHasRequiredReview).length);
  $("matrixNoActivityTotal").textContent = String(students.filter((student) => !student.latestActivityAt).length);

  const skills = klass.skills ?? dashboard.skills ?? [];
  const attention = skills.map((skill, index) => {
    let needsSupport = 0;
    let developing = 0;
    for (const student of students) {
      const cell = student.matrix?.[index];
      if (cell?.band === "needs_support") needsSupport += 1;
      if (cell?.band === "developing") developing += 1;
    }
    return {
      code: shortSkillCode(skill.code, klass.selectedUnit?.unitCode),
      nameHy: skill.nameHy,
      needsSupport,
      developing,
      total: needsSupport + developing,
    };
  }).filter((row) => row.total > 0)
    .sort((a, b) => b.needsSupport - a.needsSupport || b.total - a.total || a.code.localeCompare(b.code))
    .slice(0, 3);

  $("matrixAttentionSummary").innerHTML = attention.length
    ? attention.map((row) => `
        <span class="matrix-attention-chip" title="${escapeHtml(row.nameHy)}">
          <strong>${escapeHtml(row.code)}</strong>
          <span>${row.needsSupport} աջակցություն · ${row.developing} զարգացող</span>
        </span>`).join("")
    : '<span class="subtle small">Կարմիր կամ դեղին հմտություններ չկան։</span>';
}

function renderMatrix(klass) {
  const skills = klass.skills ?? dashboard.skills ?? [];
  const allStudents = klass.students ?? [];
  const students = allStudents.filter(matchesMatrixFilter);
  renderMatrixSummary(klass);

  const header = skills.map((s) => `<th title="${escapeHtml(s.nameHy)}">${escapeHtml(shortSkillCode(s.code, klass.selectedUnit?.unitCode))}</th>`).join("");
  const rows = students.map((student) => `
    <tr>
      <th class="student-matrix-name"><button class="link-button" data-student="${student.id}">${escapeHtml(student.displayName)}</button></th>
      ${student.matrix.map(matrixCell).join("")}
    </tr>`).join("");

  $("matrixVisibleCount").textContent = matrixStudentFilter === "all"
    ? `${students.length} աշակերտ`
    : `Ցուցադրվում է ${students.length} / ${allStudents.length} աշակերտ`;

  if (!allStudents.length) {
    $("matrixWrap").innerHTML = dashboard?.institutionalTeacher
      ? '<div class="teacher-empty-state"><strong>Աշակերտ դեռ չկա</strong><p class="subtle small">Աշակերտին հրավիրեք այս դասարանի հրավերի ձևով։</p></div>'
      : '<div class="teacher-empty-state"><strong>Աշակերտ դեռ չկա</strong><p class="subtle small">Պատճենեք վերևի կոդը կամ հրավերի հղումը և ուղարկեք աշակերտներին։</p></div>';
  } else if (!students.length) {
    $("matrixWrap").innerHTML = '<div class="matrix-empty-filter">Այս ֆիլտրին համապատասխանող աշակերտ չկա։</div>';
  } else {
    $("matrixWrap").innerHTML = `<table class="skill-matrix"><thead><tr><th>Աշակերտ</th>${header}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  $("matrixWrap").querySelectorAll("[data-student]").forEach((el) => el.addEventListener("click", () => openStudent(el.dataset.student)));
}

function renderRoster(klass) {
  const roster = $("roster");
  roster.innerHTML = "";
  const query = rosterQuery.trim().toLocaleLowerCase("hy-AM");
  const students = (klass.students ?? []).filter((student) => !query || String(student.displayName).toLocaleLowerCase("hy-AM").includes(query));
  $("rosterCount").textContent = query
    ? `Ցուցադրվում է ${students.length} / ${klass.students.length} աշակերտ`
    : `${klass.students.length} աշակերտ`;

  for (const student of students) {
    const card = document.createElement("article");
    card.className = "roster-row";
    const weak = student.weakSkills?.map((s) => shortSkillCode(s.code, klass.selectedUnit?.unitCode)).join(", ") || "—";
    const review = student.chapterReview;
    const reviewSummary = review
      ? `${review.totalReviewsCompleted} կրկնություն · պարտադիր ${review.requiredReviewsCompleted} · լրացուցիչ ${review.optionalReviewsCompleted}`
      : "Գլխի կրկնության տվյալ դեռ չկա";
    card.innerHTML = `
      <div><button class="link-button roster-name" data-open-student="${student.id}">${escapeHtml(student.displayName)}</button><span class="subtle small">${student.latestActivityAt ? `Վերջին ակտիվություն՝ ${new Date(student.latestActivityAt).toLocaleString("hy-AM")}` : "Գործունեություն դեռ չկա"}</span></div>
      <div><span class="stat-label">Վերջին պատասխանների ընդհանուր ճշգրտություն</span><strong>${student.recentAccuracy === null ? "—" : `${student.recentAccuracy}%`}</strong></div>
      <div><span class="stat-label">Ուշադրության հմտություններ</span><strong>${escapeHtml(weak)}</strong></div>
      <div><span class="stat-label">Գլուխ I-ի կրկնություն</span><strong>${escapeHtml(reviewSummary)}</strong></div>
      <div class="intervention-cell"><span class="stat-label">Հաջորդ առաջարկություն</span><strong>${escapeHtml(student.intervention?.messageHy ?? "—")}</strong></div>
      <div class="roster-actions"><button class="secondary small-button" type="button" data-open-student="${student.id}">Դիտել</button>${dashboard?.institutionalTeacher ? "" : `<button class="ghost small-button roster-remove" type="button" data-remove-student="${student.id}" data-student-name="${escapeHtml(student.displayName)}">Հեռացնել</button>`}</div>`;
    roster.appendChild(card);
  }

  roster.querySelectorAll("[data-open-student]").forEach((el) => el.addEventListener("click", () => openStudent(el.dataset.openStudent)));
  roster.querySelectorAll("[data-remove-student]").forEach((el) => el.addEventListener("click", () => removeStudent(el.dataset.removeStudent, el.dataset.studentName)));

  if (!students.length) {
    roster.innerHTML = query
      ? '<div class="teacher-empty-state"><strong>Աշակերտ չի գտնվել</strong><p class="subtle small">Փորձեք այլ անուն կամ մաքրեք որոնումը։</p></div>'
      : '<div class="teacher-empty-state"><strong>Ցուցակը դեռ դատարկ է</strong><p class="subtle small">Աշակերտները այստեղ կհայտնվեն միանալու կոդը օգտագործելուց հետո։</p></div>';
  }
}

let drawerLoadVersion=0;
async function openStudent(studentId) {
  const request=++drawerLoadVersion;
  const dashboardVersion=dashboardLoadVersion;
  if (!studentId) return;
  const drawer = $("studentDrawer");
  drawer.classList.remove("hidden");
  drawer.setAttribute("aria-hidden", "false");
  $("closeDrawerBtn").focus();
  $("studentDrawerName").textContent = "Բեռնվում է…";
  $("studentDrawerContent").innerHTML = '<p class="subtle">Տվյալները բեռնվում են…</p>';

  const klass = selectedClass();
  const institutionalContext = dashboard?.institutionalTeacher ? {
    assignmentId: klass?.assignmentId,
    curriculumReleaseId: klass?.selectedUnit?.curriculumReleaseId,
    unitId: klass?.selectedUnit?.unitId,
  } : {};
  const { data, error } = await supabase.functions.invoke("get-teacher-student", {
    body: { studentId, classId: selectedClassId, ...institutionalContext },
  });
  if (request!==drawerLoadVersion || dashboardVersion!==dashboardLoadVersion || $("studentDrawer").classList.contains("hidden"))return;
  if (error) {
    $("studentDrawerContent").innerHTML = `<p class="message bad">${escapeHtml(friendlyError(error, "Չհաջողվեց բեռնել աշակերտի տվյալները։"))}</p>`;
    return;
  }

  $("studentDrawerName").textContent = data.student.displayName;
  const skillCards = data.skills.map((s) => `
    <div class="teacher-skill ${s.band}">
      <strong>${escapeHtml(shortSkillCode(s.code, data.unitCode))}</strong>
      <span>${escapeHtml(s.nameHy)}</span>
      <b>${s.percent === null ? "—" : `${s.percent}%`}</b>
    </div>`).join("");
  const attempts = data.recentAttempts.map((a) => `
    <tr><td>${escapeHtml(a.itemCode ?? "—")}</td><td>${a.correct ? "✓" : "✗"}</td><td>${a.hintUsed ? "այո" : "ոչ"}</td><td>${new Date(a.createdAt).toLocaleString("hy-AM")}</td></tr>`).join("");
  const review = data.chapterReview;
  const reviewHistory = (review?.history ?? []).map((row) => `
    <tr><td>${row.qualifying ? "Պարտադիր" : "Լրացուցիչ"}</td><td>${row.cycleNumber ?? "—"} / ${row.sessionNumber ?? "—"}</td><td>${row.targetQuestions}</td><td>${row.completedAt ? new Date(row.completedAt).toLocaleString("hy-AM") : "Ընթացքի մեջ"}</td></tr>`).join("");
  const reviewSkills = (review?.skills ?? []).map((s) => `
    <tr><td>${escapeHtml(shortSkillCode(s.code, data.unitCode))}</td><td>${s.reviewObservations}</td><td>${s.independentCorrect} / ${s.independentObservations}</td><td>${s.hintAssistedResponses}</td><td>${s.failedLatestMastery ? "Այո" : "Ոչ"}</td><td>Շեմերը դեռ սահմանված չեն</td></tr>`).join("");
  const masteryStatus = review?.masteryStatus === "confirmed" ? "Ստուգարքն անցած է"
    : review?.masteryStatus === "not_demonstrated" ? "Ստուգարքը չի անցել" : "Ընթացքի մեջ";
  const masteryResult = data.latestMasteryCheck?.result === "passed" ? "Անցած է"
    : data.latestMasteryCheck?.result === "failed" ? "Չի անցել"
    : data.latestMasteryCheck?.result ?? null;
  const coverage = review?.currentCycleEligiblePoolSize
    ? `${review.currentCycleUniqueSeen ?? 0} / ${review.currentCycleEligiblePoolSize}` : "—";
  const modeSummary = data.modeSummary ?? {};
  const recentSessions = (data.sessions ?? []).map((session) => {
    const labels = { diagnostic: "Ախտորոշիչ", practice: "Վարժություն", chapter_review: "Գլխի կրկնություն", mastery_check: "Յուրացման ստուգում" };
    return `<tr><td>${escapeHtml(labels[session.mode] ?? session.mode)}</td><td>${escapeHtml(session.status)}</td><td>${assessmentResultMarkup(session.reporting) || `${session.correct ?? "—"} / ${session.answered}`} ${contractMarkup(session.contract)}</td><td>${session.completedAt ? new Date(session.completedAt).toLocaleString("hy-AM") : "Ընթացքի մեջ"}</td></tr>`;
  }).join("");
  const unitTitle = data.selectedUnit?.unitTitleHy ?? klass?.selectedUnit?.unitTitleHy ?? "—";
  const contextKicker = dashboard?.institutionalTeacher
    ? [klass?.subjectName, klass?.gradeNumber ? `${klass.gradeNumber}-րդ դասարան` : "", klass?.selectedUnit?.unitSequence ? `Գլուխ ${klass.selectedUnit.unitSequence}` : ""].filter(Boolean).join(" · ")
    : "Ֆիզիկա 7 · Գլուխ I";
  $("studentDrawerContent").innerHTML = `
    <section class="drawer-summary-grid">
      <div class="mini-card"><span>Սկզբնական ախտորոշիչ</span><strong>${data.latestDiagnostic?.assessmentResult ? assessmentResultMarkup(data.latestDiagnostic.assessmentResult) : data.latestDiagnostic ? `${data.latestDiagnostic.percent}%` : "—"}</strong></div>
      <div class="mini-card"><span>Վարժություն</span><strong>${modeSummary.practice?.completed ?? 0} ավարտված</strong></div>
      <div class="mini-card"><span>Գլխի կրկնություն</span><strong>${modeSummary.chapter_review?.completed ?? review?.totalReviewsCompleted ?? 0} ավարտված</strong></div>
      <div class="mini-card"><span>Յուրացման ստուգում</span><strong>${data.latestMasteryCheck?.assessmentResult ? assessmentResultMarkup(data.latestMasteryCheck.assessmentResult) : data.latestMasteryCheck ? `${escapeHtml(masteryResult ?? "—")} · ${data.latestMasteryCheck.percent}%` : "—"}</strong></div>
    </section>
    <section class="teacher-intervention"><strong>Առաջարկվող միջամտություն</strong><p>${escapeHtml(data.recommendation?.messageHy ?? "—")}</p></section>
    <p class="mode-kicker">${escapeHtml(contextKicker)}</p>
    <p class="subtle small">${escapeHtml(unitTitle)}</p>
    <h3>Յուրացման ստուգում և կրկնություն</h3>
    <section class="drawer-summary-grid">
      <div class="mini-card"><span>Յուրացման ստուգման արդյունք</span><strong>${escapeHtml(masteryStatus)}</strong></div>
      <div class="mini-card"><span>Փորձեր</span><strong>${review ? `${review.attemptsUsed} / ${review.maximumAttempts}` : "—"}</strong></div>
      <div class="mini-card"><span>Անցած փորձ</span><strong>${review?.passedOnAttempt ?? "—"}</strong></div>
      <div class="mini-card"><span>Պարտադիր կրկնություններ</span><strong>${review?.requiredReviewsCompleted ?? 0}</strong></div>
      <div class="mini-card"><span>Լրացուցիչ կրկնություններ</span><strong>${review?.optionalReviewsCompleted ?? 0}</strong></div>
      <div class="mini-card"><span>Ընթացիկ ծածկույթ</span><strong>${escapeHtml(coverage)}</strong></div>
      <div class="mini-card"><span>Ծածկույթի տոկոս</span><strong>${review?.currentCycleCoveragePercent == null ? "—" : `${review.currentCycleCoveragePercent}%`}</strong></div>
      <div class="mini-card"><span>Տեսած տարբեր հարցեր</span><strong>${review?.lifetimeUniqueItemsSeen ?? 0}</strong></div>
      <div class="mini-card"><span>Նույն հարցի կրկնություններ</span><strong>${review?.exactRepeatCount ?? 0}</strong></div>
      <div class="mini-card"><span>Դեպքեր, երբ նոր հարց չէր մնացել</span><strong>${review?.poolExhaustionEventCount ?? "—"}</strong></div>
      <div class="mini-card"><span>Ինքնուրույն ճիշտ պատասխանների տոկոս</span><strong>${review?.independentAccuracyPercent == null ? "—" : `${review.independentAccuracyPercent}%`}</strong></div>
      <div class="mini-card"><span>Օգնություն օգտագործած պատասխաններ</span><strong>${review?.hintAssistedResponses ?? 0}</strong></div>
    </section>
    <p class="subtle small">Գլխի կրկնության «ուշադրության» շեմերը դեռ չեն հաստատվել։ Ստորև ցուցադրվում են միայն դիտարկելի փաստերը, ոչ վերջնական դասակարգում։</p>
    <h3>Կրկնությունների պատմություն</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Տեսակ</th><th>Ցիկլ / սեսիա</th><th>Հարցեր</th><th>Ավարտ</th></tr></thead><tbody>${reviewHistory || '<tr><td colspan="4">Տվյալ չկա</td></tr>'}</tbody></table></div>
    <h3>Գլխի կրկնության հմտությունների տվյալներ</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Հմտություն</th><th>Դիտարկումներ</th><th>Ինքնուրույն ճիշտ</th><th>Օգնություն օգտագործած</th><th>Սխալ՝ վերջին յուրացման ստուգման ժամանակ</th><th>Վիճակ</th></tr></thead><tbody>${reviewSkills || '<tr><td colspan="6">Գլխի կրկնության բավարար տվյալ դեռ չկա</td></tr>'}</tbody></table></div>
    <p class="subtle">Ցուցանիշները ընտրված դասարանի և սկզբնական կանոնների ապացույցներն են։ Տարբեր պայմաններով արդյունքները չեն միավորվում։</p>
    ${(data.matrix ?? []).filter(row=>row.estimates?.length).map(row=>`<details><summary>${escapeHtml(row.nameHy)} · առանձին ապացույցներ</summary>${row.estimates.map(estimate=>`<p>${estimate.percent == null ? "Տվյալն անբավարար է" : estimate.percent+"%"} · ${estimate.evidenceCount} պատասխան</p>${contractMarkup(estimate.contract)}`).join("")}</details>`).join("")}
    <h3>Հմտությունների յուրացում</h3><div class="teacher-skill-grid">${skillCards}</div>
    <h3>Սեսիաների պատմություն</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Տեսակ</th><th>Վիճակ</th><th>Ճիշտ / պատասխանած</th><th>Ավարտ</th></tr></thead><tbody>${recentSessions || '<tr><td colspan="4">Տվյալ չկա</td></tr>'}</tbody></table></div>
    <h3>Վերջին փորձերը</h3>
    <div class="matrix-wrap"><table class="attempt-table"><thead><tr><th>Հարց</th><th>Արդյունք</th><th>Օգնություն</th><th>Ժամանակ</th></tr></thead><tbody>${attempts || '<tr><td colspan="4">Տվյալ չկա</td></tr>'}</tbody></table></div>`;
}

function closeDrawer() {
  ++drawerLoadVersion;
  $("studentDrawerName").textContent = "";
  $("studentDrawerContent").replaceChildren();
  $("studentDrawer").classList.add("hidden");
  $("studentDrawer").setAttribute("aria-hidden", "true");
}

async function saveProfile() {
  const displayName = $("teacherDisplayNameInput").value.trim();
  if (displayName.length < 2) return setMessage("profileMessage", "Մուտքագրեք ձեր անունն ու ազգանունը։", true);
  $("saveProfileBtn").disabled = true;
  setMessage("profileMessage", "Պահպանում ենք…");
  const { data, error } = await supabase.functions.invoke("manage-teacher-profile", { body: { displayName } });
  $("saveProfileBtn").disabled = false;
  if (error) return setMessage("profileMessage", friendlyError(error, "Չհաջողվեց պահպանել անունը։"), true);
  const savedName = data?.profile?.displayName || displayName;
  $("teacherName").textContent = savedName;
  $("teacherDisplayNameInput").value = savedName;
  if (dashboard?.teacher) dashboard.teacher.displayName = savedName;
  setMessage("profileMessage", "Անունը պահպանված է։");
}

async function createClass() {
  const name = $("classNameInput").value.trim();
  if (!name) return setMessage("classMessage", "Մուտքագրեք դասարանի անունը։", true);
  $("createClassBtn").disabled = true;
  setMessage("classMessage", "Դասարանը ստեղծվում է…");
  const { data, error } = await supabase.functions.invoke("manage-teacher-class", {
    body: { action: "create", name, academicYear: $("academicYearInput").value.trim() },
  });
  $("createClassBtn").disabled = false;
  if (error) return setMessage("classMessage", friendlyError(error, "Չհաջողվեց ստեղծել դասարանը։"), true);
  selectedClassId = data.class.id;
  $("classNameInput").value = "";
  setMessage("classMessage", `Դասարանը ստեղծվեց։ Միանալու կոդ՝ ${data.class.join_code}`);
  showTeacherClassAfterMutation(data.class.id);
  await loadDashboard();
}

async function createInstitutionalClass(event) {
  event.preventDefault();
  if (!dashboard?.institutionalTeacher) return;
  const options = Array.isArray(dashboard.institutionalOptions) ? dashboard.institutionalOptions : [];
  const selectedKey = $("institutionalClassOption").value;
  const option = options.find((candidate) => institutionalOptionKey(candidate) === selectedKey);
  const name = $("institutionalClassName").value.trim();
  if (!option) {
    return setMessage("institutionalCreateMessage", "Ընտրեք հասանելի դպրոցական համատեքստը։", true);
  }
  if (name.length < 2) {
    return setMessage("institutionalCreateMessage", "Դասարանի անունը պետք է պարունակի առնվազն 2 նիշ։", true);
  }

  const button = $("institutionalCreateBtn");
  button.disabled = true;
  setMessage("institutionalCreateMessage", "Դպրոցի դասարանը ստեղծվում է…");
  const { data, error } = await supabase.functions.invoke("manage-institutional-teacher-class", {
    body: {
      action: "create",
      membershipId: option.teacherMembershipId,
      academicYearId: option.academicYearId,
      subjectProgramId: option.subjectProgramId,
      name,
    },
  });
  button.disabled = false;
  if (error || !data?.classId) {
    return setMessage("institutionalCreateMessage",
      friendlyError(error, "Չհաջողվեց ստեղծել դպրոցի դասարանը։"), true);
  }

  selectedClassId = data.classId;
  $("institutionalClassName").value = "";
  setMessage("institutionalCreateMessage", "Դպրոցի դասարանը ստեղծված է։ Այժմ կարող եք հրավիրել աշակերտներին։");
  showTeacherClassAfterMutation(data.classId);
  await loadDashboard();
}

function buildInviteUrl(code) {
  if (!code) return "";
  const url = new URL("./join.html", window.location.href);
  url.searchParams.set("code", code);
  return url.toString();
}

async function copyText(value, successMessage, statusElementId = "copyCodeStatus") {
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    setMessage(statusElementId, successMessage);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    setMessage(statusElementId,
      copied ? successMessage : "Չհաջողվեց պատճենել։ Ընտրեք արժեքը ձեռքով։", !copied);
    return copied;
  }
}

async function copyJoinCode() {
  const klass = selectedClass();
  if (!klass?.joinCode) return;
  await copyText(klass.joinCode, "Կոդը պատճենված է։");
}

async function copyInviteLink() {
  const klass = selectedClass();
  const invite = buildInviteUrl(klass?.joinCode);
  if (!invite) return;
  await copyText(invite, "Հրավերի հղումը պատճենված է։");
}

async function rotateCode() {
  if (!selectedClassId) return;
  const klass = selectedClass();
  if (!klass?.isActive) return;
  if (!window.confirm("Ստեղծե՞լ նոր միանալու կոդ։ Նախորդ կոդը այլևս չի աշխատի։")) return;
  $("rotateCodeBtn").disabled = true;
  const { data, error } = await supabase.functions.invoke("manage-teacher-class", { body: { action: "rotate_join_code", classId: selectedClassId } });
  $("rotateCodeBtn").disabled = false;
  if (error) return setMessage("copyCodeStatus", "Չհաջողվեց ստեղծել նոր կոդ։", true);
  if (klass) klass.joinCode = data.class.join_code;
  $("joinCode").textContent = data.class.join_code;
  if ($("openJoinBtn")) $("openJoinBtn").href = buildInviteUrl(data.class.join_code);
  $("copyCodeStatus").textContent = "Նոր կոդը պատրաստ է։";
}

async function toggleClassStatus() {
  const klass = selectedClass();
  if (!klass) return;
  const action = klass.isActive ? "archive" : "activate";
  if (klass.isActive && !window.confirm("Արխիվացնե՞լ դասարանը։ Արխիվացված դասարանի կոդով նոր աշակերտներ չեն կարող միանալ։")) return;
  $("toggleClassBtn").disabled = true;
  const { error } = await supabase.functions.invoke("manage-teacher-class", { body: { action, classId: klass.id } });
  $("toggleClassBtn").disabled = false;
  if (error) return setMessage("copyCodeStatus", "Դասարանի կարգավիճակը չհաջողվեց փոխել։", true);
  await loadDashboard();
}

async function toggleInstitutionalClassStatus() {
  const klass = selectedClass();
  if (!klass || !dashboard?.institutionalTeacher) return;
  const action = klass.isActive ? "archive" : "activate";
  if (klass.isActive && !window.confirm("Արխիվացնե՞լ դպրոցի այս դասարանը։ Աշակերտների և դասարանի պատմությունը կպահպանվի։")) return;
  $("institutionalClassToggle").disabled = true;
  setMessage("institutionalClassMessage", action === "archive" ? "Արխիվացվում է…" : "Վերակտիվացվում է…");
  const { data, error } = await supabase.functions.invoke("manage-institutional-teacher-class", {
    body: { action, classId: klass.id },
  });
  $("institutionalClassToggle").disabled = false;
  if (error || data?.updated !== true) {
    return setMessage("institutionalClassMessage", "Դասարանի կարգավիճակը չփոխվեց։ Ստուգեք թույլտվությունները և ուսումնական տարին։", true);
  }
  setMessage("institutionalClassMessage", action === "archive" ? "Դասարանն արխիվացված է։" : "Դասարանը վերակտիվացված է։");
  // Archived classes have no active evidence context. Update the URL before reload.
  klass.isActive = action === "activate";
  syncNavigation(klass);
  await loadDashboard();
}

async function removeStudent(studentId, studentName) {
  if (!studentId || !selectedClassId) return;
  const name = studentName || "այս աշակերտին";
  if (!window.confirm(`Հեռացնե՞լ ${name}-ին այս դասարանից։ Ուսանողի հաշիվը և ուսումնական տվյալները չեն ջնջվի։`)) return;
  const { error } = await supabase.functions.invoke("manage-teacher-class", {
    body: { action: "remove_student", classId: selectedClassId, studentId },
  });
  if (error) return alert("Չհաջողվեց հեռացնել աշակերտին դասարանից։");
  await loadDashboard();
}

$("signOutBtn").addEventListener("click", signOut);
$("refreshBtn").addEventListener("click", () => { void loadDashboard(); });
$("saveProfileBtn").addEventListener("click", saveProfile);
$("createClassBtn").addEventListener("click", createClass);
$("institutionalCreateForm").addEventListener("submit", createInstitutionalClass);
$("copyCodeBtn").addEventListener("click", copyJoinCode);
$("copyInviteBtn").addEventListener("click", copyInviteLink);
$("rotateCodeBtn").addEventListener("click", rotateCode);
$("toggleClassBtn").addEventListener("click", toggleClassStatus);
$("institutionalClassToggle").addEventListener("click", toggleInstitutionalClassStatus);
$("renameClassBtn").addEventListener("click", () => setClassRenameEditor("legacy", true));
$("renameClassCancelBtn").addEventListener("click", () => setClassRenameEditor("legacy", false));
$("renameClassForm").addEventListener("submit", (event) => renameSelectedClass(event, false));
$("institutionalRenameClassBtn").addEventListener("click", () => setClassRenameEditor("institutional", true));
$("institutionalRenameClassCancelBtn").addEventListener("click", () => setClassRenameEditor("institutional", false));
$("institutionalRenameClassForm").addEventListener("submit", (event) => renameSelectedClass(event, true));
$("institutionalStudentInviteForm").addEventListener("submit", submitInstitutionalStudentInvitation);
$("institutionalStudentEmail").addEventListener("input", updateInstitutionalStudentEmailCount);
$("refreshInstitutionalInvites").addEventListener("click", () => loadInstitutionalStudentInvitations());
$("institutionalGenerateJoinCodeBtn").addEventListener("click", generateInstitutionalJoinCode);
$("institutionalCopyJoinCodeBtn").addEventListener("click", copyInstitutionalJoinCode);
$("institutionalCopyJoinLinkBtn").addEventListener("click", copyInstitutionalJoinLink);
$("closeDrawerBtn").addEventListener("click", closeDrawer);
$("drawerBackdrop").addEventListener("click", closeDrawer);
$("studentSearchInput").addEventListener("input", (event) => {
  rosterQuery = event.target.value || "";
  const klass = selectedClass();
  if (klass) renderRoster(klass);
});
$("matrixStudentFilter").addEventListener("change", (event) => {
  matrixStudentFilter = event.target.value || "all";
  const klass = selectedClass();
  if (klass) renderMatrix(klass);
});
$("teacherUnitFilter").addEventListener("change", changeInstitutionalUnit);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("studentDrawer").classList.contains("hidden")) closeDrawer();
  closeClassRenameEditors();
});
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href]');
  if (!link || !dashboard || event.defaultPrevented || event.button !== 0
    || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(link.href, window.location.href);
  if(url.origin!==window.location.origin || url.hash || !["/teacher","/teacher.html"].includes(url.pathname))return;
  const view = url.searchParams.get("view");
  if (!TEACHER_VIEWS.has(view) || view === "class") return;
  event.preventDefault();
  navigateTeacherView(view, true);
});

window.addEventListener("popstate", () => {
  const nav=navigationSelection();
  if(!dashboard) return void loadDashboard();
  if(nav.view==="class") {
    if(!dashboard.classes.some(c=>c.id===nav.classId))return void loadDashboard();
    void selectClass(nav.classId,{selection:nav.selection});
  } else navigateTeacherView(nav.view,false);
});
$("teacherClassRetry").addEventListener("click",()=>retryClass());
$("teacherDashboardRetry").addEventListener("click",()=>loadDashboard());
$("classesLoadMore").addEventListener("click",()=>loadDirectory(false,{more:true}));
$("archiveLoadMore").addEventListener("click",()=>loadDirectory(true,{more:true,search:$("archiveServerQuery").value.trim()}));
$("classesRetry").addEventListener("click",()=>loadDirectory(false));
$("archiveRetry").addEventListener("click",()=>loadDirectory(true,{search:$("archiveServerQuery").value.trim()}));
$("archiveServerQuery").addEventListener("input",()=>{
  clearTimeout(archiveSearchTimer);directoryRequestVersion++;
  archiveSearchTimer=setTimeout(()=>loadDirectory(true,{search:$("archiveServerQuery").value.trim()}),250);
});
for(const id of ["institutionalInvitationHistory","institutionalCodeOption"]) $(id).addEventListener("toggle",()=>{
  if($(id).open)void loadInstitutionalStudentInvitations();
});

function bootstrapTeacherDashboard(session) {
  if (!session) return Promise.resolve();
  if (dashboardBootstrapPromise && actorId===session.user.id) return dashboardBootstrapPromise;
  if (dashboard && actorId===session.user.id && !$("dashboardPanel").classList.contains("hidden")) return Promise.resolve();
  actorId=session.user.id;
  const promise=loadDashboard(session).finally(()=>{if(dashboardBootstrapPromise===promise)dashboardBootstrapPromise=null;});
  dashboardBootstrapPromise=promise;
  return promise;
}

supabase.auth.onAuthStateChange((event, session) => {
  teacherAuthGeneration++;
  if (event === "SIGNED_OUT" || !session || (actorId && actorId!==session.user?.id)) {
    window.__haieduTeacherHomeStartup?.cancel();
    const switched=actorId && session?.user?.id && actorId!==session.user.id;
    clearTeacherRecent(actorId);
    if(switched)window.history.replaceState({},"",teacherViewUrl("home",true));
    selectedClassId=null;selectedAssignmentId=null;
    dashboardLoadVersion++;
    clearDetail(); directoryRequestVersion++; directoryPages={}; pendingReads.clear();
    dashboardBootstrapPromise=null; actorId=null;
    disposeWriting(); disposeWriting = () => {};
    closeDrawer();
    dashboard = null;
    $("dashboardPanel").classList.add("hidden");
    $("authPanel").classList.remove("hidden");
    $("signOutBtn").classList.add("hidden");
    $("teacherLoading")?.classList.add("hidden");
    if(session?.user && event!=="SIGNED_OUT")void bootstrapTeacherDashboard(session);
    return;
  }
  if (event === "TOKEN_REFRESHED" && !$("dashboardPanel").classList.contains("hidden")) return;
  if ($("dashboardPanel").classList.contains("hidden")) void bootstrapTeacherDashboard(session);
});

// The auth event already drives its own role-gated bootstrap. A delayed SDK
// snapshot (including a failure) must never override a newer auth event.
const initialAuthGeneration=teacherAuthGeneration;
try {
  const {data:sessionData,error}=await supabase.auth.getSession();
  if(initialAuthGeneration===teacherAuthGeneration){
    if(error)throw error;
    if(sessionData?.session)await bootstrapTeacherDashboard(sessionData.session);
  }
} catch {
  if(initialAuthGeneration===teacherAuthGeneration&&!dashboard&&!dashboardBootstrapPromise){
    window.__haieduTeacherHomeStartup?.cancel();
    showDashboardReadFailure("Չհաջողվեց ստուգել մուտքի տվյալները։ Փորձեք կրկին։");
  }
}
