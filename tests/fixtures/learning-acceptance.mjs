// Disposable SQL only. Auth.getUser is an explicit credential double; the real
// Auth-session gate, Edge handler bodies, routers and governed transactions run.
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import vm from 'node:vm';
import ts from 'typescript';
import { database, id } from './learning-dashboard-db.mjs';
import { scopes, blueprintId, slot } from './governed-session-db.mjs';
import { routeGovernedLearning, verifiedSessionClaim } from '../../supabase/functions/_shared/governed-learning-runtime.mjs';
import { routeStudentDashboard } from '../../supabase/functions/_shared/student-dashboard-handler.mjs';
import * as evidence from '../../supabase/functions/_shared/analytics-evidence.mjs';

export { id };
export const acceptanceScopes = [...scopes, { programme:202,release:502,unit:514,model:612,skills:[527,528],enrollment:373,code:'SYN-B-CH2' }];
export const selection = idx => {
  const s=acceptanceScopes[idx];
  return { enrollmentId:id(s.enrollment),curriculumReleaseId:id(s.release),unitId:id(s.unit) };
};
export const href = (idx,action) => '/course.html?'+new URLSearchParams({...Object.fromEntries(Object.entries(selection(idx)).map(([k,v])=>[{enrollmentId:'enrollment',curriculumReleaseId:'release',unitId:'unit'}[k],v])),...(action?{action}:{})});

export async function postgresClient() {
  const child=spawn('python',['tests/fixtures/phase3_sql_bridge.py'],{stdio:['pipe','pipe','inherit']});
  const pending=new Map();let next=0,readyResolve,readyReject;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const ended=new Promise((resolve,reject)=>child.once('exit',code=>code===0?resolve():reject(Error(`SQL bridge exited ${code}`))));
  ended.catch(error=>{readyReject(error);for(const p of pending.values())p.reject(error);});
  createInterface({input:child.stdout}).on('line',line=>{
    const m=JSON.parse(line);if(m.ready){console.log(`Isolated learning acceptance SQL: ${m.version}`);readyResolve();return;}
    const p=pending.get(m.id);pending.delete(m.id);
    if(m.error)p.reject(Object.assign(Error(m.error),{code:m.code}));else p.resolve({rows:m.rows});
  });
  await ready;
  return {
    query(query,params=[]){return new Promise((resolve,reject)=>{const request=++next;pending.set(request,{resolve,reject});child.stdin.write(JSON.stringify({id:request,query,params})+'\n');});},
    exec(query){return this.query(query);},
    async close(){child.stdin.end(JSON.stringify({close:true})+'\n');await ended;},
  };
}

export function compile(source, bindings, names) {
  const code=ts.transpile(source.replace(/^import[\s\S]*?;\n/gm,'').replace(/^export /gm,''),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None});
  return vm.runInNewContext(code+'\n({'+names.join(',')+'})',{Response,Request,atob,URL,console,...bindings});
}

export function sqlAdmin(db) {
  const identifier = value => {if(!/^[a-z_][a-z0-9_]*$/.test(value))throw Error('Unsafe fixture identifier');return value;};
  const tableName = value => value.split('.').map(identifier).join('.');
  const admin={
    from(table){
      table=tableName(table);const clauses=[],params=[],orders=[];let columns='*',limit=null,offset=0,single=false;
      const bind=value=>{params.push(value);return '$'+params.length;};
      const q={
        select(value){columns=value==='*'?'*':value.split(',').map(x=>identifier(x.trim())).join(',');return q;},
        eq(key,value){clauses.push(identifier(key)+'='+bind(value));return q;},
        in(key,values){clauses.push(identifier(key)+'=any('+bind(values)+')');return q;},
        order(key,{ascending=true}={}){orders.push(identifier(key)+(ascending?' asc':' desc'));return q;},
        limit(value){limit=value;return q;},range(a,b){offset=a;limit=b-a+1;return q;},
        maybeSingle(){single=true;return q;},
        then(resolve,reject){return (async()=>{
          try{
            const result=await db.query(`select ${columns} from ${table}${clauses.length?' where '+clauses.join(' and '):''}${orders.length?' order by '+orders.join(','):''}${limit==null?'':' limit '+Number(limit)}${offset?' offset '+Number(offset):''}`,params);
            if(single&&result.rows.length>1)throw Error('Ambiguous fixture row');
            // Match PostgREST's date/timestamp JSON representation, rather than
            // PGlite's JavaScript Date objects. Do not alter JSON policy values.
            const rows=result.rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value instanceof Date?(['starts_on','ends_on','effective_from','effective_to'].includes(key)?value.toISOString().slice(0,10):value.toISOString()):value])));
            return {data:single?(rows[0]??null):rows,error:null};
          }catch(error){return {data:null,error:{message:error.message,code:error.code}};}
        })().then(resolve,reject);},
      };return q;
    },
    async rpc(name,args){
      try{
        const entries=Object.entries(args),values=entries.map(([,v])=>v&&typeof v==='object'?JSON.stringify(v):v);
        const result=await db.query(`select ${identifier(name)}(${entries.map(([k],i)=>identifier(k)+' => $'+(i+1)).join(',')}) result`,values);
        return {data:result.rows[0].result,error:null};
      }catch(error){return {data:null,error:{message:error.message,code:error.code}};}
    },
  };return admin;
}

