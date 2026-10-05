import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as validation from "../supabase/functions/_shared/remediation-authoring-validation.mjs";

const source = readFileSync("supabase/functions/manage-remediation-guides/index.ts", "utf8").replace(/^import[\s\S]*?;\n/gm, "");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const saved = { titleHy: "Ուղեցույց", strategyHy: "Օգտագործիր կապը։", hint1Hy: "Վերհիշիր կանոնը։", hint2Hy: "Գրիր միավորը։",
  workedExampleHy: "500 մլ = 0,5 լ։", allowedParameterKeys: [], skillId: null, itemTemplateId: "template", metadata: {} };
const variants = [2500, 500].map((sourceValue) => ({ id: `variant-${sourceValue}`, code: `ITEM-${sourceValue}`,
  prompt_hy: `${sourceValue} մլ-ը արտահայտիր լիտրերով։`, variant_parameters: { sourceValue, sourceUnit: "մլ" } }));

function harness(overrides = {}) {
  const content = { ...saved, ...overrides };
  const rpcCalls = [];
  const guide = { guide_scope: "template", guide_source_id: "guide", item_template_id: "template",
    authoring_content: content, reference_metadata: {}, authoring_version: 2, lifecycle_status: "draft" };
  const admin = { auth: { getUser: async () => ({ data: { user: { id: "reviewer" } } }) },
    from(table) {
      const query = { select() { return this; }, eq() { return this; }, order() { return this; }, range() { return this; },
        async maybeSingle() { return { data: table === "profiles" ? { role: "content_admin", account_status: "active" } : guide }; },
        then(resolve, reject) { return Promise.resolve({ data: variants }).then(resolve, reject); } };
      return query;
    },
    async rpc(name, args) { rpcCalls.push({ name, args }); return { data: { authoringVersion: 3 } }; },
  };
  let handler;
  vm.runInNewContext(compiled, { ...validation, createClient: () => admin, hasActiveLiveSession: async () => true,
    Deno: { env: { get: () => "fixture-only" }, serve: (fn) => { handler = fn; } },
    Response, atob, console: { error() {} } });
  const payload = Buffer.from(JSON.stringify({ aal: "aal2" })).toString("base64url");
  return { rpcCalls, async call(action) {
    const response = await handler(new Request("https://fixture.test", { method: "POST",
      headers: { Authorization: `Bearer fixture.${payload}.fixture`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, guideScope: "template", guideSourceId: "guide", variantId: "variant-2500",
        content, referenceMetadata: {}, expectedAuthoringVersion: 2, changeRationale: "Fixture check" }) }));
    return { status: response.status, body: await response.json() };
  } };
}

test("preview renders the selected safe variant while reporting other failing variants", async () => {
  const h = harness(); const { status, body } = await h.call("preview");
  assert.equal(status, 200); assert.equal(body.preview.variantId, "variant-2500");
  assert.equal(body.validation.checkedVariantCount, 2);
  assert.deepEqual(body.validation.variantFailures.map((row) => row.itemCode), ["ITEM-500"]);
  assert.equal(h.rpcCalls.length, 0);
});

test("choosing a safe preview cannot bypass review or publication validation", async () => {
  for (const action of ["submit_review", "publish"]) {
    const h = harness(); const { status, body } = await h.call(action);
    assert.equal(status, 409); assert.equal(body.error, "guide_validation_failed");
    assert.equal(body.validation.variantFailures[0].itemCode, "ITEM-500");
    assert.equal(h.rpcCalls.length, 0);
  }
});

test("failing edits are still saved as drafts without publishing runtime content", async () => {
  const h = harness(); const { status, body } = await h.call("save_draft");
  assert.equal(status, 200); assert.equal(body.validation.variantFailures.length, 1);
  assert.equal(h.rpcCalls.length, 1); assert.equal(h.rpcCalls[0].args.p_lifecycle_status, "draft");
});

test("safe quantity relationships can progress through the existing review and publication gates", async () => {
  for (const action of ["submit_review", "publish"]) {
    const h = harness({ hint2Hy: "1 լ = 1000 մլ։ Կիրառիր այս կապը։", workedExampleHy: "750 մլ = 0,75 լ։" });
    const { status, body } = await h.call(action);
    assert.equal(status, 200); assert.deepEqual(body.validation.errors, []);
    assert.equal(h.rpcCalls.length, 1); assert.equal(h.rpcCalls[0].args.p_lifecycle_status, action === "publish" ? "published" : "review");
  }
});
