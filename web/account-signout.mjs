// Shared browser-only logout control. Authorization and revocation stay with Auth.
// A failed remote request can still remove the local session (auth-js 2.118.0).
// Reconcile the local state before reporting an outcome or navigating.
const operations = new WeakMap();
const noticeKey = 'haiedu:signout-notice';
const controlsSelector = '#signOutBtn, #blockedSignOutBtn, [data-student-signout], .hm-sidebar-signout';
const messages = {
  pending: 'Հաշվից դուրս գալը կատարվում է…',
  failed: 'Չհաջողվեց դուրս գալ։ Ստուգեք կապը և կրկին սեղմեք «Դուրս գալ»։',
  unknown: 'Չհաջողվեց հաստատել՝ դուրս եք եկել հաշվից, թե ոչ։ Ստուգեք կապը և կրկին ստուգեք կարգավիճակը։',
  local: 'Այս դիտարկիչից դուրս եք եկել։ Մյուս սարքերից դուրս գալը չհաստատվեց։',
  localScope: 'Այս դիտարկիչից դուրս եք եկել։ Հեռավար աշխատաշրջանի փակումը չհաստատվեց։',
  authFailed: 'Մուտքի ստուգումը ժամանակավորապես անհասանելի է։ Ստուգեք կապը և կրկին փորձեք։',
};

function notice(kind, check) {
  document.getElementById('accountSignOutMessage')?.remove();
  const section = document.createElement('section');
  section.id = 'accountSignOutMessage';
  section.className = 'account-signout-notice card';
  section.dataset.accountRecovery = kind;
  section.setAttribute('role', kind === 'pending' ? 'status' : 'alert');
  section.tabIndex = -1;
  const text = document.createElement('p'); text.textContent = messages[kind];
  section.append(text);
  if (check) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = kind === 'authFailed' ? 'Կրկին ստուգել մուտքը' : 'Ստուգել կարգավիճակը';
    if (kind !== 'authFailed') button.setAttribute('aria-label', 'Ստուգել դուրս գալու կարգավիճակը՝ առանց կրկին դուրս գալու');
    button.dataset.signoutCheck = '';
    button.addEventListener('click', () => { void check(); });
    section.append(button);
  } else if (kind !== 'pending') {
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'ghost'; button.textContent = 'Փակել';
    button.addEventListener('click', () => section.remove()); section.append(button);
  }
  document.body.append(section);
  if (kind !== 'pending') (section.querySelector('[data-signout-check]') || section).focus();
  return section;
}

export function showSessionReadFailure(retry) {
  notice('authFailed', () => { document.getElementById('accountSignOutMessage')?.remove(); return retry(); });
}

export function clearSessionReadFailure() {
  const section = document.getElementById('accountSignOutMessage');
  if (section?.dataset.accountRecovery === 'authFailed') section.remove();
}

export function showSignOutNotice() {
  try {
    const kind = sessionStorage.getItem(noticeKey);
    sessionStorage.removeItem(noticeKey);
    if (kind === 'local' || kind === 'localScope') notice(kind);
  } catch { /* Optional storage must not block login or logout. */ }
}

async function sessionOf(client) {
  const result = await client.auth.getSession();
  if (result?.error || !result?.data || !Object.hasOwn(result.data, 'session')) throw Error('session_unavailable');
  if (result.data.session !== null && !result.data.session?.user?.id) throw Error('session_unavailable');
  return result.data.session;
}

export function signOutAccount(client, options = {}) {
  let operation = operations.get(client.auth);
  if (operation) return operation.promise || operation.check();
  const { canLeave = () => true, prepare = () => {}, onSignedOut = () => {}, redirect, scope = 'global' } = options;
  operation = { promise: null, attempted: false, remoteFailed: false, changed: false, initial: null };
  operations.set(client.auth, operation);
  const controls = [...document.querySelectorAll(controlsSelector)];
  const disabled = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  let finished = false, subscription;
  const show = (kind, check) => { operation.notice = notice(kind, check); };
  const clearNotice = () => { if (document.getElementById('accountSignOutMessage') === operation.notice) operation.notice?.remove(); };
  subscription = client.auth.onAuthStateChange?.((event, session) => {
    if (event === 'SIGNED_IN' && session && (!operation.initial
      || session.user?.id !== operation.initial.user?.id
      || session.access_token !== operation.initial.access_token)) {
      operation.changed = true;
      if (!operation.promise) { finish(); clearNotice(); }
    }
  })?.data?.subscription;
  if (finished) subscription?.unsubscribe?.();
  function finish() {
    if (finished) return; finished = true;
    subscription?.unsubscribe?.();
    if (operations.get(client.auth) === operation) operations.delete(client.auth);
    controls.forEach((control, index) => { control.disabled = disabled[index]; });
  }
  async function reconcile() {
    let current;
    try { current = await sessionOf(client); }
    catch {
      if (operation.changed) { finish(); clearNotice(); return false; }
      show('unknown', operation.check); return false;
    }
    if (operation.changed || (current && current.user?.id !== operation.initial?.user?.id)) {
      finish(); clearNotice(); return false;
    }
    if (current) { finish(); show('failed'); return false; }
    finish(); clearNotice();
    onSignedOut();
    const kind = scope === 'global' ? 'local' : 'localScope';
    if (operation.remoteFailed) {
      if (redirect) { try { sessionStorage.setItem(noticeKey, kind); } catch { /* optional */ } }
      else show(kind);
    }
    if (redirect) location.replace(redirect);
    return true;
  }
  operation.check = () => {
    if (operation.promise) return operation.promise;
    show('pending');
    operation.promise = Promise.resolve().then(reconcile).finally(() => { operation.promise = null; if (operation.changed) { finish(); clearNotice(); } });
    return operation.promise;
  };
  operation.promise = Promise.resolve().then(async () => {
    try {
      const guards = [];
      const event = new CustomEvent('haiedu-before-signout', {
        cancelable: true, detail: { waitUntil: promise => guards.push(Promise.resolve(promise)) },
      });
      if (!document.dispatchEvent(event) || (await Promise.all(guards)).some(allowed => !allowed)) { finish(); return false; }
      if (!(await canLeave())) { finish(); return false; }
      operation.initial = await sessionOf(client);
      if (operation.changed) { finish(); return false; }
      if (options.expectedSession && (operation.initial?.user?.id !== options.expectedSession.user?.id
        || operation.initial?.access_token !== options.expectedSession.access_token)) { finish(); return false; }
      if (operation.initial) {
        await prepare();
        // Preparation (e.g. MFA cleanup) must not log out a newer account.
        const current = await sessionOf(client);
        if (operation.changed || current?.user?.id !== operation.initial.user?.id) { finish(); return false; }
        show('pending'); operation.attempted = true;
        try { const result = await client.auth.signOut({ scope }); operation.remoteFailed = !result || !Object.hasOwn(result, 'error') || Boolean(result.error); }
        catch { operation.remoteFailed = true; }
      }
      return await reconcile();
    } catch {
      finish(); if (!operation.changed) show('failed'); return false;
    }
  }).finally(() => { operation.promise = null; if (operation.changed) { finish(); clearNotice(); } });
  return operation.promise;
}

export function isTerminalAuthError(error) {
  return new Set(['user_not_found', 'user_banned', 'session_not_found', 'session_expired',
    'refresh_token_not_found', 'refresh_token_already_used', 'bad_jwt']).has(error?.code);
}
