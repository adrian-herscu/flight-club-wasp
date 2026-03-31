import { expect, test } from "@playwright/test";
import { createTestCourseWithManager, logUserIn, createTestStudentUser } from "./utils.js";

test.describe("4.16 course interest flow", () => {
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

      await expect.poll(async () => interestButton.isEnabled()).toBe(false);
      await expect(interestButton).toContainText(/interested/i);
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
      await expect(page.getByTestId("mark-contacted-btn").first()).toBeVisible();
    });
  });
});

