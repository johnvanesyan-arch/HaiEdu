import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect as baseExpect } from '@playwright/test';
import { validateFixture, roles, sides, runIsolation } from './sprint-14-isolation.mjs';

// Production acceptance: only newly created empty classes and memberships may be changed.
const site = 'https://www.haiedu.am';
const expect = baseExpect.configure({ timeout: 30000 });
const fixture = JSON.parse(process.env.QA_TENANT_FIXTURES_JSON ?? '{}');
const credentials = Object.fromEntries(sides.flatMap(s => roles.map(r => [`${s}_${r}`, {
  email: process.env[`QA_SCHOOL_${s}_${r.toUpperCase()}_EMAIL`],
  password: process.env[`QA_SCHOOL_${s}_${r.toUpperCase()}_PASSWORD`],
}])));
const config = await readFile(new URL('../web/config.js', import.meta.url), 'utf8');
const url = config.match(/export const SUPABASE_URL = "([^"]+)"/)?.[1];
const key = config.match(/export const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
const report = { scope: 'Sprint 14 authenticated actions', revision: process.env.GITHUB_SHA ?? 'local',
  startedAt: new Date().toISOString(), status: 'running', sprint14GateClosed: false, checks: [], resources: [] };
const sessions = new Map(), classes = [], memberships = [], invitations = [], contexts = [], pages = [];
const prefix = `S14-QA-${process.env.GITHUB_RUN_ID ?? Date.now()}-${process.env.GITHUB_RUN_ATTEMPT ?? 1}`;
let browser, stage = 'preflight';
const selection = f => ({ assignmentId: f.assignmentId, curriculumReleaseId: f.curriculumReleaseId, unitId: f.unitId });
function check(label, passed, httpStatus) {
  report.checks.push({ label, status: passed ? 'passed' : 'failed', ...(httpStatus === undefined ? {} : { httpStatus }) });
  if (!passed) throw new Error(label); // Never expose response bodies or browser errors.
}
async function request(actor, endpoint, body) {
  try {
    const response = await fetch(`${url}${endpoint}`, { method: 'POST', redirect: 'error',
      headers: { apikey: key, Authorization: `Bearer ${sessions.get(actor)?.access_token ?? key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(25000) });
    return { status: response.status, data: await response.json().catch(() => null) };
  } catch { return { status: 0, data: null }; }
}
async function call(actor, fn, body, label, predicate = r => r.status === 200) {
  const result = await request(actor, `/functions/v1/${fn}`, body);
  check(label, predicate(result), result.status);
  return result.data;
}
const denied = code => r => r.status === 403 && r.data?.error === code && Object.keys(r.data).length === 1;
const dashboard = actor => call(actor, 'get-teacher-dashboard', {}, `${actor}: authorized dashboard`);
async function createClass(actor, option, suffix) {
  const entry = { actor, name: `${prefix}-${suffix}`, id: null, archived: false };
  classes.push(entry); // Track intent before a possibly ambiguous network result.
  const r = await request(actor, '/functions/v1/manage-institutional-teacher-class', { action: 'create',
    membershipId: option.teacherMembershipId, academicYearId: option.academicYearId,
    subjectProgramId: option.subjectProgramId, name: entry.name });
  entry.id = r.data?.classId;
  if (!entry.id) entry.id = (await dashboard(actor)).classes.find(c => c.name === entry.name)?.id;
  check(`${actor}: create disposable empty class`, r.status === 200 && Boolean(entry.id), r.status);
  report.resources.push({ type: 'emptyClass', id: entry.id });
  const c = (await dashboard(actor)).classes.find(c => c.id === entry.id);
  check(`${actor}: disposable class has no learners`, c?.students?.length === 0);
  return { entry, klass: c };
}
async function archive(entry) {
  if (!entry.id || entry.archived) return;
  const data = await call(entry.actor, 'manage-institutional-teacher-class', { action: 'archive', classId: entry.id },
    `${entry.actor}: archive only run-created class`, r => r.status === 200 && r.data?.updated === true);
  entry.archived = data.updated;
}
async function offboard(entry) {
  if (!entry.id || entry.ended) return;
  check('cleanup target is newly created membership', memberships.includes(entry) && !entry.originalIds.includes(entry.id));
  const body = { schoolId: entry.schoolId, membershipId: entry.id, reason: 'administrative' };
  const p = await call(entry.admin, 'manage-school-teacher', { ...body, action: 'preview_offboard' }, 'cleanup: fresh offboarding preview');
  await call(entry.admin, 'manage-school-teacher', { ...body, action: 'offboard', revision: p.offboarding.revision },
    'cleanup: end only new membership', r => r.status === 200 && r.data?.offboarding?.ended === true);
  entry.ended = true;
}
async function pageFor(actor, pathname, width = 1365) {
  const session = sessions.get(actor);
  const context = await browser.newContext({ viewport: { width, height: 950 }, storageState: {
    cookies: [], origins: [{ origin: site, localStorage: [{ name: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, value: JSON.stringify(session) }] }],
  } });
  contexts.push(context);
  // An unexpected UI request can never change original memberships/classes or send email.
  await context.route('**/functions/v1/**', async route => {
    const req = route.request(), fn = new URL(req.url()).pathname.split('/').pop();
    if (req.method() !== 'POST' || !fn.startsWith('manage-')) return route.continue();
    let b; try { b = req.postDataJSON(); } catch { return route.abort(); }
    const safeClass = fn === 'manage-institutional-teacher-class' && ['rename','archive','activate'].includes(b.action) && classes.some(c => c.id === b.classId);
    const safeMember = fn === 'manage-school-teacher' && ['preview_offboard','offboard'].includes(b.action) && memberships.some(m => m.id === b.membershipId && m.schoolId === b.schoolId && !m.originalIds.includes(m.id));
    const safeList = fn === 'manage-student-invitation' && b.action === 'list';
    if (!safeClass && !safeMember && !safeList) { report.checks.push({ label: 'browser mutation safety guard', status: 'failed' }); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  pages.push({ actor, page });
  page.on('requestfailed', req => {
    const target = new URL(req.url());
    if (target.hostname === new URL(site).hostname || target.hostname === new URL(url).hostname || target.hostname === 'esm.sh') {
      (report.browserRequestFailures ??= []).push({ actor, host: target.hostname, path: target.pathname, failure: req.failure()?.errorText });
    }
  });
  page.setDefaultTimeout(30000);
  const response = await page.goto(`${site}/${pathname}`, { waitUntil: 'domcontentloaded' });
  check(`${actor}: browser document loads`, response?.status() === 200, response?.status());
  return page;
}
async function teacherUI(side, entry) {
  stage = `${side}: teacher browser navigation`;
  const page = await pageFor(`${side}_teacher`, `teacher.html?view=class&class=${entry.id}`);
  await expect(page.locator('#institutionalSelectedName')).toHaveText(entry.name);
  stage = `${side}: browser rename`;
  const renamed = `${entry.name}-renamed`;
  await page.locator('#institutionalRenameClassBtn').click();
  await page.locator('#institutionalRenameClassNameInput').fill(renamed);
  await page.locator('#institutionalRenameClassSaveBtn').click();
  await expect(page.locator('#institutionalSelectedName')).toHaveText(renamed);
  entry.name = renamed;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#institutionalSelectedName')).toHaveText(renamed);
  check(`${side}: actual rename persists after browser reload`, true);
  stage = `${side}: browser home link`;
  const home = page.locator('a').filter({ hasText: /^Ուսուցչի գլխավոր էջ$/ }).first();
  await home.click();
  await expect(page.locator('[data-teacher-view="home"]')).toBeVisible();
  await expect(page.locator('#dashboardPanel')).toBeVisible();
  check(`${side}: teacher home navigation retains authentication`, ['/teacher', '/teacher.html'].includes(new URL(page.url()).pathname));
  for (const view of ['profile', 'classes', 'archive']) {
    stage = `${side}: sidebar ${view}`;
    await page.locator(`.hm-role-nav a[href$="view=${view}"]`).click();
    await expect(page.locator(`[data-teacher-view="${view}"]`)).toBeVisible();
    check(`${side}: sidebar ${view} action`, true);
  }
  await page.goto(`${site}/teacher.html?view=classes`, { waitUntil: 'domcontentloaded' });
  await page.locator('#classList .teacher-class-button').filter({ hasText: renamed }).click();
  await expect(page.locator('#institutionalSelectedName')).toHaveText(renamed);
  stage = `${side}: browser archive/reactivate`;
  page.once('dialog', d => d.accept());
  await page.locator('#institutionalClassToggle').click();
  await expect(page.locator('#institutionalClassToggle')).toHaveText('Վերակտիվացնել դասարանը');
  entry.archived = true;
  check(`${side}: archive empty class through teacher UI`, true);
  await page.locator('#institutionalClassToggle').click();
  await expect(page.locator('#institutionalClassToggle')).toHaveText('Արխիվացնել դասարանը');
  entry.archived = false;
  check(`${side}: reactivate empty class through teacher UI`, true);
  stage = `${side}: mobile rename cancellation`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#institutionalRenameClassBtn').click();
  await expect(page.locator('#institutionalRenameClassNameInput')).toBeVisible();
  await page.locator('#institutionalRenameClassCancelBtn').click();
  check(`${side}: mobile rename cancel retains name`, await page.locator('#institutionalSelectedName').textContent() === renamed);
  check(`${side}: mobile teacher workspace has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.context().close();
}
try {
  check('six dedicated QA identities configured', validateFixture(fixture, credentials).length === 0 && Boolean(url && key));
  const pre = await runIsolation({ fixture, credentials, url, key, revision: report.revision });
  report.readIsolationBefore = pre;
  check('authenticated read-isolation preflight passes', pre.status === 'passed');
  for (const s of sides) for (const role of roles) {
    const actor = `${s}_${role}`, r = await request(null, '/auth/v1/token?grant_type=password', credentials[actor]);
    if (r.data?.access_token) sessions.set(actor, {
      ...r.data,
      // GoTrue's REST token response may omit expires_at. The browser SDK's
      // stored-session contract requires it; derive it exactly as the SDK does.
      expires_at: r.data.expires_at ?? Math.floor(Date.now() / 1000) + Number(r.data.expires_in),
    });
    check(`${actor}: real expected identity`, r.status === 200 && r.data?.user?.id === fixture[s][`${role}Id`], r.status);
  }
  browser = await chromium.launch();
  const baselines = {};
  for (const s of sides) {
    const d = await dashboard(`${s}_teacher`);
    const original = d.classes.find(c => c.id === fixture[s].classId);
    const option = d.institutionalOptions.find(o => o.schoolId === fixture[s].schoolId && o.subjectProgramId === original?.subjectProgramId && o.academicYearId === original.academicYearId);
    const roster = await call(`${s}_admin`, 'get-school-teachers', { schoolId: fixture[s].schoolId }, `${s}: original membership inventory`);
    const student = await call(`${s}_student`, 'get-student-classes', {}, `${s}: original learner enrolment inventory`);
    check(`${s}: current authorized class creation option`, Boolean(option));
    baselines[s] = { option, roster: roster.teachers, studentClasses: student.classes, originalClasses: d.classes.map(c => ({ id:c.id, name:c.name, isActive:c.isActive, assignmentId:c.assignmentId, students:c.students.map(x=>x.id).sort() })) };
  }
  // Reciprocal mutations are attempted before either temporary cross-school membership exists.
  for (const s of sides) {
    stage = `${s}: cross-school mutation denials`;
    const other = s === 'A' ? 'B' : 'A', actor = `${s}_teacher`;
    const { entry, klass } = await createClass(actor, baselines[s].option, `${s}-navigation`);
    for (const action of ['rename','archive','activate']) await call(`${other}_teacher`, 'manage-institutional-teacher-class', { action, classId: entry.id, name: `${prefix}-denied` }, `${s}: foreign teacher ${action} denied`, denied('teacher_class_unavailable'));
    await call(`${other}_student`, 'manage-institutional-teacher-class', { action:'rename',classId:entry.id,name:`${prefix}-denied` }, `${s}: student teacher mutation denied`, denied('teacher_role_required'));
    await call(`${other}_teacher`, 'manage-institutional-teacher-class', { action:'create',membershipId:baselines[s].option.teacherMembershipId,academicYearId:baselines[s].option.academicYearId,subjectProgramId:baselines[s].option.subjectProgramId,name:`${prefix}-denied` }, `${s}: foreign membership class creation denied`, denied('teacher_class_unavailable'));
    await call(`${other}_teacher`, 'manage-student-invitation', {action:'create_code',schoolId:fixture[s].schoolId,classId:entry.id,assignmentId:klass.assignmentId}, `${s}: foreign join code issuance denied`, denied('student_invitation_unavailable'));
    await teacherUI(s, entry);
    await archive(entry);
  }
  for (const s of sides) {
    stage = `${s}: temporary membership offboarding`;
    const other = s === 'A' ? 'B' : 'A', admin = `${s}_admin`, teacher = `${other}_teacher`, schoolId = fixture[s].schoolId;
    const old = baselines[s].roster;
    check(`${s}: guest teacher has no existing live membership`, !old.some(t => t.person_id === fixture[other].teacherId && ['active','archived'].includes(t.membership_status)));
    const pending = { actor:admin,id:null,used:false }; invitations.push(pending);
    const invite = await call(admin, 'manage-institutional-invitation', {action:'issue',schoolId,recipientUserId:fixture[other].teacherId,role:'teacher'}, `${s}: issue token-only guest invitation`, r=>r.status===201 && Boolean(r.data?.invitationId && r.data?.token));
    pending.id = invite.invitationId;
    await call(`${s}_student`, 'redeem-institutional-invitation', {token:invite.token}, `${s}: wrong recipient cannot redeem teacher invitation`, denied('invitation_unavailable'));
    const member = {id:null,schoolId,admin,teacher,ended:false,originalIds:sides.flatMap(x=>baselines[x].roster.map(t=>t.membership_id))};
    memberships.push(member);
    const redeemed = await request(teacher, '/functions/v1/redeem-institutional-invitation', {token:invite.token});
    member.id = redeemed.data?.membershipId;
    if (!member.id) {
      const roster = await call(admin,'get-school-teachers',{schoolId},'recover ambiguous guest membership creation');
      member.id = roster.teachers.find(t=>t.person_id===fixture[other].teacherId && t.membership_status==='active' && !member.originalIds.includes(t.membership_id))?.membership_id;
    }
    pending.used = Boolean(member.id);
    check(`${s}: redemption creates a new disposable membership`, redeemed.status===200 && Boolean(member.id) && !member.originalIds.includes(member.id),redeemed.status);
    report.resources.push({type:'temporaryTeacherMembership',id:member.id,schoolId});
    const body={schoolId,membershipId:member.id,reason:'administrative'};
    for(const action of ['archive','restore','preview_offboard','offboard']) await call(`${other}_admin`,'manage-school-teacher',{...body,action,revision:'0'.repeat(32)},`${s}: foreign admin ${action} denied`,denied('school_teacher_unavailable'));
    await call(`${other}_admin`,'manage-institutional-membership',{action:'end_membership',membershipId:member.id,reason:'administrative'},`${s}: foreign membership termination denied`,denied('termination_unavailable'));
    const subjectId=baselines[s].studentClasses.find(c=>c.id===fixture[s].classId)?.subjectId;
    check(`${s}: subject resolved from current enrolment`, Boolean(subjectId));
    await call(`${other}_admin`,'manage-teacher-subject',{action:'grant',membershipId:member.id,subjectId},`${s}: foreign subject grant denied`,denied('teacher_subject_unavailable'));
    await call(admin,'manage-teacher-subject',{action:'grant',membershipId:member.id,subjectId},`${s}: grant guest current subject`,r=>r.status===201 && Boolean(r.data?.authorizationId));
    const option=(await dashboard(teacher)).institutionalOptions.find(o=>o.teacherMembershipId===member.id && o.subjectProgramId===baselines[s].option.subjectProgramId && o.academicYearId===baselines[s].option.academicYearId);
    check(`${s}: new membership receives own authorized option`,Boolean(option));
    const {entry,klass}=await createClass(teacher,option,`${s}-offboard`);
    const scope={schoolId,classId:entry.id,assignmentId:klass.assignmentId};
    const preview=await call(admin,'manage-school-teacher',{...body,action:'preview_offboard'},`${s}: preview new membership`);
    const code=await call(teacher,'manage-student-invitation',{...scope,action:'create_code'},`${s}: create unused code without sending email`,r=>r.status===201 && Boolean(r.data?.codeId));
    const learnerInvite=await call(teacher,'manage-institutional-invitation',{...scope,action:'issue',role:'student',recipientUserId:fixture[s].studentId},`${s}: create unused token-only learner invitation`,r=>r.status===201 && Boolean(r.data?.invitationId));
    invitations.push({actor:teacher,id:learnerInvite.invitationId,used:false,member});
    await call(admin,'manage-school-teacher',{...body,action:'offboard',revision:preview.offboarding.revision},`${s}: stale offboarding preview fails closed`,r=>r.status===409 && r.data?.error==='teacher_offboarding_preview_changed');
    const impact=await call(admin,'manage-school-teacher',{...body,action:'preview_offboard'},`${s}: refreshed offboarding impact`);
    check(`${s}: preview counts only new assignment, grant and unused credentials`,impact.offboarding.activeAssignments===1 && impact.offboarding.activeSubjectGrants===1 && impact.offboarding.unusedInvitations===1 && impact.offboarding.unusedJoinCodes===1);
    await archive(entry);
    stage = `${s}: admin offboarding UI`;
    const page=await pageFor(admin,'school-admin.html#teachersPanel');
    await page.locator('#rosterSchool').selectOption(schoolId);
    const button=()=>page.locator('.roster-card').filter({has:page.locator(`a[href*="membership=${member.id}"]`)}).getByRole('button',{name:'Դադարեցնել աշխատանքը',exact:true});
    let cancelledPreview = false;
    page.once('dialog',async d=>{ cancelledPreview = d.type() === 'confirm'; await d.dismiss(); });
    await button().click();
    await expect(button()).toBeEnabled();
    check(`${s}: offboarding confirmation was shown and cancelled`,cancelledPreview);
    const afterCancel=await call(admin,'get-school-teachers',{schoolId},`${s}: read after cancel`);
    check(`${s}: offboarding cancel preserves new membership`,afterCancel.teachers.some(t=>t.membership_id===member.id && t.membership_status==='active'));
    page.once('dialog',d=>d.accept());
    const response=page.waitForResponse(r=>r.url().endsWith('/manage-school-teacher') && r.request().postDataJSON()?.action==='offboard');
    await button().click();
    const result=await response;
    const payload=await result.json();
    check(`${s}: actual admin UI offboards only new membership`,result.status()===200 && payload.offboarding?.ended===true,result.status());
    member.ended=true;
    await expect(page.locator('#rosterMessage')).toContainText('դադարեցված');
    await page.context().close();
    const ended=await call(admin,'get-school-teachers',{schoolId},`${s}: verify ended membership`);
    check(`${s}: ended membership has no live grants or assignments`,ended.teachers.some(t=>t.membership_id===member.id && t.membership_status==='ended' && t.subjects.length===0 && t.classes.length===0));
    await call(`${s}_student`,'redeem-institutional-invitation',{token:learnerInvite.token},`${s}: offboarding revokes unused invitation`,denied('invitation_unavailable'));
    await call(teacher,'get-teacher-academic-context',{assignmentId:klass.assignmentId,curriculumReleaseId:fixture[s].curriculumReleaseId,unitId:fixture[s].unitId},`${s}: ended assignment cannot resolve context`,denied('academic_context_unavailable'));
    await call(teacher,'get-teacher-academic-context',selection(fixture[other]),`${s}: guest retains original school access`,r=>r.status===200 && r.data?.context?.schoolId===fixture[other].schoolId);
  }
  for(const s of sides){
    const d=await dashboard(`${s}_teacher`);
    check(`${s}: original class identity, state and roster preserved`,baselines[s].originalClasses.every(b=>d.classes.some(c=>c.id===b.id && c.name===b.name && c.isActive===b.isActive && c.assignmentId===b.assignmentId && JSON.stringify(c.students.map(x=>x.id).sort())===JSON.stringify(b.students))));
    const student=await call(`${s}_student`,'get-student-classes',{},`${s}: final original enrolment`);
    check(`${s}: original learner enrolments unchanged`,JSON.stringify(student.classes)===JSON.stringify(baselines[s].studentClasses));
  }
} catch (error) {
  report.failureKind = error?.name === 'TimeoutError' ? 'browser-timeout' : 'assertion-or-request';
  report.browserState = [];
  for (const { actor, page } of pages) if (!page.isClosed()) {
    report.browserState.push({ actor, path: new URL(page.url()).pathname,
      dashboardVisible: await page.locator('#dashboardPanel').isVisible().catch(()=>false),
      authVisible: await page.locator('#authPanel').isVisible().catch(()=>false),
      classHeadingPresent: await page.locator('#institutionalSelectedName').count().catch(()=>0),
    });
  }
  if(!report.checks.some(c=>c.status==='failed')) report.checks.push({label:stage,status:'failed'});
} finally {
  for(const context of contexts) await context.close().catch(()=>{});
  await browser?.close().catch(()=>{});
  for(const entry of classes) try {
    if(!entry.id) entry.id=(await dashboard(entry.actor)).classes.find(c=>c.name===entry.name)?.id;
    await archive(entry);
  } catch { report.checks.push({label:'cleanup: archive run-created class',status:'failed'}); }
  for(const member of memberships) try { await offboard(member); } catch { report.checks.push({label:'cleanup: end run-created membership',status:'failed'}); }
  for(const invite of invitations) if(invite.id && !invite.used && !invite.member?.ended) try {
    await call(invite.actor,'manage-institutional-invitation',{action:'revoke',invitationId:invite.id},'cleanup: revoke unused token invitation',r=>r.status===200 && r.data?.revoked===true);
  } catch { report.checks.push({label:'cleanup: revoke token invitation',status:'failed'}); }
  for(const[actor]of sessions){
    const r=await request(actor,'/auth/v1/logout?scope=local',{});
    report.checks.push({label:`${actor}: close only QA session`,status:r.status===204 || r.status===200?'passed':'failed',httpStatus:r.status});
  }
  if(sessions.size===6){
    try { report.readIsolationAfter=await runIsolation({fixture,credentials,url,key,revision:report.revision});
      check('authenticated read-isolation restored after cleanup',report.readIsolationAfter.status==='passed');
    } catch { report.checks.push({label:'final read isolation',status:'failed'}); }
  }
  report.status=report.checks.some(c=>c.status==='failed')?'failed':'passed';
  report.finishedAt=new Date().toISOString();
  report.cleanup={classes:classes.map(c=>({id:c.id,archived:c.archived})),memberships:memberships.map(m=>({id:m.id,ended:m.ended}))};
  await mkdir('qa-results',{recursive:true});
  await writeFile('qa-results/sprint-14-actions.json',JSON.stringify(report,null,2),{mode:0o600});
  console.log(`Authenticated actions: ${report.status}; ${report.checks.filter(c=>c.status==='passed').length}/${report.checks.length} checks passed.`);
  for(const c of report.checks.filter(c=>c.status==='failed')) console.log(`FAILED: ${c.label}${c.httpStatus===undefined?'':` (HTTP ${c.httpStatus})`}`);
  process.exitCode=report.status==='passed'?0:1;
}
