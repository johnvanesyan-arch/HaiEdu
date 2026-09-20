import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("pre-submit hinting is disabled once a draft answer exists", async () => {
  const remediation = await read("web/remediation.js");

  assert.match(
    remediation,
    /function hasDraftAnswer\(\)[\s\S]*querySelectorAll\("input, select, textarea"\)/,
    "hint controller must inspect the current answer controls",
  );
  assert.match(
    remediation,
    /const answerSubmitted = !feedback\.classList\.contains\("hidden"\)/,
    "hint visibility must use actual submission state rather than submit-button enabled state",
  );
  assert.match(
    remediation,
    /const draftAnswerPresent = preSubmit && hasDraftAnswer\(\)/,
    "draft answers must be detected before showing pre-submit help",
  );
  assert.match(
    remediation,
    /\(preSubmit && !draftAnswerPresent\) \|\| incorrectAnswered/,
    "pre-submit help must be visible for a blank unanswered question, hidden for a draft answer, and available after an incorrect submission",
  );
  assert.doesNotMatch(
    remediation,
    /const unanswered = !submitBtn\.disabled/,
    "submit-button state must not control hint visibility",
  );
  assert.match(
    remediation,
    /answerArea\.addEventListener\("input", syncHelpVisibility\)/,
    "typing must immediately update hint availability",
  );
  assert.match(
    remediation,
    /answerArea\.addEventListener\("change", syncHelpVisibility\)/,
    "choice selection must immediately update hint availability",
  );
});

test("practice UI explains the progressive scaffold and independent-answer boundary", async () => {
  const html = await read("web/practice.html");

  assert.match(html, /ուղղություն → ռազմավարություն → նման օրինակ/);
  assert.match(html, /Դրանք չեն լուծում ընթացիկ հարցը/);
  assert.match(html, /հմտությունը հետագայում պետք է հաստատվի ինքնուրույն/);
});
