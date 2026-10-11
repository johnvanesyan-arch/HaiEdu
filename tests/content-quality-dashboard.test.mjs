import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardFixture } from './fixtures/content-dashboard-endpoint.mjs';

test('a larger bank retains passing current QA instead of silently disabling approval', async () => {
  const fixture = dashboardFixture();
  const result = await fixture.call();
  assert.equal(result.status, 200);
  assert.equal(result.body.items.length, 382);
  assert.equal(result.body.items.filter(item => item.latestQa?.passed).length, 382);
  assert.equal(result.body.stats.qaMissing, 0);
  assert.ok(fixture.requests.every(query => query.inCount <= 80));
});

test('pagination preserves items, mapping history and latest QA for the current version across subjects', async () => {
  const fixture = dashboardFixture({ count: 1105 });
  const itemId = fixture.rows.items[0].id;
  fixture.rows.item_qa_runs.push({ id: 'later-old-version', item_id: itemId, version_no: 1, passed: false, created_at: '2026-10-12T00:00:00Z' });
  fixture.rows.item_misconception_mappings.push(...Array.from({ length: 1101 }, (_, n) => ({ id: String(n).padStart(5, '0'), item_id: itemId, response_key: String(n), misconceptions: { code: `MC-${n}` } })));
  const result = await fixture.call();
  assert.equal(result.status, 200);
  assert.equal(result.body.items.length, 1105);
  assert.equal(result.body.items[0].latestQa.passed, true);
  assert.equal(result.body.items[0].latestQa.versionNo, 2);
  assert.equal(result.body.items[0].misconceptions.length, 1101);
  assert.equal(new Set(result.body.items.map(item => item.skill.subjectId)).size, 2);
});

for (const table of ['item_qa_runs', 'item_reviews', 'item_versions', 'item_misconception_mappings']) {
  test(`${table} failure cannot return a successful dashboard with missing evidence`, async () => {
    const result = await dashboardFixture({ count: 2, failedTable: table }).call();
    assert.equal(result.status, 500);
    assert.equal(result.body.items, undefined);
  });
}

test('network rejection and authorization checks fail closed', async () => {
  assert.equal((await dashboardFixture({ rejectTable: 'item_qa_runs' }).call()).status, 500);
  assert.equal((await dashboardFixture().call({ anonymous: true })).status, 401);
  assert.equal((await dashboardFixture({ role: 'student' }).call()).status, 403);
  assert.equal((await dashboardFixture({ active: false }).call()).status, 403);
});
