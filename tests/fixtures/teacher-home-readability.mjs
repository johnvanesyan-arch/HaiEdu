// Executed in the native page. Contained page geometry alone can hide a copy
// column squeezed to one letter per line; inspect natural word ranges as well.
export function teacherHomeReadability(){
 const errors=[];
 const selectors='.teacher-home-paths,.teacher-welcome-copy,.teacher-onboarding-card h3,.teacher-onboarding-steps,#teacherToday h2,#teacherToday h3,#teacherToday .today-summary,#teacherToday .today-class-card,#institutionalTeacherNotice h2';
 for(const el of document.querySelectorAll(selectors)){
  if(!el.getClientRects().length)continue;
  const box=el.getBoundingClientRect(),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  if(el.scrollWidth>el.clientWidth+1||box.right>innerWidth+1)errors.push(el.textContent);
  // Numeric year ranges and hyphens have normal break opportunities; inspect
  // continuous letter/mark runs rather than treating every non-space as a word.
  for(let node=walker.nextNode();node;node=walker.nextNode())for(const word of node.textContent.matchAll(/\p{L}[\p{L}\p{M}]*/gu)){
   const r=document.createRange();r.setStart(node,word.index);r.setEnd(node,word.index+word[0].length);
   const rects=[...r.getClientRects()].filter(r=>r.width>0);
   if(rects.some(r=>Math.abs(r.top-rects[0].top)>1)||rects.some(r=>r.left<box.left-1||r.right>box.right+1))errors.push(word[0]);
  }
 }
 return errors;
}
