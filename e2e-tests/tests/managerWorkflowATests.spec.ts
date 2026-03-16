import { expect, test } from "@playwright/test";

test.describe("manager workflow A", () => {
  test.skip("manager can view school profile", async ({ page }) => {
    await page.goto("/admin/school");
    await page.waitForURL("**/admin/school");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "My School" })).toBeVisible();
    await expect(page.getByText("Cloudbase Paragliding")).toBeVisible();
    await expect(page.getByText("123 Mountain Ridge Road")).toBeVisible();
    await expect(page.getByText("Boulder")).toBeVisible();
    await expect(page.getByText("USD").first()).toBeVisible();
  });

  test.skip("manager can discover final syllabuses with policy hints", async ({
    page,
  }) => {
    await page.goto("/admin/syllabuses");
    await page.waitForURL("**/admin/syllabuses");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Visibility and usage policy")).toBeVisible();

    await expect(page.getByText("Tandem Flights")).toBeVisible();
    await expect(page.getByText("Paragliding Intro")).toBeVisible();
    await expect(
      page.getByText("Course opening can use only FINAL syllabus versions."),
    ).toBeVisible();
    await expect(
      page.getByText("Drafts are private to the manager's school."),
    ).toBeVisible();
  });

  test("rtl layout: sidebar stays anchored to right on syllabuses page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "seed+school_manager.01@example.test");
    await page.fill('input[name="password"]', "12345678");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");

    await page.goto("/admin/syllabuses?section=catalog");
    await page.waitForURL("**/admin/syllabuses?section=catalog");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/syllabuses\?section=catalog/);

    const cookieAcceptButton = page.getByRole("button", { name: /Accept all/i });
    if (await cookieAcceptButton.count()) {
      await cookieAcceptButton.first().click();
    }

    await page.evaluate(() => {
      localStorage.setItem("locale", "he");
      document.documentElement.lang = "he";
      document.documentElement.dir = "rtl";
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect
      .poll(async () => page.getAttribute("html", "dir"))
      .toBe("rtl");

    const geometry = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const main = document.querySelector("main");
      if (!aside || !main) {
        return {
          viewportWidth: window.innerWidth,
          asideFound: !!aside,
          mainFound: !!main,
          pathname: window.location.pathname,
          search: window.location.search,
        };
      }

      const asideRect = aside.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();

      return {
        viewportWidth: window.innerWidth,
        asideRight: asideRect.right,
        mainLeft: mainRect.left,
        asideFound: true,
        mainFound: true,
        pathname: window.location.pathname,
        search: window.location.search,
      };
    });

    expect((geometry as any).asideFound).toBe(true);
    expect((geometry as any).mainFound).toBe(true);
    expect((geometry as any).pathname).toBe("/admin/syllabuses");

    expect(Math.abs((geometry as any).asideRight - (geometry as any).viewportWidth)).toBeLessThanOrEqual(2);
    expect((geometry as any).mainLeft).toBeGreaterThanOrEqual(0);
  });

  test("hebrew locale: syllabuses catalog labels are translated", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "seed+school_manager.01@example.test");
    await page.fill('input[name="password"]', "12345678");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");

    await page.addInitScript(() => {
      localStorage.setItem("locale", "he");
      document.documentElement.lang = "he";
      document.documentElement.dir = "rtl";
    });

    await page.goto("/admin/syllabuses?section=catalog");
    await page.waitForURL("**/admin/syllabuses?section=catalog");
    await page.waitForLoadState("networkidle");
    await expect.poll(async () => page.getAttribute("html", "lang")).toBe("he");
    await expect(page).toHaveURL(/\/admin\/syllabuses\?section=catalog/);
    await expect(page.locator("body")).not.toContainText("Visibility and usage policy");
  });

  test("manager member requests panel is split by instructors/students and supports pending/approved filtering", async ({ page }) => {
    const seedEmail = "seed+user.02@example.test";

    const dismissCookieBanner = async () => {
      const cookieAcceptButton = page.getByRole("button", { name: /Accept all/i });
      if (await cookieAcceptButton.count()) {
        await cookieAcceptButton.first().click();
      }
    };

    const submitMemberRequest = async (role: "INSTRUCTOR" | "STUDENT") => {
      await page.goto(`/registration?role=${role}&schoolId=seed-school-cloudbase-paragliding`);
      await page.waitForLoadState("networkidle");
      await dismissCookieBanner();
      await page.locator("#fullName").fill("Seed User 02");
      await page.locator("#phone").fill("+1 555 0171");
      await page.locator(".flex.justify-end button").click();
      await page.waitForLoadState("networkidle");
    };

    const clearAuthState = async () => {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.context().clearCookies();
      await page.goto("about:blank");
    };

    await page.goto("/login");
    await page.fill('input[name="email"]', seedEmail);
    await page.fill('input[name="password"]', "12345678");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 10000 });

    await submitMemberRequest("INSTRUCTOR");
    await submitMemberRequest("STUDENT");

    await clearAuthState();
    await page.goto("/login");
    await page.fill('input[name="email"]', "seed+school_manager.01@example.test");
    await page.fill('input[name="password"]', "12345678");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 10000 });

    await page.goto("/admin/member-requests/instructors");
    await page.waitForURL("**/admin/member-requests/instructors");
    await page.waitForLoadState("networkidle");

    const instructorPendingSection = page.locator(
      "[data-testid='manager-requests-instructors-pending-section']",
    );
    const studentPendingSection = page.locator(
      "[data-testid='manager-requests-students-pending-section']",
    );
    const instructorApprovedSection = page.locator(
      "[data-testid='manager-requests-instructors-approved-section']",
    );
    const studentApprovedSection = page.locator(
      "[data-testid='manager-requests-students-approved-section']",
    );

    await expect(studentPendingSection).toHaveCount(0);
    await expect(studentApprovedSection).toHaveCount(0);

    await expect(
      page.locator("[data-testid='manager-member-request-card']").filter({ hasText: seedEmail }).first(),
    ).toBeVisible();

    const instructorPendingCard = instructorPendingSection
      .locator("[data-testid='manager-member-request-card']")
      .filter({ hasText: seedEmail })
      .first();
    const instructorApprovedCard = instructorApprovedSection
      .locator("[data-testid='manager-member-request-card']")
      .filter({ hasText: seedEmail })
      .first();
    if (await instructorPendingCard.count()) {
      await instructorPendingCard.getByRole("button", { name: /approve/i }).click();
      await expect(instructorApprovedCard).toBeVisible();
    } else {
      await expect(instructorApprovedCard).toBeVisible();
    }

    await page.getByTestId("manager-requests-status-filter-pending").click();
    await expect(instructorApprovedSection).toHaveCount(0);
    await expect(studentApprovedSection).toHaveCount(0);

    await page.getByTestId("manager-requests-status-filter-approved").click();
    await expect(instructorPendingSection).toHaveCount(0);

    await page.goto("/admin/member-requests/students");
    await page.waitForURL("**/admin/member-requests/students");
    await page.waitForLoadState("networkidle");

    const mainArea = page.locator("main");
    await expect(mainArea.locator("h2", { hasText: "Students" })).toHaveCount(0);
    await expect(mainArea.getByRole("navigation")).toHaveCount(0);

    await expect(instructorPendingSection).toHaveCount(0);
    await expect(instructorApprovedSection).toHaveCount(0);
    await expect(
      page
        .locator("[data-testid='manager-member-request-card']")
        .filter({ hasText: seedEmail })
        .first(),
    ).toBeVisible();
  });
});
