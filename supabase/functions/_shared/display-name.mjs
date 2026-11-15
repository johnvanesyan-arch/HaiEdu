// One display-name rule for every role and every writer (owner decision, 14 November 2026):
// required, 2–80 characters, leading and trailing spaces removed, repeated spaces collapsed.
// web/account-core.mjs carries the same rule for the browser; tests/display-name-rule.test.mjs keeps them identical.
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 80;

export function normalizeDisplayName(value) {
  return String(value ?? "").trim().replace(/\s+/gu, " ");
}

// Returns null for a valid name, otherwise the error code sent to the client.
export function displayNameError(value) {
  const length = [...normalizeDisplayName(value)].length;
  if (length === 0) return "display_name_required";
  if (length < DISPLAY_NAME_MIN) return "display_name_too_short";
  if (length > DISPLAY_NAME_MAX) return "display_name_too_long";
  return null;
}
