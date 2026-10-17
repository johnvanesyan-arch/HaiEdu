import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
test('offline Chapter III generator guards exact inputs, scope, rollback default and explicit activation boundary', () => {
  const run = spawnSync('python3', ['tests/fixtures/chapter-iii-release-generator.py'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
});
