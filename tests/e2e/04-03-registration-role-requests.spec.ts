import { expect, test, type Page } from "@playwright/test";
import { createTestCourseWithManager, logUserIn, provisionFreshEmailUser } from "./utils.js";

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
  test("[4.3][STD-REG-011][STD-REG-013] school manager request duplicate is blocked deterministically", async ({ page }) => {
    test.slow();

    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
      expectedRedirectPath: "/registration",
    });

    const uniqueSchoolName = `E2E Duplicate School ${Date.now()}`;

    await page.goto("/registration?role=SCHOOL_MANAGER");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

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

    await submitRegistrationForm(page);
    await expectSubmissionErrorVisible(page);
  });


  test("[4.3][STD-REG-012] approved role cannot be re-requested for the same school", async ({ page }) => {
    test.slow();

    // Generate isolated data: fresh requester + fresh manager who owns a fresh school
    const [requester, { manager, schoolId }] = await Promise.all([
      provisionFreshEmailUser(),
      createTestCourseWithManager(),
    ]);

    // Step 1: requester submits instructor request for the generated school
    await logUserIn({
      page,
      user: requester,
      expectedRedirectPath: "/registration",
    });

    await page.goto(`/registration?role=INSTRUCTOR&schoolId=${schoolId}`);
    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

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

    await page.goto(`/registration?role=INSTRUCTOR&schoolId=${schoolId}`);
    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

    await page.locator("#fullName").fill("Test Requester");
    await page.locator("#phone").fill("+1 555 0199");
    await submitRegistrationForm(page);

    await expectSubmissionErrorVisible(page);
  });
});
