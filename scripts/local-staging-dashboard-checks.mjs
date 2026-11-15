import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
import path from 'node:path';

// All responses and documents are real. These checks never supply UI/API data.
export async function dashboardReady(page, account, school, other) {
  const label=account.school;
  if(account.role==='student') {
    await expect(page.locator('#multiSubjectHome')).toBeVisible();
    await expect(page.locator('#mySubjects')).toContainText('Synthetic class '+label);
    await expect(page.locator('#mySubjects')).toContainText('Synthetic school '+label);
    await expect(page.locator('#studentCourseSelect')).toContainText('Synthetic subject '+label);
    await expect(page.locator('#studentUnitSelect')).toContainText('Synthetic unit '+label);
    await expect(page.locator('#studentNextStep')).toContainText('Synthetic unit '+label);
    await expect(page.locator('#studentPath').getByText('Դեռ ակտիվացված չէ',{exact:true})).toHaveCount(3);
    const contexts=await page.evaluate(()=>window.HaiEduCourseAccess?.contexts);
    assert.equal(contexts.length,1);
    assert.equal(contexts[0].classId,school.class);
    assert.equal(contexts[0].enrollmentId,school.enrollment);
    assert.equal(contexts[0].curriculumReleaseId,school.release);
    assert.equal(contexts[0].unitId,school.unit);
  } else if(account.role==='teacher') {
    await expect(page.locator('#dashboardPanel')).toBeVisible();
    await expect(page.locator('[data-today-cards]')).toContainText('Synthetic class '+label);
    await expect(page.locator('[data-today-cards]')).toContainText('Synthetic school '+label);
    await expect(page.locator('[data-today-list]')).toContainText('ստուգման սպասող գրավոր աշխատանք չկա');
  } else {
    await expect(page.locator('#overviewPanel')).toBeVisible();
    await expect(page.locator('#overviewSchool option')).toHaveCount(1);
    await expect(page.locator('#overviewSchool')).toHaveValue(school.school);
    await expect(page.locator('#overviewSchool')).toContainText('Synthetic school '+label);
    await expect(page.locator('#overviewTeachers')).toHaveText('1');
    await expect(page.locator('#overviewClasses')).toHaveText('1');
    await expect(page.locator('#teachersPanel')).toContainText('Synthetic class '+label);
    await expect(page.locator('#analyticsClassFilter')).toContainText('Synthetic class '+label);
    await expect(page.locator('#analyticsMessage')).toHaveText('Ընտրված համատեքստում դեռ հաստատված ուսումնական աշխատանք չկա։');
    await expect(page.locator('#refreshInvitesBtn')).toBeEnabled();
  }
  await expect(page.getByRole('button',{name:'Դուրս գալ',exact:true})).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Synthetic school '+other.label);
  await expect(page.locator('body')).not.toContainText('Synthetic class '+other.label);
}

export async function dashboardInteraction(page, account, school) {
  if(account.role==='student') {
    await page.locator('#studentUnitSelect').selectOption('');
    await expect(page.locator('#studentNextStep')).toContainText('Ո՞ր բաժնից շարունակենք');
    const options=await page.locator('#studentUnitSelect').locator('option').evaluateAll(rows=>rows.map(r=>r.value).filter(Boolean));
    assert.equal(options.length,1);
    await page.locator('#studentUnitSelect').selectOption(options[0]);
    await expect(page.locator('#studentNextStep')).toContainText('Synthetic unit '+account.school);
  } else if(account.role==='teacher') {
    await page.getByRole('link',{name:'Դասարաններ',exact:true}).first().click();
    await expect(page.locator('#teacherClassesView')).toBeVisible();
    await expect(page.locator('#classList')).toContainText('Synthetic class '+account.school);
    await page.locator('#classList').getByRole('button',{name:new RegExp('Synthetic class '+account.school)}).click();
    await expect(page.locator('#institutionalClassView')).toBeVisible();
    await expect(page.locator('#institutionalSelectedName')).toHaveText('Synthetic class '+account.school);
    await expect(page.locator('#teacherUnitFilter')).toContainText('Synthetic unit '+account.school);
    await expect(page.locator('#roster')).toContainText('Synthetic '+account.school+' student');
  } else {
    await page.getByRole('button',{name:'Թարմացնել տվյալները',exact:true}).click();
    await expect(page.locator('#refreshAnalyticsBtn')).toBeEnabled();
    await expect(page.locator('#analyticsMessage')).toHaveText('Ընտրված համատեքստում դեռ հաստատված ուսումնական աշխատանք չկա։');
    await expect(page.locator('#analyticsClassFilter')).toContainText('Synthetic class '+account.school);
  }
}

