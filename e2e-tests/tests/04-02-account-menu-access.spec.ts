import { expect, test, type Page } from "@playwright/test";
import { logUserIn } from "./utils";

type DashboardUserScenario = {
  testName: string;
  email: string;
  triggerName: RegExp;
};

const dashboardUserScenarios: DashboardUserScenario[] = [
  {
    testName: "[4.11][STD-NAV-008] admin user menu shows Admin Dashboard link that navigates to /admin",
    email: "seed+system_admin.01@example.test",
    triggerName: /system_admin_01/i,
  },
  {
    testName: "[4.11][STD-NAV-008] school manager user menu shows Admin Dashboard link that navigates to /admin",
    email: "seed+school_manager.01@example.test",
    triggerName: /school_manager_01/i,
  },
];

const openAccountUserMenu = async ({
  page,
  email,
  triggerName,
}: {
  page: Page;
  email: string;
  triggerName: RegExp;
}) => {
  await logUserIn({
    page,
    user: {
      email,
      password: "12345678",
    },
    expectedRedirectPath: "/",
  });

  await page.goto("/account");
  await expect(page).toHaveURL(/\/account/);

  const dropdownTrigger = page.getByRole("button", { name: triggerName });
  await expect(dropdownTrigger).toBeVisible();
  await dropdownTrigger.click();
};

test.describe("4.2 authentication and access control - account menu", () => {
  dashboardUserScenarios.forEach((scenario) => {
    test(scenario.testName, async ({ page }) => {
      await openAccountUserMenu({
        page,
        email: scenario.email,
        triggerName: scenario.triggerName,
      });

      const dashboardLink = page.getByRole("menuitem").filter({ hasText: /admin dashboard/i });
      await expect(dashboardLink).toBeVisible();

      await dashboardLink.click();
      await expect(page).toHaveURL(/\/admin\/?$/);
    });
  });

  test("[4.2][STD-AUTH-005] registered users can open Request Roles from user menu", async ({ page }) => {
    await openAccountUserMenu({
      page,
      email: "seed+school_manager.01@example.test",
      triggerName: /school_manager_01/i,
    });

    const requestRolesLink = page.getByRole("menuitem").filter({ hasText: /request roles/i });
    await expect(requestRolesLink).toBeVisible();

    await requestRolesLink.click();
    await expect(page).toHaveURL(/\/registration/);
  });
});
