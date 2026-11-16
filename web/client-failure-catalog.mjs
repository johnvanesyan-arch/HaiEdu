// Read only fixed, own data properties. Never traverse or serialize a body.
const own = (object, key) => Object.getOwnPropertyDescriptor(object ?? {}, key)?.value;
const readRoutes = new Set(['get-admin-dashboard','get-student-dashboard','get-teacher-dashboard','get-teacher-workspace','get-student-classes','get-student-work','get-school-admin-overview','get-school-performance-analytics','get-school-teachers','get-school-subject-options','get-teacher-academic-context','get-teacher-student','get-content-quality-dashboard','get-content-review-history','get-pilot-item-analytics']);
const learningRoutes = new Set(['get-chapter-mastery-lifecycle','get-learning-context','get-learning-task-set','get-mastery-check-status','get-practice-item','get-remediation-help','get-session-item','get-unit-guides','start-learning-session','get-student-onboarding-options']);
const adminRoutes = new Set(['accept-staff-account','bootstrap-school','complete-student-invitation','get-my-privacy','join-class','manage-admin-account','manage-institutional-invitation','manage-institutional-membership','manage-institutional-teacher-class','manage-my-privacy','manage-school-academic-year','manage-school-teacher','manage-staff-invitation','manage-student-invitation','manage-teacher-class','manage-teacher-profile','manage-teacher-subject','provision-staff-account','provision-student-account','redeem-institutional-invitation']);
const contentRoutes = new Set(['manage-content-quality','manage-misconception-reviews','manage-remediation-guides','manage-unit-materials']);
export function failureOperation(route, options) {
  try {
    if (readRoutes.has(route)) return 'dashboard_load';
    if (learningRoutes.has(route)) return 'learning_load';
    if (adminRoutes.has(route)) return 'admin_action';
    if (contentRoutes.has(route)) return 'content_action';
    const body = own(options, 'body'), action = own(body, 'action');
    if (['submit-answer','submit-mastery-answer'].includes(route)) return own(body, 'saveDraft') === true ? 'draft_save' : 'answer_submit';
    if (route === 'get-learning-audio') return 'audio_load';
    if (route === 'manage-written-work') return action === 'save' ? 'draft_save' : action === 'submit' ? 'writing_submit' : 'learning_load';
    if (route === 'manage-teacher-feedback') return action === 'publish' ? 'feedback_publish' : action === 'save_draft' ? 'draft_save' : 'learning_load';
    if (['manage-resource-assignments','manage-writing-assignments','manage-teacher-task-delivery'].includes(route)) return 'assignment_send';
    if (['manage-teacher-task-sources','manage-teacher-task-student-files','manage-teacher-task-review-files','manage-supplementary-resources'].includes(route)) return 'file_load';
    if (['manage-teacher-task-drafts','manage-teacher-task-review','manage-teacher-task-student-work'].includes(route)) return 'draft_save';
    // Recommendation analytics and the collector itself never report recursively.
    return null;
  } catch { return null; }
}
export function failurePage(path) {
  const page = String(path).replace(/\.html$/, '').replace(/\/$/, '') || '/index';
  if (page === '/account-access' || page === '/admin-security') return 'account';
  if (page === '/admin') return 'master_admin';
  if (page === '/school-admin') return 'school_admin';
  if (['/teacher','/school-teacher'].includes(page)) return 'teacher';
  if (/^\/content(?:-[a-z-]+)?$/.test(page)) return 'content';
  if (['/index','/course','/diagnostic','/practice','/mastery','/materials','/physics-7','/progress','/join','/resource-library','/assessment','/privacy'].includes(page)) return 'student';
  return 'other';
}
export function failureCategory(result, thrown) {
  try {
    const error = thrown ?? result?.error;
    if (error?.name === 'AbortError') return null;
    const status = Number(error?.context?.status ?? result?.response?.status ?? error?.status ?? 0);
    if (status >= 500 && status <= 599) return {category:'service_failure', status};
    if (error && !status) return {category:'request_failed', status:0};
    // Known validation, permission, conflict and throttling replies are handled
    // by the caller. Their arbitrary text is neither read nor sent here.
    if (status >= 400) return null;
    if (result?.data?.error) return {category:'invalid_response', status:status || 200};
    return null;
  } catch { return null; }
}