export async function acceptanceFixture() {
  const db=await database({curriculumScopes:acceptanceScopes,...(process.env.PHASE3_POSTGRES_17_CI==='1'?{client:await postgresClient()}:{})});
  try {
    await db.exec(readFileSync('supabase/migrations/0012_live_session_gate.sql','utf8'));
    await db.exec(`insert into grades values('${id(8)}',8,'8-րդ դասարան');
      update subject_programs set grade_id='${id(8)}' where id='${id(202)}';
      update classes set grade_id='${id(8)}' where id='${id(322)}';
      update subjects set code=case when id='${id(101)}' then 'SYN-A' else 'SYN-B' end,name_hy=case when id='${id(101)}' then 'Առարկա Ա' else 'Առարկա Բ' end;
      update curriculum_release_units set sequence_order_snapshot=case when unit_id in('${id(512)}','${id(514)}') then 2 else 1 end,title_hy_snapshot=case when unit_id in('${id(512)}','${id(514)}') then 'Գլուխ Բ' else 'Գլուխ Ա' end;
      create table item_versions(item_id uuid,version_no integer,snapshot jsonb,primary key(item_id,version_no));`);
    // Different counts/thresholds, same runtime; no subject-specific defaults.
    await db.exec(`insert into academic_mastery_policy_versions select '${id(602)}',status,effective_from,5,maximum_mastery_attempts,review_required_after_failed_attempts,review_optional_after_pass,review_available_after_final_failure,additional_attempt_after_final_failure from academic_mastery_policy_versions where id='${id(601)}'`);
    const s=acceptanceScopes[3],contracts=[];
    for(const mode of ['diagnostic','practice','mastery_check','chapter_review']) {
      const bp=blueprintId(3,mode),n=slot(3,mode);
      for(let j=4;j<=5;j++) {
        const item=id(n+j),skill=id(s.skills[j===4?0:1]);
        await db.query("insert into items(id,skill_id,item_type,status,version_no,code,item_template_id,variant_key,prompt_hy) values($1,$2,'single_choice','published',1,$3,$4,$3,'Synthetic selected response')",[item,skill,'SYN-'+(n+j),id(902)]);
        await db.query('insert into assessment_pool_items values($1,$2,true)',[id(n),item]);
        await db.query('insert into assessment_blueprint_items values($1,$2,1)',[bp,item]);
        await db.query('insert into item_curriculum_scopes(item_id,subject_program_id,unit_id,is_primary) values($1,$2,$3,true)',[item,id(s.programme),id(s.unit)]);
        await db.query('insert into item_answer_keys(item_id,answer) values($1,$2)',[item,'{"value":"A"}']);
        await db.query("insert into item_options values($1,'A','Correct',1),($1,'B','Wrong',2)",[item]);
        if(mode==='diagnostic')await db.query('insert into assessment_form_items values($1,$2)',[id(slot(3,'diagnostic')+60),item]);
      }
      const p=(await db.query('select configuration_snapshot from assessment_blueprints where id=$1',[bp])).rows[0].configuration_snapshot.assessmentPolicy;
      p.plannedQuestionCount=5;p.academicMasteryPolicyId=id(602);if(p.questionCountBySkill)p.questionCountBySkill={[id(s.skills[0])]:2,[id(s.skills[1])]:3};if(mode==='mastery_check')p.minimumPercent=60;
      contracts.push(p);await db.query('update assessment_blueprints set configuration_snapshot=$2 where id=$1',[bp,JSON.stringify({assessmentPolicy:p})]);
    }
    const model=(await db.query('select configuration from learning_model_configurations where id=$1',[id(s.model)])).rows[0].configuration;
    model.assessmentPolicyContracts=model.assessmentPolicyContracts.filter(p=>p.unitId!==id(s.unit)).concat(contracts);
    await db.query('update learning_model_configurations set configuration=$2 where id=$1',[id(s.model),JSON.stringify(model)]);
    await db.exec("insert into item_versions select id,version_no,jsonb_build_object('item',jsonb_build_object('skill_id',skill_id,'difficulty',difficulty)) from items");
    const admin=sqlAdmin(db),credentials=new Map(),logs=[],calls=[];
    const credential=(student=id(10),session=id(401))=>{
      const token='fixture.'+Buffer.from(JSON.stringify({sub:student,session_id:session,aal:'aal1'})).toString('base64url')+'.fixture';
      credentials.set(token,student);return token;
    };
    admin.auth={getUser:async token=>({data:{user:credentials.has(token)?{id:credentials.get(token)}:null},error:credentials.has(token)?null:{message:'invalid fixture credential'}})};
    const {hasActiveLiveSession}=compile(readFileSync('supabase/functions/_shared/auth.ts','utf8'),{},['hasActiveLiveSession']);
    const names=['get-student-classes','get-student-dashboard','start-learning-session','get-session-item','submit-answer','submit-mastery-answer','get-remediation-help','get-mastery-check-status','get-chapter-mastery-lifecycle'];
    const handlers=new Map();
    for(const name of names){
      let handler;
      compile(readFileSync(`supabase/functions/${name}/index.ts`,'utf8'),{
        routeGovernedLearning,verifiedSessionClaim,routeStudentDashboard,createClient:()=>admin,hasActiveLiveSession,
        getStudentCourseEntitlements:async()=>[],
        hasPhysics7Access:async()=>false,
        Deno:{env:{get:()=> 'fixture-only'},serve:fn=>{handler=fn;}},
        console:{error:(...args)=>logs.push(args)},
      },[]);handlers.set(name,handler);
    }
    const defaultToken=credential();
    return {db,admin,credential,defaultToken,logs,calls,
      async request(name,body={},token=defaultToken){
        calls.push({name,body,token});const handler=handlers.get(name);if(!handler)throw Error('Unknown fixture handler');
        return handler(new Request('http://isolated.invalid/functions/v1/'+name,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));
      },
      async call(name,body={},token=defaultToken){const r=await this.request(name,body,token);return {status:r.status,body:await r.json()};},
      async close(){await db.close();},
    };
  } catch(error){await db.close();throw error;}
}

