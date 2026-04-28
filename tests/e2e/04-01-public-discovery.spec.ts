import { Cookie, expect, test } from "@playwright/test";
import {
  createTestCourseWithAssignedInstructor,
  logUserIn,
  provisionFreshEmailUser,
} from "./utils.js";

test.describe("4.1 public discovery", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("[4.2][STD-AUTH-001] existing user can log in through translated login form", async ({ page }) => {
    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/",
    });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('input[name="email"]')).toHaveCount(0);
    await expect(page.getByTestId("landing-schools-section")).toBeVisible();
  });

  test("[4.1][STD-PUB-001][STD-PUB-002][STD-PUB-003A] anonymous users can see schools and courses on landing", async ({ page }) => {
    await expect(page.getByTestId("landing-schools-section")).toBeVisible();
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();
    const schoolCards = await page.getByTestId("landing-school-card").count();
    await expect(page.getByTestId("landing-school-logo")).toHaveCount(schoolCards);
    await expect(page.getByTestId("landing-course-item").first()).toBeVisible();
    await expect(page.getByTestId("landing-school-manager-contact-item")).toHaveCount(0);
    await expect(page.getByTestId("landing-course-instructor-contact-item")).toHaveCount(0);
  });

  test("[4.1][STD-PUB-003B] logged in users can see schools and courses on landing", async ({ page }) => {
    const { manager } = await createTestCourseWithAssignedInstructor();
    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });
    await expect(page.getByTestId("landing-schools-section")).toBeVisible();
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();
    await expect(page.getByTestId("landing-course-item").first()).toBeVisible();
    await expect(page.getByTestId("landing-school-manager-contact-item").first()).toBeVisible();
    await expect(page.getByTestId("landing-course-instructor-contact-item").first()).toBeVisible();
  });

  test("[4.1][STD-PUB-002A] landing course cards show total course price", async ({ page }) => {
    const tandemCourseCard = page
      .getByTestId("landing-course-item")
      .filter({ has: page.getByText("Tandem Flights v1") })
      .first();

    await expect(tandemCourseCard).toBeVisible();
    await expect(tandemCourseCard).toContainText("Total price: 240");
  });

  test("[4.1][STD-PUB-004] school card renders school name and location text", async ({ page }) => {
    const schoolCard = page.getByTestId("landing-school-card").first();
    await expect(schoolCard).toBeVisible();

    const schoolNameText = (await schoolCard.locator("h2").first().textContent())?.trim() ?? "";
    expect(schoolNameText.length).toBeGreaterThan(0);

    const locationText = (await schoolCard.locator("p").first().textContent())?.trim() ?? "";
    expect(locationText).toContain(",");
  });

  test("[4.1][STD-PUB-005][STD-PUB-006] landing remains stable when a school has no website and no logo", async ({ page }) => {
    const { schoolName } = await createTestCourseWithAssignedInstructor();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const schoolCard = page.getByTestId("landing-school-card").filter({ hasText: schoolName }).first();
    await expect(schoolCard).toBeVisible();

    await expect(schoolCard.locator("img")).toHaveCount(0);
    await expect(schoolCard.getByRole("link", { name: /website/i })).toHaveCount(0);
    await expect(schoolCard.getByTestId("landing-course-item").first()).toBeVisible();
  });

  test("[4.1][STD-PUB-007][STD-PUB-010] course name filter shows only matching courses", async ({ page }) => {
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    const filterInput = page.getByTestId("filter-course-name");
    await expect(filterInput).toBeVisible();

    await filterInput.fill("Tandem");
    // "Tandem Flights" course should be visible; auto-retrying assertion replaces waitForTimeout
    const courseItems = page.getByTestId("landing-course-item");
    const visibleItems = await courseItems.all();
    for (const item of visibleItems) {
      await expect(item).toContainText("Tandem");
    }

    // At least one result, and "Paragliding Intro" should not appear
    await expect(courseItems.first()).toBeVisible();
    await expect(page.getByText("Paragliding Intro v1")).not.toBeVisible();
  });

  test("[4.1][STD-PUB-009][STD-PUB-010] country dropdown filters schools by country", async ({ page }) => {
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    const dropdown = page.getByTestId("filter-country");
    await expect(dropdown).toBeVisible();

    // Default "all" shows cards
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    // Selecting the seeded country "US" still shows the card
    await dropdown.selectOption("US");
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    // Selecting a country that has no schools hides all cards
    await dropdown.selectOption("__none__");
    await expect(page.getByTestId("landing-school-card")).toHaveCount(0, { timeout: 5000 });
  });

  test("[4.1][STD-PUB-008][STD-PUB-010] location filter shows only matching schools", async ({ page }) => {
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    const filterInput = page.getByTestId("filter-location");
    await expect(filterInput).toBeVisible();

    // Filtering by seeded school's city: Boulder
    await filterInput.fill("Boulder");
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible({ timeout: 5000 });

    // Filtering by nonsense hides all schools
    await filterInput.fill("XYZNonExistentCity99");
    await expect(page.getByTestId("landing-school-card")).toHaveCount(0, { timeout: 5000 });
  });

  test("[4.1][STD-PUB-011] empty-result message is shown when filters yield no schools", async ({ page }) => {
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    const filterInput = page.getByTestId("filter-location");
    await filterInput.fill("XYZNonExistentCity99");

    await expect(page.getByTestId("landing-school-card")).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByText("No schools or courses match your filters.")).toBeVisible();
    await expect(page.getByTestId("landing-schools-section")).toBeVisible();
  });

  test("[4.1][STD-NAV-012] narrow landing menu opens from the hamburger side and exposes theme/language controls", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 960 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const menuTrigger = page.getByRole("button", { name: /open main menu/i });
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();

    // Keep the landing hamburger visible and usable as a close toggle while sheet is open.
    const openStateToggle = page.getByTestId("landing-mobile-menu-toggle-open");
    await expect(openStateToggle).toBeVisible();

    const sheetGeometry = await page.evaluate(() => {
      const dialog = document.querySelector("[data-slot='sheet-content']") as HTMLElement | null;
      if (!dialog) return null;
      const rect = dialog.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, viewport: window.innerWidth };
    });

    expect(sheetGeometry).not.toBeNull();
    expect(sheetGeometry!.left).toBeLessThanOrEqual(2);
    expect(sheetGeometry!.right).toBeLessThan(sheetGeometry!.viewport);

    await expect(page.locator("[data-slot='sheet-content'] [role='combobox']").first()).toBeVisible();
    await expect(page.locator("[data-slot='sheet-content'] input[type='checkbox']").first()).toBeVisible();

    const topBarGeometry = await page.evaluate(() => {
      const toggle = document.querySelector("[data-testid='landing-mobile-menu-toggle-open']") as HTMLElement | null;
      const sheet = document.querySelector("[data-slot='sheet-content']") as HTMLElement | null;
      if (!toggle || !sheet) {
        return null;
      }

      const logo = sheet.querySelector("img[alt='Flight Club']") as HTMLElement | null;
      if (!logo) {
        return null;
      }

      const toggleRect = toggle.getBoundingClientRect();
      const logoRect = logo.getBoundingClientRect();

      const overlaps = !(
        toggleRect.right <= logoRect.left ||
        toggleRect.left >= logoRect.right ||
        toggleRect.bottom <= logoRect.top ||
        toggleRect.top >= logoRect.bottom
      );

      return { overlaps };
    });

    expect(topBarGeometry).not.toBeNull();
    expect(topBarGeometry!.overlaps).toBe(false);

    await openStateToggle.click();
    await expect(page.locator("[data-slot='sheet-content']")).toHaveCount(0);
  });

  test.skip("[template-relic] get started link", async ({ page }) => {
    await page.getByRole("link", { name: "Get started" }).click();
    await page.waitForURL("**/signup");
  });

  test.skip("[template-relic] headings", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Frequently asked questions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Some cool words" }),
    ).toBeVisible();
  });
});

