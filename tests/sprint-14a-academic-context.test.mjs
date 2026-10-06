import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAuthorizedTeacherAcademicContext, AcademicContextDenied } from '../supabase/functions/_shared/academic-context.ts';

const now = new Date('2026-09-23T12:00:00Z');
const rows = {
  profiles:{id:'teacher-a',role:'teacher',account_status:'active'},
  teacher_subject_authorizations:{id:'grant-a',school_id:'school-a',teacher_membership_id:'member-a',subject_id:'subject-a',status:'active',valid_from:'2026-09-01T00:00:00Z',valid_to:null},
  teacher_assignments: { id: 'a', school_id: 'school-a', academic_year_id: 'year-a', class_id: 'class-a', teacher_membership_id: 'member-a', subject_program_id: 'program-a', status: 'active', valid_from: '2026-09-01T00:00:00Z', valid_to: null },
  institutional_memberships: { id: 'member-a', school_id: 'school-a', person_id: 'teacher-a', role: 'teacher', status: 'active', valid_from: '2026-09-01T00:00:00Z', valid_to: null },
  classes: { id: 'class-a', school_id: 'school-a', academic_year_id: 'year-a', subject_id: 'subject-a', grade_id: 'grade-7', is_active: true },
  academic_years: { id: 'year-a', school_id: 'school-a', status: 'active', starts_on: '2026-09-01', ends_on: '2027-08-31' },
  subject_programs: { status:'published',id: 'program-a', subject_id: 'subject-a', grade_id: 'grade-7' },
  curriculum_releases: { id: 'release-a', subject_program_id: 'program-a', status: 'pilot', effective_from: '2026-09-01', effective_to: null },
  units: { id: 'unit-2', subject_program_id: 'program-a', code: 'DRAFT-CODE', sequence_order: 99, title_hy: 'Խմբագրական տարբերակ', status: 'review' },
  curriculum_release_units: { curriculum_release_id: 'release-a', unit_id: 'unit-2', unit_code_snapshot: 'PHY7-U02', title_hy_snapshot: 'Գլուխ II', sequence_order_snapshot: 2 },
  subjects: { id: 'subject-a', code: 'physics', name_hy: 'Ֆիզիկա' },
  grades: { id: 'grade-7', grade_number: 7, label_hy: '7-րդ դասարան' },
};
const selection = { assignmentId: 'a', curriculumReleaseId: 'release-a', unitId: 'unit-2' };
function mock(overrides = {}) {
  const data = Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, { ...value, ...overrides[key] }]));
  return { from(table) {
    return { select() {
      const filters = [];
      const query = {
        eq(column, value) { filters.push([column, value]); return query; },
        then(resolve,reject) { const candidate=data[table];return Promise.resolve({data:candidate && filters.every(([column,value])=>candidate[column]===value)?[candidate]:[],error:null}).then(resolve,reject); },
        async maybeSingle() {
          const candidate = data[table];
          return {
            data: candidate && filters.every(([column, value]) => candidate[column] === value) ? candidate : null,
            error: null,
          };
        },
      };
      return query;
    } };
  } };
}
const resolve = (changes = {}, teacher = 'teacher-a', choice = selection) =>
  resolveAuthorizedTeacherAcademicContext(mock(changes), teacher, choice, now);

test('returns a server-authorized context for the selected second unit', async () => {
  const context = await resolve();
  assert.equal(context.schoolId, 'school-a');
  assert.equal(context.classId, 'class-a');
  assert.equal(context.unitCode, 'PHY7-U02');
  assert.equal(context.unitSequence, 2);
  assert.equal(context.unitTitleHy, 'Գլուխ II');
});

test('uses the immutable release-unit snapshot while the mutable unit remains in editorial review', async () => {
  const context = await resolve({ units: { status: 'review', code: 'CHANGED', sequence_order: 42 } });
  assert.equal(context.unitCode, 'PHY7-U02');
  assert.equal(context.unitSequence, 2);
  assert.equal(context.unitTitleHy, 'Գլուխ II');
});

test('same programme in a second school is visible only to its assigned teacher', async () => {
  const schoolB = {
    profiles:{id:'teacher-b'}, teacher_subject_authorizations:{school_id:'school-b',teacher_membership_id:'member-b'},
    teacher_assignments: { school_id: 'school-b', class_id: 'class-b', academic_year_id: 'year-b', teacher_membership_id: 'member-b' },
    institutional_memberships: { id: 'member-b', school_id: 'school-b', person_id: 'teacher-b' },
    classes: { id: 'class-b', school_id: 'school-b', academic_year_id: 'year-b' },
    academic_years: { id: 'year-b', school_id: 'school-b' },
  };
  assert.equal((await resolve(schoolB, 'teacher-b')).schoolId, 'school-b');
  await assert.rejects(resolve(schoolB, 'teacher-a'), AcademicContextDenied);
});

