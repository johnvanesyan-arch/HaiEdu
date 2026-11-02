// The first unit also has a primary course-entry link. Choose the chapter-list
// link explicitly so a valid page never produces an ambiguous locator.
export function mobileUnitLink(page, unitId) {
  const selector = `.amp-subject-class-list a[href*="unit=${unitId}"]`;
  const card = page.locator('#mySubjects .amp-subject-card').filter({has: page.locator(selector)});
  return {card, link: card.locator(selector)};
}
