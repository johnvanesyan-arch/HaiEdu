import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const icoPath = path.join(root, "web", "favicon.ico");
const svgPath = path.join(root, "web", "assets", "haiedu-icon.svg");
const uxPath = path.join(root, "web", "ux.js");
const shellPath = path.join(root, "web", "student-shell.js");

await Promise.all([access(icoPath), access(svgPath), access(uxPath), access(shellPath)]);

const icoBytes = await readFile(icoPath);
if (icoBytes.length < 100 || icoBytes[0] !== 0 || icoBytes[1] !== 0 || icoBytes[2] !== 1 || icoBytes[3] !== 0) {
  throw new Error("web/favicon.ico is missing or is not a valid ICO file.");
}

const svg = await readFile(svgPath, "utf8");
if (!svg.includes("<svg") || !svg.includes("viewBox")) {
  throw new Error("web/assets/haiedu-icon.svg is missing or malformed.");
}

const [ux, shell] = await Promise.all([
  readFile(uxPath, "utf8"),
  readFile(shellPath, "utf8"),
]);
const canonical = "/assets/haiedu-icon.svg?v=20260928";
if (!ux.includes(canonical) || !shell.includes(canonical)) {
  throw new Error("The shared browser shells are not pointing at the canonical HaiEdu favicon.");
}

console.log("HaiEdu favicon guard passed: root ICO fallback and shared SVG favicon are present.");
