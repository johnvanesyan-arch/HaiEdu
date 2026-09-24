// Navigation only. Server-side authorization remains the source of truth.
const destinations = Object.freeze({
  student: "./index.html",
  teacher: "./teacher.html",
  school_admin: "./school-admin",
  content_admin: "./content.html",
  admin: "./admin.html",
});

export function roleDestination(role) {
  return Object.hasOwn(destinations, role) ? destinations[role] : null;
}

export function studentDestination(search = "") {
  const params = new URLSearchParams(search);
  const code = params.get("code")?.trim().toUpperCase() ?? "";
  if (params.get("next") === "join")
    return /^[A-Z0-9]{8}$/.test(code) ? `./join.html?code=${code}` : "./join.html";
  return destinations.student;
}
