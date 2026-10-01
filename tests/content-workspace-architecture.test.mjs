import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("content reviewer uses dedicated task pages instead of one monolithic console", () => {
  const home = read("web/content.html");
  const review = read("web/content-review.html");
  const bank = read("web/content-bank.html");
  const item = read("web/content-item.html");
  const curriculum = read("web/content-curriculum.html");
  const evidence = read("web/content-evidence.html");
  assert.match(home, /Բովանդակության աշխատասեղան/);
  assert.doesNotMatch(home, /id="itemRows"/);
  assert.match(review, /id="queueList"/);
  assert.match(bank, /id="itemRows"/);
  assert.doesNotMatch(bank, /id="detailPanel"/);
  assert.match(item, /id="detailPanel"/);
  assert.match(item, /data-content-mode="item"/);
  assert.match(curriculum, /Ուսումնական ծրագրի ծածկույթ/);
  assert.match(evidence, /Փորձնական տվյալներ/);
});

test("content sidebar exposes the streamlined task hierarchy", () => {
  const layout = read("web/role-layout.js");
  for (const label of ["Գլխավոր","Ստուգման հերթ","Հարցերի բանկ","Ուսումնական ծրագիր","Փորձնական տվյալներ","Օգնության ուղեցույցներ"]) {
    assert.match(layout, new RegExp(label));
  }
  for (const workspace of ["contentReview","contentBank","contentItem","contentCurriculum","contentEvidence","contentGuides"]) {
    assert.match(layout, new RegExp(`${workspace}:\\s*\\{`));
  }
});

test("dedicated item workspace keeps the editor workflow and separates tabs", () => {
  const editor = read("web/content.js");
  assert.match(editor, /data-item-tab-button="preview"/);
  assert.match(editor, /data-item-tab-button="content"/);
  assert.match(editor, /data-item-tab-button="metadata"/);
  assert.match(editor, /data-item-tab-button="review"/);
  assert.match(editor, /data-item-tab-button="history"/);
  assert.match(editor, /learnerPreviewHtml/);
});


test("dedicated item workspace uses the MVP Model A reviewer decision flow", () => {
  const editor = read("web/content.js");
  assert.match(editor, /Բովանդակային որոշում/);
  assert.match(editor, /id="editQuestionBtn"/);
  assert.match(editor, /id="approveBtn"/);
  assert.match(editor, /Հաստատումը հասանելի կլինի միայն ընթացիկ տարբերակի հաջող QA-ից հետո/);
  assert.doesNotMatch(editor, /id="submitReviewBtn"/);
  assert.doesNotMatch(editor, /id="changesBtn"/);
});
