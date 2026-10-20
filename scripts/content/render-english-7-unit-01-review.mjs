// Render reviewer-readable material from the single draft source; no publication or DB writes.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const raw=readFileSync('docs/content/english-7-unit-01-draft.json','utf8'),p=JSON.parse(raw);
const sha=createHash('sha256').update(raw).digest('hex'),short=x=>x.replace('ENG7-U01-','');
const lines=['# English 7 Unit 1 — complete draft review packet','',
 '**16.1C.1 · Automated-author draft · 2026-10-20 · Not staged, approved or released.**','',
 'This packet follows the 30 textbook activities in order. It includes learner-facing English and reviewer-only keys/feedback. Keep it in the private repository; it is outside the Vercel `web` output directory. [Handoff and decisions](english-7-unit-01-authoring-review.md) · [Whole-bank comparison](english-7-unit-01-whole-bank-review.md).','',
 `Source of truth: [structured draft](content/english-7-unit-01-draft.json), SHA-256 \`${sha}\`. Regenerate with \`node scripts/content/render-english-7-unit-01-review.mjs\`.`,
 '', 'All 45 automatic items are practice proposals: 39 text items (including two optional reporting extensions) and six script-based listening items on hold. There are nine teaching guides, three reading sets, three proposed listening sets, one proposed reviewed writing task, one writing practice prompt and one model. Question counts are draft inventory, not approved bank capacity.','',
 'Each choice or exact ordering item contributes at most one point; matching and typed items propose equal required-component credit normalised to one item point. These declarations are compatible with the deployed capability, but no English scoring policy has adopted them. Hints and worked examples are practice support. Shared Armenian navigation is unchanged. Speaking remains classroom-assessed.',''];
function text(s){lines.push(s.trimEnd(),'');}
function item(i){
 text(`### ${short(i.code)} · ${i.skill} · ${i.responseType}${i.scope?' · OPTIONAL EXTENSION':''}`);
 if(i.sourceSet)text(`Shared source: **${i.sourceSet}**. ${i.sourceSet.startsWith('LISTEN')?'**Audio hold: keys verified against the printed script only; no recording alignment verified.**':''}`);
 text(i.prompt);
 if(i.options){
  for(const o of i.options)lines.push(`- **${o.id.toUpperCase()}.** ${o.text}`);lines.push('');
  text(`**Key:** ${i.key.optionId.toUpperCase()}.`);
  for(const o of i.options)text(`**${o.id.toUpperCase()} feedback:** ${o.feedback}`);
 }else if(i.responseType==='typed_fields'){
  lines.push('| Field | Sentence | Accepted answers | Common rejected alternatives and feedback |','| --- | --- | --- | --- |');
  for(const f of i.definition.fields){const r=i.fieldReview[f.id];lines.push(`| ${f.id} | ${f.label} | ${i.key.fields[f.id].accepted.map(x=>'`'+x+'`').join(' / ')} | ${r.reject.map(x=>'`'+x+'`').join(', ')}. ${r.feedback} |`);}lines.push('');
  text('**Normalisation:** trim outer whitespace, collapse internal whitespace, normalise curly apostrophes and ignore ASCII letter case. Spelling, articles, tense and word order are otherwise significant. Blank is never the zero-article answer. Type only the words needed in the gap.');
 }else if(i.responseType==='matching'){
  lines.push('| Source ID | Source | Correct target ID |','| --- | --- | --- |');for(const s of i.definition.sources)lines.push(`| ${s.id} | ${s.label} | ${i.key.pairs[s.id]} |`);lines.push('');
  text('**Targets:** '+i.definition.targets.map(t=>`${t.id}: ${t.label}`).join('; ')+'.');
  text('**Rule:** '+(i.definition.cardinality==='one_to_one'?'Use each target at most once.':'Targets may be reused.'));
 }else{
  for(const s of i.definition.segments)lines.push(`- \`${s.id}\`: ${s.label}`);lines.push('');text('**Accepted order:** '+i.key.acceptedSequences.map(s=>s.join(' → ')).join(' / ')+'.');
 }
 text('**Process hint:** '+i.hint);text('**Explanation:** '+i.feedback);
 text(`**Review:** ${i.comparison.disposition.replaceAll('_',' ')}; nearest ${i.comparison.nearest.map(short).join(', ')}. ${i.comparison.rationale}`);
}
for(const a of p.activityPath){
 text(`## Activity ${a.activity} · book p.${a.pages.join(', ')} · ${a.disposition.replaceAll('_',' ')}`);
 text(a.teacherNotes);
 for(const g of p.guides.filter(x=>x.beforeActivity===a.activity)){text(`**Teaching guide ${g.id}: ${g.title}.** ${g.text}`);text('**Worked practice example:** '+g.workedExample);}
 for(const s of p.sourceSets.filter(x=>x.activities[0]===a.activity)){
  text(`### Shared source ${s.id} · ${s.title}`);
  if(s.text)text(s.text);else text('**Printed-script evidence for the author:** '+s.scriptEvidence+' Candidate file: '+s.candidateTrack+'. **Do not assume the speaker mapping.**');
  text(`**Source family:** \`${s.family}\`; proposed ID \`${s.sourceFamilyProposedId}\`. Ordered members: ${s.members.map(short).join(', ')}. Familiar-source practice only.`);
  if(s.adaptation)text('**Source adaptation:** '+s.adaptation);
  if(s.externalSource)text('**Supplementary source:** '+s.externalSource);
 }
 for(const i of p.items.filter(x=>x.activity===a.activity))item(i);
 if(a.activity===25){
  const w=p.writing;
  text('### W01 · proposed teacher-reviewed task');text(w.definition.prompt);
  text('**Length:** 80–100 words using `unicode-whitespace-v1`. Whitespace-separated words; contractions and hyphenated expressions count as one. Length is guidance and a review flag, not an automatic failure.');
  text('**Assistance proposal:** '+w.definition.assistance.policy+' Browser spellcheck is disabled in the task configuration. This does not prove that external assistance was absent.');
  lines.push('| Criterion | 0 | 1 | 2 | 3 |','| --- | --- | --- | --- | --- |');for(const c of w.definition.criteria)lines.push(`| ${c.label} | ${c.descriptors.join(' | ')} |`);lines.push('');
  for(const note of w.assessmentNotes)lines.push('- '+note);lines.push('');
  text('### WP01 · independent practice prompt');text(w.practice.prompt);text('**Comparison:** '+w.practice.comparison);
  text('### WM01 · practice model');text('**Incoming message:** '+w.model.incoming);text(w.model.text);
  text(`**Word count:** ${w.model.text.trim().split(/\s+/u).length}.`);for(const note of w.model.annotation)lines.push('- '+note);lines.push('');
  text('**Teacher workload proposal:** '+w.workloadProposal.teacherMinutes);text('**Learner workload proposal:** '+w.workloadProposal.learnerMinutes+'. '+w.workloadProposal.cadence);
  text('**Baseline boundary:** '+w.workloadProposal.baseline);
  for(const note of w.workloadProposal.teacherChecklist)lines.push('- '+note);lines.push('');
 }
}
text('## Review record');
text('Automated author: Codex, 2026-10-20. Human language/content review, source permission, final rubric/workload acceptance, audio audition, protected-form qualification and learner release are pending. No reviewer identity or approval has been fabricated. Any substantive correction changes the draft fingerprint and invalidates affected QA/comparison evidence.');
writeFileSync('docs/english-7-unit-01-review-packet.md',lines.join('\n'));

