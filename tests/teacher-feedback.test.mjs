import test,{before,after} from 'node:test';import assert from 'node:assert/strict';
import {fixture,id,context} from './fixtures/written-work-api.mjs';
let f,work,revision;const ctx=context(0,true);const data={scores:{task:2,organisation:null},feedback:'Private unfinished feedback',changeReason:''};
before(async()=>{f=await fixture();const r=await f.request({action:'submit',context:context(),payload:{taskId:id(1000),expectedRevision:0,text:'Synthetic submitted response.'}});const a=await r.json();work=a.work.id;revision=a.work.revision;if(!f.db.fixtureTransaction)await f.db.exec('begin');});after(async()=>f?.db.close());
async function api(action,payload={},actor=20,c=ctx){await f.db.exec('savepoint feedback_rpc');try{const r=await f.feedbackRequest({action,context:c,payload},actor);if(r.status>=400)await f.db.exec('rollback to feedback_rpc');return{status:r.status,data:await r.json()};}finally{await f.db.exec('release savepoint feedback_rpc');}}
async function changed(fn){await f.db.exec('savepoint feedback_test');try{await fn();}finally{await f.db.exec('rollback to feedback_test');await f.db.exec('release savepoint feedback_test');}}
// Every test rolls back its own data; PostgreSQL 17 fixtures already own an outer transaction.

