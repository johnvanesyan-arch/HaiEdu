import { createClient } from "npm:@supabase/supabase-js@2";
import { hasActiveLiveSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_not_configured" }, 500);
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
    if (!(await hasActiveLiveSession(admin, token, userData.user.id))) return json({ error: "account_or_session_inactive" }, 403);

    const actorId = userData.user.id;
    const { data: profile } = await admin.from("profiles").select("role, display_name").eq("id", actorId).maybeSingle();
    if (!profile || !["admin", "content_admin"].includes(String(profile.role))) return json({ error: "content_admin_required" }, 403);

    const [itemResult, gradeResult, subjectResult, frameworkResult, programResult, unitResult, scopeResult] = await Promise.all([
      admin.from("items")
        .select("id, code, skill_id, item_type, prompt_hy, difficulty, difficulty_band, item_family, source_reference, validation_state, review_status, version_no, status, retired_at, retired_reason, replacement_item_id, updated_at, skills(code, name_hy, subject_id, grade_id)")
        .order("code", { ascending: true }),
      admin.from("grades").select("id, grade_number, label_hy, label_en").order("grade_number", { ascending: true }),
      admin.from("subjects").select("id, code, name_hy, name_en, status").order("name_en", { ascending: true }),
      admin.from("curriculum_frameworks").select("id, title, version_label, effective_from, effective_to, status").order("effective_from", { ascending: false }),
      admin.from("subject_programs").select("id, curriculum_framework_id, subject_id, grade_id, version_label, effective_from, effective_to, status"),
      admin.from("units").select("id, subject_program_id, code, title_hy, title_en, sequence_order, status").order("sequence_order", { ascending: true }),
      admin.from("item_curriculum_scopes").select("item_id, subject_program_id, unit_id, is_primary").eq("is_primary", true),
    ]);

    if (itemResult.error) return json({ error: "items_query_failed", detail: itemResult.error.message }, 500);
    for (const [name, result] of [["grades", gradeResult], ["subjects", subjectResult], ["frameworks", frameworkResult], ["programs", programResult], ["units", unitResult], ["scopes", scopeResult]] as const) {
      if (result.error) return json({ error: `${name}_query_failed`, detail: result.error.message }, 500);
    }

    const items = itemResult.data ?? [];
    const grades = gradeResult.data ?? [];
    const subjects = subjectResult.data ?? [];
    const frameworks = frameworkResult.data ?? [];
    const programs = programResult.data ?? [];
    const units = unitResult.data ?? [];
    const scopes = scopeResult.data ?? [];

    const gradeById = new Map(grades.map((row: any) => [row.id, row]));
    const subjectById = new Map(subjects.map((row: any) => [row.id, row]));
    const frameworkById = new Map(frameworks.map((row: any) => [row.id, row]));
    const programById = new Map(programs.map((row: any) => [row.id, row]));
    const unitById = new Map(units.map((row: any) => [row.id, row]));
    const primaryScopeByItem = new Map(scopes.map((row: any) => [row.item_id, row]));

    const itemIds = items.map((i: any) => i.id);
    const [qaResult, reviewResult, mappingResult, versionResult] = await Promise.all([
      itemIds.length ? admin.from("item_qa_runs").select("item_id, version_no, passed, errors, warnings, created_at").in("item_id", itemIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? admin.from("item_reviews").select("item_id, version_no, review_type, decision, notes, created_at").in("item_id", itemIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? admin.from("item_misconception_mappings").select("item_id, response_key, misconceptions(code, title_hy)").in("item_id", itemIds) : Promise.resolve({ data: [] as any[] }),
      itemIds.length ? admin.from("item_versions").select("item_id, version_no, change_summary, created_at").in("item_id", itemIds).order("version_no", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
    ]);

    const latestBy = (rows: any[], key: string) => {
      const map = new Map<string, any>();
      for (const row of rows) if (!map.has(row[key])) map.set(row[key], row);
      return map;
    };
    const latestQa = latestBy(qaResult.data ?? [], "item_id");
    const latestReview = latestBy(reviewResult.data ?? [], "item_id");
    const latestVersion = latestBy(versionResult.data ?? [], "item_id");
    const misconceptions = new Map<string, any[]>();
    for (const row of mappingResult.data ?? []) {
      const list = misconceptions.get(row.item_id) ?? [];
      list.push({ responseKey: row.response_key, code: row.misconceptions?.code ?? null, titleHy: row.misconceptions?.title_hy ?? null });
      misconceptions.set(row.item_id, list);
    }

    const rows = items.map((item: any) => {
      const qaRaw = latestQa.get(item.id) ?? null;
      const reviewRaw = latestReview.get(item.id) ?? null;
      const qa = qaRaw && Number(qaRaw.version_no) === Number(item.version_no) ? qaRaw : null;
      const review = reviewRaw && Number(reviewRaw.version_no) === Number(item.version_no) ? reviewRaw : null;
      const version = latestVersion.get(item.id) ?? null;
      const scope: any = primaryScopeByItem.get(item.id) ?? null;
      const program: any = scope ? programById.get(scope.subject_program_id) : null;
      const unit: any = scope ? unitById.get(scope.unit_id) : null;
      const subject: any = program ? subjectById.get(program.subject_id) : null;
      const grade: any = program ? gradeById.get(program.grade_id) : null;
      const framework: any = program ? frameworkById.get(program.curriculum_framework_id) : null;

      return {
        id: item.id,
        code: item.code,
        skill: {
          id: item.skill_id,
          code: item.skills?.code ?? null,
          nameHy: item.skills?.name_hy ?? null,
          subjectId: item.skills?.subject_id ?? null,
          gradeId: item.skills?.grade_id ?? null,
        },
        curriculum: scope ? {
          subject: subject ? { id: subject.id, code: subject.code, nameHy: subject.name_hy, nameEn: subject.name_en } : null,
          grade: grade ? { id: grade.id, number: Number(grade.grade_number), labelHy: grade.label_hy, labelEn: grade.label_en } : null,
          program: program ? { id: program.id, versionLabel: program.version_label, frameworkId: program.curriculum_framework_id } : null,
          framework: framework ? { id: framework.id, title: framework.title, versionLabel: framework.version_label } : null,
          unit: unit ? { id: unit.id, code: unit.code, titleHy: unit.title_hy, titleEn: unit.title_en } : null,
        } : null,
        type: item.item_type,
        promptHy: item.prompt_hy,
        difficulty: Number(item.difficulty),
        difficultyBand: item.difficulty_band,
        itemFamily: item.item_family,
        sourceReference: item.source_reference,
        validationState: item.validation_state,
        reviewStatus: item.review_status,
        versionNo: Number(item.version_no),
        lifecycleStatus: item.status,
        retiredAt: item.retired_at,
        retiredReason: item.retired_reason,
        replacementItemId: item.replacement_item_id,
        updatedAt: item.updated_at,
        misconceptions: misconceptions.get(item.id) ?? [],
        latestQa: qa ? { passed: qa.passed, errors: qa.errors ?? [], warnings: qa.warnings ?? [], versionNo: qa.version_no, createdAt: qa.created_at } : null,
        latestReview: review ? { decision: review.decision, type: review.review_type, notes: review.notes, versionNo: review.version_no, createdAt: review.created_at } : null,
        latestSnapshot: version ? { versionNo: version.version_no, changeSummary: version.change_summary, createdAt: version.created_at } : null,
      };
    });

    const active = rows.filter((r: any) => !r.retiredAt);
    const programCatalog = programs.map((program: any) => {
      const subject: any = subjectById.get(program.subject_id);
      const grade: any = gradeById.get(program.grade_id);
      const framework: any = frameworkById.get(program.curriculum_framework_id);
      return {
        id: program.id,
        subjectId: program.subject_id,
        gradeId: program.grade_id,
        versionLabel: program.version_label,
        status: program.status,
        subjectNameHy: subject?.name_hy ?? null,
        subjectNameEn: subject?.name_en ?? null,
        gradeNumber: grade ? Number(grade.grade_number) : null,
        gradeLabelHy: grade?.label_hy ?? null,
        gradeLabelEn: grade?.label_en ?? null,
        framework: framework ? { id: framework.id, title: framework.title, versionLabel: framework.version_label } : null,
      };
    });

    return json({
      actor: { id: actorId, role: profile.role, displayName: profile.display_name || "Content admin" },
      catalog: {
        grades: grades.map((g: any) => ({ id: g.id, number: Number(g.grade_number), labelHy: g.label_hy, labelEn: g.label_en })),
        subjects: subjects.map((s: any) => ({ id: s.id, code: s.code, nameHy: s.name_hy, nameEn: s.name_en, status: s.status })),
        programs: programCatalog,
        units: units.map((u: any) => ({ id: u.id, programId: u.subject_program_id, code: u.code, titleHy: u.title_hy, titleEn: u.title_en, sequenceOrder: u.sequence_order, status: u.status })),
      },
      stats: {
        totalItems: rows.length,
        published: active.filter((r: any) => r.lifecycleStatus === "published").length,
        reviewQueue: active.filter((r: any) => ["needs_review", "in_review", "changes_requested", "unreviewed"].includes(r.reviewStatus)).length,
        approved: active.filter((r: any) => r.reviewStatus === "approved").length,
        qaFailed: active.filter((r: any) => r.latestQa && !r.latestQa.passed).length,
        qaMissing: active.filter((r: any) => !r.latestQa).length,
        retired: rows.filter((r: any) => Boolean(r.retiredAt)).length,
        provisionalSme: active.filter((r: any) => r.validationState === "provisional_no_sme_review").length,
        unscoped: rows.filter((r: any) => !r.curriculum).length,
      },
      items: rows,
    });
  } catch (err) {
    console.error("get-content-quality-dashboard", err);
    return json({ error: "content_quality_dashboard_failed", detail: err instanceof Error ? err.message : String(err) }, 500);
  }
});
