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
    /const draftAnswerPresent = unanswered && hasDraftAnswer\(\)/,
    "draft answers must be detected before showing pre-submit help",
  );
  assert.match(
    remediation,
    /\(unanswered && !draftAnswerPresent\) \|\| incorrectAnswered/,
    "pre-submit help must disappear when an answer is present while post-error help remains available",
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

test("practice UI explains the independent-answer hint boundary", async () => {
  const html = await read("web/practice.html");

  assert.match(
    html,
    /Հուշումը հասանելի է մինչև պատասխանը մուտքագրելը կամ սխալ պատասխանից հետո/,
  );
});
