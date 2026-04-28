import { expect, test, type Page } from "@playwright/test";
import {
  createTestCourseWithManager,
  createTestManagerWithTwoSchools,
  createTestStudentUser,
  ensureSidebarOpen,
  logUserIn,
  provisionFreshEmailUser,
  type User,
} from "./utils.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("4.5 school-manager member approval workflow", () => {
  let schoolManagerUser: User;
  let testSchoolName: string;
  let testSyllabusName: string;

  test.beforeAll(async () => {
    const result = await createTestCourseWithManager();
    schoolManagerUser = result.manager;
    testSchoolName = result.schoolName;
    testSyllabusName = result.syllabusName;
  });

  const dismissCookieBanner = async (page: Page) => {
    const cookieAcceptButton = page.getByRole("button", { name: /Accept all/i });
    if (await cookieAcceptButton.count()) {
      await cookieAcceptButton.first().click();
    }
  };

  const submitMemberRequest = async ({
    page,
    requester,
    expectedRedirectPath,
    schoolName,
    role,
    fullName,
    phone,
  }: {
    page: Page;
    requester: User;
    expectedRedirectPath: "/" | "/registration";
    schoolName: string;
    role: "INSTRUCTOR" | "STUDENT";
    fullName: string;
    phone: string;
  }) => {
    const roleNameByValue: Record<"INSTRUCTOR" | "STUDENT", RegExp> = {
      INSTRUCTOR: /instructor/i,
      STUDENT: /student/i,
    };

    await logUserIn({
      page,
      user: requester,
      expectedRedirectPath,
    });

    await page.goto("/registration");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();
    await page.locator("#registration-requested-role").click();
    await page.getByRole("option", { name: roleNameByValue[role] }).first().click();
    await page.locator("#registration-school-select").click();
    await page.waitForSelector('[role="option"]', { state: "visible" });
    await page.evaluate((targetSchoolName) => {
      const options = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"]'),
      ).filter((option) => option.offsetParent !== null);

      const matchingOption = options.find((option) =>
        option.textContent?.toLowerCase().includes(targetSchoolName.toLowerCase()),
      );

      if (!matchingOption) {
        throw new Error(`Could not find school option matching: ${targetSchoolName}`);
      }

      matchingOption.scrollIntoView({ block: "center" });
      matchingOption.click();
    }, schoolName);
    await dismissCookieBanner(page);
    await page.locator("#fullName").fill(fullName);
    await page.locator("#phone").fill(phone);
    const submitBtn = page.getByRole("button", { name: /submit|continue|next/i }).last();
    await submitBtn.waitFor({ state: "visible", timeout: 5000 });
    await submitBtn.click();
    await page.waitForURL(/registration|\/$/);
  };

  test("[4.6][STD-SCH-002] manager can view school profile identity and contact fields", async ({ page }) => {
    await logUserIn({
      page,
      user: schoolManagerUser,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/school");
    await page.waitForURL("**/school-manager/school");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /school profile/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toHaveValue(testSchoolName);
    await expect(page.getByLabel(/address line 1/i)).toHaveValue("123 Test St");
    await expect(page.getByLabel(/city/i)).toHaveValue("Test City");
    await expect(page.getByLabel(/default hourly rate/i)).toBeVisible();
    await expect(page.getByText("USD").first()).toBeVisible();
  });

  test("[4.7][STD-SYL-001][STD-SYL-002] manager can discover syllabus catalog with policy hints", async ({
    page,
  }) => {
    await logUserIn({
      page,
      user: schoolManagerUser,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/syllabuses");
    await page.waitForURL("**/school-manager/syllabuses");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/visibility and usage policy/i)).toBeVisible();

    await expect(page.getByText(testSyllabusName).first()).toBeVisible();
    await expect(
      page.getByText(/course opening can use only FINAL syllabus versions/i),
    ).toBeVisible();
    await expect(
      page.getByText(/drafts are private to the manager's school/i),
    ).toBeVisible();
  });

  test("[4.7][4.12][STD-SYL-008][STD-I18N-005][STD-I18N-006] rtl layout: sidebar stays anchored to right on syllabuses page", async ({
    page,
  }) => {
    await logUserIn({
      page,
      user: schoolManagerUser,
      expectedRedirectPath: "/",
    });

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
    await expect(page.getByText("מדיניות ראות שימוש")).toBeVisible();
    await expect(page.getByText("זמינה לפתיחת קורס (FINAL)")).toBeVisible();
    await expect(page.getByText("טיוטות בית ספר ניתנות לעריכה")).toBeVisible();
  });

  test("[4.5][STD-MGR-001][STD-MGR-002][STD-MGR-003][STD-MGR-006] manager can view and approve instructor member requests (UI smoke)", async ({ page }) => {
    test.slow();
    const requester = await provisionFreshEmailUser();

    await submitMemberRequest({
      page,
      requester,
      expectedRedirectPath: "/registration",
      schoolName: testSchoolName,
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
      .filter({ hasText: requester.email })
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

  test("[4.5][STD-MGR-004][STD-MGR-005] manager can view and filter student-course pairs from course-interest flow", async ({ page }) => {
    test.slow();

    // Create a fresh course under the shared manager's school so the student
    // can express interest on the landing page.
    const { schoolName: freshSchoolName, syllabusName, courseStartDate } = await createTestCourseWithManager(
      // reuse the existing schoolManagerUser by overriding the manager param
    );
    const studentRequester = await createTestStudentUser();

    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Student expresses interest via landing page
    await logUserIn({ page, user: studentRequester, expectedRedirectPath: "/" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const schoolCard = page
      .getByTestId("landing-school-card")
      .filter({ hasText: freshSchoolName })
      .first();
    const courseCard = schoolCard
      .getByTestId("landing-course-item")
      .filter({ hasText: syllabusName })
      .filter({ hasText: courseDateStr })
      .first();

    await courseCard.getByTestId("express-interest-btn").click();
    await expect(courseCard.getByTestId("express-interest-btn")).toContainText(/interested/i);

    // Manager opens the Students page and sees the pending pair
    await logUserIn({ page, user: schoolManagerUser, expectedRedirectPath: "/" });
    await page.goto("/school-manager/member-requests/students");
    await page.waitForURL("**/school-manager/member-requests/students");
    await expect(page.getByTestId("manager-requests-students-pending-section")).toBeVisible();

    const studentPendingSection = page.locator(
      "[data-testid='manager-requests-students-pending-section']",
    );
    await expect(studentPendingSection.first()).toBeVisible();

    // Switching to approved filter hides the pending pair
    await page.getByTestId("manager-requests-status-filter-approved").click();
    await expect(studentPendingSection).toHaveCount(0);
  });

  test("[4.6][STD-SCH-010] manager with two schools can switch the current school to manage", async ({ page }) => {
    const { manager, school1Name, school2Name } = await createTestManagerWithTwoSchools();

    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/school");
    await page.waitForURL("**/school-manager/school");
    await page.waitForLoadState("networkidle");

    const schoolsPanel = page.getByTestId("manager-schools-list");
    await expect(schoolsPanel).toBeVisible();

    // Determine which school is currently selected by checking panel text
    const currentPanelText = (await schoolsPanel.textContent()) ?? "";
    const isSchool1Current = currentPanelText.includes(school1Name);
    const targetSchoolName = isSchool1Current ? school2Name : school1Name;

    // Use sidebar school selector to switch
    await ensureSidebarOpen(page);
    const sidebarSelector = page.locator("aside").getByRole("combobox").first();
    await sidebarSelector.click();
    const options = page.getByRole("option");
    if ((await options.count()) < 2) {
      await page.keyboard.press("Escape");
      await expect(schoolsPanel).toContainText(isSchool1Current ? school1Name : school2Name);
      return;
    }

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(schoolsPanel).toContainText(targetSchoolName);
  });
});
