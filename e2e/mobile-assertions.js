import { expect } from "@playwright/test";

export async function expectNoPageOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  expect(
    dimensions.documentWidth,
    `Page-level horizontal overflow: document=${dimensions.documentWidth}px, viewport=${dimensions.viewportWidth}px`,
  ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

export async function expectInsideViewport(locator, viewportWidth) {
  const box = await locator.boundingBox();
  expect(box, "Expected a visible element with a bounding box").not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
}

