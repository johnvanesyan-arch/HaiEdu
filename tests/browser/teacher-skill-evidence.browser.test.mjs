import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
import {fixture} from '../fixtures/teacher-performance-browser.mjs';
import {historyEntries,historyReports,historyReadability} from '../fixtures/assessment-history.mjs';

let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const estimates=[{percent:88,band:'secure',status:'secure',evidenceCount:4,contract:{mode:'diagnostic',modelId:'model-a'}},{percent:38,band:'needs_support',status:'needs_support',evidenceCount:4,contract:{mode:'practice',modelId:'model-b'}}];
const matrix=[{skillId:'s1',code:'SYN-1-S01',nameHy:'Առաջին հմտություն',percent:null,band:'not_assessed',status:'mixed_contracts',evidenceCount:8,estimates},
 {skillId:'s2',code:'SYN-1-S02',nameHy:'Երկրորդ հմտություն',percent:60,band:'not_assessed',status:'insufficient_evidence',evidenceCount:1},
 {skillId:'s3',code:'SYN-1-S03',nameHy:'Երրորդ հմտություն',percent:null,band:'not_assessed',status:'provenance_unavailable',evidenceCount:5},
 {skillId:'s4',code:'SYN-1-S04',nameHy:'Չորրորդ հմտություն',percent:null,band:'not_assessed',status:'not_assessed',evidenceCount:0}];
const student={id:'student-a',displayName:'Փորձնական աշակերտ',matrix,weakSkills:matrix,latestActivityAt:'2026-10-30',masteryCheck:{passed:true}};
const studentDetails={student,unitCode:'SYN-1',matrix,skills:matrix,recentAttempts:[],sessions:[],modeSummary:{}};
const analytics={students:[student],studentCount:1,skills:matrix};

test('teacher saved history distinguishes unassessed groups from zero, keeps versions and one keyboard-accessible scope',async t=>{
 const details={...studentDetails,sessions:historyEntries(),latestDiagnostic:{assessmentResult:historyReports[1]},latestMasteryCheck:{assessmentResult:historyReports[2]}};
 const {page:p,errors}=await fixture(browser,t,{analytics,studentDetails:details});
 await p.locator('.hm-role-nav a[href$="view=classes"]').click();await p.locator('#classList .teacher-class-button').first().click();
 await p.locator('#matrixWrap td button').first().click();
 const history=p.locator('.teacher-assessment-history');await expect(history.locator('.assessment-history-list>li')).toHaveCount(3);
 await expect(history.locator('[data-assessment-state=unassessed]')).toHaveCount(3);
 assert.doesNotMatch(await history.innerText(),/0\/0/);
 await expect(history).toContainText('0/3 միավոր · 0%');await expect(history).toContainText('2/3 · 66.67%');
 await expect(history).toContainText('Ստուգարքը չի անցել · 22.39/28 միավոր · 80%');
 await expect(history.locator('[data-assessment-scope]')).toHaveCount(1);await expect(history.locator('[data-assessment-scope]')).toBeHidden();
 await history.locator('.assessment-scope summary').focus();await p.keyboard.press('Enter');
 await expect(history.locator('[data-assessment-scope]')).toBeVisible();await expect(history.locator('[data-assessment-scope]')).toContainText('ամբողջ դասընթացի ընդհանուր գնահատականը չէ');
 await p.keyboard.press('Enter');
 for(const [n,record] of (await history.locator('.assessment-history-list>li').all()).entries()){
  await record.locator('details summary').click();await expect(record).toContainText('policy-'+n);await record.locator('details summary').click();
 }
 await p.emulateMedia({reducedMotion:'reduce'});
 for(const width of [1280,768,390]){
  await p.setViewportSize({width,height:1000});await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  await history.locator('h3').scrollIntoViewIfNeeded();assert.deepEqual(await p.evaluate(historyReadability,'.teacher-assessment-history'),[],String(width));
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-practice-history-'+width+'.png'});}
 }
 await p.setViewportSize({width:1280,height:1000});await p.evaluate(()=>document.documentElement.style.fontSize='100%');await history.locator('h3').scrollIntoViewIfNeeded();
 if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR)await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-practice-history-normal.png'});
 const writes=await p.evaluate(()=>window.__teacherFixture.calls.filter(c=>!['get-teacher-dashboard','get-teacher-student','get-teacher-workspace'].includes(c.fn)&&!(c.fn==='manage-student-invitation'&&c.body.action==='list')));
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
});

