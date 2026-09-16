import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("web/content.css", "utf8");

function has(pattern, message) {
  assert.match(css, pattern, message);
}

test("content quality workbench gives the editor adequate desktop width", () => {
  has(/\.content-shell\s*\{[\s\S]*?max-width:\s*1880px/, "content workbench should use the wider desktop shell");
  has(/grid-template-columns:\s*minmax\(720px,\s*1\.25fr\)\s*minmax\(620px,\s*\.95fr\)/, "desktop detail panel should have a 620px minimum width");
  has(/\.detail-panel\s*\{[\s\S]*?padding:\s*24px 28px 30px/, "detail panel should have deliberate internal spacing");
  has(/max-height:\s*calc\(100vh - 32px\)/, "desktop panel should stay viewport-bounded while scrolling internally");
});

test("detail editor sections are visually grouped and workflow controls remain usable", () => {
  has(/\.editor-section\s*\{[\s\S]*?border-radius:\s*12px/, "editor sections should be grouped as readable subcards");
  has(/\.detail-section h3\s*\{[\s\S]*?font-size:\s*1\.15rem/, "detail section headings should be compact rather than oversized");
  has(/\.detail-panel \.workflow-actions button\s*\{[\s\S]*?min-height:\s*44px/, "workflow actions should keep accessible target height");
});

test("layout collapses to a full-width editor before two columns become cramped", () => {
  has(/@media \(max-width:\s*1280px\)[\s\S]*?\.quality-layout\s*\{\s*grid-template-columns:\s*1fr/, "workbench should switch to one column at 1280px");
  has(/@media \(max-width:\s*760px\)[\s\S]*?\.detail-panel\s*\{\s*padding:\s*18px 16px/, "mobile detail panel should use compact padding");
});
