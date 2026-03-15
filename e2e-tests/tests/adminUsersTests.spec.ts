import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

test.describe("admin users", () => {
  test("system admin login redirects to dashboard", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/admin",
    });

    await expect(page).toHaveURL(/\/admin\/?(?:[?#].*)?$/);
    await expect(page.getByTestId("admin-dashboard-placeholder")).toHaveText("Under construction");
    await expect(page.getByRole("heading", { name: "Users" })).toBeHidden();
  });

  test("system admin sees seeded users without applying status filter", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/admin",
    });

    await page.goto("/admin/users");
    await page.waitForURL("**/admin/users");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByText("seed+system_admin.01@example.test")).toBeVisible();
  });
});
