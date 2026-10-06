import { escapeHtml as esc } from './learning-navigation.mjs';
import { renderEvidenceGroups } from './analytics-provenance.mjs';
export function mountSchoolAnalytics(root,supabase,schoolId) {
  let live=true,version=0;
  const fields=[['academicYearId','Ուսումնական տարի'],['subjectProgramId','Առարկա և դասարան'],['classId','Դասարան'],['curriculumReleaseId','Թողարկում'],['unitId','Գլուխ']];
  root.innerHTML=`<h3>Ուսումնական վերլուծություն</h3><form class="row">${fields.map(([key,label])=>`<label>${label}<select name="${key}" aria-label="${label}"><option value="">Բոլորը</option></select></label>`).join('')}<button type="submit">Թարմացնել</button></form><p role="status"></p><div data-metrics></div><div data-evidence></div>`;
  const form=root.querySelector('form'),message=root.querySelector('[role=status]');
  async function load() {
    const request=++version;root.querySelector('[data-metrics]').replaceChildren();root.querySelector('[data-evidence]').replaceChildren();message.textContent='Տվյալները բեռնվում են…';
    const body={schoolId};for(const [key] of fields)if(form.elements[key].value)body[key]=form.elements[key].value;
    try {
      const {data,error}=await supabase.functions.invoke('get-school-performance-analytics',{body});
      if(!live||request!==version)return;
      if(error||!data?.analytics)throw new Error('Ընտրված տվյալներն այս պահին հասանելի չեն։');
      for(const [key,list] of [['academicYearId','academicYears'],['subjectProgramId','programmes'],['classId','classes'],['curriculumReleaseId','releases'],['unitId','units']]) {
        const select=form.elements[key];const selected=data.scope[key] ?? '';
        const rows=(data.options[list] ?? []).filter(row=>key!=='unitId'||row.curriculumReleaseId===data.scope.curriculumReleaseId);
        select.innerHTML='<option value="">Բոլորը</option>'+rows.map(row=>`<option value="${esc(row.id)}">${esc(row.label||row.name)}</option>`).join('');select.value=selected;
      }
      const a=data.analytics;
      root.querySelector('[data-metrics]').innerHTML=`<p>${a.enrollment.students} ընդգրկված աշակերտ · ${a.participation.students} մասնակցած · ${a.evidence.completedSessions} ավարտված աշխատանք · ${a.chapterReview.completedSessions} կրկնություն</p>`;
      renderEvidenceGroups(root.querySelector('[data-evidence]'),data);message.textContent='';
    }catch(error){if(live&&request===version)message.textContent=error.message;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();load();});
  form.addEventListener('change',event=>{
    const key=event.target.name;
    for(const [downstream] of fields.slice(fields.findIndex(([field])=>field===key)+1))form.elements[downstream].value='';
    load();
  });
  load();return()=>{live=false;++version;root.replaceChildren();};
}
