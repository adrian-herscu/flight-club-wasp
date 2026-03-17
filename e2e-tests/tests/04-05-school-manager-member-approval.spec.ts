import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

test.describe("4.5 school-manager member approval workflow", () => {
  test.skip("[4.6][STD-SCH-001][STD-SCH-002][inactive] manager can view school profile", async ({ page }) => {
    await page.goto("/admin/school");
    await page.waitForURL("**/admin/school");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "My School" })).toBeVisible();
    await expect(page.getByText("Cloudbase Paragliding")).toBeVisible();
    await expect(page.getByText("123 Mountain Ridge Road")).toBeVisible();
    await expect(page.getByText("Boulder")).toBeVisible();
    await expect(page.getByText("USD").first()).toBeVisible();
  });

  test.skip("[4.7][STD-SYL-001][STD-SYL-002][inactive] manager can discover final syllabuses with policy hints", async ({
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

  test("[4.7][4.12][STD-SYL-008][STD-I18N-005][STD-I18N-006] rtl layout: sidebar stays anchored to right on syllabuses page", async ({
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

  test("[4.7][4.12][STD-SYL-009][STD-I18N-007] hebrew locale: syllabuses catalog labels are translated", async ({ page }) => {
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

  test("[4.5][STD-MGR-001][STD-MGR-002][STD-MGR-003] manager can view and approve instructor member requests", async ({ page }) => {
    const dismissCookieBanner = async () => {
      const cookieAcceptButton = page.getByRole("button", { name: /Accept all/i });
      if (await cookieAcceptButton.count()) {
        await cookieAcceptButton.first().click();
      }
    };

    await logUserIn({
      page,
      user: { email: "seed+user.02@example.test", password: "12345678" },
      expectedRedirectPath: "/registration",
    });

    await page.goto(`/registration?role=INSTRUCTOR&schoolId=seed-school-cloudbase-paragliding`);
    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();
    await dismissCookieBanner();
    await page.locator("#fullName").fill("Manager Test User");
    await page.locator("#phone").fill("+1 555 0171");
    await page.locator(".flex.justify-end button").click();
    await page.waitForURL(/registration|\/$/);

    await logUserIn({
      page,
      user: { email: "seed+school_manager.01@example.test", password: "12345678" },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin/member-requests/instructors");
    await page.waitForURL("**/admin/member-requests/instructors");
    await expect(page.getByRole("heading", { name: /instructor/i }).first()).toBeVisible();

    const instructorPendingSection = page.locator(
      "[data-testid='manager-requests-instructors-pending-section']",
    );
    
    // Check if there are pending requests
    const hasPendingRequests = await instructorPendingSection.locator("[data-testid='manager-member-request-card']").count() > 0;
    
    if (hasPendingRequests) {
      const instructorPendingCard = instructorPendingSection
        .locator("[data-testid='manager-member-request-card']")
        .first();
      await instructorPendingCard.getByRole("button", { name: /approve/i }).click();
    }

    const instructorApprovedSection = page.locator(
      "[data-testid='manager-requests-instructors-approved-section']",
    );
    await expect(instructorApprovedSection.locator("[data-testid='manager-member-request-card']").first()).toBeVisible({ timeout: 5000 });
  });

  test("[4.5][STD-MGR-004][STD-MGR-005][STD-MGR-006] manager can view and filter student member requests", async ({ page }) => {
    const dismissCookieBanner = async () => {
      const cookieAcceptButton = page.getByRole("button", { name: /Accept all/i });
      if (await cookieAcceptButton.count()) {
        await cookieAcceptButton.first().click();
      }
    };

    await logUserIn({
      page,
      user: { email: "seed+student.02@example.test", password: "12345678" },
      expectedRedirectPath: "/",
    });

    await page.goto(`/registration?role=STUDENT&schoolId=seed-school-cloudbase-paragliding`);
    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();
    await dismissCookieBanner();
    await page.locator("#fullName").fill("Manager Test Student");
    await page.locator("#phone").fill("+1 555 0172");
    await page.locator(".flex.justify-end button").click();
    await page.waitForURL(/registration|\/$/);

    await logUserIn({
      page,
      user: { email: "seed+school_manager.01@example.test", password: "12345678" },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin/member-requests/students");
    await page.waitForURL("**/admin/member-requests/students");
    await expect(page.getByRole("heading", { name: /student/i }).first()).toBeVisible();

    const studentPendingSection = page.locator(
      "[data-testid='manager-requests-students-pending-section']",
    );
    await expect(studentPendingSection.first()).toBeVisible();

    // Test pending/approved filter
    await page.getByTestId("manager-requests-status-filter-approved").click();
    await expect(studentPendingSection).toHaveCount(0);
  });
});
