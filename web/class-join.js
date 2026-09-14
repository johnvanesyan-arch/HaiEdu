import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let mounted = false;

function mount() {
  if (mounted) return;
  const dashboard = document.getElementById("dashboardContent");
  if (!dashboard) return;
  mounted = true;
  const card = document.createElement("section");
  card.className = "card";
  card.style.marginTop = "20px";
  card.innerHTML = `
    <span class="mode-kicker">Դասարան</span>
    <h3>Միանալ ուսուցչի դասարանին</h3>
    <p class="subtle">Մուտքագրեք ուսուցչի տրամադրած 8-նիշ join code-ը։</p>
    <div class="row">
      <input id="joinClassCode" maxlength="8" autocomplete="off" placeholder="Օր.՝ A7K9M2QX" style="text-transform:uppercase;max-width:260px" />
      <button id="joinClassBtn" type="button">Միանալ</button>
    </div>
    <p id="joinClassMessage" class="message"></p>`;
  dashboard.appendChild(card);

  const button = document.getElementById("joinClassBtn");
  button.addEventListener("click", async () => {
    const input = document.getElementById("joinClassCode");
    const message = document.getElementById("joinClassMessage");
    const joinCode = input.value.trim().toUpperCase();
    if (!joinCode) {
      message.textContent = "Մուտքագրեք join code-ը։";
      message.style.color = "#8a3342";
      return;
    }
    button.disabled = true;
    message.textContent = "Միանում ենք…";
    message.style.color = "#64748b";
    const { data, error } = await supabase.functions.invoke("join-class", { body: { joinCode } });
    button.disabled = false;
    if (error) {
      message.textContent = "Չհաջողվեց միանալ։ Ստուգեք կոդը։";
      message.style.color = "#8a3342";
      return;
    }
    input.value = "";
    message.textContent = data.alreadyMember
      ? `Դուք արդեն ${data.class.name} դասարանի անդամ եք։`
      : `Միացաք ${data.class.name} դասարանին։`;
    message.style.color = "#356246";
  });
}

const observer = new MutationObserver(() => {
  const dashboard = document.getElementById("dashboardContent");
  if (dashboard && !dashboard.classList.contains("hidden")) mount();
});
const dashboard = document.getElementById("dashboardContent");
if (dashboard) observer.observe(dashboard, { attributes: true, attributeFilter: ["class"] });
mount();
