import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function releaseMetadata(environment = process.env) {
  const commit = environment.VERCEL_GIT_COMMIT_SHA || environment.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/i.test(commit ?? "")) {
    throw new Error("A full Git commit SHA is required to identify the deployed release.");
  }
  return { schemaVersion: 1, commit: commit.toLowerCase() };
}

export async function stampRelease(output = resolve("web/release.json"), environment = process.env) {
  const metadata = releaseMetadata(environment);
  await writeFile(output, `${JSON.stringify(metadata)}\n`, "utf8");
  return metadata;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const metadata = await stampRelease();
    console.log(`Frontend release: ${metadata.commit}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
