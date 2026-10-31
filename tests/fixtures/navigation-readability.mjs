// Native focus, text and clipping checks. An intentional scroll menu may have
// offscreen links; every link must become fully readable when keyboard-focused.
// No click, route change, application event or data operation is synthesized.
export async function navigationReadability() {
  await document.fonts.ready;
  const errors=[],previous=document.activeElement,position={x:scrollX,y:scrollY};
  const roots=[...document.querySelectorAll('.hm-role-nav,.amp-nav-list,.amp-mobile-nav')];
  const saved=roots.map(el=>({el,x:el.scrollLeft,y:el.scrollTop}));
  const controls=[...document.querySelectorAll('.hm-role-nav a,.hm-role-foot a,.hm-role-foot button,.amp-nav-list a,.amp-nav-utility a,.amp-nav-utility button,.amp-mobile-link')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const links=controls.map(el=>({label:el.textContent.trim(),href:el.getAttribute('href'),current:el.getAttribute('aria-current')}));
  for(const el of controls) {
    el.focus();await new Promise(requestAnimationFrame);
    const box=el.getBoundingClientRect(),label=el.textContent.trim();
    const issue=(kind,details={})=>errors.push({label,kind,...details});
    if(document.activeElement!==el)issue('unreachable keyboard control');
    if(box.height<44||box.width<44)issue('small target',{width:box.width,height:box.height});
    if(box.left< -1||box.right>innerWidth+1||box.top< -1||box.bottom>innerHeight+1)issue('focused control outside viewport',{left:box.left,right:box.right,top:box.top,bottom:box.bottom});
    for(let parent=el.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
      const style=getComputedStyle(parent),clip=parent.getBoundingClientRect();
      if(/auto|scroll|hidden|clip/.test(style.overflowX)&&(box.left<clip.left-1||box.right>clip.right+1))issue('focused control clipped horizontally');
      if(/auto|scroll|hidden|clip/.test(style.overflowY)&&(box.top<clip.top-1||box.bottom>clip.bottom+1))issue('focused control clipped vertically');
    }
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    for(let node=walker.nextNode();node;node=walker.nextNode())for(const word of node.textContent.matchAll(/\p{L}[\p{L}\p{M}]*/gu)){
      const range=document.createRange();range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);
      const rects=[...range.getClientRects()].filter(r=>r.width>0);
      if(rects.some(r=>Math.abs(r.top-rects[0].top)>1))issue('split word',{word:word[0]});
      if(rects.some(r=>r.left<box.left-1||r.right>box.right+1))issue('clipped word',{word:word[0]});
    }
  }
  if(previous&&previous!==document.body)previous.focus({preventScroll:true});else document.activeElement?.blur();
  for(const {el,x,y} of saved){el.scrollLeft=x;el.scrollTop=y;}
  window.scrollTo({left:position.x,top:position.y,behavior:'instant'});
  if(document.documentElement.scrollWidth>innerWidth+1)errors.push({kind:'page overflow'});
  return {errors,links};
}


// Establish actual keyboard modality before testing focused-label geometry.
export async function checkNavigation(page) {
  await page.keyboard.press('Tab');
  return page.evaluate(navigationReadability);
}

export function accountWordReadability() {
  const errors=[];
  for(const el of document.querySelectorAll('.privacy-shell :is(h1,h2,h3,p,dt,label,strong,small,button,.button-link)')){
    if(!el.getClientRects().length)continue;
    const box=el.getBoundingClientRect(),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    for(let node=walker.nextNode();node;node=walker.nextNode())for(const word of node.textContent.matchAll(/\p{L}[\p{L}\p{M}]*/gu)){
      const range=document.createRange();range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);
      const rects=[...range.getClientRects()].filter(r=>r.width>0);
      if(rects.some(r=>Math.abs(r.top-rects[0].top)>1)||rects.some(r=>r.left<box.left-1||r.right>box.right+1))errors.push({word:word[0],tag:el.tagName,id:el.id});
    }
  }
  return errors;
}