test('actual teacher matrix exposes split evidence, support counts and direct keyboard details without false no-data',async t=>{
 const {page:p,errors}=await fixture(browser,t,{analytics,studentDetails});
 await p.locator('.hm-role-nav a[href$="view=classes"]').click();await p.locator('#classList .teacher-class-button').first().click();
 await expect(p.locator('#matrixStudentTotal')).toHaveText('1');await expect(p.locator('#matrixMasteredTotal')).toHaveText('1');await expect(p.locator('#matrixNeedsSupportTotal')).toHaveText('1');
 const cells=p.locator('#matrixWrap td');
 for(const [i,text] of ['Առանձին արդյունքներ','Դիտարկումները դեռ քիչ են','Ցուցանիշը հասանելի չէ','Տվյալ դեռ չկա'].entries())await expect(cells.nth(i)).toHaveText(text);
 await expect(p.locator('#roster')).toContainText('S01');assert.doesNotMatch(await p.locator('#roster .stat-label').filter({hasText:'Ուշադրության հմտություններ'}).locator('..').innerText(),/S02|S03|S04/);
 await p.locator('#matrixStudentFilter').selectOption('needs_support');await expect(p.locator('#matrixWrap tbody tr')).toHaveCount(1);
 const open=cells.first().getByRole('button');await open.focus();await p.keyboard.press('Enter');
 const detail=p.locator('[data-skill-evidence="s1"]');await expect(detail).toHaveAttribute('open','');
 await expect(detail.locator(':scope > summary')).toBeFocused();
 await expect(detail).toContainText('Կայուն · 88%');await expect(detail).toContainText('Աջակցություն է պետք · 38%');await expect(detail).toContainText('Ախտորոշիչ');await expect(detail).toContainText('Վարժություն');
 assert.equal(await p.locator('#studentDrawerContent').evaluate(e=>[...e.querySelectorAll('h3')].map(n=>n.textContent).indexOf('Հմտությունների տվյալներ')<[...e.querySelectorAll('h3')].map(n=>n.textContent).indexOf('Յուրացման ստուգում և կրկնություն')),true);
 assert.equal(await p.locator('#studentDrawerContent .teacher-skill-grid').count(),0);
 for(const width of [1280,768,390]){
  await p.setViewportSize({width,height:1000});await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  await detail.locator(':scope > summary').scrollIntoViewIfNeeded();await expect(detail.locator(':scope > summary')).toBeVisible();
  assert.equal(await p.locator('.student-drawer-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'drawer fits at '+width);
  if(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR){await mkdir(process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR,{recursive:true});await p.screenshot({path:process.env.STUDENT_LAYOUT_SCREENSHOTS_DIR+'/teacher-skill-evidence-'+width+'.png'});}
 }
 assert.deepEqual(errors,[]);
});

test('repeated matrix renders bind one request and late skill details cannot cross class or actor',async t=>{
 const {page:p,errors}=await fixture(browser,t,{analytics,studentDetails});
 await p.locator('.hm-role-nav a[href$="view=classes"]').click();await p.locator('#classList .teacher-class-button').first().click();
 await p.locator('#matrixStudentFilter').selectOption('needs_support');await p.locator('#matrixStudentFilter').selectOption('all');
 await p.evaluate(()=>window.__teacherFixture.holds.push('get-teacher-student'));
 await p.locator('#matrixWrap td button').first().click();await expect(p.locator('#studentDrawerName')).toHaveText('Բեռնվում է…');
 assert.equal(await p.evaluate(()=>window.__teacherFixture.calls.filter(c=>c.fn==='get-teacher-student').length),1);
 await p.locator('#closeDrawerBtn').click();await p.locator('.hm-role-nav a[href$="view=classes"]').click();await p.locator('#classList .teacher-class-button').nth(1).click();
 await p.evaluate(()=>window.__teacherFixture.release('get-teacher-student'));await expect(p.locator('#studentDrawer')).toBeHidden();await expect(p.locator('#studentDrawerContent')).toBeEmpty();
 await p.locator('#matrixWrap td button').first().click();await expect(p.locator('[data-skill-evidence="s1"]')).toBeVisible();
 await p.locator('#closeDrawerBtn').click();await p.evaluate(()=>window.__teacherFixture.holds.push('get-teacher-student'));await p.locator('#matrixWrap td button').first().click();
 await p.evaluate(()=>{const s=window.__teacherFixture;s.actor='teacher-b';s.listeners.forEach(fn=>fn('SIGNED_IN',{user:{id:s.actor,email:'new@example.invalid'}}));});
 await p.evaluate(()=>window.__teacherFixture.release('get-teacher-student'));await expect(p.locator('#studentDrawer')).toBeHidden();await expect(p.locator('#studentDrawerContent')).toBeEmpty();assert.deepEqual(errors,[]);
});
