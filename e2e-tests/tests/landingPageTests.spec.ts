import { Cookie, expect, test } from "@playwright/test";

test.describe("general landing page tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has title", async ({ page }) => {
    await expect(page).toHaveTitle(/SaaS/);
  });

  test("existing seeded user can log in through translated login form", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "seed+school_manager.01@example.test");
    await page.fill('input[name="password"]', "12345678");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("school_manager_01")).toBeVisible();
  });

  test("anonymous users can see schools and courses on landing", async ({ page }) => {
    await expect(page.getByTestId("landing-schools-section")).toBeVisible();
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();
    const schoolCards = await page.getByTestId("landing-school-card").count();
    await expect(page.getByTestId("landing-school-logo")).toHaveCount(schoolCards);
    await expect(page.getByTestId("landing-course-item").first()).toBeVisible();
  });

  test("logged in users can see schools and courses on landing", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "seed+school_manager.01@example.test");
    await page.fill('input[name="password"]', "12345678");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("landing-schools-section")).toBeVisible();
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();
    await expect(page.getByTestId("landing-course-item").first()).toBeVisible();
  });

  test("course name filter shows only matching courses", async ({ page }) => {
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    const filterInput = page.getByTestId("filter-course-name");
    await expect(filterInput).toBeVisible();

    await filterInput.fill("Tandem");
    await page.waitForTimeout(200);

    // "Tandem Flights" course should be visible
    const courseItems = page.getByTestId("landing-course-item");
    const visibleItems = await courseItems.all();
    for (const item of visibleItems) {
      await expect(item).toContainText("Tandem");
    }

    // At least one result, and "Paragliding Intro" should not appear
    await expect(courseItems.first()).toBeVisible();
    await expect(page.getByText("Paragliding Intro v1")).not.toBeVisible();
  });

  test("country dropdown filters schools by country", async ({ page }) => {
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    const dropdown = page.getByTestId("filter-country");
    await expect(dropdown).toBeVisible();

    // Default "all" shows cards
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    // Selecting the seeded country "US" still shows the card
    await dropdown.selectOption("US");
    await page.waitForTimeout(200);
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    // Selecting a country that has no schools hides all cards
    await dropdown.selectOption("__none__");
    await page.waitForTimeout(200);
    await expect(page.getByTestId("landing-school-card")).toHaveCount(0);
  });

  test("location filter shows only matching schools", async ({ page }) => {
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    const filterInput = page.getByTestId("filter-location");
    await expect(filterInput).toBeVisible();

    // Filtering by seeded school's city: Boulder
    await filterInput.fill("Boulder");
    await page.waitForTimeout(200);
    await expect(page.getByTestId("landing-school-card").first()).toBeVisible();

    // Filtering by nonsense hides all schools
    await filterInput.fill("XYZNonExistentCity99");
    await page.waitForTimeout(200);
    await expect(page.getByTestId("landing-school-card")).toHaveCount(0);
  });

  test.skip("get started link", async ({ page }) => {
    await page.getByRole("link", { name: "Get started" }).click();
    await page.waitForURL("**/signup");
  });

  test.skip("headings", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Frequently asked questions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Some cool words" }),
    ).toBeVisible();
  });
});

test.describe("cookie consent tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("cookie consent banner rejection does not set cc_cookie", async ({
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

  test.skip("cookie consent banner acceptance sets cc_cookie and _ga cookies", async ({
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