test('another subject and grade can use the same authorized context contract', async () => {
  const subjectB = {
    teacher_subject_authorizations:{subject_id:'subject-b'},
    teacher_assignments: { subject_program_id: 'program-b' },
    classes: { subject_id: 'subject-b', grade_id: 'grade-8' },
    subject_programs: { id: 'program-b', subject_id: 'subject-b', grade_id: 'grade-8' },
    curriculum_releases: { subject_program_id: 'program-b' },
    units: { subject_program_id: 'program-b' },
    curriculum_release_units: { unit_code_snapshot: 'SUB8-U02' },
    subjects: { id: 'subject-b', code: 'subject-b' },
    grades: { id: 'grade-8', grade_number: 8 },
  };
  const context = await resolve(subjectB);
  assert.equal(context.subjectCode, 'subject-b');
  assert.equal(context.gradeNumber, 8);
  assert.equal(context.unitCode, 'SUB8-U02');
});

for (const [name, changes, teacher, choice] of [
  ['another teacher', {}, 'teacher-b', selection],
  ['cross-school class', { classes: { school_id: 'school-b' } }, 'teacher-a', selection],
  ['cross-school membership', { institutional_memberships: { school_id: 'school-b' } }, 'teacher-a', selection],
  ['ended membership', { institutional_memberships: { valid_to: '2026-09-22T00:00:00Z' } }, 'teacher-a', selection],
  ['expired assignment', { teacher_assignments: { valid_to: '2026-09-22T00:00:00Z' } }, 'teacher-a', selection],
  ['legacy class without school', { classes: { school_id: null } }, 'teacher-a', selection],
  ['wrong programme release', { curriculum_releases: { subject_program_id: 'program-b' } }, 'teacher-a', selection],
  ['legacy release', { curriculum_releases: { status: 'legacy' } }, 'teacher-a', selection],
  ['wrong programme unit', { units: { subject_program_id: 'program-b' } }, 'teacher-a', selection],
  ['unit missing from release snapshot', { curriculum_release_units: { unit_id: 'unit-1' } }, 'teacher-a', selection],
  ['release snapshot without a code', { curriculum_release_units: { unit_code_snapshot: '' } }, 'teacher-a', selection],
  ['release snapshot without a title', { curriculum_release_units: { title_hy_snapshot: '' } }, 'teacher-a', selection],
  ['forged assignment URL', {}, 'teacher-a', { ...selection, assignmentId: 'other' }],
  ['forged unit URL', {}, 'teacher-a', { ...selection, unitId: 'other' }],
]) {
  test(`denies ${name}`, async () => {
    await assert.rejects(resolve(changes, teacher, choice), AcademicContextDenied);
  });
}

test('closed original year and ended original assignment remain read-only to the same authorized teacher',async()=>{
 const context=await resolve({teacher_assignments:{status:'ended',valid_to:'2026-09-22T00:00:00Z'},academic_years:{status:'closed'},classes:{is_active:false},curriculum_releases:{status:'retired'}});
 assert.equal(context.readOnlyHistory,true);
});
for(const [name,changes] of [
 ['suspended teacher',{profiles:{account_status:'suspended'}}],
 ['revoked subject grant',{teacher_subject_authorizations:{status:'revoked'}}],
 ['foreign subject grant',{teacher_subject_authorizations:{subject_id:'foreign'}}],
]) test('historical access does not bypass '+name,async()=>{
 await assert.rejects(resolve({...changes,teacher_assignments:{status:'ended',valid_to:'2026-09-22T00:00:00Z'},academic_years:{status:'closed'}}),AcademicContextDenied);
});

function batchMock(count=19,change=()=>{},onQuery=()=>{}) {
  const data=Object.fromEntries(Object.entries(rows).map(([table,row])=>[table,[structuredClone(row)]]));
  data.teacher_assignments=Array.from({length:count},(_,i)=>({...rows.teacher_assignments,id:'assignment-'+i,class_id:'class-'+i}));
  data.classes=Array.from({length:count},(_,i)=>({...rows.classes,id:'class-'+i}));
  change(data);
  const calls=[];
  const admin={from(table){return {select(){
    const filters=[];const orders=[];let bounds=null;
    const query={
      eq(column,value){filters.push(row=>row[column]===value);return query;},
      in(column,values){filters.push(row=>values.includes(row[column]));return query;},
      order(column){orders.push(column);return query;},
      range(from,to){bounds=[from,to];return query;},
      async maybeSingle(){const result=await query;return {...result,data:result.data[0]??null};},
      then(resolve,reject){calls.push({table,bounds,orders});onQuery(table,data);
        let candidates=(data[table]??[]).filter(row=>filters.every(filter=>filter(row)));
        candidates.sort((a,b)=>{for(const column of orders){const comparison=String(a[column]).localeCompare(String(b[column]));if(comparison)return comparison;}return 0;});
        if(bounds)candidates=candidates.slice(bounds[0],bounds[1]+1);
        return Promise.resolve({data:structuredClone(candidates),error:null}).then(resolve,reject);
      },
    };return query;
  }}}};
  return {admin,calls,selections:data.teacher_assignments.map(assignment=>({...selection,assignmentId:assignment.id}))};
}
const resolveBatch=async(mock,clock=()=>now)=>{
  const {resolveTeacherAcademicContextsBatch}=await import('../supabase/functions/_shared/academic-context.ts');
  return resolveTeacherAcademicContextsBatch(mock.admin,'teacher-a',mock.selections,clock);
};

