import assert from 'node:assert/strict';
import {expect} from '@playwright/test';
export async function keyboardSkipAcceptance(page){
 const link=page.locator('a.skip-link').first();await expect(link).toBeAttached();
 await page.evaluate(()=>document.activeElement?.blur());
 const hidden=await link.evaluate(e=>e.getBoundingClientRect().bottom<=0);assert.ok(hidden,'skip link is outside the viewport before keyboard focus');
 await link.focus();
 const style=await link.evaluate(e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor,top:e.getBoundingClientRect().top,right:e.getBoundingClientRect().right,width:innerWidth}));
 const luminance=colour=>{const channels=colour.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
 const a=luminance(style.fg),b=luminance(style.bg),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 assert.ok(contrast>=4.5,JSON.stringify({contrast,...style}));assert.ok(style.top>=0&&style.right<=style.width+1,'focused skip link remains in view');
 await page.evaluate(()=>document.activeElement?.blur());
}
