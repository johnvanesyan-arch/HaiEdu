import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {STAGING_VERSION,validateStagingTarget,guardedStagingFetch,stagingUrl} from '../scripts/staging-target.mjs';

const target = {schemaVersion:STAGING_VERSION,kind:'owned-local',runId:'a'.repeat(24),sourceCommit:'b'.repeat(40),
  fixtureVersion:'two-school-dashboards-v2',buildId:'c'.repeat(64),backendOrigin:'http://127.0.0.1:32110',frontendOrigin:'http://127.0.0.1:32111'};

test('local staging requires the independently owned origins, source, fixture and build before fetch', () => {
  let calls = 0;
  const fetchImpl = () => { calls++; };
  for (const key of Object.keys(target)) {
    const invalid = {...target}; delete invalid[key];
    assert.throws(() => guardedStagingFetch(invalid,target,fetchImpl));
  }
  for (const key of ['runId','sourceCommit','fixtureVersion','buildId','backendOrigin','frontendOrigin']) {
    assert.throws(() => guardedStagingFetch(target,{...target,[key]:'different'},fetchImpl));
  }
  assert.equal(calls,0);
  assert.ok(Object.isFrozen(validateStagingTarget(target,target)));
});

test('production, hosted test, encoded hosts and incomplete local origins are refused before fetch', () => {
  let calls=0;
  const forbidden=['https://xzyjvwiiibuarpotppid.supabase.co','https://pgtfeiwznqdeahrkoioy.supabase.co',
    'https://haiedu.am','https://www.haiedu.am','https://armenian-mastery-platform.vercel.app',
    'http://localhost:32110','http://127.1:32110','http://2130706433:32110','http://[::1]:32110',
    'http://127.0.0.1:65536','http://127.0.0.1:32110/','http://user@127.0.0.1:32110',
    'http://127.0.0.1:32110?target=production','https://127.0.0.1:32110'];
  for (const backendOrigin of forbidden) {
    const invalid={...target,backendOrigin};
    assert.throws(()=>guardedStagingFetch(invalid,invalid,()=>calls++));
  }
  assert.equal(calls,0);
});

test('requests cannot leave the two exact owned origins or follow redirects', async () => {
  const calls=[];
  const request=guardedStagingFetch(target,target,async (...args)=>{calls.push(args);return 'ok';});
  for(const value of ['https://www.haiedu.am/account-access','https://xzyjvwiiibuarpotppid.supabase.co/auth/v1/token',
    '//www.haiedu.am','http://127.0.0.1:32112/auth/v1/token','http://user@127.0.0.1:32110/auth/v1/token']) {
    assert.throws(()=>request(value));
  }
  assert.equal(calls.length,0);
  assert.equal(await request('/auth/v1/user',{redirect:'follow'}),'ok');
  assert.equal(calls[0][1].redirect,'error');
  assert.equal(stagingUrl(target,target.frontendOrigin+'/account-access').origin,target.frontendOrigin);
});

test('server runtime refuses external destinations before network access and never follows redirects', async () => {
  const calls=[];
  const runtime=vm.createContext({URL,fetch:async (...args)=>{calls.push(args);return 'local';}});
  vm.runInContext(await readFile(new URL('./fixtures/staging-egress.js',import.meta.url),'utf8'),runtime);
  for(const url of ['https://xzyjvwiiibuarpotppid.supabase.co','https://pgtfeiwznqdeahrkoioy.supabase.co',
    'https://www.haiedu.am','http://api:8080@outside.example.invalid','http://user@api:8080','http://api:8081',
    'http://127.0.0.1:8080','https://api:8080']) {
    assert.throws(()=>runtime.fetch(url),/staging_server_destination_refused/);
  }
  assert.equal(calls.length,0);
  assert.equal(await runtime.fetch('http://api:8080/rest/v1/profiles',{redirect:'follow'}),'local');
  assert.equal(calls[0][1].redirect,'error');
});
