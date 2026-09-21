import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../web/practice.js", import.meta.url), "utf8");

test("Practice completion uses learner-facing Armenian instead of raw completion codes", () => {
  assert.match(source, /Հմտությունը յուրացված է/);
  assert.match(source, /հմտության յուրացումը հաստատվել է/);
  assert.match(source, /նախատեսված առավելագույն/);
  assert.match(source, /\$\{answered\} հարց/);
  assert.doesNotMatch(source, /Ավարտման պատճառ՝ \$\{reason\}/);
});
