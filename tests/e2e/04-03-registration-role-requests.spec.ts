import { expect, test, type Page } from "@playwright/test";
import { createTestCourseWithManager, logUserIn, provisionFreshEmailUser } from "./utils.js";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function openRequestNewRoleForm(
  page: Page,
  role: "SCHOOL_MANAGER" | "INSTRUCTOR",
) {
  const tabName = role === "SCHOOL_MANAGER" ? /request manager/i : /request instructor/i;
  const roleTab = page.getByRole("button", { name: tabName }).first();
  await expect(roleTab).toBeVisible();
  await roleTab.click();
}

async function selectTargetSchool(page: Page, schoolName: string) {
  await page.locator("#registration-school-select").click();
  await page.waitForSelector('[role="option"]', { state: "visible" });
  await page.evaluate((targetSchoolName) => {
    const options = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]'),
    ).filter((option) => option.offsetParent !== null);

    const matchingOption = options.find((option) =>
      option.textContent?.toLowerCase().includes(targetSchoolName.toLowerCase()),
    );

    if (!matchingOption) {
      throw new Error(`Could not find school option matching: ${targetSchoolName}`);
    }

    matchingOption.scrollIntoView({ block: "center" });
    matchingOption.click();
  }, schoolName);
}

async function submitRegistrationForm(page: Page) {
  const submitBtn = page.getByRole("button", { name: /submit|continue|next/i }).last();
  await submitBtn.waitFor({ state: "visible", timeout: 5000 });
  await submitBtn.click();
}

async function expectSubmissionErrorVisible(page: Page) {
  await expect(
    page.locator('[data-slot="toast"][class*="bg-destructive"]').first(),
  ).toBeVisible({ timeout: 8000 });
}

async function expectPendingRequestVisible(
  page: Page,
  requestedRole: RegExp,
  requestedSchoolName?: string,
) {
  // Navigate to My Requests tab to see history
  await page.getByRole("button", { name: /my requests/i }).first().click();
  await page.getByRole("button", { name: /pending/i }).first().click();

  await expect
    .poll(async () => {
      const pendingCount = await page.getByText("PENDING").count();
      const roleCount = await page.getByText(requestedRole).count();
      const schoolCount = requestedSchoolName
        ? await page.getByText(requestedSchoolName).count()
        : 1;

      return pendingCount > 0 && roleCount > 0 && schoolCount > 0;
    })
    .toBe(true);
}


test.describe("4.3 registration and role requests", () => {
  test("[4.3][STD-REG-001][STD-REG-011][STD-REG-013] school manager request duplicate is blocked deterministically", async ({ page }) => {
    test.slow();

    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/registration",
    });

    const uniqueSchoolName = `E2E Duplicate School ${Date.now()}`;

    await page.goto("/registration");
    await page.waitForLoadState("networkidle");
    await openRequestNewRoleForm(page, "SCHOOL_MANAGER");

    await page.locator("#fullName").fill("User One");
    await page.locator("#phone").fill("+1 555 1111");
    await page.locator("#requestedSchoolName").fill(uniqueSchoolName);
    await page.locator("#requestedWebsiteUrl").fill("https://duplicate-role-check.example.test");
    await page.locator("#requestedAddressLine1").fill("10 Drift Avenue");
    await page.locator("#requestedCity").fill("Annecy");
    await page.locator("#requestedPostalCode").fill("74000");
    await page.locator("#requestedCountry").fill("FR");
    await page.locator("#requestedCurrency").fill("EUR");

    await submitRegistrationForm(page);
    await expectPendingRequestVisible(page, /SCHOOL_MANAGER/i, uniqueSchoolName);

    await openRequestNewRoleForm(page, "SCHOOL_MANAGER");
    await submitRegistrationForm(page);
    await expectSubmissionErrorVisible(page);
  });


  test("[4.3][STD-REG-004][STD-REG-012] approved role cannot be re-requested for the same school", async ({ page }) => {
    test.slow();

    // Generate isolated data: fresh requester + fresh manager who owns a fresh school
    const [requester, { manager, schoolName }] = await Promise.all([
      provisionFreshEmailUser(),
      createTestCourseWithManager(),
    ]);

    // Step 1: requester submits instructor request for the generated school
    await logUserIn({
      page,
      user: requester,
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration");
    await openRequestNewRoleForm(page, "INSTRUCTOR");
    await selectTargetSchool(page, schoolName);

    await page.locator("#fullName").fill("Test Requester");
    await page.locator("#phone").fill("+1 555 0199");
    await submitRegistrationForm(page);

    // Step 2: manager approves the request
    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/member-requests/instructors");
    await expect(
      page.getByTestId("manager-requests-instructors-pending-section").first(),
    ).toBeVisible();

    const pendingSection = page.locator("[data-testid='manager-requests-instructors-pending-section']");
    const pendingCard = pendingSection
      .locator("[data-testid='manager-member-request-card']")
      .filter({ hasText: requester.email })
      .first();

    if (await pendingCard.count()) {
      await pendingCard.getByRole("button", { name: /approve/i }).click();
      const approvedSection = page.locator("[data-testid='manager-requests-instructors-approved-section']");
      await expect(
        approvedSection
          .locator("[data-testid='manager-member-request-card']")
          .filter({ hasText: requester.email })
          .first(),
      ).toBeVisible();
    }

    // Step 3: requester tries to request the same role again — must fail
    await logUserIn({
      page,
      user: requester,
      expectedRedirectPath: "/registration",
    });

    await page.goto("/registration");
    await openRequestNewRoleForm(page, "INSTRUCTOR");
    await selectTargetSchool(page, schoolName);

    await page.locator("#fullName").fill("Test Requester");
    await page.locator("#phone").fill("+1 555 0199");
    await submitRegistrationForm(page);

    await expectSubmissionErrorVisible(page);
  });
});
