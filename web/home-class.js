import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const dashboard = document.getElementById("dashboardContent");
let loading = false;

function ensureCard() {
  let card = document.getElementById("homeClassCard");
  if (card || !dashboard) return card;

  card = document.createElement("section");
  card.id = "homeClassCard";
  card.className = "card home-class-card";
  card.setAttribute("aria-labelledby", "homeClassTitle");
  card.innerHTML = `
    <div class="home-class-copy">
      <span class="mode-kicker">Դասարան</span>
      <h3 id="homeClassTitle">Ուսուցչի դասարան</h3>
      <p id="homeClassText" class="subtle">Դասարանի կարգավիճակը բեռնվում է…</p>
      <div id="homeClassList" class="home-class-list hidden" aria-label="Իմ դասարանները"></div>
    </div>
    <a id="homeClassAction" class="button-link secondary" href="./join.html">Միանալ դասարանին</a>`;

  const browserCard = dashboard.querySelector(".home-browser-card");
  if (browserCard) dashboard.insertBefore(card, browserCard);
  else dashboard.appendChild(card);
  return card;
}

function renderClasses(classes) {
  ensureCard();
  const title = document.getElementById("homeClassTitle");
  const text = document.getElementById("homeClassText");
  const list = document.getElementById("homeClassList");
  const action = document.getElementById("homeClassAction");
  if (!title || !text || !list || !action) return;

  list.innerHTML = "";
  if (!classes.length) {
    title.textContent = "Միացեք ձեր ուսուցչի դասարանին";
    text.textContent = "Ընդունեք ուսուցչի էլ. փոստով ուղարկած հրավերը կամ, եթե ստացել եք մեկանգամյա կոդ, մուտքագրեք այն այստեղ։";
    list.classList.add("hidden");
    action.textContent = "Միանալ դասարանին՝ կոդով";
    action.href = "./join.html";
    return;
  }

  title.textContent = classes.length === 1 ? "Դուք միացված եք ուսուցչի դասարանին" : `Դուք միացված եք ${classes.length} դասարանի`;
  text.textContent = "Ուսուցիչը կարող է հետևել ձեր Ֆիզիկա 7 · Գլուխ I առաջընթացին իր դասարանի վահանակից։";
  list.classList.remove("hidden");

  for (const klass of classes) {
    const item = document.createElement("div");
    item.className = "home-class-item";
    const strong = document.createElement("strong");
    strong.textContent = klass.name;
    const meta = document.createElement("span");
    meta.className = "subtle small";
    meta.textContent = klass.academicYear || "Ուսումնական տարի նշված չէ";
    item.append(strong, meta);
    list.appendChild(item);
  }

  action.textContent = "Միանալ այլ դասարանի՝ կոդով";
  action.href = "./join.html";
}

async function refreshClasses() {
  if (loading || !dashboard || dashboard.classList.contains("hidden")) return;
  loading = true;
  ensureCard();
  const { data, error } = await supabase.functions.invoke("get-student-classes", { body: {} });
  loading = false;

  if (error) {
    const title = document.getElementById("homeClassTitle");
    const text = document.getElementById("homeClassText");
    if (title) title.textContent = "Ուսուցչի դասարան";
    if (text) text.textContent = "Դասարանի կարգավիճակը հիմա հասանելի չէ։ Կարող եք միանալ կոդով։";
    return;
  }

  renderClasses(Array.isArray(data?.classes) ? data.classes : []);
}

if (dashboard) {
  const observer = new MutationObserver(() => {
    if (!dashboard.classList.contains("hidden")) queueMicrotask(refreshClasses);
  });
  observer.observe(dashboard, { attributes: true, attributeFilter: ["class"] });
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) setTimeout(refreshClasses, 200);
});
setTimeout(refreshClasses, 550);
