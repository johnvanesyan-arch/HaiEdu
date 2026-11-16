// Feed the real local collector's sanitized summary into the production
// publisher using an in-memory GitHub adapter. This file cannot send requests.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {publishClientIncidents} from '../../scripts/client-failure-incidents.mjs';
const summary=JSON.parse(readFileSync(process.argv[2],'utf8'));
const issues=[];let writes=0;
const fetchImpl=async(url,options)=>{
  assert.match(url,/^https:\/\/api\.github\.com\/repos\/johnvanesyan-arch\/HaiEdu\/issues(?:\?|$)/);
  if(options.method==='GET')return Response.json(issues);
  assert.equal(options.method,'POST');writes++;
  const body=JSON.parse(options.body);
  assert.deepEqual(Object.keys(body).sort(),['body','title']);
  assert.doesNotMatch(JSON.stringify(body),/private-answer-canary|private@example|eventId|actorTag|access_token|buildId/);
  issues.push({...body,number:issues.length+1,state:'open',user:{login:'github-actions[bot]',type:'Bot'}});
  return Response.json({number:issues.length});
};
const options={fetchImpl,token:'synthetic-never-sent',now:()=>new Date(summary.observedAt)};
const first=await publishClientIncidents(summary,options);
assert.equal(first.length,5);assert.ok(first.every(x=>x.action==='opened'));
const repeated=await publishClientIncidents(summary,options);
assert.ok(repeated.every(x=>x.action==='unchanged'));assert.equal(writes,5);
await publishClientIncidents({...summary,candidates:[]},options);assert.equal(writes,5);
writeFileSync(process.argv[3],JSON.stringify({passed:true,realGitHubRequests:0,
  repeatedNotifications:0,issues:issues.map(({title,body})=>({title,body}))},null,2)+'\n');
console.log('PASS real collector summary projected to five grouped notices; repeat and silence send nothing');
