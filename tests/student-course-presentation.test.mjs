import test from 'node:test';
import assert from 'node:assert/strict';
import {courseHero,readinessBadge,skillEvidence} from '../web/student-course-presentation.mjs';
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
