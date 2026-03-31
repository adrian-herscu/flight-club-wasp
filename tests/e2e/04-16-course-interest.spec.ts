import { expect, test } from "@playwright/test";
import { logUserIn, provisionFreshEmailUser } from "./utils.js";

const MANAGER_USER = {
  email: "seed+school_manager.01@example.test",
  password: "12345678",
};

const TARGET_SCHOOL_NAME = "Cloudbase Annex";
const TARGET_COURSE_TITLE = "Tandem Flights v1";
const TARGET_COURSE_START_DATE = "Aug 2, 2027";

test.describe("4.16 course interest flow", () => {
  test("[4.16][STD-CIN-001][STD-CIN-005] logged-in user can express course interest and manager can view it", async ({ page }) => {
    const interestedUser = await provisionFreshEmailUser();
    let matchedCourseFound = false;

    await test.step("Create a fresh user account and sign in", async () => {
      await logUserIn({
        page,
        user: interestedUser,
        expectedRedirectPath: "/",
      });
    });

    await test.step("Express interest in the seeded course from the landing page", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const schoolCard = page
        .getByTestId("landing-school-card")
        .filter({ hasText: TARGET_SCHOOL_NAME })
        .first();

      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId("landing-course-item")
        .filter({ hasText: TARGET_COURSE_TITLE })
        .filter({ hasText: TARGET_COURSE_START_DATE })
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
        user: MANAGER_USER,
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
              .getByText(interestedUser.email)
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

    await test.step("Manager sees the interested user on that course", async () => {
      expect(matchedCourseFound).toBeTruthy();

      const interestEntry = page.getByText(interestedUser.email).first();
      await expect(interestEntry).toBeVisible();
      await expect(page.getByTestId("interest-status-badge").first()).toContainText("INTERESTED");
      await expect(page.getByTestId("mark-contacted-btn").first()).toBeVisible();
    });
  });
});
