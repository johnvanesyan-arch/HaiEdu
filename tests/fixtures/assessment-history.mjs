// Saved response examples, independent of the rendering implementation.
export const historyReports=[
 {schemaVersion:'haiedu-assessment-result-v3',score:null,passed:null,groups:[
  {label:'Գնահատված հմտություն',earned:0,possible:3,percent:0,determinesPass:false},
  {label:'Այլ հմտություն',earned:0,possible:0,percent:null,determinesPass:false}]},
 {schemaVersion:'haiedu-assessment-result-v2',score:null,passed:null,groups:[
  {label:'Գնահատված հմտություն',correct:2,answered:3,percent:66.67,determinesPass:false},
  {label:'Այլ հմտություն',correct:0,answered:0,percent:null,determinesPass:false}]},
 {schemaVersion:'haiedu-assessment-result-v3',score:{earned:22.3888,possible:28,percent:80},passed:false,groups:[
  {label:'Պարտադիր հմտություններ',earned:22.3888,possible:28,percent:80,determinesPass:true},
  {label:'Այլ հմտություն',earned:0,possible:0,percent:null,determinesPass:false}]}
];
export function historyEntries(){
 return historyReports.map((report,n)=>({id:'history-'+n,mode:n===2?'mastery_check':'practice',status:'completed',correct:n===0?0:2,answered:n===2?28:3,percent:n===0?0:n===2?80:66.67,completedAt:'2026-10-31T10:00:00Z',assessmentResult:structuredClone(report),reporting:structuredClone(report),curriculumReleaseId:'release-a',blueprintId:'blueprint-'+n,policyBindingId:'policy-'+n,modelId:'model-'+n,runtimeBuildId:'a'.repeat(40),provenanceStatus:'governed',contract:{releaseId:'release-a',unitId:'unit-a',policyBindingId:'policy-'+n,modelId:'model-'+n,runtimeBuildId:'a'.repeat(40)}}));
}
export function historyReadability(selector){
 const root=document.querySelector(selector),errors=[];
 if(!root)return ['history missing'];
 for(const el of root.querySelectorAll('.assessment-history-list>li,.assessment-group,:scope>h2,:scope>h3,.assessment-record-heading h3,.assessment-record-heading h4')){
  const box=el.getBoundingClientRect();
  if(el.scrollWidth>el.clientWidth+1||box.right>innerWidth+1)errors.push('overflow: '+el.textContent);
  if(!el.matches('.assessment-group,h2,h3,h4'))continue;
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode())for(const word of node.textContent.matchAll(/\p{L}[\p{L}\p{M}]*/gu)){
   const r=document.createRange();r.setStart(node,word.index);r.setEnd(node,word.index+word[0].length);
   const rects=[...r.getClientRects()].filter(r=>r.width>0);
   if(rects.some(r=>Math.abs(r.top-rects[0].top)>1))errors.push(word[0]);
  }
 }
 return errors;
}
