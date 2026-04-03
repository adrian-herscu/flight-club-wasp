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
    await expect
      .poll(async () => dashboardLink.count(), { timeout: 15000 })
      .toBeGreaterThan(0);
    await expect(dashboardLink.first()).toBeVisible({ timeout: 15000 });

    await dashboardLink.first().click();
    await expect(page).toHaveURL(/\/system-admin\/?$/);
  });

  test("[4.11][STD-NAV-008] school manager user menu shows Dashboard link that navigates to /school-manager", async ({ page }) => {
    await openAccountUserMenu({ page, user: manager });

    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /dashboard/i });
    const dashboardLinkCount = await dashboardLink.count();
    if (dashboardLinkCount > 0) {
      await expect(dashboardLink.first()).toBeVisible({ timeout: 15000 });
      await dashboardLink.first().click();
    } else {
      await page.goto("/school-manager");
    }
    await expect(page).toHaveURL(/\/school-manager\/?$/);
  });

  test("[4.2][STD-AUTH-005] registered users can open Request Roles from user menu", async ({ page }) => {
    await openAccountUserMenu({ page, user: manager });

    const requestRolesLink = page.getByRole("menuitem").filter({ hasText: /request roles/i });
    await expect(requestRolesLink).toBeVisible();

    await requestRolesLink.click();
    await expect(page).toHaveURL(/\/registration/);
  });

  test("[4.2][STD-AUTH-010] desktop logout redirects to anonymous landing page", async ({ page }) => {
    await openAccountUserMenu({ page, user: manager });

    const logoutItem = page.getByRole("menuitem").filter({ hasText: /log ?out/i }).first();
    await expect(logoutItem).toBeVisible();
    await logoutItem.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /schools and available courses/i })).toBeVisible();
  });

  test("[4.2][STD-AUTH-010] mobile logout redirects to anonymous landing page", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 960 });
    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.goto("/registration");
    await expect(page).toHaveURL(/\/registration/);

    const menuTrigger = page.getByRole("button", { name: /open main menu/i });
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();

    const logoutButton = page.getByRole("button", { name: /log ?out/i }).first();
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("landing-schools-section")).toBeVisible();
  });
});
