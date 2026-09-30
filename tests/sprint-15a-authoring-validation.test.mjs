import test from "node:test";
import assert from "node:assert/strict";
import {
  renderRawTemplate,
  tokenSimilarity,
  validateGuideContent,
} from "../supabase/functions/_shared/remediation-authoring-validation.mjs";

const references = {
  sourceTitle: "Ֆիզիկա 7",
  sourceLocator: "Գլուխ I, էջ 12",
  sourceUrl: "https://example.edu/physics-7",
};

function content(overrides = {}) {
  return {
    titleHy: "Արագության որոշում",
    strategyHy: "Առանձնացրու տրված մեծությունները և ընտրիր համապատասխան կապը։",
    hint1Hy: "Նախ որոշիր, թե որ մեծություններն են տրված։",
    hint2Hy: "Հիշիր արագության, ճանապարհի և ժամանակի կապը։",
    workedExampleHy: "Մեկ այլ մարմին 12 մ ճանապարհն անցնում է 3 վայրկյանում։ Կիրառիր նույն կապը այդ տվյալների նկատմամբ։",
    triggerErrorCode: null,
    misconceptionCode: "speed_relation",
    allowedParameterKeys: ["distance", "time"],
    metadata: {},
    ...overrides,
  };
}

const liveVariant = {
  id: "variant-1",
  prompt_hy: "Մարմինը 10 մ ճանապարհն անցնում է 2 վայրկյանում։ Հաշվիր արագությունը։",
  variant_parameters: { distance: 10, time: 2, bucket: "practice", sequence: 1 },
};

test("safe raw interpolation still uses allow-listed parameters only", () => {
  assert.equal(
    renderRawTemplate("Ճանապարհը {{distance}} մ է, պատասխանը՝ {{answer}}։", ["distance"], { distance: 10, answer: 5 }),
    "Ճանապարհը 10 մ է, պատասխանը՝ {{answer}}։",
  );
});

test("a genuinely different numeric example passes the stronger analogous-example checks", () => {
  const validation = validateGuideContent("template", content(), references, liveVariant);
  assert.deepEqual(validation.errors, []);
});

test("hard-coded reuse of a live numeric parameter is rejected", () => {
  const validation = validateGuideContent("template", content({
    workedExampleHy: "Մեկ այլ մարմին 10 մ ճանապարհն անցնում է 3 վայրկյանում։ Կիրառիր նույն կապը։",
  }), references, liveVariant);
  assert.ok(validation.errors.includes("worked_example_reuses_live_numeric_value:distance"));
});

test("a near-copy conceptual example without changed values or context is rejected", () => {
  const prompt = "Մագնիսը ձգում է երկաթե մեխը։ Որոշիր ներկայացված ֆիզիկական երևույթի տեսակը։";
  const worked = "Մագնիսը ձգում է երկաթե մեխը։ Նշիր ներկայացված ֆիզիկական երևույթի տեսակը։";
  assert.ok(tokenSimilarity(prompt, worked) >= 0.78);
  const validation = validateGuideContent("template", content({ workedExampleHy: worked }), references, {
    prompt_hy: prompt,
    variant_parameters: {},
  });
  assert.ok(validation.errors.includes("worked_example_too_similar_to_live_item"));
});

test("obvious option and numeric answer leakage in hints is rejected", () => {
  const validation = validateGuideContent("template", content({
    hint1Hy: "Ճիշտ պատասխանը Բ տարբերակն է։",
    hint2Hy: "Հաշվելուց հետո կստանանք 5 մ/վ։",
  }), references, liveVariant);
  assert.ok(validation.errors.includes("hint_1_obvious_answer_leakage"));
  assert.ok(validation.errors.includes("hint_2_obvious_answer_leakage"));
});

test("invalid and non-HTTP reference URLs are surfaced without blocking drafts", () => {
  const validation = validateGuideContent("template", content(), { ...references, sourceUrl: "javascript:alert(1)" }, liveVariant);
  assert.ok(validation.warnings.includes("source_url_invalid"));
  assert.deepEqual(validation.errors, []);
});
