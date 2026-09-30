const SCHOOL_MEMBERSHIP_STATES = Object.freeze({
  active: Object.freeze({ key: "active", label: "Ակտիվ այս դպրոցում" }),
  archived: Object.freeze({ key: "archived", label: "Արխիվացված այս դպրոցում" }),
  ended: Object.freeze({ key: "ended", label: "Անդամակցությունն ավարտված է" }),
});

export function schoolMembershipStatus(status) {
  if (status === "active") return SCHOOL_MEMBERSHIP_STATES.active;
  if (status === "archived") return SCHOOL_MEMBERSHIP_STATES.archived;
  return SCHOOL_MEMBERSHIP_STATES.ended;
}

export function schoolMembershipLabel(status) {
  return schoolMembershipStatus(status).label;
}
