// This is a QA browser guard, not application authorization.
export function allowedBrowserManagement(fn, body, { classes, memberships }) {
  if (body?.action === 'list' && ['manage-student-invitation', 'manage-staff-invitation', 'manage-school-academic-year'].includes(fn)) return true;
  if (fn === 'manage-institutional-teacher-class' && ['rename', 'archive', 'activate'].includes(body?.action)) {
    return classes.some(c => c.id && c.id === body.classId);
  }
  if (fn === 'manage-school-teacher' && ['preview_offboard', 'offboard'].includes(body?.action)) {
    return memberships.some(m => m.id && m.id === body.membershipId && m.schoolId === body.schoolId && !m.originalIds.includes(m.id));
  }
  return false;
}
