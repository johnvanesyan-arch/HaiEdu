import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('production QA credentials stay on reviewed main and outside pull request jobs', () => {
  const directory = '.github/workflows';
  const workflows = readdirSync(directory)
    .filter(name => /\.ya?ml$/.test(name))
    .map(name => ({ name, source: readFileSync(`${directory}/${name}`, 'utf8') }))
    .filter(({ source }) => /\$\{\{\s*secrets\.QA_/.test(source));
  assert.equal(workflows.length, 21, 'audit every production QA credential consumer');
  for (const { name, source } of workflows) {
    assert.doesNotMatch(source, /^  (?:pull_request|pull_request_target|workflow_run):/m, name);
    const mainGuard = source.indexOf('test "$GITHUB_REF" = refs/heads/main');
    const checkout = source.search(/uses: actions\/checkout@/);
    const credentials = source.search(/\$\{\{\s*secrets\.QA_/);
    assert.ok(mainGuard >= 0 && mainGuard < checkout && mainGuard < credentials, name);
  }

  const source = workflows.find(({ name }) => name === 'sprint-15a3-authenticated-qa.yml').source;
  assert.match(source, /if: \$\{\{ github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'workflow_dispatch' \|\| vars\.PRODUCTION_QA_AUTORUN == 'true'\) \}\}/);
  const guard = source.match(/- name: Require reviewed main branch\n        run: \|\n((?:          [^\n]*\n)+)/)?.[1];
  assert.ok(guard, 'execute the actual pre-checkout guard without any credentials or network');
  for (const [ref, repository, allowed] of [
    ['refs/heads/main', 'johnvanesyan-arch/HaiEdu', true],
    ['refs/pull/466/merge', 'johnvanesyan-arch/HaiEdu', false],
    ['refs/heads/feature', 'johnvanesyan-arch/HaiEdu', false],
    ['refs/heads/Main', 'johnvanesyan-arch/HaiEdu', false],
    ['refs/heads/main', 'other/fixture', false],
  ]) {
    const result = spawnSync('/bin/bash', ['--noprofile', '--norc', '-e', '-c', guard], {
      env: { GITHUB_REF: ref, GITHUB_REPOSITORY: repository },
      encoding: 'utf8',
      timeout: 1000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, allowed ? 0 : 1, `${ref} ${repository}`);
  }
});
