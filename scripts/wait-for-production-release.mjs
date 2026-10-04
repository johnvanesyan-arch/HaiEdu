import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function waitForRelease({
  expectedCommit,
  url = "https://www.haiedu.am/release.json",
  timeoutMs = 10 * 60 * 1000,
  pollIntervalMs = 5000,
  requestTimeoutMs = 10000,
  fetchImpl = globalThis.fetch,
  now = Date.now,
  delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds)),
  log = console.log,
} = {}) {
  if (!/^[a-f0-9]{40}$/i.test(expectedCommit ?? "")) throw new Error("A full expected Git commit SHA is required.");
  for (const [name, value] of Object.entries({ timeoutMs, pollIntervalMs, requestTimeoutMs })) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  }
  const expected = expectedCommit.toLowerCase();
  const endpoint = new URL(url);
  const deadline = now() + timeoutMs;
  let observation = "no response";
  let reported;
  while (now() < deadline) {
    endpoint.searchParams.set("release_probe", String(now()));
    try {
      const response = await fetchImpl(endpoint, {
        cache: "no-store",
        redirect: "error",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(Math.max(1, Math.min(requestTimeoutMs, deadline - now()))),
      });
      if (!response.ok) observation = `HTTP ${response.status}`;
      else {
        const metadata = await response.json();
        if (now() >= deadline) {
          observation = "release probe exceeded its deadline";
        } else if (metadata?.schemaVersion !== 1 || !/^[a-f0-9]{40}$/i.test(metadata?.commit ?? "")) {
          observation = "invalid release metadata";
        } else if (metadata.commit.toLowerCase() === expected) {
          log(`Production frontend matches ${expected}.`);
          return metadata;
        } else observation = `different frontend commit ${metadata.commit.toLowerCase()}`;
      }
    } catch (error) {
      observation = `request failed (${error.name})`;
    }
    if (observation !== reported) {
      log(`Waiting for frontend ${expected}: ${observation}.`);
      reported = observation;
    }
    const remaining = deadline - now();
    if (remaining > 0) await delay(Math.min(pollIntervalMs, remaining));
  }
  throw new Error(`Production frontend did not match ${expected} within ${timeoutMs}ms; ${observation}. Live QA was not started.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await waitForRelease({ expectedCommit: process.env.GITHUB_SHA });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
