// Kept from the 14–16 November 2026 session. Usage is in docs/agent-handover-20261116.md, §3.4.
import {createRequire} from 'node:module';
const [repo, file] = process.argv.slice(2);
const {chromium} = createRequire(repo + '/package.json')('@playwright/test');
const b = await chromium.launch(); const fails=[]; const errors=[];
for (const device of ['desktop','phone']) {
const c = await b.newContext({viewport:{width:1400,height:900}}); await c.route(/fonts\./, r=>r.abort());
const p = await c.newPage(); p.on('pageerror',e=>errors.push(e.message)); await p.goto('file://'+file+'#home');
await p.click(`#ctlDevice button[data-v="${device}"]`);
const h1=()=>p.evaluate(()=>document.querySelector('#app h1').textContent); const ok=(c,m)=>{if(!c)fails.push(device+': '+m)};
await p.click('#app [data-open-first]'); ok(await p.locator('#revT').count()===1,'continue review opens first item');
await p.selectOption('#ctlScreen','home'); await p.click('#app .class-card .card-title >> nth=0'); ok((await h1()).includes('·'),'class card opens class');
await p.click('#app [data-assign-from]'); ok(await h1()==='Հանձնարարել','assign from class');
await p.click('#app [data-as-item] >> nth=0'); await p.click('#app [data-as-next]'); await p.click('#app [data-as-next]'); await p.click('#app [data-as-send]'); ok(await p.locator('#okT').count()===1,'assign completes');
await p.selectOption('#ctlScreen','editor'); await p.fill('#edTitle','x'); await p.selectOption('#ctlScreen','home'); ok(await p.locator('#gT').count()===1,'editor guard');
await p.click('[data-guard="leave"]'); ok(await h1()==='Գլխավոր','leave editor');
await p.selectOption('#ctlScreen','class'); await p.click('#app [data-tab="skills"]'); await p.click('#app .matrix button.band >> nth=0'); ok(await p.locator('.drawer').count()===1,'matrix cell opens drawer');
await p.keyboard.press('Escape'); ok(await p.locator('.drawer').count()===0,'escape closes drawer');
await p.selectOption('#ctlScreen','library'); await p.click('#app [data-modal^="material:"] >> nth=0'); ok(await p.locator('.modal').count()===1,'material preview');
await p.click('.modal [data-close-modal]');
await p.selectOption('#ctlScreen','signin'); await p.click('#app [data-signin]'); ok(await h1()==='Գլխավոր','sign-in returns home');
await c.close(); }
console.log(fails.length?fails.join('\n'):'paths ok', errors.length?'ERRORS '+errors.join('|'):'no errors'); await b.close();
