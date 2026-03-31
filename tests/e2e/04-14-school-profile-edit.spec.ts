import { expect, test } from "@playwright/test";
import { createTestCourseWithManager, logUserIn } from "./utils.js";

test.describe("4.14 school manager school profile editing", () => {
  test("[4.14][STD-SCH-001][STD-SCH-003] school manager can edit school details and see persisted values", async ({
    page,
  }) => {
    // Set up test data: manager + school + syllabus + course
    const { manager } = await createTestCourseWithManager();

    await test.step("Log in as school manager and open My School", async () => {
      await logUserIn({
        page,
        user: manager,
        expectedRedirectPath: "/",
      });

      await page.goto("/school-manager/school");
      await page.waitForURL("**/school-manager/school");
      await expect(page.getByTestId("manager-schools-list")).toHaveCount(1);
      await expect(page.getByText("Select school to manage")).toHaveCount(0);
    });

    const uniqueSuffix = Date.now().toString().slice(-6);
    const updatedName = `School-Edited-${uniqueSuffix}`;
    const updatedPhone = `+1 555 ${uniqueSuffix}`;
    const updatedCity = `Test-City-${uniqueSuffix}`;

    await test.step("Edit school profile fields and save", async () => {
      await page.getByLabel("Name").fill(updatedName);
      await page.getByLabel("Phone (optional)").fill(updatedPhone);
      await page.getByLabel("City").fill(updatedCity);
      await page.getByLabel("Default hourly rate").fill("135");

      await page.getByRole("button", { name: "Save details" }).click();
      await expect(page.getByText("School details were saved successfully.")).toHaveCount(1);
    });

    await test.step("Reload and verify values were persisted", async () => {
      await page.reload();
      await page.waitForLoadState("networkidle");

      await expect(page.getByLabel("Name")).toHaveValue(updatedName);
      await expect(page.getByLabel("Phone (optional)")).toHaveValue(updatedPhone);
      await expect(page.getByLabel("City")).toHaveValue(updatedCity);
      await expect(page.getByLabel("Default hourly rate")).toHaveValue("135");
    });
  });
});
