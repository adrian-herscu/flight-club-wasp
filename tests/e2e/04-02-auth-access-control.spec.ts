import { expect, test } from "@playwright/test";
import { createTestSystemAdmin, logUserIn, provisionFreshEmailUser } from "./utils.js";

test.describe("4.2 authentication and access control", () => {

  test("[4.2][STD-AUTH-003] unauthenticated users are redirected to login for protected routes", async ({ page }) => {
    await page.goto("/system-admin/users");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/login(?:[?#].*)?$/);
  });

  test("[4.2][STD-AUTH-007] non-admin users cannot access admin-only pages", async ({ page }) => {
    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/",
    });

    await page.goto("/system-admin/users");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Users" })).toHaveCount(0);
  });

  test("[4.2][STD-AUTH-008] non-manager users cannot access manager-only member request pages", async ({ page }) => {
    const admin = await createTestSystemAdmin();
    await logUserIn({
      page,
      user: admin,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/member-requests/instructors");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("manager-member-request-card")).toHaveCount(0);
  });

});
