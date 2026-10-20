// A bounded, versioned response capability. Keys stay in the private authoring path.
export const TYPED_FIELDS_VERSION = 'haiedu-typed-fields-v1';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const exact = (x, keys) => object(x) && Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x, k));
const textLength = x => [...x].length;
const check = ok => { if (!ok) throw new Error('typed_fields_contract_invalid'); };
export function validateTypedDefinition(definition) {
  check(exact(definition, ['schemaVersion', 'layout', 'locale', 'fields']));
  check(definition.schemaVersion === TYPED_FIELDS_VERSION && ['short_answer', 'gap_fill'].includes(definition.layout));
  check(typeof definition.locale === 'string' && definition.locale.length <= 35 && /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(definition.locale));
  check(Array.isArray(definition.fields) && definition.fields.length >= 1 && definition.fields.length <= 10);
  check(definition.layout !== 'short_answer' || definition.fields.length === 1);
  const ids = new Set();
  for (const field of definition.fields) {
    check(exact(field, ['id', 'label', 'maxLength']));
    check(typeof field.id === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(field.id) && !ids.has(field.id));
    check(typeof field.label === 'string' && field.label.trim().length > 0 && textLength(field.label) <= 2000);
    check(Number.isInteger(field.maxLength) && field.maxLength >= 1 && field.maxLength <= 500);
    ids.add(field.id);
  }
  return definition;
}
export function normalizeTypedText(text, rules) {
  if (rules.apostrophes) text = text.replace(/[‘’]/g, "'");
  if (rules.collapseWhitespace) text = text.replace(/[ \t\r\n]+/g, ' ');
  if (rules.trim) text = text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');
  if (rules.caseMode === 'ascii-insensitive') text = text.replace(/[A-Z]/g, c => c.toLowerCase());
  return text;
}
export function validateTypedKey(definition, key) {
  validateTypedDefinition(definition);
  check(exact(key, ['schemaVersion', 'fields']) && key.schemaVersion === TYPED_FIELDS_VERSION);
  check(exact(key.fields, definition.fields.map(f => f.id)));
  for (const field of definition.fields) {
    const k = key.fields[field.id];
    check(exact(k, ['accepted', 'normalization']) && exact(k.normalization, ['trim', 'collapseWhitespace', 'apostrophes', 'caseMode']));
    check(['trim', 'collapseWhitespace', 'apostrophes'].every(x => typeof k.normalization[x] === 'boolean'));
    check(['sensitive', 'ascii-insensitive'].includes(k.normalization.caseMode));
    check(Array.isArray(k.accepted) && k.accepted.length >= 1 && k.accepted.length <= 20);
    check(k.accepted.every(x => typeof x === 'string' && textLength(x) <= field.maxLength && normalizeTypedText(x, k.normalization).replace(/[ \t\r\n]/g, '').length > 0));
    check(new Set(k.accepted.map(x => normalizeTypedText(x, k.normalization))).size === k.accepted.length);
  }
  return key;
}