test.describe("4.1 public discovery - cookie consent", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("[non-prd] cookie consent banner rejection does not set cc_cookie", async ({
    context,
    page,
  }) => {
    await page.$$('button:has-text("Reject all")');
    await page.click('button:has-text("Reject all")');

    const cookies = await context.cookies();
    const consentCookie = cookies.find((c) => c.name === "cc_cookie");
    const cookieObject = JSON.parse(decodeURIComponent(consentCookie.value));
    expect(cookieObject.categories.includes("analytics")).toBeFalsy();
  });

  test.skip("[template-relic] cookie consent banner acceptance sets cc_cookie and _ga cookies", async ({
    context,
    page,
  }) => {
    await page.$$('button:has-text("Accept all")');
    await page.click('button:has-text("Accept all")');

    let cookies = await context.cookies();
    const consentCookie = cookies.find((c) => c.name === "cc_cookie");
    const cookieObject = JSON.parse(decodeURIComponent(consentCookie.value));
    // Check that the Cookie Consent cookie is set. This should happen immediately, and then the GA cookies will get set after it, dynamically.
    expect(cookieObject.categories.includes("analytics")).toBeTruthy();

    const areGaCookiesSet = (cookies: Cookie[]) => {
      const gaCookiesArr = cookies.filter((c) => c.name.startsWith("_ga"));
      return gaCookiesArr.length === 2; // GA cookies are _ga and _ga_<GA_ANALYTICS_ID>
    };

    const startTime = Date.now();
    const MAX_TIME_MS = 10000;
    let timeElapsed = 0;

    while (!areGaCookiesSet(cookies) && timeElapsed < MAX_TIME_MS) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // wait for 1 second before checking again
      cookies = await context.cookies();
      timeElapsed = Date.now() - startTime;
    }

    expect(timeElapsed).toBeLessThan(MAX_TIME_MS);
  });
});
