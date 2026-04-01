import { expect, test } from "@playwright/test";

import { createTestCourseWithManager, logUserIn } from "./utils.js";

const closeButtonName = /close|închide|סגור/i;
const reopenButtonName = /reopen|redeschide|פתח מחדש/i;
const closedCoursesSummaryName = /closed courses|cursuri închise|קורסים סגורים/i;

test.describe("4.15 course close/reopen", () => {
  test("[STD-CRS-006] manager can close and reopen a course from closed panel", async ({ page }) => {
    // Set up test data: manager + school + syllabus + course
    const { manager } = await createTestCourseWithManager();

    await test.step("Sign in as school manager and open Courses page", async () => {
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
    });

    await test.step("Use an existing open course", async () => {
      await expect(page.getByRole("button", { name: closeButtonName }).first()).toBeVisible();
    });

    await test.step("Close the course and verify it appears in closed panel", async () => {
      await page.getByRole("button", { name: closeButtonName }).first().click();

      await expect(page.getByRole("dialog")).toBeVisible();
      await page
        .getByRole("button", { name: /^close course$/i })
        .last()
        .click();

      const closedSummary = page.getByText(closedCoursesSummaryName).first();
      await closedSummary.click();

      await expect(page.getByRole("button", { name: reopenButtonName }).first()).toBeVisible();
    });

    await test.step("Reopen the course and verify close action is available again", async () => {
      await page.getByRole("button", { name: reopenButtonName }).first().click();

      await expect(page.getByRole("dialog")).toBeVisible();
      await page
        .getByRole("button", { name: /^reopen course$/i })
        .last()
        .click();

      await expect(page.getByRole("button", { name: closeButtonName }).first()).toBeVisible();
    });
  });
});
