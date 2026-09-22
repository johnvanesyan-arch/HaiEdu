import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const teacherUi = read("web/teacher.js");
const remediation = read("web/remediation.js");

test("Chapter Review teacher analytics use natural Armenian labels", () => {
  for (const label of [
    "Տեսած տարբեր հարցեր",
    "Նույն հարցի կրկնություններ",
    "Դեպքեր, երբ նոր հարց չէր մնացել",
    "Ինքնուրույն ճիշտ պատասխանների տոկոս",
    "Օգնություն օգտագործած պատասխաններ",
  ]) {
    assert.match(teacherUi, new RegExp(label));
  }

  assert.doesNotMatch(teacherUi, /Եզակի հարցեր՝ ամբողջ ընթացքում/);
  assert.doesNotMatch(teacherUi, /Ճշգրիտ կրկնություններ/);
  assert.doesNotMatch(teacherUi, /Բանկի սպառման դեպքեր/);
  assert.doesNotMatch(teacherUi, /Անկախ ճշգրտություն/);
});

test("Hinting controls are available in ordinary Practice and Chapter Review", () => {
  assert.match(
    remediation,
    /\["Վարժանք", "Գլխի կրկնություն"\]\.includes\(sessionMode\.textContent\.trim\(\)\)/,
  );
  assert.match(
    remediation,
    /practiceVisible && isHelpEnabledMode && hasQuestion/,
  );
});
