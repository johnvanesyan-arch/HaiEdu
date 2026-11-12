// Public configuration only. Activation follows provider/domain setup and review.
// The provider secret belongs in Supabase Auth, never in browser code.
export const AUTH_CHALLENGE = Object.freeze({
  enabled: false,
  provider: "turnstile",
  siteKey: "",
});
