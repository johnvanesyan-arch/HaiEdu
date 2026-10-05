import test from "node:test";
import assert from "node:assert/strict";
import { validateGuideContent, validateGuideVariants } from "../supabase/functions/_shared/remediation-authoring-validation.mjs";

const refs = { sourceTitle: "Curriculum", sourceLocator: "Unit 1", sourceUrl: "https://example.test" };
const content = (overrides = {}) => ({ titleHy: "Ուղեցույց", strategyHy: "Ընտրի՛ր համապատասխան կապը։",
  hint1Hy: "Ուշադիր կարդա պայմանը։", hint2Hy: "Կիրառի՛ր համապատասխան կանոնը։",
  workedExampleHy: "Մեկ այլ առաջադրանքի տվյալները տարբեր են։", allowedParameterKeys: [], misconceptionCode: "conversion", ...overrides });
const volume = { id: "volume-2500", code: "VOLUME-2500", prompt_hy: "2500 մլ-ը արտահայտիր լիտրերով։",
  variant_parameters: { sourceValue: 2500, sourceUnit: "մլ", targetUnit: "L" } };
const check = (overrides, variant = volume, scope = "template") => validateGuideContent(scope, content(overrides), refs, variant).errors;

test("quantity relationships in hints pass without numeric answer false positives", () => {
  assert.deepEqual(check({ hint2Hy: "1 լ = 1000 մլ։ Թվային արժեքը բաժանի՛ր 1000-ի։" }), []);
  assert.deepEqual(check({ hint1Hy: "Օրինակ՝ 1 կմ = 1000 մ։", hint2Hy: "Օրինակ՝ 100 սմ = 1 մ։" }, volume, "skill"), []);
  assert.deepEqual(check({ hint2Hy: "1 րոպե = 60 վ, իսկ 1 ժամ = 60 րոպե = 3600 վ։" }, {
    prompt_hy: "0.5 ժամ-ը արտահայտիր վայրկյաններով։", variant_parameters: { sourceValue: 0.5, sourceUnit: "ժամ" } }), []);
});

test("Armenian option labels must be separate Unicode tokens", () => {
  for (const hint2Hy of ["Պատասխանը պետք է ունենա «թվային արժեք + միավոր» տեսքը։", "Նշի՛ր օգտագործված բառը։", "The answer format should include a value."]) {
    assert.deepEqual(check({ hint2Hy }), []);
  }
  for (const hint2Hy of ["Ընտրի՛ր Ա տարբերակը։", "Նշիր Բ։", "Պատասխանը՝ C)", "Ճիշտը Դ-ն է։"]) {
    assert.ok(check({ hint2Hy }).includes("hint_2_obvious_answer_leakage"), hint2Hy);
  }
});

test("explicit conclusions and substituted live calculations remain blocked", () => {
  for (const hint2Hy of ["Պատասխանը է 2,5 լ։", "Կստանանք 2.5 լ։", "Ծավալ = 2.5 լ։", "2500 ÷ 1000 = 2,5 լ։", "{{sourceValue}} ÷ 1000 = 2.5 լ։"]) {
    assert.ok(check({ hint2Hy, allowedParameterKeys: ["sourceValue"] }).includes("hint_2_obvious_answer_leakage"), hint2Hy);
  }
});

test("the same general conversion relationship is blocked when it solves the active task", () => {
  assert.ok(check({ hint2Hy: "1 րոպե = 60 վ, իսկ 1 ժամ = 60 րոպե = 3600 վ։" }, {
    prompt_hy: "1 ժամ-ը արտահայտիր վայրկյաններով։", variant_parameters: { sourceValue: 1, sourceUnit: "ժամ" } })
    .includes("hint_2_obvious_answer_leakage"));
});

test("examples may share one input but may not copy the entire live task", () => {
  const scale = { prompt_hy: "50 և 52.5 նշումների միջև կա 5 հավասար բաժանում։",
    variant_parameters: { lowerMark: 50, upperMark: 52.5, divisionCount: 5 } };
  assert.deepEqual(check({ workedExampleHy: "10 և 20 նշումների միջև կա 5 հավասար բաժանում։ (20 − 10) ÷ 5 = 2։" }, scale), []);
  assert.ok(check({ workedExampleHy: "50 և 52,5 նշումների միջև կա 5 բաժանում։ (52,5 − 50) ÷ 5 = 0,5։" }, scale)
    .includes("worked_example_reuses_live_task"));
  const task = { prompt_hy: "10 մ ճանապարհը անցնում է 2 վայրկյանում։", variant_parameters: { distance: 10, time: 2 } };
  assert.deepEqual(check({ workedExampleHy: "10 մ ճանապարհը անցնում է 3 վայրկյանում։" }, task), []);
  assert.ok(check({ workedExampleHy: "10 մ ճանապարհը անցնում է 2 վայրկյանում։ 10 ÷ 2 = 5։" }, task).includes("worked_example_reuses_live_task"));
});

