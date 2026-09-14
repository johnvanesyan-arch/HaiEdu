type AdminClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    const value = JSON.parse(decoded);
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function hasActiveLiveSession(
  admin: AdminClient,
  token: string,
  userId: string,
): Promise<boolean> {
  const claims = parseJwtPayload(token);
  const sessionId = typeof claims?.session_id === "string" ? claims.session_id : null;
  if (!sessionId) return false;

  const { data, error } = await admin.rpc("service_validate_active_session", {
    p_user_id: userId,
    p_session_id: sessionId,
  });

  return !error && data === true;
}
