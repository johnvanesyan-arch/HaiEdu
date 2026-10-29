import { signOutAccount } from './account-signout.mjs';
export function signOutStudent(supabase) {
  return signOutAccount(supabase, {
    redirect: ['/', '/index.html'].includes(location.pathname) ? undefined : './index.html',
    onSignedOut: () => {
    window.__HAIEDU_DASHBOARD__ = null;
    window.HaiEduCourseAccess = { contexts: [], accessStatus: 'signed_out' };
    try { sessionStorage.removeItem('amp:practice-bootstrap'); } catch { /* optional browser storage */ }
    window.dispatchEvent(new CustomEvent('haiedu-course-access', { detail: window.HaiEduCourseAccess }));
    },
  });
}