const save=(extra={})=>api('save_draft',{workId:work,expectedRevision:revision,draftRevision:0,data,...extra});
test('open is one authorized writing/draft/snippet projection without creating a draft',async()=>changed(async()=>{
 const r=await api('open',{workId:work});assert.equal(r.status,200);assert.equal(r.data.writtenWork.work.id,work);assert.equal(r.data.draft,null);assert.deepEqual(r.data.snippets,[]);
 assert.equal((await f.db.query('select count(*) n from private.teacher_feedback_drafts')).rows[0].n,0);
}));
test('partial draft is private, restores exact revision, and identical lost-save retry is idempotent',async()=>changed(async()=>{
 const a=await save();assert.equal(a.status,200);assert.equal(a.data.draft.revision,1);assert.deepEqual(a.data.draft.data,data);
 const b=await save();assert.equal(b.status,200);assert.equal(b.data.draft.revision,1);
 const stale=await save({data:{...data,feedback:'Other tab'}});assert.equal(stale.status,409);
 const student=await(await f.request({action:'open',context:context(),payload:{taskId:id(1000)}})).json();assert.equal(JSON.stringify(student).includes(data.feedback),false);
 assert.equal((await api('open',{workId:work})).data.draft.revision,1);
}));
test('publication validates rubric and incomplete drafts remain private',async()=>changed(async()=>{
 await save();const r=await api('publish',{workId:work,expectedRevision:revision,draftRevision:1,decision:'assessed',requestId:id(8000)});assert.equal(r.status,400);assert.equal(r.data.error,'written_review_invalid');
 assert.equal((await f.db.query('select count(*) n from written_reviews')).rows[0].n,0);
}));
test('publish is atomic, leaves student-visible receipt/history and replays a lost reply only once',async()=>changed(async()=>{
 const complete={scores:{task:2,organisation:2,vocabulary:2,grammar:2},feedback:'Synthetic published feedback',changeReason:''};await save({data:complete});
 const payload={workId:work,expectedRevision:revision,draftRevision:1,decision:'assessed',requestId:id(8001)};
 const a=await api('publish',payload);assert.equal(a.status,200);assert.equal(a.data.receipt.replayed,false);
 const b=await api('publish',payload);assert.equal(b.status,200);assert.equal(b.data.receipt.replayed,true);assert.equal(b.data.receipt.reviewId,a.data.receipt.reviewId);
 assert.equal((await f.db.query('select count(*) n from written_reviews')).rows[0].n,1);
 assert.equal((await f.db.query('select count(*) n from private.teacher_feedback_drafts')).rows[0].n,0);
 const student=await(await f.request({action:'open',context:context(),payload:{taskId:id(1000)}})).json();assert.equal(student.submissions.at(-1).reviews.at(-1).feedback,complete.feedback);
 assert.equal((await api('publish',{...payload,decision:'return'})).status,409);
 assert.equal((await f.db.query('select count(*) n from learning_sessions')).rows[0].n,0);
}));
test('return, revised submission and regrade preserve history while old drafts are invalidated',async()=>changed(async()=>{
 await save();const p={workId:work,expectedRevision:revision,draftRevision:1,decision:'return',requestId:id(8002)};const a=await api('publish',p);assert.equal(a.status,200);assert.equal(a.data.writtenWork.work.state,'changes_requested');
 const sub=await f.request({action:'submit',context:context(),payload:{taskId:id(1000),expectedRevision:a.data.writtenWork.work.revision,text:'Revised synthetic response.'}});const b=await sub.json();assert.equal(b.submissions.length,2);assert.equal((await save()).status,409);
 const complete={scores:{task:3,organisation:3,vocabulary:3,grammar:3},feedback:'Complete',changeReason:''};const c=await save({expectedRevision:b.work.revision,data:complete});assert.equal(c.status,200);
 const d=await api('publish',{...p,expectedRevision:b.work.revision,decision:'assessed',requestId:id(8003)});assert.equal(d.status,200);
 const regrade=await save({expectedRevision:d.data.writtenWork.work.revision,data:complete});assert.equal(regrade.status,200);
 const noReason=await api('publish',{...p,expectedRevision:d.data.writtenWork.work.revision,decision:'assessed',requestId:id(8004)});assert.equal(noReason.status,400);
}));
for(const [label,sql] of [['grant',`update teacher_subject_authorizations set status='ended' where id='${id(361)}'`],['session',`update auth.sessions set not_after=now()-interval '1 minute' where id='${id(420)}'`],['role',`update profiles set role='student' where id='${id(20)}'`],['archive',`update classes set is_active=false where id='${id(321)}'`]])test(`${label} changes deny new feedback mutations`,async()=>changed(async()=>{
 await save();await f.db.exec(sql);const r=await save({draftRevision:1});assert.equal(r.status,403);
}));
test('foreign class/teacher, learner and forged selectors cannot read private draft or templates',async()=>changed(async()=>{
 await save();assert.equal((await api('open',{workId:work},20,context(1,true))).status,403);assert.equal((await api('open',{workId:work},21,context(2,true))).status,403);
 assert.equal((await api('snippets',{},10,{})).status,403);assert.equal((await api('snippets',{},30,{})).status,403);
 const forged=await f.feedbackRequest({action:'open',context:ctx,payload:{workId:work},actorId:id(21)});assert.equal(forged.status,400);
}));
test('personal snippets support versioned edit/archive/restore and foreign IDs never confer access',async()=>changed(async()=>{
 const p={id:id(8100),expectedRevision:0,title:'Generic reasoning',body:'Explain your reason.',archived:false};
 const a=await api('save_snippet',p,20,{});assert.equal(a.status,200);assert.equal((await api('save_snippet',p,20,{})).data.snippet.revision,1);
 assert.equal((await api('save_snippet',{...p,body:'Changed'},20,{})).status,409);
 assert.deepEqual((await api('snippets',{},21,{})).data.snippets,[]);assert.equal((await api('save_snippet',{...p,expectedRevision:1},21,{})).status,403);
 const b=await api('save_snippet',{...p,expectedRevision:1,archived:true},20,{});assert.equal(b.status,200);assert.equal((await api('snippets',{},20,{})).data.snippets.length,0);assert.equal((await api('snippets',{archived:true},20,{})).data.snippets.length,1);
 assert.equal((await api('save_snippet',{...p,expectedRevision:2},20,{})).status,200);
}));
test('privacy inventory, deletion cascades and direct database denial preserve existing reviewed evidence',async()=>changed(async()=>{
 await save();await api('save_snippet',{id:id(8110),expectedRevision:0,title:'Generic',body:'Generic comment',archived:false},20,{});
 const r=await f.admin.rpc('service_teacher_feedback_privacy_counts',{p_user:id(20)});assert.deepEqual(r.data,{feedbackDrafts:1,feedbackSnippets:1,feedbackReceipts:0});
 for(const role of ['anon','authenticated','service_role'])for(const table of ['teacher_feedback_drafts','teacher_feedback_snippets','teacher_feedback_receipts'])assert.equal((await f.db.query('select has_table_privilege($1,$2,\'SELECT\') p',[role,'private.'+table])).rows[0].p,false);
 for(const role of ['anon','authenticated'])assert.equal((await f.db.query('select has_function_privilege($1,\'public.service_teacher_feedback(uuid,uuid,text,jsonb,jsonb)\',\'execute\') p',[role])).rows[0].p,false);
 await f.db.query('delete from profiles where id=$1',[id(20)]);assert.equal((await f.db.query('select count(*) n from private.teacher_feedback_drafts')).rows[0].n,0);assert.equal((await f.db.query('select count(*) n from private.teacher_feedback_snippets')).rows[0].n,0);
}));
test('legacy reviews invalidate new drafts and staff deletion preserves the published judgment',async()=>changed(async()=>{
 const complete={scores:{task:2,organisation:2,vocabulary:2,grammar:2},feedback:'Synthetic mark',changeReason:''};await save({data:complete});
 const r=await f.request({action:'review',context:ctx,payload:{workId:work,expectedRevision:revision,decision:'assessed',scores:complete.scores,feedback:complete.feedback}},20);assert.equal(r.status,200);
 assert.equal((await f.db.query('select count(*) n from private.teacher_feedback_drafts')).rows[0].n,0);
 await f.db.query('delete from profiles where id=$1',[id(20)]);const reviews=(await f.db.query('select assessor_id,feedback from written_reviews')).rows;assert.equal(reviews.length,1);assert.equal(reviews[0].assessor_id,null);assert.equal(reviews[0].feedback,complete.feedback);
}));
test('personal comments have bounded pages and active count, while learner erasure cascades linked private drafts',async()=>changed(async()=>{
 await f.db.query("insert into private.teacher_feedback_snippets(id,teacher_id,title,body,revision) select gen_random_uuid(),$1,'Generic','Comment',1 from generate_series(1,50)",[id(20)]);
 const a=await api('snippets',{},20,{});assert.equal(a.status,200);assert.equal(a.data.snippets.length,20);assert.equal(a.data.hasMore,true);
 const b=await api('snippets',{offset:20},20,{});assert.equal(b.data.snippets.length,20);assert.ok(!b.data.snippets.some(x=>a.data.snippets.some(y=>y.id===x.id)));
 assert.equal((await api('save_snippet',{id:id(8200),expectedRevision:0,title:'Generic',body:'Comment',archived:false},20,{})).data.error,'feedback_snippet_limit');
 await save();await f.db.query('delete from profiles where id=$1',[id(10)]);assert.equal((await f.db.query('select count(*) n from private.teacher_feedback_drafts')).rows[0].n,0);assert.equal((await f.db.query('select count(*) n from private.teacher_feedback_snippets')).rows[0].n,50);
}));
