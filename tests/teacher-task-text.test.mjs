import test from 'node:test';import assert from 'node:assert/strict';
import {TASK_TEXT_FORMAT as format,renderTeacherTaskText as render,taskTextEdit,escapeTaskText} from '../web/teacher-task-text.mjs';
import {newTeacherTaskForm,teacherTaskDefinition} from '../web/teacher-task-form.mjs';
import {validateTeacherTaskDefinition as validate} from '../supabase/functions/_shared/teacher-task-definition.mjs';
test('versioned instructions support paragraphs, headings, lists and safe links without raw HTML',()=>{
 const html=render('# Main heading\n## Small heading\n\nFirst line\nNext line\n\n- First\n- **Second**\n\n3. Third\n4. Fourth\n\n[Read](https://example.org/task?a=1&b=2)',format);
 assert.match(html,/<h5>Main heading<\/h5><h6>Small heading<\/h6>/);assert.match(html,/<p>First line<br>Next line<\/p>/);assert.match(html,/<ul><li>First<\/li><li><strong>Second<\/strong><\/li><\/ul>/);assert.match(html,/<ol start="3">/);assert.match(html,/href="https:\/\/example.org\/task\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"/);
});
test('unsafe schemes, credentials, local hosts, injected HTML and media remain inert text',()=>{
 for(const value of ['[bad](javascript:alert)','[bad](data:text/html,x)','[bad](http://example.org)','[bad](https://user:pass@example.org)','[bad](https://localhost/file)','[bad](https://x.localhost/file)','<script>alert(1)</script>','<img src=x onerror=alert(1)>','<iframe src="https://example.org"></iframe>','![Image](https://example.org/image.png)']){
  const html=render(value,format);assert.doesNotMatch(html,/<(?:a |script|img|iframe)/i);assert.ok(html.includes('&lt;')||html.includes(value));
 }
});
test('unversioned frozen text stays literal and enabling formatting preserves its previous characters',()=>{
 const text='# Literal title\n- Literal marker\n[Literal link](https://example.org)\n**Not bold**\n<script>x</script>';
 const literal=render(text);assert.doesNotMatch(literal,/<(?:h5|ul|a |strong)/);const preserved=render(escapeTaskText(text),format);assert.doesNotMatch(preserved,/<(?:h5|ul|a |strong)/);assert.match(preserved,/# Literal title/);assert.match(preserved,/\[Literal link\]\(https:\/\/example.org\)/);
});
test('toolbar applies whole-line lists/headings and a validated selected-text link',()=>{
 assert.equal(taskTextEdit('First\nSecond',0,12,'bullet').text,'- First\n- Second');assert.equal(taskTextEdit('First\nSecond',6,12,'number').text,'First\n1. Second');assert.equal(taskTextEdit('\nFirst',0,0,'heading').text,'# \nFirst');assert.equal(taskTextEdit('Read this',5,9,'link','https://example.org').text,'Read [this](https://example.org)');assert.equal(taskTextEdit('Read',0,4,'link','javascript:bad'),null);const special=taskTextEdit('[Read]',0,6,'link','https://example.org/path(part)');assert.match(render(special.text,format),/href="https:\/\/example.org\/path%28part%29"[^>]*>\[Read\]<\/a>/);
});
test('forms retain legacy format identity and persist new versioned fields independently of source type',()=>{
 const model=newTeacherTaskForm();Object.assign(model,{title:'Task',instructions:'# Instructions',text:'- Explain'});const d=teacherTaskDefinition(model);assert.equal(validate(d).valid,true);assert.equal(d.instructionsFormat,format);assert.equal(d.source.format,format);
 const legacy={...d};delete legacy.instructionsFormat;legacy.source={kind:'text',text:'# Literal'};assert.deepEqual(teacherTaskDefinition(newTeacherTaskForm(legacy)),legacy);
 for(const instructionsFormat of ['html','future',null])assert.equal(validate({...d,instructionsFormat}).valid,false);
 assert.equal(validate({...d,source:{kind:'link',url:'https://example.org',format}}).valid,false);assert.equal(validate({...d,source:{...d.source,format:'html'}}).valid,false);
});
