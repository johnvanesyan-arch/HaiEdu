// Teacher account view (T1–T7, 15 November 2026): the teacher's one account entry, inside the teacher layout.
// It reads and writes only the signed-in account through the existing account services. It makes no role or
// authorization decision: the teacher page mounts it after its own role check, and every service checks again.
import {invokeRateAware, rateLimitMessage} from './rate-budget-feedback.mjs';
import {escapeHtml} from './text-safety.mjs';
import {taskPrivacyRows, erasurePresentation} from './task-privacy-view.mjs';
import {authErrorMessage} from './auth-feedback.mjs';
import {AUTH_CHALLENGE} from './auth-challenge-config.mjs';
import {createAuthChallenge} from './auth-challenge.mjs';
import {roleLabel, statusLabel, inventoryPresentation, deletionLabel, rejectionReason,
  normalizeDisplayName, displayNameError, displayNameMessage, DISPLAY_NAME_MAX} from './account-core.mjs';

const SECTIONS = [['teacherAccountIdentity', 'Հաշիվ'], ['teacherAccountLogin', 'Մուտքի տվյալներ'],
  ['teacherAccountPrivacy', 'Գաղտնիություն'], ['teacherAccountDeletion', 'Ջնջման հարցում']];
// Existing generic failure text from the teacher page; service error codes are never shown to the teacher.
const GENERIC_FAILURE = 'Գործողությունը չհաջողվեց։';
const MINIMIZATION = 'Ծննդյան ամսաթիվ, տան հասցե, հեռախոսահամար, ծնողի էլ. հասցե և պետական նույնականացուցիչ այս պրոֆիլում չենք պահում։ Հաշվի էլ. հասցեն պահվում է մուտքի համակարգում։';
// Students see the name on work and materials the teacher sends them; administrators see it in their lists.
const nameAudience = institutional => institutional
  ? 'Անունը տեսնում են ձեր աշակերտները՝ ձեր ուղարկած առաջադրանքներում և նյութերում, ինչպես նաև դպրոցի ադմինը և հարթակի ադմինը։'
  : 'Անունը տեսնում են ձեր աշակերտները՝ ձեր ուղարկած առաջադրանքներում և նյութերում, ինչպես նաև հարթակի ադմինը։';

