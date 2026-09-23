import { expect, test } from "@playwright/test";
import { expectInsideViewport, expectNoPageOverflow } from "./mobile-assertions.js";

test("@mobile learner Physics 7 remains usable without page overflow", async ({ page }, testInfo) => {
  const viewportWidth = testInfo.project.metadata.viewportWidth;

  await page.goto("/physics-7.html");

  await expect(page).toHaveURL(/\/physics-7(?:\.html)?(?:\?.*)?$/);
  await expect(page.locator("#subjectPanel")).toBeVisible();
  await expect(page.locator("#subjectLoading")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Իմ ֆիզիկայի ուղին" })).toBeVisible();
  await expect(page.getByText("Յուրացման ստուգում", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Դուրս գալ" })).toBeVisible();

  await expectNoPageOverflow(page);
  await expectInsideViewport(page.locator("#mainContent"), viewportWidth);

  const activeSessionBanner = page.locator("#activeSessionBanner");
  if (await activeSessionBanner.isVisible()) {
    await expectInsideViewport(activeSessionBanner, viewportWidth);
    await expect(activeSessionBanner.getByRole("link")).toBeVisible();
  }

  await page.screenshot({
    path: testInfo.outputPath(`learner-${viewportWidth}.png`),
    fullPage: true,
  });
});
