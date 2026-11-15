// Teacher account build (15 November 2026): the one display-name rule and the written rejection reason.
// The service tests run the real Edge handlers against an in-memory PostgreSQL schema with synthetic records;
// they are not a deployed or production check.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as server from '../supabase/functions/_shared/display-name.mjs';
import * as browser from '../web/account-core.mjs';
import {rejectionResolution, REJECTION_CODES, REJECTION_NOTE_MAX} from '../supabase/functions/_shared/deletion-rejection.mjs';
import {privacyFixture, id} from './fixtures/teacher-task-privacy-api.mjs';

const names = ['', ' ', '\t\n', 'Ա', ' Ա ', 'Աբ', '  Աննա   Մարտիրոսյան  ', 'Anna  Smith', 'ա'.repeat(80), ' ' + 'ա'.repeat(80) + ' ', 'ա'.repeat(81),
  'ա '.repeat(40), 'ա '.repeat(41), '😀', '😀😀', '😀'.repeat(80), '😀'.repeat(81), null, undefined, 0, 'Ուսուցիչ'];

test('browser and server apply the identical display-name rule to every input', () => {
  assert.equal(server.DISPLAY_NAME_MIN, 2); assert.equal(server.DISPLAY_NAME_MAX, 80);
  assert.equal(browser.DISPLAY_NAME_MIN, server.DISPLAY_NAME_MIN); assert.equal(browser.DISPLAY_NAME_MAX, server.DISPLAY_NAME_MAX);
  for (const name of names) {
    assert.equal(browser.normalizeDisplayName(name), server.normalizeDisplayName(name), JSON.stringify(name));
    assert.equal(browser.displayNameError(name), server.displayNameError(name), JSON.stringify(name));
  }
});

test('the display-name rule requires 2–80 characters after removing outer and repeated spaces', () => {
  const rule = server.displayNameError;
  for (const empty of ['', ' ', '\t\n', null, undefined]) assert.equal(rule(empty), 'display_name_required');
  for (const short of ['Ա', ' Ա ', '😀', 0]) assert.equal(rule(short), 'display_name_too_short');
  for (const long of ['ա'.repeat(81), '😀'.repeat(81), 'ա '.repeat(41)]) assert.equal(rule(long), 'display_name_too_long');
  for (const valid of ['Աբ', 'ա'.repeat(80), ' ' + 'ա'.repeat(80) + ' ', '😀'.repeat(80), 'ա '.repeat(40)]) assert.equal(rule(valid), null);
  assert.equal(server.normalizeDisplayName('  Աննա   Մարտիրոսյան  '), 'Աննա Մարտիրոսյան');
  // Every code has Armenian text, and an unrelated service code has none.
  for (const code of ['display_name_required', 'display_name_too_short', 'display_name_too_long']) assert.match(browser.displayNameMessage(code), /[Ա-֏]/);
  assert.equal(browser.displayNameMessage('display_name_update_failed'), null);
});

test('both name-writing functions use the shared rule and neither can clear a name', () => {
  for (const name of ['manage-my-privacy', 'manage-teacher-profile']) {
    const source = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    assert.match(source, /import \{ displayNameError, normalizeDisplayName \} from "\.\.\/_shared\/display-name\.mjs";/, name);
    assert.match(source, /const nameError = displayNameError\(displayName\);\s+if \(nameError\) return json\(\{ error: nameError \}, 400\);/, name);
    assert.doesNotMatch(source, /displayName \|\| null|length > 100|length > 80|length < 2/, name);
  }
});

