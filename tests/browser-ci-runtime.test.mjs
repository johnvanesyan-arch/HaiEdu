import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the CI browser image matches the locked driver and supplies its browsers without a package installer', () => {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const driver = lock.packages['node_modules/playwright-core'].version;
  assert.equal(lock.packages['node_modules/@playwright/test'].version, driver);
  assert.equal(lock.packages['node_modules/playwright'].version, driver);

  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  const job = workflow.match(/\n  role-layout-browser:\n(.*?)(?=\n  [a-z][\w-]*:|$)/s)?.[1];
  assert.ok(job, 'the required browser job must remain present');
  const image = job.match(/^      image: mcr\.microsoft\.com\/playwright:v([^\s@]+)-resolute@sha256:([0-9a-f]{64})$/m);
  assert.ok(image, 'use a complete immutable digest from the official browser image registry');
  assert.equal(image[1], driver, 'a driver update also needs a reviewed image update');
  assert.doesNotMatch(job, /\b(?:apt-get|apt|playwright install)\b/, 'browser dependencies are already in the reviewed image');
  assert.match(job, /run: node --test tests\/browser\/\*\.test\.mjs/);
  assert.match(job, /STUDENT_LAYOUT_SCREENSHOTS_DIR: artifacts\/student-workspace/);
});
