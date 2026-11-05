import test from 'node:test';
import assert from 'node:assert/strict';
import {courseHero,readinessBadge,readinessSummary,skillEvidence} from '../web/student-course-presentation.mjs';
test('readiness counts only required known evidence and never implies verified mastery',()=>{
 const data={skills:[{ready:true},{ready:false},{ready:true,requiredForReadiness:false}]};
 assert.match(courseHero('progress',data),/>1 \/ 2</);assert.doesNotMatch(courseHero('progress',data),/verified|յուրացված/i);
 for(const skills of [[],[{ready:null}],[{ready:true},{ready:undefined}]])assert.doesNotMatch(courseHero('progress',{skills}),/<meter/);
 assert.doesNotMatch(courseHero('writing',data),/<meter/);
 assert.match(readinessBadge({ready:null}),/Տվյալը դեռ չկա/);
});
test('visual evidence escapes supplied labels and omits invalid meter values',()=>{
 assert.doesNotMatch(skillEvidence({mastery:null}),/<meter/);
 assert.doesNotMatch(skillEvidence({mastery:{percent:200,evidenceCount:2}}),/<meter/);
 const html=skillEvidence({nameHy:'<img>',mastery:{percent:75,evidenceCount:8}});
 assert.match(html,/75% · 8 պատասխան/);assert.match(html,/&lt;img&gt;/);assert.doesNotMatch(html,/<img>/);
});
test('the course tab readiness summary matches the banner evidence and stays empty without known readiness',()=>{
 const data={skills:[{ready:true},{ready:false},{ready:true,requiredForReadiness:false}]};
 assert.match(readinessSummary(data),/>1 \/ 2</);
 assert.ok(courseHero('course',data).includes(readinessSummary(data)));
 for(const skills of [[],[{ready:null}],[{ready:true},{ready:undefined}]])assert.equal(readinessSummary({skills}),'');
 assert.equal(readinessSummary({}),'');
});
test('too few answers mirrors the server status and never overrides server readiness',()=>{
 assert.match(readinessBadge({ready:false,mastery:{status:'insufficient_evidence',evidenceCount:2}}),/data-readiness="insufficient">Դեռ քիչ պատասխաններ</);
 assert.match(readinessBadge({ready:null,mastery:{status:'insufficient_evidence'}}),/Դեռ քիչ պատասխաններ/);
 assert.match(readinessBadge({ready:true,mastery:{status:'insufficient_evidence'}}),/Պատրաստ է/);
 assert.match(readinessBadge({ready:false,mastery:{status:'developing',evidenceCount:2}}),/Ամրապնդում է պետք/,'No browser-side answer-count threshold');
});
