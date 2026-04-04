import { expect, test } from "@playwright/test";
import { logUserIn, provisionFreshEmailUser } from "./utils.js";

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
});
