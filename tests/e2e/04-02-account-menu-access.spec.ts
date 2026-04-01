import { expect, test, type Page } from "@playwright/test";
import { createTestCourseWithManager, createTestSystemAdmin, logUserIn, type User } from "./utils.js";

const openAccountUserMenu = async ({
  page,
  user,
}: {
  page: Page;
  user: User;
}) => {
  await logUserIn({
    page,
    user,
    expectedRedirectPath: "/",
  });

  await page.goto("/account");
  await expect(page).toHaveURL(/\/account/);

  // Try to find the user menu button by email (in case it's shown as label);
  // fall back to the user icon button which is always present.
  const emailPattern = user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dropdownTriggerByName = page.getByRole("button", { name: new RegExp(emailPattern, "i") });
  const dropdownTrigger = (await dropdownTriggerByName.count())
    ? dropdownTriggerByName.first()
    : page.locator("button:has(svg.lucide-user)").first();
  await expect(dropdownTrigger).toBeVisible();
  await dropdownTrigger.click();
};

test.describe("4.2 authentication and access control - account menu", () => {
  let systemAdmin: User;
  let manager: User;

  test.beforeAll(async () => {
    const [adminResult, courseResult] = await Promise.all([
      createTestSystemAdmin(),
      createTestCourseWithManager(),
    ]);
    systemAdmin = adminResult;
    manager = courseResult.manager;
  });

  test("[4.11][STD-NAV-008] system admin user menu shows Dashboard link that navigates to /system-admin", async ({ page }) => {
    await openAccountUserMenu({ page, user: systemAdmin });

    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /dashboard/i });
    await expect(dashboardLink).toBeVisible();

    await dashboardLink.click();
    await expect(page).toHaveURL(/\/system-admin\/?$/);
  });

  test("[4.11][STD-NAV-008] school manager user menu shows Dashboard link that navigates to /school-manager", async ({ page }) => {
    await openAccountUserMenu({ page, user: manager });

    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /dashboard/i });
    await expect(dashboardLink).toBeVisible();

    await dashboardLink.click();
    await expect(page).toHaveURL(/\/school-manager\/?$/);
  });

  test("[4.2][STD-AUTH-005] registered users can open Request Roles from user menu", async ({ page }) => {
    await openAccountUserMenu({ page, user: manager });

    const requestRolesLink = page.getByRole("menuitem").filter({ hasText: /request roles/i });
    await expect(requestRolesLink).toBeVisible();

    await requestRolesLink.click();
    await expect(page).toHaveURL(/\/registration/);
  });
});
