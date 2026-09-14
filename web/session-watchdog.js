const promptEl = document.getElementById("prompt");
const nextBtn = document.getElementById("nextBtn");

let loadingTimer = null;

function armWatchdog() {
  if (!promptEl || !nextBtn) return;
  if (loadingTimer) clearTimeout(loadingTimer);
  loadingTimer = null;

  if (promptEl.textContent.trim() !== "Հարցը բեռնվում է…") return;

  loadingTimer = setTimeout(() => {
    if (promptEl.textContent.trim() !== "Հարցը բեռնվում է…") return;
    promptEl.textContent = "Հարցի բեռնումը շատ երկար տևեց։ Կրկին փորձեք։";
    nextBtn.disabled = false;
    nextBtn.textContent = "Կրկին փորձել";
    nextBtn.dataset.action = "next";
  }, 12000);
}

const observer = new MutationObserver(armWatchdog);
observer.observe(promptEl, { childList: true, characterData: true, subtree: true });
armWatchdog();
