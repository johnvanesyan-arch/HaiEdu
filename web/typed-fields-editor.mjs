import {escapeHtml as esc} from './learning-navigation.mjs';
import {validateTypedKey,TYPED_FIELDS_VERSION} from './typed-fields-contract.mjs';
export function typedEditorRow(field={},key={},disabled=false) {
 const off=disabled?'disabled':'',rules=key.normalization??{trim:false,collapseWhitespace:false,apostrophes:false,caseMode:'sensitive'};
 return `<fieldset data-typed-editor-row><legend>Պատասխանի դաշտ</legend><label>Սովորողին ցուցադրվող նախադասությունը կամ պիտակը<textarea data-field-label ${off}>${esc(field.label??'')}</textarea></label><label>Ընդունվող պատասխանները՝ յուրաքանչյուրը նոր տողից<textarea data-field-accepted ${off}>${esc((key.accepted??[]).join('\n'))}</textarea></label><details class="editor-advanced" ${field.id?'':'open'}><summary>Ընդլայնված · դաշտի կոդ և պատասխանի ընդունման կանոններ</summary><label>Դաշտի կայուն կոդ<input data-field-id value="${esc(field.id??'')}" ${off}></label><label>Նիշերի առավելագույն քանակը<input data-field-max type="number" min="1" max="500" value="${field.maxLength??100}" ${off}></label>${[['trim','Անտեսել սկզբի և վերջի բացատները'],['collapseWhitespace','Մի քանի հաջորդական բացատը համարել մեկ բացատ'],['apostrophes','Համարժեք համարել ուղիղ և տպագրական ապաթարցները']].map(([name,label])=>`<label><input type="checkbox" data-rule="${name}" ${rules[name]?'checked':''} ${off}>${label}</label>`).join('')}<label>Մեծատառերի և փոքրատառերի տարբերությունը<select data-field-case ${off}><option value="sensitive" ${rules.caseMode==='sensitive'?'selected':''}>Հաշվի առնել</option><option value="ascii-insensitive" ${rules.caseMode==='ascii-insensitive'?'selected':''}>Անտեսել լատիներեն A–Z տառերի համար</option></select></label></details>${disabled?'':'<button type="button" data-remove-typed>Հեռացնել դաշտը</button>'}</fieldset>`;
}
export function typedEditorMarkup(detail,disabled=false) {
 const def=detail.item.config?.responseDefinition,key=detail.answerKey?.answer;
 return `<div id="typedFieldsEditor"><details class="editor-advanced"><summary>Ընդլայնված · լեզվի կարգավորում</summary><label>Բովանդակության լեզվի կոդը (օրինակ՝ en կամ hy)<input data-typed-locale value="${esc(def?.locale??'')}" ${disabled?'disabled':''}></label></details><label>Առաջադրանքի ձևը<select data-typed-layout ${disabled?'disabled':''}><option value="short_answer" ${def?.layout==='short_answer'?'selected':''}>Կարճ պատասխան</option><option value="gap_fill" ${def?.layout==='gap_fill'?'selected':''}>Բացթողումների լրացում</option></select></label><p>Նշեք բոլոր ընդունելի պատասխանները։ Ուղղագրական կամ քերականական այլ տարբերակներն ինքնաբերաբար չեն ընդունվում։</p><div data-typed-rows>${(def?.fields??[]).map(f=>typedEditorRow(f,key?.fields?.[f.id],disabled)).join('')}</div>${disabled?'':'<button type="button" data-add-typed>Ավելացնել դաշտ</button>'}</div>`;
}
export function bindTypedEditor(root) {
 root.querySelector('[data-add-typed]')?.addEventListener('click',()=>{const rows=root.querySelector('[data-typed-rows]');if(rows.children.length>=10)return;rows.insertAdjacentHTML('beforeend',typedEditorRow());root.dispatchEvent(new Event('input',{bubbles:true}));});
 root.addEventListener('click',event=>{if(event.target.closest('[data-remove-typed]')){event.target.closest('[data-typed-editor-row]').remove();root.dispatchEvent(new Event('input',{bubbles:true}));}});
}
export function collectTypedEditor(root) {
 const fields=[],keys={};
 for(const row of root.querySelectorAll('[data-typed-editor-row]')) {
  const id=row.querySelector('[data-field-id]').value.trim();
  fields.push({id,label:row.querySelector('[data-field-label]').value,maxLength:Number(row.querySelector('[data-field-max]').value)});
  keys[id]={accepted:row.querySelector('[data-field-accepted]').value.split('\n').filter(x=>x!==''),normalization:{...Object.fromEntries([...row.querySelectorAll('[data-rule]')].map(x=>[x.dataset.rule,x.checked])),caseMode:row.querySelector('[data-field-case]').value}};
 }
 const definition={schemaVersion:TYPED_FIELDS_VERSION,layout:root.querySelector('[data-typed-layout]').value,locale:root.querySelector('[data-typed-locale]').value.trim(),fields};
 const key={schemaVersion:TYPED_FIELDS_VERSION,fields:keys};
 try{validateTypedKey(definition,key);}catch{root.querySelectorAll("details.editor-advanced").forEach(section=>{section.open=true;});throw new Error('Ստուգեք դաշտերի կոդերը, պիտակները, նիշերի սահմանները և ընդունվող պատասխանները։ Կարճ պատասխանի համար անհրաժեշտ է մեկ դաշտ։');}
 return {definition,key};
}