const matrix=['# English 7 Unit 1 — whole-bank comparison','',
 '**16.1C.1 · Automated-author comparison · 2026-10-20 · Human review pending.**','',
 `Candidate packet SHA-256: \`${sha}\`. [Frozen corpus and guards](evidence/english-7-unit-01-corpus-20261020.json) · [Complete prompts/keys](english-7-unit-01-review-packet.md) · [Structured scenario, inference, solution and distractor profiles](content/english-7-unit-01-draft.json).`,'',
 '## Frozen applicable corpus','',
 'Production observations at 19:00:59–19:01:35 UTC on 2026-10-20 found two subjects (Physics and an empty Mathematics fixture), 67 Physics skills, 1,251 Physics questions, 1,146 immutable item versions and seven Physics releases. All registered skill names/descriptions were checked against the proposed English outcomes; none is equivalent. No English subject, programme, release, current item or historical English reference exists. Shared task sets, source-family exposures and writing tasks are empty. The snapshot includes retired/draft skills; current item and history guards cover all statuses. No existing English protected bank is available or claimed. This is not a re-review of Physics content.','',
 'A follow-up at 19:21:56 UTC inspected all 53 outcome statements, 84 skill-outcome links, 84 reconciled curriculum links, 53 normative mappings and 53 release outcome snapshots. They remain Physics outcomes; no equivalent English-language target is hidden under another code. General school competencies do not make Physics questions English-language assessment. The corpus evidence retains the outcome projection, links and a complete-mapping snapshot hash.','',
 'The full-row MD5 guards identify the observed production corpus, not a cryptographic proof of semantic diversity. Re-query all applicable English current/historical content, related outcome mappings, releases and exposure records immediately before staging or registration. An intervening English batch invalidates this empty-bank comparison. The current snapshot does not authorize a future import.','',
 '## Comparison method and dispositions','',
 'The automated author compared the complete 45-item batch by actual response demand, taught claim, scenario, solution and distractor logic, including cross-skill reading/vocabulary overlap and the nine practice guides. The matrix names the closest candidates and states the decision. The JSON retains complete profiles; distractor feedback and typed rejected alternatives are part of each profile. These are author judgments awaiting human language/content and SME review, not results of an automatic semantic-diversity detector.','',
 'A new-coverage disposition means the first candidate addressing the stated demand in this empty English corpus. It does not mean a new curriculum outcome, proven independent psychometric dimension or protected form. Variants are not counted again as independent reasoning. '+p.items.filter(x=>x.comparison.disposition==='new_reasoning_coverage').length+' candidates have provisional new-coverage dispositions and '+p.items.filter(x=>x.comparison.disposition==='intentional_practice_variant').length+' are intentional practice variants. Approved capacity remains zero.','',
 '| Candidate | Skill / taught claim | Nearest candidates | Disposition and substantive comparison |','| --- | --- | --- | --- |'];
