// Public configuration only. Server enforcement follows the reviewed rollout.
// The provider secret belongs in Supabase Auth, never in browser code.
export const AUTH_CHALLENGE = Object.freeze({
  enabled: true,
  provider: "turnstile",
  siteKey: "0x4AAAAAAF94SqvxZr4Z0G2C",
});
