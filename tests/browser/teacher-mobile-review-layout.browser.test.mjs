import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {fixture} from '../fixtures/teacher-performance-browser.mjs';
import {wordBreaks} from '../fixtures/word-boundaries.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
const skills=Array.from({length:10},(_,i)=>({skillId:'skill-'+i,code:'SYN-1-S'+String(i+1).padStart(2,'0'),nameHy:'Փորձնական հմտության ամբողջական անվանում',percent:60,band:'not_assessed',status:'insufficient_evidence',evidenceCount:6,observedEvidenceCount:6,excludedEvidenceCount:0}));
const learner={id:'student-a',displayName:'Փորձնական աշակերտի ամբողջական անուն',matrix:skills,weakSkills:skills,latestActivityAt:'2026-11-03',recentAccuracy:60,masteryCheck:null,chapterReview:null};
for(const width of [390,430,768,1280])for(const populated of [false,true])test('teacher review remains inside '+width+'px viewport at ordinary and doubled text ('+(populated?'populated':'empty')+')',async t=>{
 const {page,errors}=await fixture(browser,t,{viewport:{width,height:width===390?844:width===430?932:1000},mobile:width<=430,analytics:populated?{students:[learner],studentCount:1,skills}:null});
 if(populated)await page.evaluate(()=>window.__teacherFixture.queueRows=[{id:'synthetic-work',studentName:'Փորձնական աշակերտի ամբողջական անուն',taskTitle:'Փորձնական գրավոր առաջադրանքի ամբողջական անվանում',state:'submitted'}]);
 await page.locator('.hm-role-nav a[href$="view=classes"]').click();
 await page.locator('#classList .teacher-class-button').first().click();
 await expect(page.locator('#rosterAnalyticsCard')).toBeVisible();
 await page.locator('#teacherOpenWrittenWork').click();
 await expect(page.locator('[data-writing-filter]')).toBeVisible();
 for(const size of [100,200]){
  await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);
  const box=await page.evaluate(()=>{const root=document.documentElement,main=document.querySelector('#mainContent'),r=main.getBoundingClientRect();return{viewport:innerWidth,scrollX,scroll:root.scrollWidth,client:root.clientWidth,left:r.left,right:r.right,offenders:[...document.body.querySelectorAll('*')].filter(e=>{const b=e.getBoundingClientRect();let right=b.right;for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement)if(['auto','scroll','hidden','clip'].includes(getComputedStyle(p).overflowX))right=Math.min(right,p.getBoundingClientRect().right);return b.width>0&&right>root.clientWidth+1;}).map(e=>({tag:e.tagName,id:e.id,classes:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).slice(0,12),roster:[...document.querySelectorAll('.roster-row>div')].map(e=>({width:e.getBoundingClientRect().width,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))};});
  assert.ok(box.scroll<=box.client+1&&box.left>=-1&&box.right<=width+1,JSON.stringify({size,...box}));
  assert.deepEqual(await wordBreaks(page,'.roster-row .stat-label,.roster-row strong'),[],`roster words stay whole at ${width}px/${size}%`);
  if(width===430&&populated&&size===200)console.log('C2 corrected geometry: '+JSON.stringify({size,...box}));
 }
 assert.deepEqual(errors,[]);
});
