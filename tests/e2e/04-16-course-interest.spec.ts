import { expect, test } from "@playwright/test";
import { createTestCourseWithManager, logUserIn, createTestStudentUser } from "./utils.js";

const PENDING_ANON_INTEREST_KEY = "landing.pendingAnonCourseInterest";

test.describe("4.16 course interest flow", () => {
  test("[4.16][STD-CIN-013][STD-CIN-014] student can cancel interest and later re-express it", async ({ page }) => {
    const { manager, schoolName, syllabusName, courseStartDate } = await createTestCourseWithManager();
    const interestedStudent = await createTestStudentUser();

    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    await logUserIn({
      page,
      user: interestedStudent,
      expectedRedirectPath: "/",
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const schoolCard = page.getByTestId("landing-school-card").filter({ hasText: schoolName }).first();
    const targetCourseCard = schoolCard
      .getByTestId("landing-course-item")
      .filter({ hasText: syllabusName })
      .filter({ hasText: courseDateStr })
      .first();

    const interestButton = targetCourseCard.getByTestId("express-interest-btn");
    await interestButton.click();
    await expect(interestButton).toContainText(/interested/i);
    await expect(interestButton).toBeEnabled();

    await interestButton.click();
    await expect(interestButton).toContainText(/i('| a)m interested/i);

    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/member-requests/students");
    await expect(page.getByText(interestedStudent.email).first()).toHaveCount(0);

    await logUserIn({
      page,
      user: interestedStudent,
      expectedRedirectPath: "/",
    });

    await page.goto("/");
    await targetCourseCard.getByTestId("express-interest-btn").click();
    await expect(targetCourseCard.getByTestId("express-interest-btn")).toContainText(/interested/i);
  });

  test("[4.16][STD-CIN-003][STD-CIN-011][STD-CIN-012] first anonymous click redirects to login and resumes as interested after login", async ({ page }) => {
    const { schoolName, syllabusName, courseStartDate } = await createTestCourseWithManager();
    const interestedStudent = await createTestStudentUser();

    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    await test.step("Anonymous user clicks I'm Interested and is redirected to login", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const schoolCard = page
        .getByTestId("landing-school-card")
        .filter({ hasText: schoolName })
        .first();
      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId("landing-course-item")
        .filter({ hasText: syllabusName })
        .filter({ hasText: courseDateStr })
        .first();
      await expect(targetCourseCard).toBeVisible();

      const interestButton = targetCourseCard.getByTestId("express-interest-login-btn");
      await expect(interestButton).toBeEnabled();
      await interestButton.click();

      await expect(page).toHaveURL(/\/login\/?$/);

      const pendingIntent = await page.evaluate((storageKey) => {
        return window.localStorage.getItem(storageKey);
      }, PENDING_ANON_INTEREST_KEY);
      expect(pendingIntent).toBeTruthy();
    });

    await test.step("After login, the selected course is automatically marked as interested and button stays enabled", async () => {
      await logUserIn({
        page,
        user: interestedStudent,
        expectedRedirectPath: "/",
      });

      await page.goto("/");

      const schoolCard = page
        .getByTestId("landing-school-card")
        .filter({ hasText: schoolName })
        .first();
      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId("landing-course-item")
        .filter({ hasText: syllabusName })
        .filter({ hasText: courseDateStr })
        .first();
      await expect(targetCourseCard).toBeVisible();

      const interestButton = targetCourseCard.getByTestId("express-interest-btn");
      await expect(interestButton).toBeEnabled();
      await expect(interestButton).toContainText(/interested/i);

      const pendingIntent = await page.evaluate((storageKey) => {
        return window.localStorage.getItem(storageKey);
      }, PENDING_ANON_INTEREST_KEY);
      expect(pendingIntent).toBeNull();
    });
  });

  test("[4.16][STD-CIN-001][STD-CIN-005] logged-in user can express course interest and manager can view it", async ({ page }) => {
    // Set up test data server-side: manager + school + syllabus + course
    const { manager, schoolName, syllabusName, courseStartDate } = await createTestCourseWithManager();
    const interestedStudent = await createTestStudentUser();

    // Format course date for display (e.g., "Jan 15, 2027")
    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    let matchedCourseFound = false;

    await test.step("Create a fresh student account and sign in", async () => {
      await logUserIn({
        page,
        user: interestedStudent,
        expectedRedirectPath: "/",
      });
    });

    await test.step("Express interest in the test course from the landing page", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const schoolCard = page
        .getByTestId("landing-school-card")
        .filter({ hasText: schoolName })
        .first();

      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId("landing-course-item")
        .filter({ hasText: syllabusName })
        .filter({ hasText: courseDateStr })
        .first();

      await expect(targetCourseCard).toBeVisible();

      const interestButton = targetCourseCard.getByTestId("express-interest-btn");
      await expect(interestButton).toBeEnabled();
      await interestButton.click();

      await expect(interestButton).toContainText(/interested/i);
      await expect(interestButton).toBeEnabled();
    });

    await test.step("Manager opens the course interest panel for the same course", async () => {
      await logUserIn({
        page,
        user: manager,
        expectedRedirectPath: "/",
      });

      await page.goto("/school-manager/courses");
      await expect(page).toHaveURL(/\/school-manager\/courses\/?$/);
      await expect(
        page.getByRole("heading", { name: /open course from final syllabus/i }).first(),
      ).toBeVisible();

      await page.locator("#interests-course-select").click();
      const optionNames = (await page.getByRole("option").allTextContents())
        .map((name) => name.trim())
        .filter(Boolean);

      await page.keyboard.press("Escape");

      for (const optionName of optionNames) {
        await page.locator("#interests-course-select").click();
        await page.getByRole("option", { name: optionName }).first().click();

        const isVisible = await expect
          .poll(async () => {
            return await page
              .getByText(interestedStudent.email)
              .first()
              .isVisible()
              .catch(() => false);
          }, { timeout: 1500 })
          .toBe(true)
          .then(() => true)
          .catch(() => false);

        if (isVisible) {
          matchedCourseFound = true;
          break;
        }
      }
    });

    await test.step("Manager sees the interested student on that course", async () => {
      expect(matchedCourseFound).toBeTruthy();

      const interestEntry = page.getByText(interestedStudent.email).first();
      await expect(interestEntry).toBeVisible();
      await expect(page.getByTestId("interest-status-badge").first()).toContainText("INTERESTED");
    });
  });

  test("[4.16][STD-CIN-004] student dashboard lists the student course interests with status", async ({ page }) => {
    const { schoolName, syllabusName, courseStartDate } = await createTestCourseWithManager();
    const interestedStudent = await createTestStudentUser();

    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    await logUserIn({
      page,
      user: interestedStudent,
      expectedRedirectPath: "/",
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const schoolCard = page.getByTestId("landing-school-card").filter({ hasText: schoolName }).first();
    const targetCourseCard = schoolCard
      .getByTestId("landing-course-item")
      .filter({ hasText: syllabusName })
      .filter({ hasText: courseDateStr })
      .first();

    await expect(targetCourseCard).toBeVisible();
    await targetCourseCard.getByTestId("express-interest-btn").click();
    await expect(targetCourseCard.getByTestId("express-interest-btn")).toContainText(/interested/i);

    await page.goto("/student");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("student-dashboard-interests-section")).toBeVisible();
    const dashboardItem = page
      .getByTestId("student-interest-item")
      .filter({ hasText: syllabusName })
      .first();
    await expect(dashboardItem).toBeVisible();
    await expect(dashboardItem).toContainText(/status: interested/i);
  });
});

