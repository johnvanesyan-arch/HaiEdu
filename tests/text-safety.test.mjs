import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeHtml,isSafeHttpsUrl,isSafeInternalHref,externalLinkMarkup} from '../web/text-safety.mjs';
import {escapeHtml as navigationEscape} from '../web/learning-navigation.mjs';
import {taskTextHttps} from '../web/teacher-task-text.mjs';

test('shared HTML escaping retains nullish, Unicode, string and quoted-attribute behavior',()=>{
 assert.equal(escapeHtml(null),'');assert.equal(escapeHtml(undefined),'');
 assert.equal(escapeHtml(0),'0');assert.equal(escapeHtml(false),'false');
 assert.equal(escapeHtml('Հայերեն English & <tag a="x">\' ։'),'Հայերեն English &amp; &lt;tag a=&quot;x&quot;&gt;&#039; ։');
 assert.equal(escapeHtml('&lt;script&gt;'),'&amp;lt;script&amp;gt;');
 assert.equal(navigationEscape,escapeHtml,'Navigation keeps its public compatibility export');
});

test('external URL checks retain the governed task-text contract',()=>{
 for(const value of ['https://example.org/path?a=1&b=2#part','https://օրինակ.հայ/path','https://example.org:8443/path']){
  assert.equal(isSafeHttpsUrl(value),true,value);assert.equal(taskTextHttps(value),true,value);
 }
 for(const value of [null,{},'', '/relative','//example.org','http://example.org','javascript:alert(1)','JaVaScRiPt:alert(1)','data:text/html,test','blob:https://example.org/id','https://user:pass@example.org','https://localhost/path','https://host.localhost/','https://example.org/\nscript','https://example.org/a b','https://example.org/'+ 'x'.repeat(2048)]){
  assert.equal(isSafeHttpsUrl(value),false,String(value));assert.equal(taskTextHttps(value),false,String(value));
 }
});

test('external link markup guards the URL separately from its visible label',()=>{
 const good=externalLinkMarkup('https://example.org/?x=1&y=2','<label> " Հայերեն');
 assert.match(good,/href="https:\/\/example\.org\/\?x=1&amp;y=2"/);
 assert.match(good,/rel="noopener noreferrer"/);assert.match(good,/&lt;label&gt; &quot; Հայերեն/);
 for(const value of ['javascript:alert(1)','https://user@example.org','<img src=x onerror=alert(1)>']){
  const text=externalLinkMarkup(value,'Open');assert.doesNotMatch(text,/<a\b|<img\b/);assert.ok(text.startsWith('<span>'));
 }
});

test('admin navigation stays on the current origin and rejects scheme/credential tricks',()=>{
 const base='https://platform.example.org/admin.html';
 for(const value of ['./admin-security.html','/admin?view=audit','#overview','https://platform.example.org/admin'])assert.equal(isSafeInternalHref(value,base),true,value);
 for(const value of ['','https://outside.invalid','//outside.invalid','javascript:alert(1)','data:text/html,x','https://name@platform.example.org/admin','https://platform.example.org.evil.invalid','\n/admin'])assert.equal(isSafeInternalHref(value,base),false,value);
 assert.equal(isSafeInternalHref('/admin','invalid-base'),false);
});
