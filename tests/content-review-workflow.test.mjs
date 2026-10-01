import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const reviewUi = readFileSync("web/content-review-workflow.js", "utf8");
const historyFn = readFileSync("supabase/functions/get-content-review-history/index.ts", "utf8");
const html = readFileSync("web/content-item.html", "utf8");

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test("changes-request queue is a first-class filter", () => {
  has(reviewUi, /changesQueueBtn/, "changes-request quick queue button must exist");
  has(reviewUi, /filter\.value = "changes_requested"/, "queue must select the changes_requested review filter");
  has(reviewUi, /Changes requested \(\$\{count\}\)/, "queue must show the number of items awaiting changes");
});

test("requested-change note is prominently attached to current item", () => {
  has(reviewUi, /changeRequestCallout/, "current change request must render as a callout");
  has(reviewUi, /request\.notes/, "callout must display the reviewer's requested-change note");
  has(reviewUi, /Edit the question above, save a new version, then rerun QA and review/, "callout must explain the correction workflow");
});

test("review history persists across item versions", () => {
  has(historyFn, /from\("item_reviews"\)/, "history endpoint must read durable item review records");
  has(historyFn, /order\("created_at", \{ ascending: false \}\)/, "review history must be chronological newest-first");
  has(historyFn, /currentVersionChangeRequest/, "endpoint must identify the current-version change request");
  has(reviewUi, /Review history/, "content console must display review history");
  has(reviewUi, /Requested changes, submissions and approvals remain attached to the item across versions/, "UI must state that review events persist across versions");
});

test("review history endpoint remains content-admin protected", () => {
  has(historyFn, /hasActiveLiveSession/, "history endpoint must require an active live session");
  has(historyFn, /\["admin", "content_admin"\]/, "history endpoint must require content administration role");
});

test("dedicated item workspace loads the review workflow enhancement", () => {
  has(html, /content-review-workflow\.js/, "item workspace must load the review-workflow module");
});
