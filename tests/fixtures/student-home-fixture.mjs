// Synthetic auth and read services for the real student browser modules.
// No production credentials, learners, content or database writes.
export function installStudentHomeFixture(options = {}) {
  const id = n => `76000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const all = [
    { enrollmentId:id(1), curriculumReleaseId:id(2), unitId:id(3), subjectProgramId:id(4), unitSequence:1, subjectCode:'physics', subjectNameHy:'Ֆիզիկա', gradeLabelHy:'7-րդ դասարան', gradeNumber:7, unitTitleHy:'Բնության ուսումնասիրության ֆիզիկական մեթոդները', className:'7Ա', schoolName:'Փորձնական դպրոց Ա', academicYearLabel:'2026–2027', releaseNumber:1, extensionKey:'legacy-physics7-u01-v1' },
    { enrollmentId:id(1), curriculumReleaseId:id(20), unitId:id(5), subjectProgramId:id(4), unitSequence:2, subjectCode:'physics', subjectNameHy:'Ֆիզիկա', gradeLabelHy:'7-րդ դասարան', gradeNumber:7, unitTitleHy:'Նյութի կառուցվածքը և հատկությունները', className:'7Ա', schoolName:'Փորձնական դպրոց Ա', academicYearLabel:'2026–2027', releaseNumber:2 },
    { enrollmentId:id(6), curriculumReleaseId:id(7), unitId:id(8), subjectProgramId:id(9), unitSequence:1, subjectCode:'english', subjectNameHy:'Անգլերեն', gradeLabelHy:'7-րդ դասարան', gradeNumber:7, unitTitleHy:'Ես աշխարհում․ իմ բնավորությունն ու հագուստի ոճը', className:'7Ա', schoolName:'Փորձնական դպրոց Ա', academicYearLabel:'2026–2027', releaseNumber:1 },
    { enrollmentId:id(6), curriculumReleaseId:id(7), unitId:id(10), subjectProgramId:id(9), unitSequence:2, subjectCode:'english', subjectNameHy:'Անգլերեն', gradeLabelHy:'7-րդ դասարան', gradeNumber:7, unitTitleHy:'Երաժշտությունը մեր կյանքում', className:'7Ա', schoolName:'Փորձնական դպրոց Ա', academicYearLabel:'2026–2027', releaseNumber:1 },
    { enrollmentId:id(11), curriculumReleaseId:id(12), unitId:id(13), subjectProgramId:id(14), unitSequence:1, subjectCode:'mathematics', subjectNameHy:'Մաթեմատիկա', gradeLabelHy:'8-րդ դասարան', gradeNumber:8, unitTitleHy:'Կիրառական խնդիրների լուծում և համեմատություն', className:'8Բ', schoolName:'Փորձնական դպրոց Բ՝ երկար անվանումով', academicYearLabel:'2027–2028', releaseNumber:3 },
  ];
  if(options.allSubjects) {
    const codes=['english','physics','mathematics','armenian','chemistry','geography','biology','history','unknown'];
    all.splice(0,all.length,...codes.map((code,n)=>({...all[4],subjectCode:code,subjectNameHy:'Առարկա '+code,enrollmentId:id(200+n),subjectProgramId:id(300+n)})));
  }
  let contexts = options.contexts ?? (options.empty ? [] : options.single ? [all[2]] : all);
  let session = options.signedOut ? null : { user:{id:options.actorId??id(90)}, access_token:'synthetic-only' };
  let failed = Boolean(options.error), held = Boolean(options.held);
  const calls = [], listeners = [], pending = [];
  const snapshot = () => ({contexts,navigationVersion:'authorized-learning-navigation-v1'});
  const dashboard = body => ({
    dashboardVersion:'authorized-learning-dashboard-v1', context:contexts.find(c=>c.unitId===body.unitId),
    practiceAccess:{unlocked:!options.required}, baseline:options.required?null:{correct:12,answered:16,percent:75},
    activeSession:options.active===false || options.required ? null : {id:'synthetic-session',mode:'practice',answered:3,planned:8,policyBindingId:'synthetic-binding',targetSkillId:id(70)},
    skills:Array.from({length:6},(_,n)=>({id:id(70+n),code:'S'+n,nameHy:'Ուսումնական հմտություն',ready:n<2,mastery:{percent:60,evidenceCount:5},requiredForReadiness:n!==5})),
    history:[],modes:Object.fromEntries(['diagnostic','practice','mastery_check','chapter_review'].map(mode=>[mode,{status:'configured',questions:8,hintsAllowed:mode==='practice'||mode==='chapter_review'}])),
  });
  const emit = event => listeners.forEach(listener=>listener(event,session));
  const client = {
    auth: {
      getSession:async()=>({data:{session}}),
      getUser:async()=>({data:{user:session?.user}}),
      onAuthStateChange:listener=>{listeners.push(listener);queueMicrotask(()=>listener('INITIAL_SESSION',session));return {data:{subscription:{unsubscribe(){}}}};},
      signOut:async()=>{ calls.push({name:'signOut'}); await Promise.resolve(); session=null; emit('SIGNED_OUT'); if(options.signOutHeld)await new Promise(resolve=>pending.push(resolve)); return {error:null}; },
    },
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:options.role || 'student',account_status:'active'}})})})}),
    functions:{invoke:async(name,{body})=>{
      calls.push({name,body});
      if(name==='get-student-classes' || (name==='get-student-dashboard' && body.navigation)) {
        if(failed) return {error:{message:'synthetic_unavailable'}};
        return {data:snapshot()};
      }
      if(name==='get-student-dashboard') {
        const result = {data:dashboard(body)};
        if(held) return new Promise(resolve=>pending.push(()=>resolve(result)));
        return result;
      }
      if(name==='manage-writing-assignments'&&body.action==='inbox')return {data:{version:'writing-assignments-v1',assignments:[],hasMore:false,nextOffset:50}};
      if(name==='manage-resource-assignments'&&body.action==='inbox')return {data:{assignments:[],hasMore:false,nextOffset:50}};
      if(name==='manage-written-work') return {data:{version:'written-work-v1',tasks:options.writingTasks ? ['draft','submitted','reviewed'].map((state,n)=>({id:id(400+n),title:['Գրավոր սևագիր','Ներկայացված աշխատանք','Ստուգված աշխատանք'][n],locale:'hy',state,available:true,baselineRequired:false})) : []}};
      throw Error('Unexpected API '+name);
    }},
  };
  window.__homeFixture = {
    calls, all, pending,
    refresh:()=>emit('TOKEN_REFRESHED'),
    release:()=>{held=false;pending.splice(0).forEach(resolve=>resolve());},
    recover:()=>{failed=false;window.dispatchEvent(new CustomEvent('haiedu-refresh-courses'));},
    revoke:()=>{contexts=[];window.dispatchEvent(new CustomEvent('haiedu-refresh-courses'));},
    switchAccount:()=>{contexts=[all[4]];session={user:{id:id(91)},access_token:'synthetic-second'};emit('SIGNED_IN');},
    hold:()=>{held=true;},
  };
  return client;
}
