import { expect, test } from "@playwright/test";
import { expectInsideViewport, expectNoPageOverflow } from "./mobile-assertions.js";

test("@mobile teacher dashboard contains overflow inside its intended scroller", async ({ page }, testInfo) => {
  const viewportWidth = testInfo.project.metadata.viewportWidth;

  await page.goto("/teacher.html");

  await expect(page).toHaveURL(/\/teacher(?:\.html)?(?:\?.*)?$/);
  await expect(page.locator("#dashboardPanel")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Բարի գալուստ/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Դուրս գալ" })).toBeVisible();

  await expectNoPageOverflow(page);
  await expectInsideViewport(page.locator("#mainContent"), viewportWidth);

  const matrixWrap = page.locator("#matrixWrap");
  if (await matrixWrap.isVisible()) {
    const matrix = await matrixWrap.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX,
    }));

    expect(["auto", "scroll"]).toContain(matrix.overflowX);
    expect(matrix.scrollWidth).toBeGreaterThanOrEqual(matrix.clientWidth);
    await expectInsideViewport(matrixWrap, viewportWidth);
  }

  await page.screenshot({
    path: testInfo.outputPath(`teacher-${viewportWidth}.png`),
    fullPage: true,
  });
});