test('rejection reasons: «other» replaces legal hold and alone carries a written reason', () => {
  assert.deepEqual([...REJECTION_CODES], ['not_verified', 'staff_offboarding_required', 'duplicate_request', 'other']);
  assert.deepEqual(rejectionResolution('other', '  Կքննարկվի   տարվա ավարտից հետո։ '), {code: 'other', note: 'Կքննարկվի տարվա ավարտից հետո։'});
  assert.deepEqual(rejectionResolution('other', ''), {code: 'other', note: null});
  assert.deepEqual(rejectionResolution('other'), {code: 'other', note: null});
  // A browser that has not reloaded may still send the earlier code.
  assert.deepEqual(rejectionResolution('legal_hold', 'x'), {code: 'other', note: 'x'});
  // Fixed reasons never store free text.
  for (const code of ['not_verified', 'staff_offboarding_required', 'duplicate_request']) assert.deepEqual(rejectionResolution(code, 'ignored'), {code, note: null});
  for (const bad of ['', 'cancelled_by_user', 'admin_archived_account', 'student_erased', 'OTHER', null]) assert.deepEqual(rejectionResolution(bad, ''), {error: 'invalid_rejection'});
  assert.deepEqual(rejectionResolution('other', 'ա'.repeat(REJECTION_NOTE_MAX)), {code: 'other', note: 'ա'.repeat(REJECTION_NOTE_MAX)});
  assert.deepEqual(rejectionResolution('other', 'ա'.repeat(REJECTION_NOTE_MAX + 1)), {error: 'resolution_note_too_long'});
  assert.deepEqual(rejectionResolution('not_verified', 'ա'.repeat(REJECTION_NOTE_MAX + 1)), {error: 'resolution_note_too_long'});
});

test('the account page explains a rejection only from a known code or the administrator’s own words', () => {
  const reason = browser.rejectionReason;
  assert.equal(reason({status: 'rejected', resolution_code: 'staff_offboarding_required'}), 'Պատճառը՝ նախ պետք է փոխանցվեն ձեր դասարաններն ու գործերը։');
  assert.equal(reason({status: 'rejected', resolution_code: 'not_verified'}), 'Պատճառը՝ հարցումը չհաջողվեց հաստատել։');
  assert.equal(reason({status: 'rejected', resolution_code: 'duplicate_request'}), 'Պատճառը՝ նույն հարցումն արդեն ուղարկված է։');
  assert.equal(reason({status: 'rejected', resolution_code: 'other', resolution_note: ' Գրված պատճառ։ '}), 'Պատճառը՝ Գրված պատճառ։');
  for (const silent of [{status: 'rejected', resolution_code: 'other', resolution_note: null}, {status: 'rejected', resolution_code: 'other', resolution_note: '  '},
    {status: 'rejected', resolution_code: 'legal_hold'}, {status: 'rejected', resolution_code: 'unknown_code', resolution_note: 'not shown'},
    {status: 'pending', resolution_code: 'other', resolution_note: 'not shown'}, {status: 'cancelled', resolution_code: 'cancelled_by_user'}, null, undefined]) assert.equal(reason(silent), '');
});

test('the name service refuses empty, short and long names for every role and stores the normalized name', async t => {
  const f = await privacyFixture(); t.after(() => f.db.close());
  const stored = async actor => (await f.db.query('select display_name from profiles where id=$1', [id(actor)])).rows[0].display_name;
  // 10 is a student, 20 a teacher and 40 the administrator in this fixture.
  for (const actor of [10, 20, 40]) {
    const before = await stored(actor);
    for (const [displayName, error] of [['', 'display_name_required'], ['   ', 'display_name_required'], [undefined, 'display_name_required'],
      ['Ա', 'display_name_too_short'], ['ա'.repeat(81), 'display_name_too_long']]) {
      const response = await f.mineRequest({action: 'update_display_name', displayName}, actor);
      assert.equal(response.status, 400, `${actor}/${JSON.stringify(displayName)}`);
      assert.equal((await response.json()).error, error);
      assert.equal(await stored(actor), before, 'a refused name changes nothing');
    }
    const response = await f.mineRequest({action: 'update_display_name', displayName: '  Նոր   Անուն  '}, actor);
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).profile.display_name, 'Նոր Անուն');
    assert.equal(await stored(actor), 'Նոր Անուն');
  }
});

