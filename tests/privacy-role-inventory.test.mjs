import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";

const studentTables = [
  "learning_source_family_exposures",
  "written_work",
  "class_memberships",
  "institutional_class_enrollments",
  "attempts",
  "learning_sessions",
  "student_skill_mastery",
  "remediation_events",
];

async function invokePrivacy(role) {
  let handler;
  const reads = [];
  const counts = {
    class_memberships: 2,
    institutional_class_enrollments: 1,
    institutional_invitations: 3,
    attempts: 4,
    learning_sessions: 5,
    student_skill_mastery: 6,
    remediation_events: 7,
    teacher_assignments: 8,
    institutional_join_codes: 9,
    security_audit_log: 10,
    item_reviews: 11,
  };
  const client = {
    rpc: async (name, args) => {
      if(name==='service_teacher_task_privacy_counts'){assert.equal(args.p_user_id,'user-a');return{data:{drafts:role==='teacher'?3:0,received:role==='student'?2:0},error:null};}
      if(name==='service_resource_assignment_privacy_counts'){assert.ok(['teacher','student'].includes(role));assert.equal(args.p_user_id,'user-a');return {data:{materialAssignmentsReceived:4,materialAssignmentsSent:2},error:null};}
      if(name==='service_teacher_feedback_privacy_counts'){assert.equal(role,'teacher');assert.equal(args.p_user,'user-a');return{data:{feedbackDrafts:1,feedbackSnippets:2,feedbackReceipts:3},error:null};}
      assert.equal(name, 'service_unit_material_privacy_counts');
      assert.equal(args.p_user_id, 'user-a');
      return {data:{materialVersions:2,materialReviews:3,materialEvents:5},error:null};
    },
    auth: {
      getUser: async () => ({
        data: { user: { id: "user-a", email: "user@example.com" } },
        error: null,
      }),
    },
    from(table) {
      reads.push(table);
      const query = new Proxy({}, {
        get(_, key) {
          if (key === "then") {
            return (done) => done({
              data: table === "profiles"
                ? { role, display_name: "Test user", account_status: "active", created_at: "2026-09-01T00:00:00Z" }
                : table === "institutional_memberships"
                  ? [{ id: "membership-a" }]
                  : null,
              count: counts[table] ?? 0,
              error: null,
            });
          }
          return () => query;
        },
      });
      return query;
    },
  };

  const source = readFileSync("supabase/functions/get-my-privacy/index.ts", "utf8")
    .replace(/^import .*;\n/gm, "");
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => client,
    Deno: { env: { get: () => "configured" }, serve: (fn) => { handler = fn; } },
    Response,
    console,
  });
  const response = await handler(new Request("https://test.invalid", {
    method: "POST",
    headers: { Authorization: "Bearer test" },
    body: "{}",
  }));
  return { status: response.status, payload: await response.json(), reads };
}

test("student privacy inventory includes learning data and both enrollment systems", async () => {
  const result = await invokePrivacy("student");
  assert.equal(result.status, 200);
  for (const table of studentTables) assert.ok(result.reads.includes(table), table);
  assert.equal(result.payload.dataInventory.kind, "student");
  assert.equal(result.payload.dataInventory.materialAssignmentsReceived,4);
  assert.equal(result.payload.dataInventory.materialAssignmentsSent,undefined);
  assert.equal(result.payload.dataInventory.classMemberships, 3);
  assert.equal(result.payload.dataInventory.invitationsReceived, 3);
  assert.equal(result.reads.includes("security_audit_log"), false);
  assert.equal(result.reads.includes("teacher_assignments"), false);
});

for (const role of ["teacher", "school_admin", "content_admin", "admin"]) {
  test(`${role} privacy inventory never queries student-performance tables`, async () => {
    const result = await invokePrivacy(role);
    assert.equal(result.status, 200);
    for (const table of studentTables) {
      assert.equal(result.reads.includes(table), false, `${role} queried ${table}`);
    }
    assert.equal(result.payload.dataInventory.kind, role);
    assert.ok(result.reads.includes("security_audit_log"));
    if (["content_admin", "admin"].includes(role)) {
      assert.ok(result.reads.includes("written_task_versions"));
      assert.equal(result.payload.dataInventory.writtenTaskReviews, 0);
      assert.equal(result.payload.dataInventory.materialVersions, 2);
      assert.equal(result.payload.dataInventory.materialReviews, 3);
      assert.equal(result.payload.dataInventory.materialEvents, 5);
    }
  });
}

test("teacher inventory reports only teacher-owned institutional records", async () => {
  const result = await invokePrivacy("teacher");
  assert.deepEqual(result.payload.dataInventory, {
    kind: "teacher",
    teacherTasks:{drafts:3,received:0},
    institutionalMemberships: 1,
    teachingAssignments: 8,
    materialAssignmentsSent: 2,
    writtenReviews: 0,
    feedbackDrafts:1,feedbackSnippets:2,feedbackReceipts:3,
    invitationRecords: 12,
    auditEvents: 10,
  });
  for (const table of [
    "institutional_memberships",
    "teacher_assignments",
    "institutional_invitations",
    "institutional_join_codes",
    "security_audit_log",
  ]) assert.ok(result.reads.includes(table), table);
});

test("privacy interface has role-specific inventory copy and anchors", () => {
  const html = readFileSync("web/privacy.html", "utf8");
  const js = readFileSync("web/privacy.js", "utf8");
  assert.match(html, /id="inventoryTitle"/);
  assert.match(html, /id="inventoryDescription"/);
  assert.match(html, /id="inventoryMinimization"/);
  assert.match(js, /school_admin: "Դպրոցի ադմին"/);
  assert.match(js, /Աշակերտների արդյունքները այստեղ չեն ներկայացվում/);
  assert.match(js, /Դասավանդման նշանակումներ/);
  assert.match(js, /Բովանդակության ստուգումներ/);
  assert.match(js, /Master admin-ի պրոֆիլում/);
});
