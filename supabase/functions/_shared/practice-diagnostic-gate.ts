// Chapter identity includes subject and grade. A score threshold is intentionally absent.
export function isPracticeMode(mode: string): boolean {
  return mode === "practice" || mode === "chapter_review";
}

export async function getPracticeDiagnosticBlock(admin: any, studentId: string, unitCode: string, mode: string) {
  if (!isPracticeMode(mode)) return null;
  const { data, error } = await admin.from("learning_sessions").select("id")
    .eq("student_id", studentId).eq("unit_code", unitCode)
    .eq("mode", "diagnostic").eq("status", "completed").limit(1).maybeSingle();
  if (error) return { status: 503, body: { error: "diagnostic_history_failed" } };
  if (data) return null;
  return { status: 403, body: {
    error: "chapter_diagnostic_required", unitCode, diagnosticRequired: true,
    messageHy: "Վարժանքները բացելու համար նախ ավարտեք այս գլխի սկզբնական ախտորոշիչը։ Ցանկացած արդյունք բացում է վարժանքները։",
  } };
}
