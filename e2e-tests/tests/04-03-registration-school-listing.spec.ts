import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

test.describe("4.3 registration and role requests - school listing", () => {
  test("[4.3][STD-REG-006][STD-REG-008] school listing renders correctly for instructor role", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+user.02@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration?role=INSTRUCTOR");
    await page.waitForLoadState("networkidle");

    // School selector should be visible for non-manager role
    const schoolSelectorLabel = page.getByText(/select school/i).first();
    await expect(schoolSelectorLabel).toBeVisible();

    await expect(page.getByText(/school websites/i).first()).toBeVisible();

    const logos = await page.getByTestId("registration-school-logo").count();
    expect(logos).toBeGreaterThan(0);
  });
});
