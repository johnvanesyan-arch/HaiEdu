import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = stripTypeScriptTypes(readFileSync(
  "supabase/functions/_shared/course-access.ts",
  "utf8",
));
const courseAccess = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function fakeAdmin(rows) {
  const calls = [];
  return {
    calls,
    from(table) {
      const result = { data: rows[table] ?? [], error: null };
      const chain = {
        select(...args) { calls.push({ table, operation: "select", args }); return chain; },
        eq(...args) { calls.push({ table, operation: "eq", args }); return chain; },
        lte(...args) { calls.push({ table, operation: "lte", args }); return chain; },
        or(...args) { calls.push({ table, operation: "or", args }); return chain; },
        in(...args) { calls.push({ table, operation: "in", args }); return chain; },
        order(...args) {
          calls.push({ table, operation: "order", args });
          return Promise.resolve(result);
        },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
      };
      return chain;
    },
  };
}

const catalog = {
  classes: [{
    id: "class-1",
    name: "Math 7A",
    academic_year: "2026-2027",
    is_active: true,
    subject_id: "subject-1",
    grade_id: "grade-7",
  }],
  subjects: [{ id: "subject-1", code: "physics", name_hy: "Ֆիզիկա" }],
  grades: [{ id: "grade-7", grade_number: 7, label_hy: "7-րդ դասարան" }],
};

test("active institutional enrollment grants the same Physics 7 entitlement as legacy access", async () => {
  const admin = fakeAdmin({
    ...catalog,
    institutional_class_enrollments: [{
      class_id: "class-1",
      valid_from: "2026-09-25T21:17:46.639Z",
    }],
    class_memberships: [],
  });

  const entitlements = await courseAccess.getStudentCourseEntitlements(admin, "student-1");

  assert.equal(entitlements.length, 1);
  assert.equal(entitlements[0].classId, "class-1");
  assert.equal(entitlements[0].courseKey, undefined);
  assert.equal(entitlements[0].subjectCode, "physics");
  assert.equal(entitlements[0].gradeNumber, 7);
  assert.equal(entitlements[0].joinedAt, "2026-09-25T21:17:46.639Z");
  assert.equal(await courseAccess.hasPhysics7Access(admin, "student-1"), true);

  assert.ok(admin.calls.some((call) => call.table === "institutional_class_enrollments"
    && call.operation === "eq" && call.args[0] === "status" && call.args[1] === "active"));
  assert.ok(admin.calls.some((call) => call.table === "institutional_class_enrollments"
    && call.operation === "lte" && call.args[0] === "valid_from"));
  assert.ok(admin.calls.some((call) => call.table === "institutional_class_enrollments"
    && call.operation === "or" && String(call.args[0]).includes("valid_to.is.null")));
});

test("legacy membership access remains available", async () => {
  const admin = fakeAdmin({
    ...catalog,
    institutional_class_enrollments: [],
    class_memberships: [{ class_id: "class-1", joined_at: "2026-09-18T10:00:00Z" }],
  });

  const entitlements = await courseAccess.getStudentCourseEntitlements(admin, "student-2");

  assert.equal(entitlements.length, 1);
  assert.equal(entitlements[0].classId, "class-1");
  assert.equal(entitlements[0].joinedAt, "2026-09-18T10:00:00Z");
});

test("institutional enrollment wins when both models reference the same class", async () => {
  const admin = fakeAdmin({
    ...catalog,
    institutional_class_enrollments: [{
      class_id: "class-1",
      valid_from: "2026-09-25T21:17:46.639Z",
    }],
    class_memberships: [{ class_id: "class-1", joined_at: "2026-09-18T10:00:00Z" }],
  });

  const entitlements = await courseAccess.getStudentCourseEntitlements(admin, "student-3");

  assert.equal(entitlements.length, 1);
  assert.equal(entitlements[0].joinedAt, "2026-09-25T21:17:46.639Z");
});

test("get-student-classes uses the shared entitlement resolver", () => {
  const functionSource = readFileSync("supabase/functions/get-student-classes/index.ts", "utf8");
  assert.match(functionSource, /getStudentCourseEntitlements/);
  assert.match(functionSource, /courseKey:/);
});

test("chapter mastery lifecycle no longer carries a legacy-only access check", () => {
  const functionSource = readFileSync(
    "supabase/functions/get-chapter-mastery-lifecycle/index.ts",
    "utf8",
  );
  assert.match(functionSource, /from "\.\.\/_shared\/course-access\.ts"/);
  assert.doesNotMatch(functionSource, /from\("class_memberships"\)/);
});
