import { expect, test, type Page } from "@playwright/test";
import { createTestSystemAdmin, logUserIn, provisionFreshEmailUser, type User } from "./utils.js";

test.describe("4.4 admin approval workflow", () => {
  let systemAdminUser: User;
  let requesterUser: User;

  test.beforeAll(async () => {
    [systemAdminUser, requesterUser] = await Promise.all([
      createTestSystemAdmin(),
      provisionFreshEmailUser(),
    ]);
  });

  const fillSchoolManagerRequestForm = async (
    page: Page,
    uniqueSchoolName: string,
  ) => {
    await page.goto("/registration");
    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();
    await page.locator("#registration-requested-role").click();
    await page.getByRole("option", { name: /school manager/i }).first().click();

    await page.locator("#fullName").fill("Seed User 01");
    await page.locator("#phone").fill("+1 555 0160");
    await page.locator("#requestedSchoolName").fill(uniqueSchoolName);
    await page.locator("#requestedWebsiteUrl").fill("https://e2e-school.example.test");
    await page.locator("#requestedLogoUrl").fill("https://e2e-school.example.test/logo.png");
    await page.locator("#requestedAddressLine1").fill("10 Alpine Way");
    await page.locator("#requestedCity").fill("Innsbruck");
    await page.locator("#requestedPostalCode").fill("6020");
    await page.locator("#requestedCountry").fill("AT");
    await page.locator("#requestedCurrency").fill("EUR");

    await page.locator(".flex.justify-end button").click();
    await expect(page.getByText(uniqueSchoolName)).toBeVisible();
  };

  const loginAsSystemAdmin = async (page: Page) => {
    await logUserIn({
      page,
      user: systemAdminUser,
      expectedRedirectPath: "/",
    });
  };

  const loginAsRequesterForRegistration = async (page: Page) => {
    await logUserIn({
      page,
      user: requesterUser,
      expectedRedirectPath: "/registration",
    });
  };

  test("[4.2][STD-AUTH-001] system admin login redirects to dashboard", async ({ page }) => {
    await loginAsSystemAdmin(page);

    await page.goto("/system-admin");
    await expect(page.getByTestId("admin-dashboard-placeholder")).toBeVisible();

    await expect(page).toHaveURL(/\/system-admin\/?(?:[?#].*)?$/);
    await expect(page.getByTestId("admin-dashboard-placeholder")).toHaveText("Under construction");
    await expect(page.getByRole("heading", { name: "Users" })).toBeHidden();
  });

  test("[4.11][STD-NAV-003] system admin sees provisioned user without applying status filter", async ({ page }) => {
    await loginAsSystemAdmin(page);

    await page.goto("/system-admin/users");
    await page.waitForURL("**/system-admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    // The admin should see themselves in the user list
    await expect(page.getByText(systemAdminUser.email)).toBeVisible();
  });

  test("[4.11][4.7][STD-NAV-003][STD-SYL-001][STD-SYL-002] system admin can access syllabuses from sidebar and view catalog", async ({ page }) => {
    await loginAsSystemAdmin(page);

    await page.goto("/system-admin");
    await expect(page.getByTestId("admin-dashboard-placeholder")).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: /syllabuses|תוכניות לימוד|planuri de studiu/i,
      }),
    ).toBeVisible();

    await page.goto("/system-admin/syllabuses?section=catalog");
    await page.waitForURL("**/system-admin/syllabuses?section=catalog");
    await expect(page).toHaveURL(/\/system-admin\/syllabuses\?section=catalog/);
    await expect(page.getByRole("heading", { name: "404" })).toHaveCount(0);
    await expect(page.getByText(/visibility and usage policy/i)).toBeVisible();
    await expect(
      page.getByText("Only school managers can access this resource."),
    ).toHaveCount(0);
  });

  test("[4.4][STD-ADM-001][STD-ADM-002] system admin can create and view pending school requests", async ({ page }) => {
    const uniqueSchoolName = `E2E Flight School ${Date.now()}`;

    await loginAsRequesterForRegistration(page);
    await fillSchoolManagerRequestForm(page, uniqueSchoolName);

    await loginAsSystemAdmin(page);

    await page.goto("/system-admin/school-requests");
    await page.waitForURL("**/system-admin/school-requests");
    await expect(page.locator("[data-testid='schools-panel-pending-section']")).toBeVisible();

    const pendingCard = page.locator("[data-testid='schools-panel-pending-section']").getByText(uniqueSchoolName).first();
    await expect(pendingCard).toBeVisible();
  });

  test("[4.4][STD-ADM-007] system admin can approve school requests (UI smoke)", async ({ page }) => {
    const uniqueSchoolName = `E2E Approval School ${Date.now()}`;

    // Create school request first
    await loginAsRequesterForRegistration(page);
    await fillSchoolManagerRequestForm(page, uniqueSchoolName);

    // Login as admin and approve
    await loginAsSystemAdmin(page);

    await page.goto("/system-admin/school-requests");
    await page.waitForURL("**/system-admin/school-requests");
    await expect(page.locator("[data-testid='schools-panel-pending-section']")).toBeVisible();

    const pendingCard = page.locator("[data-testid='schools-panel-pending-section']").getByText(uniqueSchoolName).first();
    const requestCard = pendingCard.locator("xpath=ancestor::*[@data-testid='school-request-card']").first();
    await requestCard.getByRole("button", { name: /approve/i }).click();

    const approvedSection = page.locator("[data-testid='schools-panel-approved-section']");
    await expect(approvedSection.getByText(uniqueSchoolName).first()).toBeVisible();
  });
});
