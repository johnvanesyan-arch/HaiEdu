import {githubRequest,ObserverError} from './failure-observer.mjs';
import {validateClientSummary} from '../supabase/functions/_shared/client-failure-summary.mjs';
import {FAILURE_CATEGORIES} from '../web/client-failure-contract.mjs';
const titles=Object.freeze({service_failure:'HaiEdu: repeated service failures reported',request_failed:'HaiEdu: repeated connection failures reported',write_unconfirmed:'HaiEdu: repeated unconfirmed submissions reported',invalid_response:'HaiEdu: unexpected service replies reported',audio_playback:'HaiEdu: repeated audio failures reported',application_exception:'HaiEdu: repeated page errors reported'});
const marker=category=>`<!-- haiedu-bf22-client:v1:${category} -->`;
export function clientIncidentBody(summary,category){
  validateClientSummary(summary);if(!FAILURE_CATEGORIES.includes(category))throw Error('invalid_client_summary');
  return [marker(category),'**Investigation needed.**',`Observed: ${summary.observedAt}`,
    ...summary.candidates.filter(x=>x.category===category).map(x=>`Operation: ${x.operation}. Reports in a qualifying interval: ${x.count}.`),
    'These are authenticated browser reports, not proof that a server operation failed or that student work was lost.',
    'No student names, answers, passwords or raw error messages are included. Reports are grouped; repeated observations do not send more notifications.',
    'Resolve this issue after investigating recovery. Silence alone does not close it. Do not put learner data or credentials in this public issue.'].join('\n\n');
}
export async function publishClientIncidents(summary,{now=()=>new Date(),...options}={}){
  validateClientSummary(summary);const age=now().getTime()-Date.parse(summary.observedAt);
  if(age < -5000||age>600000)throw Error('stale_client_summary');
  if(!summary.candidates.length)return [];
  const owned=new Map();
  for(let page=1;page<=10;page++){
    // Closed issues also suppress reopening the same old bucket after manual
    // resolution. A new incident is eligible only after a two-hour quiet gap.
    const issues=await githubRequest(`/issues?state=all&creator=github-actions%5Bbot%5D&sort=created&direction=desc&per_page=100&page=${page}`,options);
    if(!Array.isArray(issues))throw new ObserverError('invalid_github_response');
    for(const issue of issues){
      if(issue.pull_request||issue.user?.login!=='github-actions[bot]'||issue.user?.type!=='Bot')continue;
      const category=FAILURE_CATEGORIES.find(c=>typeof issue.body==='string'&&issue.body.startsWith(marker(c)+'\n\n'));
      if(!category)continue;
      if(issue.title!==titles[category])throw Error('ambiguous_client_incident');
      if(issue.state==='open'||issue.state==='closed'&&Number.isFinite(Date.parse(issue.closed_at))&&now().getTime()-Date.parse(issue.closed_at)<7200000)owned.set(category,true);
    }
    if(issues.length<100)break;if(page===10)throw Error('client_incident_scan_limit');
  }
  const results=[];
  for(const category of FAILURE_CATEGORIES){
    if(!summary.candidates.some(x=>x.category===category))continue;
    if(owned.has(category)){results.push({category,action:'unchanged'});continue;}
    await githubRequest('/issues',{...options,method:'POST',body:{title:titles[category],body:clientIncidentBody(summary,category)}});
    results.push({category,action:'opened'});
  }
  return results;
}
