import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const requiredJobs = ["test", "role-layout-browser", "institutional-concurrency", "phase3-postgres-17"];

export function assertReleaseReady(results) {
  if (!results || typeof results !== "object" || Array.isArray(results)) {
    throw new Error("Release job results must be an object.");
  }
  const failures = requiredJobs.filter((name) => !Object.hasOwn(results, name)).map((name) => `${name}: missing`);
  for (const [name, job] of Object.entries(results)) {
    if (job?.result !== "success") failures.push(`${name}: ${job?.result ?? "missing result"}`);
  }
  if (failures.length) throw new Error(`Release blocked: ${failures.join("; ")}`);
  return true;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assertReleaseReady(JSON.parse(process.env.RELEASE_JOB_RESULTS ?? "null"));
    console.log("All required platform checks passed.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