export async function answerBody(db,item,correct=true) {
  const order=(await db.query('select canonical_option_order from private.learning_session_item_option_orders where session_item_id=$1',[item.sessionItemId])).rows[0]?.canonical_option_order;
  return {sessionId:item.session.id,sessionItemId:item.sessionItemId,itemId:item.item.id,response:{value:item.item.type==='true_false'?correct:String.fromCharCode(65+order.indexOf(correct?'A':'B'))}};
}
export async function finishThroughAPI(f,session,correct=true) {
  let result;
  for(let i=0;i<100;i++){
    const item=await f.call('get-session-item',{sessionId:session.id});
    if(item.status!==200)throw Error(JSON.stringify(item));if(item.body.complete)return result;
    result=await f.call(session.mode==='mastery_check'?'submit-mastery-answer':'submit-answer',await answerBody(f.db,item.body,correct));
    if(result.status!==200)throw Error(JSON.stringify(result));
  }throw Error('Unbounded isolated acceptance flow');
}
export function analyticsReaders() {
  const diagnostic=compile(readFileSync('supabase/functions/_shared/initial-diagnostic.ts','utf8'),{},['firstCompletedDiagnostic']);
  const teacher=compile(readFileSync('supabase/functions/_shared/institutional-teacher-analytics.ts','utf8'),{...evidence,...diagnostic},['loadExactInstitutionalClassAnalytics']);
  const school=compile(readFileSync('supabase/functions/_shared/school-performance-analytics.ts','utf8'),evidence,['aggregateSchoolPerformanceAnalytics']);
  return {...teacher,...school};
}
