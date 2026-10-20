import {escapeHtml as esc} from './learning-navigation.mjs';
import {validateTypedDefinition,TYPED_FIELDS_VERSION} from './typed-fields-contract.mjs';
export function typedFieldsMarkup(definition, response, disabled=false) {
  try{validateTypedDefinition(definition);}catch{throw new Error('Պատասխանի դաշտերն այս պահին հասանելի չեն։ Խնդրում ենք դիմել ուսուցչին։');}
  return `<div class="typed-fields" lang="${esc(definition.locale)}">${definition.fields.map(field=>`<label class="typed-field">${esc(field.label)}<input type="text" data-typed-field="${esc(field.id)}" value="${esc(response?.fields?.[field.id] ?? '')}" autocomplete="off" spellcheck="false" autocapitalize="off" ${disabled?'disabled':''}></label>`).join('')}</div><p class="subtle">Դատարկ թողած դաշտը կգնահատվի 0 միավորով։</p>`;
}
export function collectTypedResponse(root,definition) {
  const fields=Object.fromEntries(definition.fields.map(field=>[field.id,root.querySelector(`[data-typed-field="${field.id}"]`).value]));
  if(definition.fields.some(field=>[...fields[field.id]].length>field.maxLength))throw new Error('Պատասխանը չափազանց երկար է։ Կրճատեք այն և կրկին փորձեք։');
  return {schemaVersion:TYPED_FIELDS_VERSION,fields};
}
