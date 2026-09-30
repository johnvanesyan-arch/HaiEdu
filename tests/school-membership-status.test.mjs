import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { schoolMembershipLabel, schoolMembershipStatus } from "../web/school-membership-status.js";

const read = (path) => readFileSync(path, "utf8");

test("school membership labels have one platform-wide meaning", () => {
  assert.deepEqual(schoolMembershipStatus("active"), { key: "active", label: "Ակտիվ այս դպրոցում" });
  assert.deepEqual(schoolMembershipStatus("archived"), { key: "archived", label: "Արխիվացված այս դպրոցում" });
  assert.equal(schoolMembershipLabel("ended"), "Անդամակցությունն ավարտված է");
  assert.equal(schoolMembershipLabel("revoked"), "Անդամակցությունն ավարտված է");
  assert.equal(schoolMembershipLabel(undefined), "Անդամակցությունն ավարտված է");
});

test("school admin separates membership status from global account status", () => {
  const code = read("web/school-admin.js");
  assert.match(code, /schoolMembershipStatus\(teacher\.membership_status\)/);
  assert.match(code, /appendRosterHistory/);
  assert.match(code, /Նախկին ուսուցիչներ · ավարտված անդամակցություններ/);
  assert.doesNotMatch(code, /Մուտքը դադարեցված է/);
});

test("master admin distinguishes global account state from school membership state", () => {
  const code = read("web/admin.js");
  const html = read("web/admin.html");
  assert.match(code, /schoolStatusMarkup/);
  assert.match(code, /schoolMembershipStatus\(user\?\.membershipStatus\)/);
  assert.match(html, /Հաշվի կարգավիճակ/);
});