for(const i of p.items)matrix.push(`| ${short(i.code)} | ${short(i.skill)} / ${i.comparison.claim} | ${i.comparison.nearest.map(short).join(', ')} | **${i.comparison.disposition.replaceAll('_',' ')}.** ${i.comparison.rationale} |`);
matrix.push('', '## Cross-family and teaching collisions','',
 '| Group | Relationship and protection decision |','| --- | --- |',
 '| P01–P04; R04–R06; G01/G03 | Repeated style/personality vocabulary is deliberate teaching and retrieval practice. R06 repeats P03’s style meanings and is a variant, even though it sits inside a reading set. |',
 '| P05/P06/P22; G02 | Noun production and suffix-function classification share taught word families. P06 is a retrieval variant. P22 adds explicit word-class/function classification, with repeated target categories. |',
 '| P07–P11; G04 | Positive and negative request reporting are the core demands; P09 rehearses the positive frame. P10/P11 cover optional reporting complements. They cannot expand the required S03 denominator silently. |',
 '| P12–P15; G05 | Linking/action functions and cause/experiencer roles are separate contrasts. The second item for each is deliberate transfer practice, not a new outcome. |',
 '| P16–P21/P28–P30; G06 | Enough ordering, repeated adverb forms and repeated comparison-set choices are variants. Quantifier choice and comparative intensification add separate taught decisions. A different control or numeric context is not novelty. |',
 '| R01–R09; G07 | Time ordering, gist, explicit evidence, attribution and cross-card comparison are distinguished. Repeated gist/detail retrieval remains practice. All three passages are familiar topic/source adaptations; none is a protected unseen form. |',
 '| L01–L06 | Three proposed clip sets retain one common textbook source family. Gist and detail are distinct targets, but repetitions across speakers are variants. Script reading, clip splitting, new IDs or re-recording the same script never restores unseen status. |',
 '| P23/P24; W01/WP01/WM01; G08 | Recognising an argument supports writing but is not production evidence. All notes share the description/audience/reason procedure. The practice model is familiar support. W01 is one linked observation of S13/S14, not two samples or a protected-form claim. |',
 '| P25–P27; G09 | Article reference and generic/specific meaning are contrasted; the further a/an sound example rehearses the same rule. Blank and explicit zero remain distinct. |','',
 '## Source fidelity and omitted material','',
 'Every candidate cites the provided Grigoryan/Zangak 2023 book and the relevant programme strand. Source sets retain page/activity locators and original/adapted status. The author checked each key against its supplied sentence, passage or printed script, and each distractor against the same evidence. Images are unnecessary for the selected verbal targets; each item records that rationale. The optional Bidstrup task points to the original printed sequence without republishing it.','',
 'The author reworked moral personality labels, overlapping style definitions, absolute adjective/adverb rules, the people=-ed shortcut, the -ively suffix label, forced one-to-one suffix matching, unsupported fashion generalisations, fragmentary uniform arguments, article factual errors and comparison trivia. The defective refusal question with no valid option is omitted. Correct “said to us that” is not taught as an error. Negative reporting accepts both “not to open” and “to not open”.','',
 'The Armenian designer card paraphrases the [Fashion and Design Chamber profile](https://fdc.am/designers/4); it assesses supplied information, not celebrity dates or preference. The page is a factual source, not permission to reuse publisher audio or images. All six listening keys are provisional printed-script keys; no claim of audition or track/speaker verification is made.','',
 '## Target, shortfall and handoff','',
 'There is no approved English numeric bank target to subtract this draft from. The honest inventory is 45 automatic practice drafts (39 text / six audio-held), one reviewed-writing proposal, and zero approved or qualified Diagnostic/Mastery questions. Do not apply Physics targets or invent a reduced English pass rule. S12 speaker discrimination and unseen source/forms remain explicit gaps.','',
 'Owner/content-review decisions must establish the final bank plan, writing task/rubric/workload and listening/scoring conditions. The protected-parallel pilot has no authorized English manifest, and this packet does not use that disposition. Human approval of these exact versions, actual source/permission references, current-version QA and fresh whole-bank comparison precede staging/registration as applicable; independent qualification and exact production acceptance precede learner release.');
writeFileSync('docs/english-7-unit-01-whole-bank-review.md',matrix.join('\n')+'\n');
console.log(JSON.stringify({rendered:true,packetSha256:sha,reviewLines:lines.length,matrixItems:p.items.length}));
