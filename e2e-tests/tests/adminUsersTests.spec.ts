import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

test.describe("admin users", () => {
  test("[STD-AUTH-001] system admin login redirects to dashboard", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/admin\/?(?:[?#].*)?$/);
    await expect(page.getByTestId("admin-dashboard-placeholder")).toHaveText("Under construction");
    await expect(page.getByRole("heading", { name: "Users" })).toBeHidden();
  });

  test("[STD-NAV-003] system admin sees seeded users without applying status filter", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin/users");
    await page.waitForURL("**/admin/users");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByText("seed+system_admin.01@example.test")).toBeVisible();
  });

  test("[STD-NAV-003][STD-SYL-001][STD-SYL-002] system admin can access syllabuses from sidebar and view catalog", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("link", {
        name: /syllabuses|תוכניות לימוד|planuri de studiu/i,
      }),
    ).toBeVisible();

    await page.goto("/admin/syllabuses?section=catalog");
    await page.waitForURL("**/admin/syllabuses?section=catalog");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Visibility and usage policy")).toBeVisible();
    await expect(
      page.getByText("Only school managers can access this resource."),
    ).toBeHidden();
  });

  test("[STD-ADM-001][STD-ADM-002][STD-ADM-007] system admin schools panel shows approved school requests with details", async ({ page }) => {
    const uniqueSchoolName = `E2E Flight School ${Date.now()}`;

    await logUserIn({
      page,
      user: {
        email: "seed+user.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration?role=SCHOOL_MANAGER");
    await page.waitForLoadState("networkidle");

    await page.locator("#fullName").fill("Seed User 01");
    await page.locator("#phone").fill("+1 555 0160");
    await page.locator("#requestedSchoolName").fill(uniqueSchoolName);
    await page.locator("#requestedWebsiteUrl").fill("https://e2e-school.example.test");
    await page.locator("#requestedSchoolPhone").fill("+43 512 000000");
    await page.locator("#requestedLogoUrl").fill("https://e2e-school.example.test/logo.png");
    await page.locator("#requestedAddressLine1").fill("10 Alpine Way");
    await page.locator("#requestedCity").fill("Innsbruck");
    await page.locator("#requestedPostalCode").fill("6020");
    await page.locator("#requestedCountry").fill("AT");
    await page.locator("#requestedCurrency").fill("EUR");

    await page.locator(".flex.justify-end button").click();
    await expect(page.getByText(uniqueSchoolName)).toBeVisible();

    await logUserIn({
      page,
      user: {
        email: "seed+system_admin.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("link", { name: "Schools" })).toBeVisible();
    await page.goto("/admin/school-requests");
    await page.waitForURL("**/admin/school-requests");
    await page.waitForLoadState("networkidle");

    const main = page.locator("main");
    await expect(main.getByRole("heading", { level: 2, name: "Schools" })).toHaveCount(0);
    await expect(main.getByRole("navigation")).toHaveCount(0);

    const pendingCard = page.locator("[data-testid='schools-panel-pending-section']").getByText(uniqueSchoolName).first();
    await expect(pendingCard).toBeVisible();

    const requestCard = pendingCard.locator("xpath=ancestor::*[@data-testid='school-request-card']").first();
    await requestCard.getByRole("button", { name: /approve/i }).click();

    const approvedSection = page.locator("[data-testid='schools-panel-approved-section']");
    await expect(approvedSection.getByText(uniqueSchoolName).first()).toBeVisible();
    await approvedSection.getByText(/School details/i).first().click();
    await expect(approvedSection.getByText(/Address/i).first()).toBeVisible();
    await expect(approvedSection.getByText(/\+43 512 000000/).first()).toBeVisible();

    await page.getByTestId("schools-status-filter-pending").click();
    await expect(page.locator("[data-testid='schools-panel-approved-section']")).toHaveCount(0);

    await page.getByTestId("schools-status-filter-approved").click();
    await expect(page.locator("[data-testid='schools-panel-pending-section']")).toHaveCount(0);
    await expect(approvedSection.getByText(uniqueSchoolName).first()).toBeVisible();
  });
});
