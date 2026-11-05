import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXCEPTION_PATH, scanTrackedText, unapprovedEmailLines, formatFindings, validateExceptions } from './support/public-email-scan.mjs';

const privateEmail = ['private-learner', 'school.edu'].join('@');
const policy = { schemaVersion: 1, entries: [] };
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'haiedu-public-email-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs/qa'), { recursive: true });
  writeFileSync(join(root, EXCEPTION_PATH), JSON.stringify(policy));
  execFileSync('git', ['init', '-q'], { cwd: root });
  return root;
}
const stage = root => execFileSync('git', ['add', '.'], { cwd: root });

test('personal email literals are rejected in docs, code and evidence without printing values', () => {
  for (const path of ['docs/roadmap.md', 'web/page.js', 'docs/evidence/run.json', 'tests/example.test.mjs']) {
    const findings = unapprovedEmailLines(path, `heading\n${privateEmail}\n`);
    assert.deepEqual(findings, [{ path, line: 2, kind: 'unapproved email' }]);
    assert.ok(!JSON.stringify(findings).includes(privateEmail));
    assert.ok(!formatFindings(findings).includes(privateEmail));
  }
});

test('reserved fixtures and numeric package versions do not create false positives', () => {
  assert.deepEqual(unapprovedEmailLines('fixtures.mjs', [
    'name@example.com', 'teacher@example.org', 'user@example.net', 'qa@school.example',
    'qa@example.invalid', 'qa@example.test', 'qa@sub.example.com',
    'npm:@supabase/supabase-js@2.118.0', 'https://unpkg.com/@floating-ui/core@1.7.3',
  ].join('\n')), []);
});

test('reserved-domain suffix tricks and uppercase addresses remain blocked', () => {
  for (const domain of ['example.com.school.edu', 'notexample.com', 'invalid.school.edu']) {
    assert.equal(unapprovedEmailLines('report.md', ['learner', domain].join('@')).length, 1);
  }
  assert.equal(unapprovedEmailLines('report.md', privateEmail.toUpperCase()).length, 1);
});

test('common HTML, URL and source encodings are checked with original line numbers', () => {
  for (const at of ['&#64;', '&#x40;', '&commat;', '%40', '\\u0040', '\\x40', '&amp;#64;']) {
    const encoded = privateEmail.replace('@', at).replace('.', '&#46;');
    assert.deepEqual(unapprovedEmailLines('report.md', `first\n${encoded}`), [{ path: 'report.md', line: 2, kind: 'unapproved email' }]);
  }
});

test('exceptions require exact paths and a reason; they do not exempt other files or addresses', () => {
  const entry = { path: 'LICENSE.txt', email: privateEmail, reason: 'Synthetic example of an approved public attribution.' };
  const entries = validateExceptions({ schemaVersion: 1, entries: [entry] });
  assert.deepEqual(unapprovedEmailLines('LICENSE.txt', privateEmail, entries), []);
  assert.equal(unapprovedEmailLines('docs/evidence/run.json', privateEmail, entries).length, 1);
  assert.equal(unapprovedEmailLines('LICENSE.txt', `other-${privateEmail}`, entries).length, 1);
  assert.deepEqual(unapprovedEmailLines(EXCEPTION_PATH, JSON.stringify(entry), entries), []);
  for (const override of [{ path: '*' }, { path: '../secret' }, { path: '/absolute' }, { reason: '' }, { email: 'invalid' }]) {
    assert.throws(() => validateExceptions({ schemaVersion: 1, entries: [{ ...entry, ...override }] }));
  }
  assert.throws(() => validateExceptions({ schemaVersion: 1, entries: [entry, entry] }));
});

test('the CLI scans new tracked files, ignores untracked files, fails closed and keeps CI logs private', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'new-evidence.json'), JSON.stringify({ email: privateEmail }));
  stage(root);
  writeFileSync(join(root, 'untracked.txt'), privateEmail);
  const script = fileURLToPath(new URL('./support/public-email-scan.mjs', import.meta.url));
  const failed = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /new-evidence\.json/);
  assert.ok(!(failed.stdout + failed.stderr).includes(privateEmail));
  writeFileSync(join(root, 'new-evidence.json'), JSON.stringify({ role: 'designated QA learner' }));
  assert.equal(spawnSync(process.execPath, [script], { cwd: root }).status, 0);
  writeFileSync(join(root, EXCEPTION_PATH), '{malformed');
  assert.equal(spawnSync(process.execPath, [script], { cwd: root }).status, 1);
});

test('non-UTF8 documents and symlinks fail without following external targets; binary coverage is explicit', t => {
  const root = fixture(t);
  writeFileSync(join(root, 'evidence.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0xff]));
  writeFileSync(join(root, 'text-disguised-as-image.png'), privateEmail);
  writeFileSync(join(root, 'bad.md'), Buffer.from([0xff, 0xfe]));
  symlinkSync('absent-private-file', join(root, 'linked.md'));
  stage(root);
  const result = scanTrackedText(root);
  assert.equal(result.binaryFiles, 1);
  assert.ok(result.findings.some(x => x.path === 'text-disguised-as-image.png' && x.kind === 'unapproved email'));
  assert.ok(result.findings.some(x => x.path === 'bad.md' && x.kind === 'unsupported text encoding'));
  assert.ok(result.findings.some(x => x.path === 'linked.md' && x.kind === 'unsupported tracked file type'));
});

test('a personal identifier in a filename is blocked and redacted in diagnostics', t => {
  const root = fixture(t);
  writeFileSync(join(root, privateEmail + '.md'), 'no email in body');
  writeFileSync(join(root, privateEmail + '.png'), Buffer.from([0x89, 0xff]));
  stage(root);
  const result = scanTrackedText(root);
  assert.equal(result.findings.filter(x => x.kind === 'unapproved email in path').length, 2);
  assert.ok(!formatFindings(result.findings).includes(privateEmail));
});
