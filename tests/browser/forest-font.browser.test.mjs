import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
let browser;before(async()=>browser=await chromium.launch({headless:true}));after(async()=>browser?.close());
test('optimized Forest font retains native Armenian/Latin layout metrics across the approved weight range',async t=>{
 const manifest=JSON.parse(await readFile('web/assets/fonts/forest-font.json','utf8'));const context=await browser.newContext();t.after(()=>context.close());
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:'<main>Font metric verification</main>'});const file=u.pathname.split('/').at(-1);if(![manifest.source.file,manifest.delivery.file].includes(file))return route.abort();return route.fulfill({contentType:file.endsWith('.woff2')?'font/woff2':'font/ttf',body:await readFile('web/assets/fonts/'+file)});});
 const page=await context.newPage();await page.goto('https://font.test/fixture');
 const result=await page.evaluate(async m=>{
  for(const [name,file]of [['Baseline',m.source.file],['Delivered',m.delivery.file]]){const face=new FontFace(name,`url('/assets/fonts/${file}')`,{weight:'100 900',stretch:'normal'});document.fonts.add(await face.load());}
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),rows=[];
  for(const weight of m.verification.weights)for(const text of ['Իմ դասարանները՝ առաջընթաց և աշխատանքներ։','English 7 — Practice 0123456789']){
   const measure=name=>{ctx.font=`${weight} 32px "${name}"`;const s=ctx.measureText(text);return[s.width,s.actualBoundingBoxAscent,s.actualBoundingBoxDescent];};rows.push({weight,baseline:measure('Baseline'),delivered:measure('Delivered')});
  }return rows;
 },manifest);
 assert.equal(result.length,14);for(const row of result)for(let i=0;i<3;i++)assert.ok(Math.abs(row.baseline[i]-row.delivered[i])<0.01,JSON.stringify(row));
});
