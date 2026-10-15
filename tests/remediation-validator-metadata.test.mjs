import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGuideContent } from '../supabase/functions/_shared/remediation-authoring-validation.mjs';

const refs = { sourceTitle: 'Reference', sourceLocator: 'Chapter', sourceUrl: 'https://example.test' };
const content = {
  titleHy: 'Guide title', strategyHy: 'Check the given correspondence.',
  hint1Hy: 'Choose the whole route.', hint2Hy: 'Apply the scale to the chosen length.',
  workedExampleHy: 'A drawing has 1 cm for 3 km. A real 18 km route is drawn as 6 cm.',
  allowedParameterKeys: [],
};
const variant = {
  prompt_hy: 'A map route measures 4 cm, its chord 3 cm. Each 1 cm represents 5 km. Find the route length.',
  variant_parameters: { authoredCatalog: true, candidateRevision: 1, sequence: 3 },
};
const check = (overrides = {}, task = variant) => validateGuideContent('template', { ...content, ...overrides }, refs, task);

test('metadata cannot narrow a fixed task to a shared numeric constant', () => {
  assert.deepEqual(check().errors, []);
  assert.deepEqual(check({}, { ...variant, variant_parameters: {} }).errors, []);
});

test('complete fixed-task reuse remains blocked with or without metadata', () => {
  for (const variant_parameters of [{}, variant.variant_parameters]) {
    assert.ok(check({ workedExampleHy: 'The route is 4 cm, not its 3 cm chord. 1 cm is 5 km, so 4 times 5 gives 20 km.' },
      { ...variant, variant_parameters }).errors.includes('worked_example_reuses_live_task'));
  }
});

test('declared generated inputs still identify a copied input amid incidental numbers', () => {
  const task = { prompt_hy: 'In exercise 9, convert 2500 ml to litres.', variant_parameters: { sourceValue: 2500, sourceUnit: 'ml', sequence: 9 } };
  assert.ok(check({ allowedParameterKeys: ['sourceValue', 'sourceUnit'], workedExampleHy: '2500 ml = 2.5 litres.' }, task)
    .errors.includes('worked_example_reuses_live_task'));
  assert.ok(check({ allowedParameterKeys: ['sourceValue', 'sourceUnit'], hint2Hy: '2500 / 1000 = 2.5 litres.' }, task)
    .errors.includes('hint_2_obvious_answer_leakage'));
});

test('metadata cannot hide an exact live calculation when it matches no prompt input', () => {
  const task = { prompt_hy: 'Find 7 + 9.', variant_parameters: { authoredCatalog: true, revision: 3 } };
  assert.ok(check({ hint2Hy: '7 + 9 = 16.' }, task).errors.includes('hint_2_obvious_answer_leakage'));
});