test('19 classroom contexts share 12 inventory reads and retain selection order',async()=>{
  const mock=batchMock();mock.selections.reverse();const contexts=await resolveBatch(mock);
  assert.deepEqual(contexts.map(context=>context.assignmentId),mock.selections.map(selection=>selection.assignmentId));
  assert.equal(mock.calls.length,12);
  assert.equal(new Set(mock.calls.map(call=>call.table)).size,12);
  assert.ok(contexts.every(context=>context.schoolId==='school-a' && context.unitCode==='PHY7-U02'));
});
for(const [name,change] of [
  ['foreign-school classroom',data=>{data.classes[18].school_id='school-b';}],
  ['foreign teacher',data=>{data.institutional_memberships[0].person_id='teacher-b';}],
  ['revoked current grant',data=>{data.teacher_subject_authorizations[0].status='revoked';}],
  ['suspended account',data=>{data.profiles[0].account_status='suspended';}],
  ['duplicate subject grant',data=>{data.teacher_subject_authorizations.push({...data.teacher_subject_authorizations[0],id:'duplicate'});}],
  ['wrong release snapshot',data=>{data.curriculum_release_units[0].unit_id='foreign';}],
]) test('batch denies entire dashboard for '+name,async()=>{
  await assert.rejects(resolveBatch(batchMock(19,change)),AcademicContextDenied);
});

test('batch captures expiry clock after the last inventory query',async()=>{
  let finalRead=false;
  const mock=batchMock(19,data=>{data.teacher_subject_authorizations[0].valid_to='2026-09-23T12:00:01Z';},table=>{if(table==='grades')finalRead=true;});
  await assert.rejects(resolveBatch(mock,()=>{assert.equal(finalRead,true);return new Date('2026-09-23T12:00:01Z');}),AcademicContextDenied);
});
test('every batch request reads current grants again',async()=>{
  let revoked=false;
  const mock=batchMock(19,()=>{},(table,data)=>{if(table==='teacher_subject_authorizations' && revoked)data[table][0].status='revoked';});
  assert.equal((await resolveBatch(mock)).length,19);revoked=true;
  await assert.rejects(resolveBatch(mock),AcademicContextDenied);
});
test('batched ended assignments retain history only with current teacher membership',async()=>{
  const mock=batchMock(19,data=>{data.teacher_assignments.forEach(assignment=>{assignment.status='ended';assignment.valid_to='2026-09-22T00:00:00Z';});data.academic_years[0].status='closed';});
  assert.ok((await resolveBatch(mock)).every(context=>context.readOnlyHistory));
  await assert.rejects(resolveBatch(batchMock(19,data=>{data.teacher_assignments[0].status='ended';data.institutional_memberships[0].status='revoked';})),AcademicContextDenied);
});
test('batch splits identifier lists at 100 and preserves every classroom',async()=>{
  const mock=batchMock(101);assert.equal((await resolveBatch(mock)).length,101);
  assert.equal(mock.calls.filter(call=>call.table==='teacher_assignments').length,2);
  assert.equal(mock.calls.filter(call=>call.table==='classes').length,2);
});
test('release-unit inventory pages by release and unit without dropping selected later units',async()=>{
  const mock=batchMock(1,data=>{data.curriculum_release_units=Array.from({length:1001},(_,i)=>({...rows.curriculum_release_units,unit_id:'unit-'+String(i).padStart(4,'0')}));data.units[0].id='unit-1000';});
  mock.selections[0].unitId='unit-1000';assert.equal((await resolveBatch(mock))[0].unitId,'unit-1000');
  const pages=mock.calls.filter(call=>call.table==='curriculum_release_units');
  assert.deepEqual(pages.map(page=>page.bounds),[[0,999],[1000,1999]]);
  assert.deepEqual(pages[0].orders,['curriculum_release_id','unit_id']);
});
