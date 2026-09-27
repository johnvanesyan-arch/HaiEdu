// One completed baseline per learner and chapter. No release/year reset.
export const INITIAL_DIAGNOSTIC_POLICY = "single-initial-diagnostic-v1";

export function chooseInitialDiagnosticForm<T extends { id: string; code: string }>(
  forms: T[], studentId: string, unitCode: string,
): T | null {
  const ordered = [...forms].sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id));
  if (!ordered.length) return null;
  let hash = 2166136261;
  for (const char of `${INITIAL_DIAGNOSTIC_POLICY}|${studentId}|${unitCode}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return ordered[(hash >>> 0) % ordered.length];
}

export function firstCompletedDiagnostic<T extends {
  id: string; mode: string; status: string; completed_at?: string | null; started_at?: string | null;
}>(sessions: T[]): T | null {
  return sessions.filter((row) => row.mode === "diagnostic" && row.status === "completed")
    .sort((a, b) => String(a.completed_at ?? a.started_at ?? "").localeCompare(String(b.completed_at ?? b.started_at ?? ""))
      || a.id.localeCompare(b.id))[0] ?? null;
}

// Call only after authorizing the requested learners. Read separately from bounded
// recent activity so a long Practice history cannot hide the initial baseline.
export async function loadInitialDiagnostics(admin: any, studentIds: string[], unitCode: string) {
  const results = new Map<string, any>();
  for (let offset = 0; offset < studentIds.length; offset += 100) {
    const { data, error } = await admin.from("learning_sessions")
      .select("id,student_id,mode,status,answered_count,correct_count,completed_at,started_at,metadata")
      .in("student_id", studentIds.slice(offset, offset + 100)).eq("unit_code", unitCode)
      .eq("mode", "diagnostic").eq("status", "completed")
      .order("completed_at", { ascending: true }).order("id", { ascending: true });
    if (error) throw error;
    for (const row of data ?? []) if (!results.has(row.student_id)) results.set(row.student_id, row);
  }
  return results;
}
