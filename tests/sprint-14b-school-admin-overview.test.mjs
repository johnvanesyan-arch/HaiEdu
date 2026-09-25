import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

const actor = '123e4567-e89b-42d3-a456-426614174000';
const schoolA = '223e4567-e89b-42d3-a456-426614174000';
const schoolB = '323e4567-e89b-42d3-a456-426614174000';
const teacher = '423e4567-e89b-42d3-a456-426614174000';
const teacherMembership = '523e4567-e89b-42d3-a456-426614174000';
const klass = '623e4567-e89b-42d3-a456-426614174000';
const programme = '723e4567-e89b-42d3-a456-426614174000';
const subject = '823e4567-e89b-42d3-a456-426614174000';
const grade = '923e4567-e89b-42d3-a456-426614174000';
const year = 'a23e4567-e89b-42d3-a456-426614174000';

const current = { status: 'active', valid_from: '2026-01-01T00:00:00Z', valid_to: null };

class Query {
  constructor(table, rows, actorProfile) {
    this.table = table;
    this.rows = rows;
    this.actorProfile = actorProfile;
    this.filters = [];
  }
  select() { return this; }
  order() { return this; }
  eq(column, value) { this.filters.push({ type: 'eq', column, value }); return this; }
  in(column, values) { this.filters.push({ type: 'in', column, values }); return this; }
  result() {
    let data = [...(this.rows[this.table] ?? [])];
    for (const filter of this.filters) {
      data = data.filter((row) => filter.type === 'eq'
        ? row[filter.column] === filter.value
        : filter.values.includes(row[filter.column]));
    }
    return { data, error: null };
  }
  maybeSingle() {
    if (this.table === 'profiles' && this.filters.some((filter) => filter.column === 'id' && filter.value === actor)) {
      return Promise.resolve({ data: this.actorProfile, error: null });
    }
    const { data, error } = this.result();
    return Promise.resolve({ data: data[0] ?? null, error });
  }
  then(resolve, reject) { return Promise.resolve(this.result()).then(resolve, reject); }
}

function fixture(role = 'school_admin') {
  return {
    profiles: [{ id: teacher, display_name: 'Teacher One', account_status: 'active' }],
    schools: [
      { id: schoolA, name: 'School A', school_code: 'A-001' },
      { id: schoolB, name: 'School B', school_code: 'B-001' },
    ],
    institutional_memberships: [
      { school_id: schoolA, person_id: actor, role: 'school_admin', ...current },
      { id: teacherMembership, school_id: schoolA, person_id: teacher, role: 'teacher', ...current },
      { school_id: schoolB, person_id: teacher, role: 'teacher', ...current },
    ],
    classes: [{ id: klass, school_id: schoolA, subject_id: subject, grade_id: grade,
      name: '7A', academic_year: '2026–2027', academic_year_id: year, is_active: true }],
    teacher_assignments: [{ id: 'assignment', school_id: schoolA, academic_year_id: year,
      class_id: klass, teacher_membership_id: teacherMembership, subject_program_id: programme, ...current }],
    institutional_class_enrollments: [],
    teacher_subject_authorizations: [{ id: 'authorization', school_id: schoolA,
      teacher_membership_id: teacherMembership, subject_id: subject, ...current }],
    subjects: [{ id: subject, code: 'PHY', name_hy: 'Ֆիզիկա', name_en: 'Physics' }],
    subject_programs: [{ id: programme, subject_id: subject, grade_id: grade, version_label: '2026' }],
    grades: [{ id: grade, grade_number: 7, label_hy: '7-րդ դասարան', label_en: 'Grade 7' }],
    academic_years: [{ id: year, school_id: schoolA, label: '2026–2027', status: 'active' }],
    actorProfile: { role, display_name: 'Actor', account_status: 'active' },
  };
}

async function invoke({ role = 'school_admin', active = true } = {}) {
  let handler;
  const rows = fixture(role);
  const admin = {
    auth: {
      getUser: async () => ({ data: { user: { id: actor } }, error: null }),
      admin: { listUsers: async () => ({ data: { users: [
        { id: teacher, email: 'teacher@example.test' },
      ] }, error: null }) },
    },
    from: (table) => new Query(table, rows, rows.actorProfile),
  };
  const source = readFileSync('supabase/functions/get-school-admin-overview/index.ts', 'utf8')
    .replace(/^import .*;\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    createClient: () => admin,
    hasActiveLiveSession: async () => active,
    Deno: { env: { get: () => 'configured' }, serve: (fn) => { handler = fn; } },
    Response, Request, Date, Set, Map, atob, console,
  });
  const payload = Buffer.from(JSON.stringify({ aal: 'aal2' })).toString('base64url');
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: `Bearer x.${payload}.y` }, body: '{}',
  }));
  return { status: response.status, body: await response.json() };
}

test('school admin receives only the school authorized by current membership', async () => {
  const result = await invoke();
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.schools.map((school) => school.id), [schoolA]);
  assert.equal(result.body.schools[0].counts.teachers, 1);
  assert.equal(result.body.schools[0].counts.classes, 1);
  assert.equal(result.body.schools[0].teachers[0].email, 'teacher@example.test');
  assert.equal(result.body.performanceAnalyticsAvailable, false);
});

test('platform admin may receive all schools while ordinary roles are denied', async () => {
  const platform = await invoke({ role: 'admin' });
  assert.equal(platform.status, 200);
  assert.deepEqual(platform.body.schools.map((school) => school.id), [schoolA, schoolB]);

  const ordinary = await invoke({ role: 'teacher' });
  assert.equal(ordinary.status, 403);
  assert.equal(ordinary.body.error, 'school_admin_required');
});

test('inactive live sessions are rejected before protected data is queried', async () => {
  const result = await invoke({ active: false });
  assert.equal(result.status, 403);
  assert.equal(result.body.error, 'account_or_session_inactive');
});

test('front end presents operational hierarchy and an explicit analytics gate', () => {
  const html = readFileSync('web/school-admin.html', 'utf8');
  const js = readFileSync('web/school-admin.js', 'utf8');
  const css = readFileSync('web/school-admin.css', 'utf8');
  assert.match(html, /Ուսուցիչ → դասարան → աշակերտ/);
  assert.match(html, /Վերլուծական վահանակը դեռ չի ակտիվացվել/);
  assert.match(js, /get-school-admin-overview/);
  assert.match(js, /teacher\.classes/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.doesNotMatch(html, /\b(?:75|80|90)%\b/);
});
