import { mkdir, readFile, writeFile } from "node:fs/promises";

const reportPath = "qa-results/sprint-15a3-authenticated.json";
const config = await readFile(new URL("../web/config.js", import.meta.url), "utf8");
const supabaseUrl = config.match(/export const SUPABASE_URL = \"([^\"]+)\"/)?.[1];
const publishableKey = config.match(/export const SUPABASE_PUBLISHABLE_KEY = \"([^\"]+)\"/)?.[1];
const email = process.env.QA_SCHOOL_A_ADMIN_EMAIL;
const password = process.env.QA_SCHOOL_A_ADMIN_PASSWORD;
const report = {
  scope: "Sprint 15A.3 authenticated negative authorization",
  revision: process.env.GITHUB_SHA ?? "local",
  startedAt: new Date().toISOString(),
  status: "running",
  checks: [],
};

function check(label, passed, httpStatus, errorCode) {
  report.checks.push({
    label,
    status: passed ? "passed" : "failed",
    ...(httpStatus === undefined ? {} : { httpStatus }),
    ...(errorCode ? { errorCode } : {}),
  });
  if (!passed) throw new Error(label);
}

async function json(response) {
  return response.json().catch(() => null);
}

async function invoke(token) {
  const response = await fetch(`${supabaseUrl}/functions/v1/manage-remediation-guides`, {
    method: "POST",
    redirect: "error",
    headers: {
      apikey: publishableKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "list" }),
    signal: AbortSignal.timeout(25000),
  });
  return { status: response.status, data: await json(response) };
}

async function signIn() {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    redirect: "error",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(25000),
  });
  const data = await json(response);
  check("QA School Admin sign-in", response.status === 200 && Boolean(data?.access_token), response.status);
  return data.access_token;
}

async function signOut(token) {
  const response = await fetch(`${supabaseUrl}/auth/v1/logout?scope=local`, {
    method: "POST",
    redirect: "error",
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(25000),
  });
  check("QA session revoked", response.status === 204, response.status);
}

try {
  check("Supabase public configuration present", Boolean(supabaseUrl && publishableKey));
  check("QA School Admin credentials configured", Boolean(email && password));

  const anonymous = await invoke();
  check(
    "Anonymous request denied",
    [401, 403].includes(anonymous.status),
    anonymous.status,
    anonymous.data?.error,
  );

  const token = await signIn();
  const wrongRole = await invoke(token);
  check(
    "Authenticated School Admin cannot access Content Reviewer API",
    wrongRole.status === 403 && wrongRole.data?.error === "content_authoring_role_required",
    wrongRole.status,
    wrongRole.data?.error,
  );

  await signOut(token);
  const stale = await invoke(token);
  check(
    "Revoked session token denied",
    (stale.status === 403 && stale.data?.error === "account_or_session_inactive")
      || (stale.status === 401 && stale.data?.error === "unauthorized"),
    stale.status,
    stale.data?.error,
  );

  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.failure = error instanceof Error ? error.message : "unknown_failure";
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.filter((entry) => entry.status === "passed").length;
  report.total = report.checks.length;
  await mkdir("qa-results", { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Sprint 15A.3 authenticated QA: ${report.status} (${report.passed}/${report.total})`);
}
