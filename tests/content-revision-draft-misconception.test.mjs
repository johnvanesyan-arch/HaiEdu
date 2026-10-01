import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20261001070000_content_revision_preserve_draft_misconceptions.sql", "utf8");
const editor = readFileSync("web/content.js", "utf8");
const ux = readFileSync("web/ux.js", "utf8");

test("content revisions preserve an already-attached draft misconception", () => {
  assert.match(migration, /mc\.status = 'draft'[\s\S]*existing\.item_id = v_item\.id/);
  assert.match(migration, /count\(\*\) = 1 then max\(mc\.code\)/);
  assert.match(migration, /mc\.status <> 'retired'/);
});

test("editor retains the current misconception code even when it is not active yet", () => {
  assert.match(editor, /existingOnly: true/);
  assert.match(editor, /m\.titleHy \|\| "Ընթացիկ կապակցում"/);
  assert.match(editor, /response instanceof Response[\s\S]*response\.clone\(\)\.json/);
});

test("generic Edge Function errors no longer falsely claim account suspension", () => {
  assert.match(ux, /Edge Function returned a non-2xx status code", "Գործողությունը չհաջողվեց։ Ստուգեք տվյալները և կրկին փորձեք։"/);
  assert.doesNotMatch(ux, /Edge Function returned a non-2xx status code", "Չհաջողվեց բեռնել տվյալները։ Եթե հաշիվը ջնջվել կամ կասեցվել է/);
});
