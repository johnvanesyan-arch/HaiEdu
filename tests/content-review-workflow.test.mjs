import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const reviewUi = readFileSync("web/content-review-workflow.js", "utf8");
const reviewQueueUi = readFileSync("web/content-review.js", "utf8");
const itemUi = readFileSync("web/content.js", "utf8");
const historyFn = readFileSync("supabase/functions/get-content-review-history/index.ts", "utf8");
const html = readFileSync("web/content-item.html", "utf8");

function has(text, pattern, message) {
  assert.match(text, pattern, message);
}

test("changes-request queue belongs to the dedicated review page", () => {
  has(reviewQueueUi, /queue === "changes_requested"/, "review queue must support the changes_requested filter");
  has(reviewQueueUi, /item\.reviewStatus === "changes_requested"/, "changes-request queue must select matching review state");
  assert.doesNotMatch(reviewUi, /changesQueueBtn/, "item-history enhancer must not recreate the old monolithic bank queue");
});

test("requested-change note is prominently attached to current item", () => {
  has(reviewUi, /changeRequestCallout/, "current change request must render as a callout");
  has(reviewUi, /request\.notes/, "callout must display the reviewer's requested-change note");
  has(reviewUi, /Ուղղեք հարցը, պահպանեք նոր տարբերակը, ապա կրկին գործարկեք QA-ն և ստուգումը/, "callout must explain the correction workflow");
});

test("review history persists across item versions", () => {
  has(historyFn, /from\("item_reviews"\)/, "history endpoint must read durable item review records");
  has(historyFn, /order\("created_at", \{ ascending: false \}\)/, "review history must be chronological newest-first");
  has(historyFn, /currentVersionChangeRequest/, "endpoint must identify the current-version change request");
  has(reviewUi, /Ստուգման պատմություն/, "item workspace must display review history");
  has(reviewUi, /Փոփոխության պահանջները, ներկայացումները և հաստատումները պահպանվում են տարբերակների միջև/, "UI must state that review events persist across versions");
});

test("review history endpoint remains content-admin protected", () => {
  has(historyFn, /hasActiveLiveSession/, "history endpoint must require an active live session");
  has(historyFn, /\["admin", "content_admin"\]/, "history endpoint must require content administration role");
});

test("dedicated item workspace loads the review workflow enhancement", () => {
  has(html, /content-review-workflow\.js/, "item workspace must load the review-workflow module");
});


test("review history attaches to the current Model A decision section", () => {
  has(itemUi, /id="contentDecisionSection"/, "item page must expose a stable review-history anchor");
  has(reviewUi, /querySelector\("#contentDecisionSection"\)/, "history enhancer must use the stable decision-section anchor");
  assert.doesNotMatch(reviewUi, /Review workflow/, "history enhancer must not depend on the removed legacy heading");
});

test("review history enhancer reuses the shared Supabase client and Armenian locale", () => {
  has(reviewUi, /window\.__haieduSupabaseClient \|\|= createClient/, "review enhancer must reuse the shared auth client");
  has(reviewUi, /Intl\.DateTimeFormat\("hy-AM"/, "review history dates must use Armenian locale");
  assert.doesNotMatch(reviewUi, /No review history yet|System \/ historical review|Review event/);
});
