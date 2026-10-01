import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("login panels start hidden until Supabase resolves auth state", async () => {
  const pages = [
    ["web/index.html", /id="authPanel" class="card auth-card hidden"/],
    ["web/teacher.html", /id="authPanel" class="card auth-card teacher-auth hidden"/],
    ["web/content.html", /id="authPanel" class="card content-auth hidden"/],
    ["web/admin.html", /id="authPanel" class="card admin-auth hidden"/],
  ];

  for (const [path, pattern] of pages) {
    const source = await read(path);
    assert.match(source, pattern, `${path} must not paint the login form before session resolution`);
  }
});

test("each auth surface reveals the correct state after session resolution", async () => {
  const app = await read("web/app.js");
  const teacher = await read("web/teacher.js");
  const content = await read("web/content-home.js");
  const contentWorkspace = await read("web/content-workspace.js");
  const admin = await read("web/admin.js");

  assert.match(app, /getSession\(\)[\s\S]*setAuthenticated\(Boolean\(sessionData\.session\)\)/);
  assert.match(teacher, /onAuthStateChange[\s\S]*authPanel[\s\S]*classList\.remove\("hidden"\)/);
  assert.match(content, /mountContentWorkspace\(render\)/);
  assert.match(contentWorkspace, /getSession\(\)[\s\S]*show\(data\.session\)/);
  assert.match(contentWorkspace, /authPanel\?\.classList\.remove\("hidden"\)/);
  assert.match(admin, /async function enterConsole[\s\S]*!session[\s\S]*authPanel[\s\S]*classList\.remove\("hidden"\)/);
  assert.match(admin, /onAuthStateChange[\s\S]*enterConsole\(session\)/);
});
