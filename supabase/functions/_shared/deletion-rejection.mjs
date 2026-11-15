// Reasons an administrator may record when rejecting an account deletion request.
// "other" replaces "legal_hold" (owner decision, 15 November 2026): it has no fixed sentence and may carry
// a short written reason that the account owner sees. "legal_hold" is still accepted from a browser that
// has not reloaded since the change, and is stored as "other".
export const REJECTION_CODES = Object.freeze(["not_verified", "staff_offboarding_required", "duplicate_request", "other"]);
export const REJECTION_NOTE_MAX = 300;

// Returns {code, note} for a valid rejection, or {error} with the code sent to the client.
export function rejectionResolution(resolutionCode, resolutionNote) {
  const requested = String(resolutionCode ?? "");
  const code = requested === "legal_hold" ? "other" : requested;
  if (!REJECTION_CODES.includes(code)) return { error: "invalid_rejection" };
  const note = String(resolutionNote ?? "").trim().replace(/\s+/gu, " ");
  if ([...note].length > REJECTION_NOTE_MAX) return { error: "resolution_note_too_long" };
  // Only "other" carries a written reason; the other reasons have fixed wording on the account page.
  return { code, note: code === "other" && note ? note : null };
}
