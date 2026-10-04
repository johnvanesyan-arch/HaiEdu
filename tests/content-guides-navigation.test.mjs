import test from 'node:test';
import assert from 'node:assert/strict';
import { guideHarness } from './fixtures/content-session-harness.mjs';

const flush = () => new Promise(resolve => setImmediate(resolve));
const guideA = { guideScope: 'skill', guideSourceId: 'QA-guide' };
const guideB = { guideScope: 'template', guideSourceId: 'QA-other' };
const id = guide => `${guide.guideScope}:${guide.guideSourceId}`;
const listResult = guides => ({ data: { guides, actor: {} }, error: null });
const detailResult = guide => ({ data: { guide, variants: [], history: [] }, error: null });

test('a current catalogue refresh still reloads the unchanged guide', async () => {
  const h = await guideHarness();
  const pending = h.api.refreshCatalog();
  h.calls[0].resolve(listResult([guideA]));
  await flush();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].body.action, 'get');
  h.calls[1].resolve(detailResult(guideA));
  await pending;
  assert.equal(h.api.snapshot().selectedId, id(guideA));
  assert.equal(h.api.snapshot().detail.guide.guideSourceId, guideA.guideSourceId);
});

test('a pending catalogue cannot reopen the old guide after a new selection', async () => {
  const h = await guideHarness();
  const pending = h.api.refreshCatalog();
  const selected = h.api.selectGuide(id(guideB));
  h.calls[1].resolve(detailResult(guideB));
  await selected;
  h.calls[0].resolve(listResult([guideA, guideB]));
  await flush();
  assert.equal(h.api.snapshot().selectedId, id(guideB));
  assert.equal(h.api.snapshot().detail.guide.guideSourceId, guideB.guideSourceId);
  assert.equal(h.calls.length, 2, 'the old selection must not start another detail read');
  await pending;
});

test('a pending catalogue cannot reopen an editor after returning to the list', async () => {
  const h = await guideHarness();
  const pending = h.api.refreshCatalog();
  h.api.returnToGuideList();
  h.calls[0].resolve(listResult([guideA]));
  await flush();
  assert.equal(h.api.snapshot().selectedId, null);
  assert.equal(h.api.snapshot().detail, null);
  assert.equal(h.get('guideConsole').classList.contains('catalog-mode'), true);
  assert.equal(h.calls.length, 1);
  await pending;
});

test('a catalogue response preserves edits made while the refresh was pending', async () => {
  const h = await guideHarness();
  const detail = h.api.snapshot().detail;
  const pending = h.api.refreshCatalog();
  h.api.markGuideDirty();
  h.calls[0].resolve(listResult([guideA]));
  await flush();
  assert.equal(h.api.snapshot().editorDirty, true);
  assert.equal(h.api.snapshot().detail, detail);
  assert.equal(h.calls.length, 1);
  await pending;
});

test('background catalogue refresh still preserves an already dirty editor', async () => {
  const h = await guideHarness();
  h.api.prepare({ dirty: true });
  const detail = h.api.snapshot().detail;
  const pending = h.api.refreshCatalog(id(guideA), { preserveDirtyEditor: true });
  h.calls[0].resolve(listResult([guideA]));
  await flush();
  assert.equal(h.api.snapshot().editorDirty, true);
  assert.equal(h.api.snapshot().detail, detail);
  assert.equal(h.calls.length, 1);
  await pending;
});

test('a repeated same-user session keeps the dirty guide open', async () => {
  const h = await guideHarness();
  const session = { user: { id: 'QA-user' } };
  const initial = h.api.showForSession(session);
  h.calls[0].resolve(listResult([guideA]));
  await flush();
  h.calls[1].resolve(detailResult(guideA));
  await initial;
  h.api.markGuideDirty();
  const detail = h.api.snapshot().detail;
  const repeated = h.api.showForSession(session);
  h.calls[2].resolve(listResult([guideA]));
  await repeated;
  assert.equal(h.calls.length, 3);
  assert.equal(h.api.snapshot().editorDirty, true);
  assert.equal(h.api.snapshot().detail, detail);
  assert.equal(h.get('guideConsole').classList.contains('hidden'), false);
});

test('a superseded catalogue success cannot replace the newest catalogue', async () => {
  const h = await guideHarness();
  const older = h.api.refreshCatalog();
  const newer = h.api.refreshCatalog();
  h.calls[1].resolve(listResult([guideB]));
  await newer;
  h.calls[0].resolve(listResult([guideA]));
  await flush();
  assert.equal(h.api.snapshot().catalog[0].guideSourceId, guideB.guideSourceId);
  assert.equal(h.calls.length, 2);
  await older;
});

test('a superseded catalogue failure cannot replace the newest success with an error', async () => {
  const h = await guideHarness();
  let staleError = null;
  const older = h.api.refreshCatalog().catch(error => { staleError = error; });
  const newer = h.api.refreshCatalog();
  h.calls[1].resolve(listResult([guideB]));
  await newer;
  h.calls[0].reject(new Error('obsolete catalogue error'));
  await older;
  assert.equal(staleError, null);
  assert.equal(h.api.snapshot().catalog[0].guideSourceId, guideB.guideSourceId);
});
