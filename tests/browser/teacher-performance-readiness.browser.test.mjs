import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {installTeacherHomeReadiness} from '../../scripts/teacher-home-readiness.mjs';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
async function fixture(t,search='?view=home'){
 const c=await browser.newContext();t.after(()=>c.close());await c.addInitScript(installTeacherHomeReadiness);const p=await c.newPage();
 await c.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<style>.hidden{display:none}</style><div id="parent"><div id="dashboardPanel" class="hidden"><button data-today-refresh disabled>Refresh</button><p data-today-time></p></div></div>'}));
 await p.goto('https://readiness.test/teacher.html'+search);return p;
}
test('precise milestone requires the complete visible Home/Today predicate and settles once across repeated initialization',async t=>{
 const p=await fixture(t);assert.equal(await p.evaluate(()=>window.__haieduTeacherHomeTiming.readyAtEpochMs),null);
 await p.evaluate(installTeacherHomeReadiness);
 await p.evaluate(()=>{document.getElementById('dashboardPanel').classList.remove('hidden');document.querySelector('[data-today-time]').textContent='Ստուգված է՝ now';});
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));assert.equal(await p.evaluate(()=>window.__haieduTeacherHomeTiming.readyAtEpochMs),null);
 const start=Date.now();await p.evaluate(()=>document.querySelector('[data-today-refresh]').disabled=false);await p.waitForFunction(()=>window.__haieduTeacherHomeTiming.readyAtEpochMs!==null);
 const stamp=await p.evaluate(()=>window.__haieduTeacherHomeTiming.readyAtEpochMs);assert.ok(stamp>=start);
 await p.evaluate(()=>{document.querySelector('[data-today-time]').textContent='Changed';document.querySelector('[data-today-refresh]').disabled=true;});await p.evaluate(installTeacherHomeReadiness);
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));assert.equal(await p.evaluate(()=>window.__haieduTeacherHomeTiming.readyAtEpochMs),stamp);
});
test('hidden ancestors and a state reversed before the frame cannot create a false readiness stamp; non-Home pages install nothing',async t=>{
 const p=await fixture(t);await p.evaluate(()=>{document.getElementById('parent').style.display='none';document.getElementById('dashboardPanel').classList.remove('hidden');document.querySelector('[data-today-refresh]').disabled=false;document.querySelector('[data-today-time]').textContent='Ստուգված է՝ now';});
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));assert.equal(await p.evaluate(()=>window.__haieduTeacherHomeTiming.readyAtEpochMs),null);
 await p.evaluate(async()=>{document.getElementById('parent').style.display='';await Promise.resolve();document.querySelector('[data-today-refresh]').disabled=true;});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));assert.equal(await p.evaluate(()=>window.__haieduTeacherHomeTiming.readyAtEpochMs),null);
 await p.evaluate(()=>document.querySelector('[data-today-refresh]').disabled=false);await p.waitForFunction(()=>window.__haieduTeacherHomeTiming.readyAtEpochMs!==null);
 const other=await fixture(t,'?view=class');assert.equal(await other.evaluate(()=>window.__haieduTeacherHomeTiming),undefined);
});
