// Read-only extension of the existing reviewed-main, designated-fixture runner.
// Never create learner submissions merely to manufacture a nonzero live queue.
export async function verifyTeacherToday({sides,fixture,check,call,request,pageFor,report,site}){
 const samples=[];
 for(const side of sides){
  const actor=side+'_teacher',other=side==='A'?'B':'A';
  for(let sample=0;sample<5;sample++){
   const started=performance.now();
   const data=await call(actor,'get-teacher-workspace',{recent:[fixture[side].classId,fixture[other].classId]},`${side}: Today scoped metadata sample ${sample+1}`);
   samples.push({side,readMs:Math.round(performance.now()-started),pendingCount:data.pendingCount});
   check(`${side}: Today complete coverage and timestamp ${sample+1}`,data.version==='teacher-workspace-v1'&&data.coverage==='active_writable_school_contexts'&&Number.isInteger(data.pendingCount)&&data.pendingCount>=0&&Number.isFinite(Date.parse(data.snapshotAt))&&data.queue.length<=12&&data.cards.length<=6);
   check(`${side}: recent hints cannot add a foreign class ${sample+1}`,!data.cards.some(c=>c.id===fixture[other].classId));
   check(`${side}: Today never projects response or draft text ${sample+1}`,data.queue.every(w=>!Object.keys(w).some(k=>/text|response|feedback|answer/i.test(k))));
  }
  await call(actor,'get-teacher-workspace',{assignmentId:fixture[other].assignmentId},`${side}: foreign Today filter denied`,r=>r.status===403&&r.data?.error==='workspace_context_unavailable');
  await call(actor,'get-teacher-workspace',{workId:'ffffffff-ffff-4fff-8fff-ffffffffffff'},`${side}: unavailable Today work selector denied`,r=>r.status===403&&r.data?.error==='workspace_context_unavailable');
  for(const role of ['student','admin'])await call(side+'_'+role,'get-teacher-workspace',{},`${side}: ${role} cannot read teacher Today`,r=>r.status===403&&r.data?.error==='workspace_context_unavailable');
  const p=await pageFor(actor,'teacher.html?view=home');
  await p.locator('[data-today-time]').filter({hasText:'Ստուգված է'}).waitFor();
  check(`${side}: signed-in Today displays a fresh scoped summary`,await p.locator('[data-today-summary]').innerText().then(s=>/աշխատանք է սպասում ստուգման/.test(s)));
  const card=p.locator('.today-class-card').filter({has:p.locator(`a[href*="class=${fixture[side].classId}"]`)});
  // Large directories may legitimately omit the original class from the first six.
  if(await card.count()){
   check(`${side}: authorized live class card includes subject art`,await card.locator('svg').count()===1);
   const href=new URL(await card.locator('a').getAttribute('href'),site);
   check(`${side}: live card links to its exact assignment`,href.searchParams.get('assignment')===fixture[side].assignmentId&&href.searchParams.get('view')==='class');
  }
  await p.setViewportSize({width:360,height:900});
  check(`${side}: Today narrow layout does not overflow`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.context().close();
 }
 const unauth=await request(null,'/functions/v1/get-teacher-workspace',{});check('Today unauthenticated read denied',unauth.status===401);
 const times=samples.map(s=>s.readMs).sort((a,b)=>a-b);
 report.teacherToday={contract:'teacher-workspace-v1',samples,metadataReadMs:{percentileMethod:'nearest-rank',p50:times[Math.ceil(times.length*.5)-1],p95:times[Math.ceil(times.length*.95)-1]},
  scope:'Designated two-school live metadata/empty-or-current queue; no learner writes',
  reviewOpening:'Nonzero direct inspection, next/review removal and reload use actual SQL + Edge handler in isolated native tests. No production submission is fabricated.',
  b7Baseline:{detailMedianMs:5870,detailP95Ms:7880,unitMedianMs:6840,unitP95Ms:8860},
  perf02:'Open: metadata timing is not an equivalent measurement of opening a submitted response. Complete the paired live review timing and remaining Home/detail budgets before B.12.'};
}
