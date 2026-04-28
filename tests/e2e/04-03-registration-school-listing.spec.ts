import { expect, test } from "@playwright/test";
import { createTestCourseWithManager, logUserIn, provisionFreshEmailUser } from "./utils.js";

test.describe("4.3 registration and role requests - school listing", () => {
  test("[4.3][STD-REG-006][STD-REG-008] school listing renders correctly for instructor role", async ({ page }) => {
    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration");
    await page.waitForLoadState("networkidle");
    await page.locator("#registration-requested-role").click();
    await page.getByRole("option", { name: /instructor/i }).first().click();

    // School selector should be visible for non-manager role
    const schoolSelectorLabel = page.getByText(/select school/i).first();
    await expect(schoolSelectorLabel).toBeVisible();

    await expect(page.getByText(/school websites/i).first()).toBeVisible();

    const logos = await page.getByTestId("registration-school-logo").count();
    expect(logos).toBeGreaterThan(0);
  });

  test("[4.3][STD-REG-007] registration role selector does not offer the student role", async ({ page }) => {
    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration");
    await page.waitForLoadState("networkidle");
    await page.locator("#registration-requested-role").click();

    const roleOptions = page.getByRole("option");
    await expect(roleOptions).toHaveCount(2);
    await expect(page.getByRole("option", { name: /school manager/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /instructor/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /student/i })).toHaveCount(0);
  });

  test("[4.3][STD-REG-006] instructor registration requires selecting an existing school", async ({ page }) => {
    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration");
    await page.waitForLoadState("networkidle");
    await page.locator("#registration-requested-role").click();
    await page.getByRole("option", { name: /instructor/i }).first().click();

    await page.locator("#fullName").fill("Missing School Selection");
    await page.locator("#phone").fill("+1 555 0177");
    await page.getByRole("button", { name: /submit|continue|next/i }).last().click();

    await expect(
      page.locator('[data-slot="toast"][class*="bg-destructive"]').first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test("[4.3][STD-REG-014] registration shows clear validation feedback when required fields are missing", async ({ page }) => {
    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration");
    await page.waitForLoadState("networkidle");

    // Keep default SCHOOL_MANAGER role and submit with missing mandatory fields.
    await page.locator("#fullName").fill("Validation User");
    await page.locator("#phone").fill("+1 555 0178");
    await page.getByRole("button", { name: /submit|continue|next/i }).last().click();

    await expect(
      page.locator('[data-slot="toast"][class*="bg-destructive"]').first(),
    ).toBeVisible({ timeout: 8000 });
  });

  test("[4.3][STD-REG-008] instructor school options remain selectable when optional website/logo metadata is missing", async ({ page }) => {
    const { schoolName } = await createTestCourseWithManager();
    const user = await provisionFreshEmailUser();

    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration");
    await page.waitForLoadState("networkidle");
    await page.locator("#registration-requested-role").click();
    await page.getByRole("option", { name: /instructor/i }).first().click();

    // Open the school select dropdown and find the school using DOM evaluation
    // This approach is more reliable than Playwright locators for large dropdown lists
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

    // Selection should succeed even when optional identity fields are absent.
    await expect(page.locator("#registration-school-select")).toContainText(schoolName);
  });
});