test('the administrator’s rejection stores «other» with its written reason, and only then', async t => {
  const f = await privacyFixture(); t.after(() => f.db.close());
  const open = async () => (await f.db.query("insert into account_deletion_requests(user_id,auth_user_id,requester_user_id,status) values($1,$1,$1,'pending') returning id", [id(20)])).rows[0].id;
  const row = async requestId => (await f.db.query('select status,resolution_code,resolution_note from account_deletion_requests where id=$1', [requestId])).rows[0];
  const reject = (requestId, resolutionCode, resolutionNote) => f.adminRequest({action: 'reject_deletion', requestId, resolutionCode, resolutionNote});

  let requestId = await open();
  for (const [code, note, error] of [['legal', '', 'invalid_rejection'], ['cancelled_by_user', '', 'invalid_rejection'], ['other', 'ա'.repeat(301), 'resolution_note_too_long']]) {
    const refused = await reject(requestId, code, note);
    assert.equal(refused.status, 400); assert.equal((await refused.json()).error, error);
    assert.deepEqual(await row(requestId), {status: 'pending', resolution_code: null, resolution_note: null});
  }
  let response = await reject(requestId, 'other', '  Կքննարկվի   ավելի ուշ։ ');
  assert.equal(response.status, 200, await response.clone().text());
  assert.deepEqual(await row(requestId), {status: 'rejected', resolution_code: 'other', resolution_note: 'Կքննարկվի ավելի ուշ։'});
  assert.equal((await response.json()).request.resolution_note, 'Կքննարկվի ավելի ուշ։');

  requestId = await open(); response = await reject(requestId, 'other', '');
  assert.equal(response.status, 200); assert.deepEqual(await row(requestId), {status: 'rejected', resolution_code: 'other', resolution_note: null});

  requestId = await open(); response = await reject(requestId, 'legal_hold', 'Legacy browser');
  assert.equal(response.status, 200); assert.deepEqual(await row(requestId), {status: 'rejected', resolution_code: 'other', resolution_note: 'Legacy browser'});

  requestId = await open(); response = await reject(requestId, 'staff_offboarding_required', 'never stored');
  assert.equal(response.status, 200); assert.deepEqual(await row(requestId), {status: 'rejected', resolution_code: 'staff_offboarding_required', resolution_note: null});

  // The audit records that a written reason exists, never its text.
  const audit = (await f.db.query("select details from security_audit_log where action='admin.deletion_rejected' order by created_at")).rows.map(r => r.details);
  assert.deepEqual(audit.map(d => [d.resolutionCode, d.hasNote]), [['other', true], ['other', false], ['other', true], ['staff_offboarding_required', false]]);
  assert.equal(JSON.stringify(audit).includes('Կքննարկվի'), false);

  // The database itself refuses a written reason on any row that is not a rejection with «other».
  requestId = await open();
  await assert.rejects(f.db.query("update account_deletion_requests set resolution_note='x' where id=$1", [requestId]), /resolution_note_check/);
  await assert.rejects(f.db.query("update account_deletion_requests set status='rejected',resolution_code='not_verified',resolution_note='x' where id=$1", [requestId]), /resolution_note_check/);
  await assert.rejects(f.db.query("update account_deletion_requests set status='rejected',resolution_code='other',resolution_note=$2 where id=$1", [requestId, 'ա'.repeat(301)]), /resolution_note_check/);
  await assert.rejects(f.db.query("update account_deletion_requests set status='rejected',resolution_code='other',resolution_note='   ' where id=$1", [requestId]), /resolution_note_check/);
});

test('the account read returns the written reason to its owner', () => {
  const source = readFileSync('supabase/functions/get-my-privacy/index.ts', 'utf8');
  assert.match(source, /\.select\("id, status, requested_at, resolved_at, resolution_code, resolution_note, execution_started_at"\)/);
  assert.match(source, /\.or\(`user_id\.eq\.\$\{userId\},requester_user_id\.eq\.\$\{userId\}`\)/);
});
