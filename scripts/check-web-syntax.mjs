import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

async function javascriptFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(path);
  }
  return files.sort();
}

const files = await javascriptFiles(resolve("web"));
if (!files.length) throw new Error("No browser JavaScript files found.");
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Checked syntax of all ${files.length} browser JavaScript files.`);
