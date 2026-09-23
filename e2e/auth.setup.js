import { expect, test as setup } from "@playwright/test";
import fs from "node:fs/promises";

const authDirectory = "playwright/.auth";

function requireSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function authenticate(page, { path, email, password, expectedPath }) {
  await page.goto(path);
  await page.getByRole("textbox", { name: "Էլ. հասցե" }).fill(email);
  await page.getByRole("textbox", { name: "Գաղտնաբառ" }).fill(password);
  await page.getByRole("button", { name: "Մուտք գործել", exact: true }).click();

  await expect(page).toHaveURL(expectedPath);
  await expect(page.getByRole("button", { name: "Դուրս գալ" })).toBeVisible();
}

setup.beforeAll(async () => {
  await fs.mkdir(authDirectory, { recursive: true });
});

setup("authenticate learner", async ({ page }) => {
  await authenticate(page, {
    path: "/",
    email: requireSecret("QA_LEARNER_EMAIL"),
    password: requireSecret("QA_LEARNER_PASSWORD"),
    expectedPath: /\/(?:index\.html)?(?:\?.*)?$/,
  });

  await page.context().storageState({ path: `${authDirectory}/learner.json` });
});

setup("authenticate teacher", async ({ page }) => {
  await authenticate(page, {
    path: "/teacher.html",
    email: requireSecret("QA_TEACHER_EMAIL"),
    password: requireSecret("QA_TEACHER_PASSWORD"),
    expectedPath: /\/teacher(?:\.html)?(?:\?.*)?$/,
  });

  await page.context().storageState({ path: `${authDirectory}/teacher.json` });
});