export async function dashboardScreenshots(page, account, directory) {
  for(const [name,width,height,scale] of [['desktop',1440,1000,1],['phone',390,844,1],['large-text',1440,1000,2]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(scale=>document.documentElement.style.fontSize=(16*scale)+'px',scale);
    await page.screenshot({path:path.join(directory,account.school+'-'+account.role+'-'+name+'.png'),fullPage:true});
  }
  await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
  await page.setViewportSize({width:1440,height:1000});
}

async function privateDashboardHidden(page,role) {
  for(const id of ({student:['modePanel'],teacher:['dashboardPanel'],school_admin:['overviewPanel','teachersPanel','yearPanel','teacherPanel','pendingPanel']}[role]))
    await expect(page.locator('#'+id)).toBeHidden();
  await expect.poll(()=>page.locator('body').innerText()).not.toMatch(/Synthetic (school|class) [AB]/);
}

export async function dashboardLateLogout(page,account,school,other,backendOrigin) {
  // Hold an actual successful response, then sign out through another real tab.
  // No API response, auth event or dashboard content is fabricated.
  const target={student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin'}[account.role];
  const address=new URL(target,page.url()).href;
  await page.goto(address);await dashboardReady(page,account,school,other);
  const companion=await page.context().newPage();
  let release,settle;
  const held=new Promise(resolve=>release=resolve),completed=new Promise(resolve=>settle=resolve);
  let captured=false,responseStatus=null;
  const service={student:'get-student-dashboard',teacher:'get-teacher-workspace',school_admin:'get-school-performance-analytics'}[account.role];
  const pattern=backendOrigin+'/functions/v1/'+service;
  const hold=async route=>{
    if(captured)return route.fallback();
    captured=true;
    try {
      const response=await route.fetch({maxRedirects:0});responseStatus=response.status();
      await held;await route.fulfill({response});
    } finally {settle();}
  };
  try {
    await companion.goto(address);await dashboardReady(companion,account,school,other);
    await page.waitForLoadState('networkidle');
    await page.route(pattern,hold);
    if(account.role==='student') {
      const selected=await page.locator('#studentUnitSelect').inputValue();
      await page.locator('#studentUnitSelect').selectOption('');
      await page.locator('#studentUnitSelect').selectOption(selected);
    } else await page.locator(account.role==='teacher'?'[data-today-refresh]':'#refreshAnalyticsBtn').click();
    await expect.poll(()=>responseStatus,{timeout:15000}).toBe(200);
    await companion.getByRole('button',{name:'Դուրս գալ',exact:true}).click();
    await privateDashboardHidden(page,account.role);
    release();await completed;
    await page.waitForLoadState('networkidle');
    await privateDashboardHidden(page,account.role);
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))),false);
  } finally {
    release();await page.unroute(pattern,hold);await companion.close();
  }
}

export async function dashboardSignedOut(page, role, alreadySignedOut=false) {
  // Student Home stays on Home; staff dashboards navigate to sign-in.
  if(!alreadySignedOut)await page.getByRole('button',{name:'Դուրս գալ',exact:true}).click();
  if(role==='student'&&!alreadySignedOut) {
    await expect(page.locator('#publicEntry')).toBeVisible();
    await expect(page.locator('#modePanel')).toBeHidden();
  } else if(!alreadySignedOut)await page.waitForURL('**/account-access');
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'))),false);
  // Opening the former private address after sign-out must not show old data.
  const target={student:'/index.html',teacher:'/teacher.html',school_admin:'/school-admin'}[role];
  await page.goto(new URL(target,page.url()).href);
  if(role==='student')await expect(page.locator('#publicEntry')).toBeVisible();
  else if(role==='teacher')await expect(page.locator('#authPanel')).toBeVisible();
  else await expect(page.locator('#denied')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Synthetic (school|class) [AB]/);
}
