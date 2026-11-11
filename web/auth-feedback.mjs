export const MIN_PASSWORD_CHARACTERS = 6;
export const PASSWORD_HINT_HY = "Օգտագործեք առնվազն 6 նիշ։";

export function newPasswordProblem(password, confirmation) {
  if (typeof password !== "string" || [...password].length < MIN_PASSWORD_CHARACTERS) {
    return "Գաղտնաբառը պետք է պարունակի առնվազն 6 նիշ։";
  }
  if (password !== confirmation) return "Գաղտնաբառերը չեն համընկնում։";
  return "";
}

const fallback = {
  login: "Մուտքը չհաջողվեց։ Ստուգեք հասցեն և գաղտնաբառը։",
  register: "Հաշիվը չստեղծվեց։ Ստուգեք հասցեն և փորձեք կրկին։",
  reset: "Հղումը չուղարկվեց։ Փորձեք կրկին։",
  password: "Գաղտնաբառը չպահպանվեց։ Փորձեք կրկին։",
  email: "Հաստատման նամակը չուղարկվեց։ Փորձեք կրկին։",
  invitation: "Հրավերը չհաջողվեց ավարտել։ Փորձեք կրկին։",
};

export function authErrorMessage(error, action = "login") {
  // The shared account controller uses this sentinel to discard an old actor's reply.
  if (error?.message === "account_session_changed") return "account_session_changed";
  const code = typeof error?.code === "string" ? error.code : "";
  if (code === "over_email_send_rate_limit") {
    return "Էլ. նամակների ուղարկման սահմանաչափը լրացել է։ Խնդրում ենք փորձել ավելի ուշ։";
  }
  if (code === "over_request_rate_limit" || error?.status === 429) {
    return "Փորձերը չափազանց շատ են։ Մի փոքր սպասեք և փորձեք կրկին։";
  }
  if (["captcha_failed", "captcha_required", "captcha_expired"].includes(code)) {
    return "Ավարտեք անվտանգության ստուգումը և փորձեք կրկին։";
  }
  if (code === "captcha_unavailable") {
    return "Անվտանգության ստուգումը չբեռնվեց։ Կրկին փորձեք բեռնել այն։";
  }
  if (code === "weak_password") {
    return "Գաղտնաբառը չի ընդունվել։ Օգտագործեք առնվազն 6 նիշ և փորձեք այլ գաղտնաբառ։";
  }
  if (code === "same_password") {
    return "Նոր գաղտնաբառը պետք է տարբերվի ներկայիս գաղտնաբառից։";
  }
  if (["reauthentication_needed", "reauthentication_not_valid"].includes(code)) {
    return "Գաղտնաբառը փոխելու համար նորից հաստատեք մուտքը կամ խնդրեք վերականգնման նոր հղում։";
  }
  if (error?.name === "AuthRetryableFetchError" || error?.name === "AbortError" ||
      error?.name === "TypeError" && /fetch|network/i.test(error.message || "")) {
    return "Կապը չհաստատվեց։ Ստուգեք ինտերնետային կապը և փորձեք կրկին։";
  }
  // Provider messages may be English or contain account data. Keep fallbacks local.
  return fallback[action] || fallback.login;
}