test("equal quantities with different unit contexts do not copy the same task", () => {
  const task = { prompt_hy: "2 ժամ-ը արտահայտիր վայրկյաններով։", variant_parameters: { sourceValue: 2, sourceUnit: "ժամ", targetUnit: "վ" } };
  assert.deepEqual(check({ workedExampleHy: "2 րոպե = 2 × 60 վ = 120 վ։" }, task), []);
  assert.ok(check({ workedExampleHy: "2 ժամ = 7200 վ։" }, task).includes("worked_example_reuses_live_task"));
});

test("quantity labels use deterministic Unicode casing without a language default", () => {
  const task = { prompt_hy: "Convert 2 I to the requested scale.", variant_parameters: { sourceValue: 2, sourceUnit: "I" } };
  assert.ok(check({ workedExampleHy: "2 i = 4 other." }, task).includes("worked_example_reuses_live_task"));
  assert.ok(check({ workedExampleHy: "2 Ｉ = 4 other." }, task).includes("worked_example_reuses_live_task"));
  // Distinct Unicode labels stay distinct; the validator cannot infer that
  // dotted/dotless letters denote equivalent labels in a particular locale.
  assert.deepEqual(check({ workedExampleHy: "2 ı = 4 other." }, task), []);
  const dotless = { ...task, prompt_hy: "Convert 2 ı to the requested scale.", variant_parameters: { sourceValue: 2, sourceUnit: "ı" } };
  assert.ok(check({ workedExampleHy: "2 ı = 4 other." }, dotless).includes("worked_example_reuses_live_task"));
});

test("decimal comma and period variants still identify exact copied conversions", () => {
  const task = { prompt_hy: "500 մլ-ը արտահայտիր լիտրերով։", variant_parameters: { sourceValue: 500, sourceUnit: "մլ" } };
  assert.ok(check({ workedExampleHy: "500 մլ = 0,5 լ։" }, task).includes("worked_example_reuses_live_task"));
  assert.deepEqual(check({ workedExampleHy: "750 մլ = 0.75 լ։" }, task), []);
});

test("live numeric placeholders and answer-like keys remain forbidden in examples", () => {
  assert.ok(check({ workedExampleHy: "{{sourceValue}} մլ = 2.5 լ։", allowedParameterKeys: ["sourceValue"] })
    .includes("worked_example_reuses_live_numeric_value:sourceValue"));
  assert.ok(check({ hint2Hy: "Օգտագործիր {{answer}}։", allowedParameterKeys: ["answer"] }).includes("answer_like_placeholder_forbidden:answer"));
});

test("publication coverage includes failing variants beyond the selected safe preview", () => {
  const unsafe = { ...volume, id: "volume-500", code: "VOLUME-500", prompt_hy: "500 մլ-ը արտահայտիր լիտրերով։",
    variant_parameters: { ...volume.variant_parameters, sourceValue: 500 } };
  const result = validateGuideVariants("template", content({ workedExampleHy: "500 մլ = 0,5 լ։" }), refs, [volume, unsafe]);
  assert.equal(result.checkedVariantCount, 2);
  assert.deepEqual(result.variantFailures.map((entry) => entry.itemCode), ["VOLUME-500"]);
  assert.ok(result.errors.includes("worked_example_reuses_live_task"));
  assert.ok(validateGuideVariants("template", content(), refs, []).warnings.includes("preview_variant_missing"));
});

test("generic mathematics and nonnumeric language guides use the same validator", () => {
  const addition = { prompt_hy: "Հաշվիր 7 + 9 գումարը։", variant_parameters: { left: 7, right: 9 } };
  assert.deepEqual(check({ hint2Hy: "Օրինակ՝ 2 + 3 = 5։" }, addition), []);
  assert.ok(check({ hint2Hy: "7 + 9 = 16։" }, addition).includes("hint_2_obvious_answer_leakage"));
  assert.deepEqual(check({ hint2Hy: "Find the verb and check its tense." }, { prompt_hy: "Choose the past tense.", variant_parameters: {} }), []);
});
