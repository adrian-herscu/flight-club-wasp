import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

test.describe("account menu dashboard link", () => {
  test("admin user menu shows Admin Dashboard link that navigates to /admin", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    // Navigate to account settings page (outside admin layout)
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account/);

    // Open user dropdown - trigger button shows fullName ("system_admin_01")
    const dropdownTrigger = page.getByRole("button", { name: /system_admin_01/i });
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    // Assert "Admin Dashboard" link is visible in the dropdown
    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /admin dashboard/i });
    await expect(dashboardLink).toBeVisible();

    // Click it and expect navigation to /admin
    await dashboardLink.click();
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test("school manager user menu shows Admin Dashboard link that navigates to /admin", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+school_manager.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/account");
    await expect(page).toHaveURL(/\/account/);

    const dropdownTrigger = page.getByRole("button", { name: /school_manager_01/i });
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /admin dashboard/i });
    await expect(dashboardLink).toBeVisible();

    await dashboardLink.click();
    await expect(page).toHaveURL(/\/admin\/?$/);
  });

  test("registered users can open Request Roles from user menu", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+school_manager.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/account");
    await expect(page).toHaveURL(/\/account/);

    const dropdownTrigger = page.getByRole("button", { name: /school_manager_01/i });
    await expect(dropdownTrigger).toBeVisible();
    await dropdownTrigger.click();

    const requestRolesLink = page.getByRole("menuitem").filter({ hasText: /request roles/i });
    await expect(requestRolesLink).toBeVisible();

    await requestRolesLink.click();
    await expect(page).toHaveURL(/\/registration/);
  });
});
