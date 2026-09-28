import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../web/admin-security.js', import.meta.url), 'utf8');

// Any HTML sink fails immediately, including sinks used while replacing old UI.
class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.textContent = '';
    this.value = '';
    const classes = new Set();
    this.classList = {
      add: name => classes.add(name), remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
    };
  }
  set innerHTML(_) { throw new Error('HTML parsing is forbidden'); }
  insertAdjacentHTML() { throw new Error('HTML parsing is forbidden'); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(event, handler) { this.listeners[event] = handler; }
}

function harness({ factors = [], level = 'aal1', confirms = true, profile = { role: 'admin', account_status: 'active' } } = {}) {
  const elements = new Map();
  const calls = { removed: [], verified: [], refresh: 0, lists: 0, confirms: 0, redirects: [] };
  const get = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const client = {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: level } }),
        listFactors: async () => {
          calls.lists++;
          return { data: { totp: factors.filter(f => f.factor_type === 'totp'), phone: factors.filter(f => f.factor_type === 'phone') } };
        },
        unenroll: async ({ factorId }) => { calls.removed.push(factorId); return {}; },
        challengeAndVerify: async args => { calls.verified.push(args); return {}; },
      },
      refreshSession: async () => { calls.refresh++; },
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }) }),
  };
  const context = vm.createContext({
    document: { getElementById: get, createElement: tag => new Element(tag) },
    window: { __haieduSupabaseClient: client, location: { assign: url => calls.redirects.push(url) } },
    confirm: () => { calls.confirms++; return confirms; },
  });
  const functions = source.replace(/^import .*;\n/gm, '').split('$("challengeForm").addEventListener')[0];
  vm.runInContext(functions + '\nglobalThis.api = { loadSecurityState, renderFactors, verifyChallenge, removeFactor, enter };', context);
  return { get, calls, api: context.api };
}

const hostileName = '<img src=x onerror="globalThis.pwned=1"> & " Armenian հայերեն';
const hostileId = '\"><svg onload="globalThis.pwned=1">';
const factor = (id, name, type = 'totp') => ({ id, friendly_name: name, factor_type: type, status: 'verified' });

test('challenge options preserve hostile text and exact IDs without parsing HTML', async () => {
  const h = harness({ factors: [factor(hostileId, hostileName), factor('phone-id', '', 'phone'), { ...factor('pending', 'pending'), status: 'unverified' }] });
  await h.api.loadSecurityState();
  const options = h.get('challengeFactor').children;
  assert.equal(options.length, 2);
  assert.equal(options[0].tagName, 'option');
  assert.equal(options[0].value, hostileId);
  assert.equal(options[0].textContent, hostileName);
  assert.equal(options[0].children.length, 0);
  assert.equal(options[1].textContent, 'Authenticator 2');
  h.get('challengeFactor').value = hostileId;
  h.get('challengeCode').value = ' 123456 ';
  await h.api.verifyChallenge({ preventDefault() {} });
  assert.equal(h.calls.verified[0].factorId, hostileId);
  assert.equal(h.calls.verified[0].code, '123456');
  assert.deepEqual(h.calls.redirects, ['./admin.html']);
  await h.api.loadSecurityState();
  assert.equal(h.get('challengeFactor').children.length, 2);
});

test('factor rows use text and dataset, retain labels and remove the exact selected factor', async () => {
  const h = harness({ level: 'aal2', factors: [factor('first', hostileName), factor(hostileId, '', 'phone')] });
  await h.api.loadSecurityState();
  const rows = h.get('factorList').children;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].className, 'factor-row');
  assert.equal(rows[0].children[0].children[0].textContent, hostileName);
  assert.equal(rows[0].children[0].children[0].children.length, 0);
  assert.match(rows[0].children[0].children[1].textContent, /Authenticator հավելված/);
  assert.match(rows[1].children[0].children[1].textContent, /Հեռախոս/);
  const button = rows[1].children[1];
  assert.equal(button.type, 'button');
  assert.equal(button.dataset.removeFactor, hostileId);
  await button.listeners.click();
  assert.deepEqual(h.calls.removed, [hostileId]);
  assert.equal(h.calls.refresh, 1);
  assert.equal(h.get('factorList').children.length, 2);
});

test('sole factor remains protected and cancelled removal makes no request', async () => {
  const h = harness({ level: 'aal2', factors: [factor('only', '')] });
  await h.api.loadSecurityState();
  assert.equal(h.get('factorList').children[0].children[1].className, 'protected-note');
  await h.api.removeFactor('only');
  assert.equal(h.calls.confirms, 0);
  assert.deepEqual(h.calls.removed, []);
  const cancelled = harness({ level: 'aal2', confirms: false, factors: [factor('a', 'A'), factor('b', 'B')] });
  await cancelled.api.loadSecurityState();
  await cancelled.get('factorList').children[0].children[1].listeners.click();
  assert.deepEqual(cancelled.calls.removed, []);
});

test('no-factor enrollment and active-admin entry boundaries remain unchanged', async () => {
  const empty = harness();
  await empty.api.loadSecurityState();
  assert.equal(empty.get('enrollPanel').classList.contains('hidden'), false);
  assert.equal(empty.get('challengePanel').classList.contains('hidden'), true);
  for (const profile of [{ role: 'student', account_status: 'active' }, { role: 'admin', account_status: 'archived' }]) {
    const denied = harness({ profile });
    await denied.api.enter({ user: { id: 'user' } });
    assert.equal(denied.calls.lists, 0);
    assert.equal(denied.get('securityConsole').classList.contains('hidden'), true);
  }
  const signedOut = harness();
  await signedOut.api.enter(null);
  assert.equal(signedOut.calls.lists, 0);
});