export function mountTeacherAccount({root, supabase, institutional = true, isCurrent = () => true, onNameSaved = () => {},
  win = window, doc = document}) {
  let alive = true, data = null, loadVersion = 0, confirming = null;
  const pending = new Set();
  const challenge = createAuthChallenge(AUTH_CHALLENGE, {document: doc, window: win});
  const current = version => alive && isCurrent() && (version === undefined || version === loadVersion);
  const q = name => root.querySelector(`[data-testid="${name}"]`);

  async function call(name, body = {}) {
    const {data: payload, error} = await invokeRateAware(supabase, name, {body});
    if (error) throw (rateLimitMessage(error) ? error : new Error(payload?.error || error.message));
    if (payload?.error) throw (rateLimitMessage(payload.error) ? payload.error : new Error(payload.error));
    return payload;
  }
  function message(name, text = '', tone = 'ok') {
    const element = q(name); if (!element) return;
    element.textContent = text; element.dataset.tone = tone; element.hidden = !text;
  }
  const failure = (error, fallback) => rateLimitMessage(error) ?? fallback;
  // One request per action at a time: a second press while the first is pending does nothing.
  async function once(key, button, action) {
    if (pending.has(key)) return;
    pending.add(key); if (button) button.disabled = true;
    try { await action(); } finally { pending.delete(key); if (alive && button?.isConnected) button.disabled = locked(); }
  }
  const locked = () => data?.account?.status === 'deletion_pending';

  const saved = () => ({
    name: data?.account?.displayName || '',
    analytics: data?.preferences?.product_analytics_opt_in === true,
    research: data?.preferences?.research_use_opt_in === true,
  });
  // Unsaved changes are worked out per field against what is saved, so saving one section never hides another's change.
  function hasUnsaved() {
    if (!alive || !data || !q('account-name-input')) return false;
    const now = saved();
    return q('account-name-input').value !== now.name || Boolean(q('account-email-input').value.trim())
      || q('account-privacy-analytics').checked !== now.analytics || q('account-privacy-research').checked !== now.research;
  }
  function discard() {
    if (!data || !q('account-name-input')) return;
    const now = saved();
    q('account-name-input').value = now.name; q('account-email-input').value = '';
    q('account-privacy-analytics').checked = now.analytics; q('account-privacy-research').checked = now.research;
  }

  function loading() {
    root.innerHTML = '<p class="teacher-account-status" role="status">Տվյալները բեռնվում են…</p>';
  }
  function failed() {
    root.innerHTML = `<section class="card teacher-account-card-section" role="alert">
      <p class="teacher-account-status">Հաշվի տվյալները չբեռնվեցին։</p>
      <div class="teacher-account-actions"><button type="button" data-testid="account-retry">Փորձել կրկին</button></div></section>`;
    q('account-retry').addEventListener('click', load);
  }

  function deletionMarkup() {
    const request = data.latestDeletionRequest, state = erasurePresentation(request), reason = rejectionReason(request);
    const confirm = confirming === 'request'
      ? `<div class="teacher-account-confirm" role="alertdialog" aria-labelledby="teacherAccountConfirmTitle" tabindex="-1" data-testid="account-deletion-confirm">
          <strong id="teacherAccountConfirmTitle">Ուղարկե՞լ հաշվի ջնջման հարցում։</strong>
          <p>Այն նախ կստուգվի ադմինի կողմից, և մինչև վերջնական ջնջումը դուք կարող եք չեղարկել հարցումը։</p>
          <div class="teacher-account-actions"><button type="button" class="danger-btn" data-testid="account-deletion-confirm-send">Ուղարկել հարցումը</button><button type="button" class="secondary" data-testid="account-deletion-confirm-back">Վերադառնալ</button></div></div>`
      : confirming === 'cancel'
        ? `<div class="teacher-account-confirm" role="alertdialog" aria-labelledby="teacherAccountConfirmTitle" tabindex="-1" data-testid="account-deletion-confirm">
          <strong id="teacherAccountConfirmTitle">Չեղարկե՞լ հաշվի ջնջման հարցումը։</strong>
          <div class="teacher-account-actions"><button type="button" data-testid="account-deletion-confirm-send">Չեղարկել հարցումը</button><button type="button" class="secondary" data-testid="account-deletion-confirm-back">Վերադառնալ</button></div></div>`
        : '';
    return `<p>Ուսուցչի հաշիվը ջնջելուց առաջ անհրաժեշտ է առանձին ստուգում և դասարանների ու գործերի փոխանցում։ Մինչ այդ հաշիվը մնում է ակտիվ։</p>
      <p class="teacher-account-hint" data-testid="account-deletion-state">${escapeHtml(deletionLabel(request))}</p>
      ${reason ? `<p class="teacher-account-hint" data-testid="account-deletion-reason">${escapeHtml(reason)}</p>` : ''}
      <div class="teacher-account-actions">${state.open
        ? (state.canCancel ? '<button type="button" class="secondary" data-testid="account-deletion-cancel">Չեղարկել հարցումը</button>' : '')
        : '<button type="button" class="secondary teacher-account-danger" data-testid="account-deletion-request">Ուղարկել ջնջման հարցում</button>'}</div>
      ${confirm}<p class="teacher-account-message" data-testid="account-deletion-message" role="status" hidden></p>`;
  }
  function renderDeletion({focus = null} = {}) {
    const body = q('account-deletion-body'); if (!body) return;
    body.innerHTML = deletionMarkup();
    q('account-deletion-request')?.addEventListener('click', () => openConfirm('request'));
    q('account-deletion-cancel')?.addEventListener('click', () => openConfirm('cancel'));
    q('account-deletion-confirm-back')?.addEventListener('click', () => closeConfirm());
    q('account-deletion-confirm-send')?.addEventListener('click', event => sendDeletion(event.currentTarget));
    q('account-deletion-confirm')?.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); closeConfirm(); } });
    if (focus === 'confirm') q('account-deletion-confirm')?.focus();
    if (focus === 'opener') (q('account-deletion-request') || q('account-deletion-cancel'))?.focus();
  }
  // The confirmation is part of the page. It takes keyboard focus when it opens and returns it when it closes.
  function openConfirm(kind) { confirming = kind; renderDeletion({focus: 'confirm'}); }
  function closeConfirm() { confirming = null; renderDeletion({focus: 'opener'}); }
  function sendDeletion(button) {
    const kind = confirming;
    return once('deletion', button, async () => {
      const version = loadVersion;
      try {
        await call('manage-my-privacy', {action: kind === 'request' ? 'request_deletion' : 'cancel_deletion'});
        if (!current(version)) return;
        confirming = null;
        await load({keep: true, focusDeletion: true,
          note: kind === 'request' ? 'Ջնջման հարցումն ուղարկվեց։' : 'Ջնջման հարցումը չեղարկվեց։'});
      } catch (error) {
        if (!current(version)) return;
        message('account-deletion-message', failure(error, GENERIC_FAILURE), 'error');
      }
    });
  }

  function render() {
    const account = data.account, now = saved(), disabled = locked() ? ' disabled' : '';
    const presentation = inventoryPresentation(account.role, data.dataInventory || {});
    const rows = [...presentation.rows, ...taskPrivacyRows(data.dataInventory?.teacherTasks)];
    const status = erasurePresentation(data.latestDeletionRequest).started && account.status === 'deletion_pending'
      ? 'Ջնջումն ընթացքի մեջ է' : statusLabel(account.status);
    root.innerHTML = `
      <nav class="teacher-account-jump" aria-label="Հաշվի բաժիններ">${SECTIONS.map(([id, label]) => `<a href="#${id}" data-account-jump="${id}">${label}</a>`).join('')}</nav>
      <section class="card teacher-account-card-section" id="teacherAccountIdentity" aria-labelledby="teacherAccountIdentityTitle" tabindex="-1" data-testid="account-identity">
        <h2 id="teacherAccountIdentityTitle">Հաշիվ</h2>
        <dl class="teacher-account-summary">
          <div><dt>Էլ. հասցե</dt><dd data-testid="account-email">${escapeHtml(account.email || '—')}</dd></div>
          <div><dt>Դեր</dt><dd data-testid="account-role">${escapeHtml(roleLabel(account.role))}</dd></div>
          <div><dt>Կարգավիճակ</dt><dd data-testid="account-status">${escapeHtml(status)}</dd></div>
        </dl>
        <div class="teacher-account-sub">
          <label class="teacher-account-field" for="teacherAccountName">Ցուցադրվող անունը
            <input id="teacherAccountName" data-testid="account-name-input" maxlength="${DISPLAY_NAME_MAX}" autocomplete="name" required aria-required="true" aria-describedby="teacherAccountNameHint teacherAccountNameError" value="${escapeHtml(now.name)}"${disabled}></label>
          <p class="teacher-account-hint" id="teacherAccountNameHint">2–80 նիշ։ ${nameAudience(institutional)}</p>
          <p class="teacher-account-error" id="teacherAccountNameError" data-testid="account-name-error" role="alert" hidden></p>
          <div class="teacher-account-actions"><button type="button" data-testid="account-name-save"${disabled}>Պահել անունը</button></div>
          <p class="teacher-account-message" data-testid="account-name-message" role="status" hidden></p>
        </div>
      </section>
      <section class="card teacher-account-card-section" id="teacherAccountLogin" aria-labelledby="teacherAccountLoginTitle" tabindex="-1" data-testid="account-login">
        <h2 id="teacherAccountLoginTitle">Մուտքի տվյալներ</h2>
        <form class="teacher-account-sub teacher-account-first" novalidate data-testid="account-email-form">
          <h3>Փոխել մուտքի էլ. հասցեն</h3>
          <p class="teacher-account-hint">Մուտքի հասցեն փոխվում է հաստատման նամակների միջոցով։ Մինչև հաստատելը օգտագործեք ձեր ներկայիս հասցեն։</p>
          <label class="teacher-account-field" for="teacherAccountNewEmail">Նոր էլ. հասցե
            <input id="teacherAccountNewEmail" data-testid="account-email-input" type="email" autocomplete="email" placeholder="name@example.com" aria-describedby="teacherAccountEmailError"${disabled}></label>
          <p class="teacher-account-error" id="teacherAccountEmailError" data-testid="account-email-error" role="alert" hidden></p>
          <div class="teacher-account-actions"><button type="submit" data-testid="account-email-save"${disabled}>Ուղարկել հաստատման նամակ</button></div>
          <p class="teacher-account-message" data-testid="account-email-message" role="status" hidden></p>
        </form>
        <div class="teacher-account-sub">
          <h3>Փոխել գաղտնաբառը</h3>
          <p class="teacher-account-hint">Վերականգնման հղումը կուղարկվի ձեր ներկայիս էլ. հասցեին։ Հղումով սահմանեք նոր գաղտնաբառ։</p>
          <div class="teacher-account-actions"><button type="button" data-testid="account-password-send"${disabled}>Ուղարկել գաղտնաբառի փոփոխման հղումը</button></div>
          <p class="teacher-account-message" data-testid="account-password-message" role="status" hidden></p>
        </div>
      </section>
      <section class="card teacher-account-card-section" id="teacherAccountPrivacy" aria-labelledby="teacherAccountPrivacyTitle" tabindex="-1" data-testid="account-privacy">
        <h2 id="teacherAccountPrivacyTitle">Գաղտնիություն</h2>
        <p class="teacher-account-hint">Այս երկու ընտրությունները լռելյայն անջատված են։ Միացնելը պահում է ձեր համաձայնությունը։ Այս ընտրությունները չեն գործարկում առանձին վերլուծական կամ հետազոտական համակարգ։</p>
        <label class="teacher-account-check"><input type="checkbox" data-testid="account-privacy-analytics"${now.analytics ? ' checked' : ''}${disabled}><span><strong>Ընտրովի արտադրանքի վերլուծություն</strong><small>Թույլատրել ապագայում հաստատված պիլոտային վերլուծության համար ոչ անհրաժեշտ օգտագործումը։</small></span></label>
        <label class="teacher-account-check"><input type="checkbox" data-testid="account-privacy-research"${now.research ? ' checked' : ''}${disabled}><span><strong>Ընտրովի հետազոտական օգտագործում</strong><small>Թույլատրել առանձին հաստատված հետազոտական օգտագործումը՝ համապատասխան ընթացակարգերի դեպքում։</small></span></label>
        <div class="teacher-account-actions"><button type="button" data-testid="account-privacy-save"${disabled}>Պահել ընտրությունները</button></div>
        <p class="teacher-account-message" data-testid="account-privacy-message" role="status" hidden></p>
        <details class="teacher-account-sub" data-testid="account-inventory">
          <summary>${escapeHtml(presentation.title)}</summary>
          <p class="teacher-account-hint">${escapeHtml(presentation.description)}</p>
          <p class="teacher-account-hint">${MINIMIZATION}</p>
          <dl class="teacher-account-inventory">${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
        </details>
      </section>
      <section class="card teacher-account-card-section" id="teacherAccountDeletion" aria-labelledby="teacherAccountDeletionTitle" tabindex="-1" data-testid="account-deletion">
        <h2 id="teacherAccountDeletionTitle">Ջնջման հարցում</h2>
        <div data-testid="account-deletion-body"></div>
      </section>`;
    renderDeletion();
    bind();
  }

  function bind() {
    // A section link moves keyboard focus to its section as well as scrolling to it.
    for (const link of root.querySelectorAll('[data-account-jump]')) link.addEventListener('click', event => {
      event.preventDefault();
      const section = doc.getElementById(link.dataset.accountJump);
      section?.scrollIntoView({block: 'start'}); section?.focus({preventScroll: true});
    });
    // A "saved" message must not stay beside a value that has changed since.
    const clearOnChange = (input, messageName, errorName) => q(input).addEventListener('input', () => {
      message(messageName); if (errorName) { message(errorName); q(input).removeAttribute('aria-invalid'); }
    });
    clearOnChange('account-name-input', 'account-name-message', 'account-name-error');
    clearOnChange('account-email-input', 'account-email-message', 'account-email-error');
    clearOnChange('account-privacy-analytics', 'account-privacy-message');
    clearOnChange('account-privacy-research', 'account-privacy-message');

    q('account-name-save').addEventListener('click', event => once('name', event.currentTarget, async () => {
      const input = q('account-name-input'), displayName = normalizeDisplayName(input.value), invalid = displayNameError(displayName);
      message('account-name-message');
      if (invalid) {
        message('account-name-error', displayNameMessage(invalid), 'error'); input.setAttribute('aria-invalid', 'true'); input.focus();
        return;
      }
      message('account-name-error'); input.removeAttribute('aria-invalid');
      const version = loadVersion;
      try {
        const result = await call('manage-my-privacy', {action: 'update_display_name', displayName});
        if (!current(version)) return;
        const name = result?.profile?.display_name ?? displayName;
        // Keep a newer edit typed while the request was in flight; otherwise show the saved, normalized name.
        if (normalizeDisplayName(input.value) === displayName) input.value = name;
        data.account.displayName = name;
        message('account-name-message', 'Անունը պահպանվեց։');
        onNameSaved(name);
      } catch (error) {
        if (!current(version)) return;
        const text = rateLimitMessage(error) ?? displayNameMessage(error?.message);
        if (displayNameMessage(error?.message)) { message('account-name-error', text, 'error'); input.setAttribute('aria-invalid', 'true'); }
        else message('account-name-message', text ?? 'Չհաջողվեց պահպանել անունը։', 'error');
      }
    }));

    q('account-email-form').addEventListener('submit', event => {
      event.preventDefault();
      return once('email', q('account-email-save'), async () => {
        const input = q('account-email-input'), email = input.value.trim();
        message('account-email-message');
        if (!email || input.validity.typeMismatch || email.toLowerCase() === String(data.account.email ?? '').toLowerCase()) {
          message('account-email-error', 'Մուտքագրեք նոր էլ. հասցե։', 'error'); input.setAttribute('aria-invalid', 'true'); input.focus();
          return;
        }
        message('account-email-error'); input.removeAttribute('aria-invalid');
        message('account-email-message', 'Հաստատման նամակն ուղարկվում է…');
        const version = loadVersion;
        try {
          const {error} = await supabase.auth.updateUser({email}, {emailRedirectTo: `${win.location.origin}/account-access`});
          if (!current(version)) return;
          if (error) throw error;
          if (input.value.trim() === email) input.value = '';
          message('account-email-message', 'Ստուգեք նոր և ներկայիս էլ. հասցեների փոստարկղերը և հաստատեք փոփոխությունը։ Մինչ այդ մուտք գործեք ներկայիս հասցեով։');
        } catch (error) {
          if (!current(version)) return;
          message('account-email-message', rateLimitMessage(error) ?? authErrorMessage(error, 'email'), 'error');
        }
      });
    });

    q('account-password-send').addEventListener('click', event => once('password', event.currentTarget, async () => {
      const button = event.currentTarget, version = loadVersion;
      message('account-password-message', 'Հղումն ուղարկվում է…');
      let taken;
      try {
        // The bot-protection bar appears here on the first press, as on the shared account page (BF-15).
        challenge.mount(q('account-password-message').parentElement, q('account-password-message'));
        taken = challenge.take();
        const {data: userData, error: userError} = await supabase.auth.getUser();
        if (!current(version)) return;
        if (userError || !userData.user?.email) throw userError || new Error('Մուտքի էլ. հասցեն չի գտնվել։');
        const {error} = await supabase.auth.resetPasswordForEmail(userData.user.email, {
          redirectTo: `${win.location.origin}/account-access`, ...(taken.token ? {captchaToken: taken.token} : {}),
        });
        if (!current(version)) return;
        if (error) throw error;
        message('account-password-message', 'Հղումն ուղարկվեց ձեր ընթացիկ էլ. հասցեին։ Ստուգեք վերջին նամակը։');
      } catch (error) {
        if (!current(version)) return;
        message('account-password-message', rateLimitMessage(error) ?? authErrorMessage(error, 'reset'), 'error');
      } finally { taken?.finish(); }
    }));

    q('account-privacy-save').addEventListener('click', event => once('privacy', event.currentTarget, async () => {
      const productAnalytics = q('account-privacy-analytics').checked, researchUse = q('account-privacy-research').checked, version = loadVersion;
      try {
        await call('manage-my-privacy', {action: 'save_preferences', productAnalytics, researchUse});
        if (!current(version)) return;
        data.preferences = {...data.preferences, product_analytics_opt_in: productAnalytics, research_use_opt_in: researchUse};
        message('account-privacy-message', 'Ընտրությունները պահպանվեցին։');
      } catch (error) {
        if (!current(version)) return;
        message('account-privacy-message', failure(error, GENERIC_FAILURE), 'error');
      }
    }));
  }

  // keep: reload after a deletion action without discarding what the teacher has typed in the other sections.
  async function load({keep = false, focusDeletion = false, note = ''} = {}) {
    const version = ++loadVersion;
    const typed = keep && q('account-name-input') ? {name: q('account-name-input').value, email: q('account-email-input').value,
      analytics: q('account-privacy-analytics').checked, research: q('account-privacy-research').checked} : null;
    if (!keep) { data = null; confirming = null; loading(); }
    try {
      const fresh = await call('get-my-privacy');
      if (!current(version)) return;
      data = fresh; render();
      if (typed) {
        q('account-name-input').value = typed.name; q('account-email-input').value = typed.email;
        q('account-privacy-analytics').checked = typed.analytics; q('account-privacy-research').checked = typed.research;
      }
      if (note) message('account-deletion-message', note);
      if (focusDeletion) (q('account-deletion-cancel') || q('account-deletion-request'))?.focus();
    } catch {
      if (!current(version)) return;
      if (keep && data) { message('account-deletion-message', 'Հաշվի տվյալները չբեռնվեցին։', 'error'); return; }
      data = null; failed();
    }
  }

  void load();
  const dispose = () => { alive = false; loadVersion++; challenge.destroy(); root.replaceChildren(); };
  dispose.hasUnsaved = hasUnsaved;
  dispose.discard = discard;
  return dispose;
}
