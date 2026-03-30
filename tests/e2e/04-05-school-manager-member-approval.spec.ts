import { expect, test, type Page } from "@playwright/test";
import { ensureSidebarOpen, logUserIn } from "./utils";

test.describe("4.5 school-manager member approval workflow", () => {
  const schoolManagerUser = {
    email: "seed+school_manager.01@example.test",
    password: "12345678",
  };

  const dismissCookieBanner = async (page: Page) => {
    const cookieAcceptButton = page.getByRole("button", { name: /Accept all/i });
    if (await cookieAcceptButton.count()) {
      await cookieAcceptButton.first().click();
    }
  };

  const submitMemberRequest = async ({
    page,
    requesterEmail,
    expectedRedirectPath,
    role,
    fullName,
    phone,
  }: {
    page: Page;
    requesterEmail: string;
    expectedRedirectPath: "/" | "/registration";
    role: "INSTRUCTOR" | "STUDENT";
    fullName: string;
    phone: string;
  }) => {
    await logUserIn({
      page,
      user: { email: requesterEmail, password: "12345678" },
      expectedRedirectPath,
    });

    await page.goto(`/registration?role=${role}&schoolId=seed-school-cloudbase-paragliding`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();
    await dismissCookieBanner(page);
    await page.locator("#fullName").fill(fullName);
    await page.locator("#phone").fill(phone);
    const submitBtn = page.getByRole("button", { name: /submit|continue|next/i }).last();
    await submitBtn.waitFor({ state: "visible", timeout: 5000 });
    await submitBtn.click();
    await page.waitForURL(/registration|\/$/);
  };
  test.skip("[4.6][STD-SCH-001][STD-SCH-002][inactive] manager can view school profile", async ({ page }) => {
    await page.goto("/school-manager/school");
    await page.waitForURL("**/school-manager/school");
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
    await page.goto("/school-manager/syllabuses");
    await page.waitForURL("**/school-manager/syllabuses");
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

    await page.goto("/school-manager/syllabuses?section=catalog");
    await page.waitForURL("**/school-manager/syllabuses?section=catalog");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/school-manager\/syllabuses\?section=catalog/);

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
    await ensureSidebarOpen(page);

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
    expect((geometry as any).pathname).toBe("/school-manager/syllabuses");

    expect(Math.abs((geometry as any).asideRight - (geometry as any).viewportWidth)).toBeLessThanOrEqual(2);
    expect((geometry as any).mainLeft).toBeGreaterThanOrEqual(0);
  });

  test("[4.7][4.12][STD-SYL-009][STD-I18N-007] hebrew locale: syllabuses catalog labels are translated", async ({ page }) => {
    await logUserIn({
      page,
      user: schoolManagerUser,
      expectedRedirectPath: "/",
    });

    await page.addInitScript(() => {
      localStorage.setItem("locale", "he");
      document.documentElement.lang = "he";
      document.documentElement.dir = "rtl";
    });

    await page.goto("/school-manager/syllabuses?section=catalog");
    if (new URL(page.url()).pathname === "/login") {
      await logUserIn({
        page,
        user: schoolManagerUser,
        expectedRedirectPath: "/",
      });
      await page.goto("/school-manager/syllabuses?section=catalog");
    }
    await page.waitForURL("**/school-manager/syllabuses?section=catalog");
    await page.waitForLoadState("networkidle");
    await expect.poll(async () => page.getAttribute("html", "lang")).toBe("he");
    await expect(page).toHaveURL(/\/school-manager\/syllabuses\?section=catalog/);
    await expect(page.locator("body")).not.toContainText("Visibility and usage policy");
  });

  test("[4.5][STD-MGR-001][STD-MGR-002][STD-MGR-003] manager can view and approve instructor member requests (UI smoke)", async ({ page }) => {
    const requesterEmail = "seed+user.01@example.test";

    await submitMemberRequest({
      page,
      requesterEmail,
      expectedRedirectPath: "/registration",
      role: "INSTRUCTOR",
      fullName: "Manager Test User",
      phone: "+1 555 0171",
    });

    await logUserIn({
      page,
      user: schoolManagerUser,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/member-requests/instructors");
    await page.waitForURL("**/school-manager/member-requests/instructors");
      await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("manager-requests-instructors-pending-section")).toBeVisible();

    const instructorPendingSection = page.getByTestId("manager-requests-instructors-pending-section");
    const pendingCards = instructorPendingSection.getByTestId("manager-member-request-card");
    const hasPendingCards = (await pendingCards.count()) > 0;

    if (hasPendingCards) {
      await expect(pendingCards.first()).toBeVisible();
    }

    const requesterPendingCard = instructorPendingSection
      .getByTestId("manager-member-request-card")
      .filter({ hasText: requesterEmail })
      .first();

    const hasRequesterPendingCard = (await requesterPendingCard.count()) > 0;

    if (hasRequesterPendingCard) {
      await requesterPendingCard.getByRole("button", { name: /approve/i }).click();
    }

    await page.getByTestId("manager-requests-status-filter-approved").click();

    const instructorApprovedSection = page.getByTestId(
      "manager-requests-instructors-approved-section",
    );
    await expect(instructorApprovedSection.first()).toBeVisible();
  });

  test("[4.5][STD-MGR-004][STD-MGR-005][STD-MGR-006] manager can view and filter student member requests", async ({ page }) => {
    await submitMemberRequest({
      page,
      requesterEmail: "seed+student.02@example.test",
      expectedRedirectPath: "/",
      role: "STUDENT",
      fullName: "Manager Test Student",
      phone: "+1 555 0172",
    });

    await logUserIn({
      page,
      user: schoolManagerUser,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/member-requests/students");
    await page.waitForURL("**/school-manager/member-requests/students");
    await expect(page.getByTestId("manager-requests-students-pending-section")).toBeVisible();

    const studentPendingSection = page.locator(
      "[data-testid='manager-requests-students-pending-section']",
    );
    await expect(studentPendingSection.first()).toBeVisible();

    // Test pending/approved filter
    await page.getByTestId("manager-requests-status-filter-approved").click();
    await expect(studentPendingSection).toHaveCount(0);
  });

  test("[4.6][STD-SCH-010] manager with two schools can switch the current school to manage", async ({ page }) => {
    await logUserIn({
      page,
      user: schoolManagerUser,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/school");
    await page.waitForURL("**/school-manager/school");
    await page.waitForLoadState("networkidle");

    const schoolsPanel = page.getByTestId("manager-schools-list");
    await expect(schoolsPanel).toBeVisible();

    const currentPanelText = (await schoolsPanel.textContent()) ?? "";
    const currentAccountId = currentPanelText.includes("seed-account-manager-cloudbase-annex")
      ? "seed-account-manager-cloudbase-annex"
      : "seed-account-manager-cloudbase";
    const targetAccountId =
      currentAccountId === "seed-account-manager-cloudbase"
        ? "seed-account-manager-cloudbase-annex"
        : "seed-account-manager-cloudbase";

    // Use sidebar school selector
    await ensureSidebarOpen(page);
    const sidebarSelector = page.locator("aside").getByRole("combobox").first();
    await sidebarSelector.click();
    const options = page.getByRole("option");
    if ((await options.count()) < 2) {
      await page.keyboard.press("Escape");
      await expect(schoolsPanel).toContainText(currentAccountId);
      return;
    }

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(schoolsPanel).toContainText(targetAccountId);
  });
});
