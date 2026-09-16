export const SUPABASE_URL = "https://xzyjvwiiibuarpotppid.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_LGAvf2LEm55ZSvSUnLK_rQ_LqXvZ8Vi";

const AUTH_ERROR_MESSAGES_HY = {
  "email rate limit exceeded": "Էլ. նամակների ուղարկման ժամանակավոր սահմանաչափը լրացել է։ Խնդրում ենք փորձել ավելի ուշ։"
};

function localizeAuthMessage(node) {
  const raw = node?.textContent?.trim();
  if (!raw) return;
  const localized = AUTH_ERROR_MESSAGES_HY[raw.toLowerCase()];
  if (localized && node.textContent !== localized) node.textContent = localized;
}

if (typeof document !== "undefined") {
  const observeAuthMessage = () => {
    const node = document.getElementById("authMessage");
    if (!node) return;
    localizeAuthMessage(node);
    new MutationObserver(() => localizeAuthMessage(node)).observe(node, {
      childList: true,
      characterData: true,
      subtree: true
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeAuthMessage, { once: true });
  } else {
    observeAuthMessage();
  }
}
