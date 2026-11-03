import test from 'node:test';
import assert from 'node:assert/strict';
import {skillEvidenceState,skillAttentionBand,skillMatrixCell,skillEvidenceMarkup} from '../web/teacher-skill-evidence.mjs';

test('mixed assessment evidence stays separate and retains only existing support classifications',()=>{
  const row={skillId:'s',code:'ANY-U-S',nameHy:'Հմտություն',percent:null,band:'not_assessed',status:'mixed_contracts',evidenceCount:8,estimates:[
    {percent:88,band:'secure',status:'secure',evidenceCount:4,contract:{mode:'diagnostic',modelId:'old'}},
    {percent:38,band:'needs_support',status:'needs_support',evidenceCount:4,contract:{mode:'practice',modelId:'new'}},
  ]};
  const before=structuredClone(row);
  assert.equal(skillEvidenceState(row).kind,'separate');
  assert.equal(skillAttentionBand(row),'needs_support');
  const cell=skillMatrixCell(row,'student');
  assert.match(cell,/Առանձին արդյունքներ/);assert.doesNotMatch(cell,/not_assessed|88%|38%/);
  const detail=skillEvidenceMarkup([row],'ANY-U');
  for(const text of ['Ախտորոշիչ','Վարժություն','Կայուն · 88%','Աջակցություն է պետք · 38%','old','new'])assert.ok(detail.includes(text));
  assert.deepEqual(row,before,'presentation must not mutate or combine evidence');
});

test('missing, insufficient and unavailable evidence cannot become weak or secure performance',()=>{
  const rows=[{band:'not_assessed',percent:null,evidenceCount:0},{status:'insufficient_evidence',band:'not_assessed',percent:60,evidenceCount:1},{status:'provenance_unavailable',band:'not_assessed',percent:null,evidenceCount:5}];
  assert.deepEqual(rows.map(skillEvidenceState).map(s=>s.kind),['none','insufficient','unavailable']);
  assert.deepEqual(rows.map(skillAttentionBand),[null,null,null]);
  const mixed={status:'mixed_contracts',estimates:rows};
  assert.equal(skillAttentionBand(mixed),null);
  const html=skillEvidenceMarkup(rows.map((r,i)=>({...r,code:'S'+i,nameHy:'Հմտություն',skillId:String(i)})));
  for(const text of ['Տվյալ դեռ չկա','Դիտարկումները դեռ քիչ են','Ցուցանիշը հասանելի չէ','Նախնական ցուցանիշ՝ 60%'])assert.ok(html.includes(text));
  assert.doesNotMatch(html,/skill-estimate secure|skill-estimate needs_support/);
});

test('legacy single estimates retain their configured bands and all dynamic labels are escaped',()=>{
  const row={id:'<skill>',code:'<code>',nameHy:'<img src=x onerror=bad()>',percent:72,band:'developing',evidenceCount:5};
  assert.equal(skillEvidenceState(row).kind,'classified');assert.equal(skillAttentionBand(row),'developing');
  assert.equal(skillEvidenceState({...row,band:'constructor'}).kind,'unavailable');
  for(const html of [skillMatrixCell(row,'<student>'),skillEvidenceMarkup([row])]){
    assert.doesNotMatch(html,/<img|data-student="<|data-skill="</);assert.match(html,/&lt;img/);
  }
});

test('recorded answers with missing frozen evidence expose neutral details instead of false no-data',()=>{
  const row={skillId:'s',code:'SYN-S02',nameHy:'Հմտություն',percent:null,band:'not_assessed',
    status:'provenance_unavailable',evidenceCount:0,observedEvidenceCount:4,excludedEvidenceCount:4,estimates:[]};
  assert.equal(skillEvidenceState(row).kind,'unavailable');assert.equal(skillAttentionBand(row),null);
  assert.match(skillMatrixCell(row,'student'),/data-skill="s"/);
  const html=skillEvidenceMarkup([row]);
  assert.match(html,/Գրանցված պատասխաններ՝ 4/);assert.match(html,/հաշվարկին մասնակցող պատասխաններ՝ 0/);
  assert.doesNotMatch(html,/Տվյալ դեռ չկա|ուսումնական տվյալ դեռ չկա/);
  assert.equal(skillEvidenceState({...row,status:'not_assessed'}).kind,'unavailable','additive counts remain truthful during a mixed-version rollout');
});
