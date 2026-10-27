// Reuse the existing Supabase signout and per-page auth listeners.
// The two visible entry points share one pending request.
let pending = null;
export function signOutStudent(supabase) {
  if (pending) return pending;
  const controls = [...document.querySelectorAll('#signOutBtn, [data-student-signout]')];
  const states = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  pending = (async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    // A new login can arrive while a remote signout finishes. Its listeners own
    // the new account; never clear or redirect that newer authenticated state.
    const current = await supabase.auth.getSession();
    if (current.data?.session) return false;
    window.__HAIEDU_DASHBOARD__ = null;
    window.HaiEduCourseAccess = { contexts: [], accessStatus: 'signed_out' };
    try { sessionStorage.removeItem('amp:practice-bootstrap'); } catch { /* optional browser storage */ }
    window.dispatchEvent(new CustomEvent('haiedu-course-access', { detail: window.HaiEduCourseAccess }));
    if (!['/', '/index.html'].includes(location.pathname)) location.replace('./index.html');
    return true;
  })().catch(() => {
    let message = document.getElementById('studentSignOutMessage');
    if (!message) {
      message = document.createElement('p'); message.id = 'studentSignOutMessage';
      message.setAttribute('role', 'alert');
      document.querySelector('main')?.prepend(message);
    }
    message.textContent = 'Չհաջողվեց դուրս գալ։ Ստուգեք կապը և փորձեք նորից։';
    return false;
  }).finally(() => {
    controls.forEach((control, index) => { control.disabled = states[index]; });
    pending = null;
  });
  return pending;
}
