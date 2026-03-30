import { expect, test, type Page } from "@playwright/test";
import { logUserIn } from "./utils";

async function submitRegistrationForm(page: Page) {
  const submitBtn = page.getByRole("button", { name: /submit|continue|next/i }).last();
  await submitBtn.waitFor({ state: "visible", timeout: 5000 });
  await submitBtn.click();
}

async function expectSubmissionErrorVisible(page: Page) {
  await expect(page.getByText(/submission failed/i).first()).toBeVisible({ timeout: 8000 });
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
    await logUserIn({
      page,
      user: {
        email: "seed+user.01@example.test",
        password: "12345678",
      },
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

    const requesterEmail = "seed+user.02@example.test";
    const managerEmail = "seed+school_manager.01@example.test";

    await logUserIn({
      page,
      user: {
        email: requesterEmail,
        password: "12345678",
      },
      expectedRedirectPath: "/registration",
    });

    await page.goto(
      "/registration?role=INSTRUCTOR&schoolId=seed-school-cloudbase-paragliding",
    );
    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

    await page.locator("#fullName").fill("Seed User 02");
    await page.locator("#phone").fill("+1 555 0199");
    await submitRegistrationForm(page);

    const alreadyApproved = (await page.getByText(/already hold this role for the selected school/i).count()) > 0;

    if (!alreadyApproved) {
      await logUserIn({
        page,
        user: {
          email: managerEmail,
          password: "12345678",
        },
        expectedRedirectPath: "/",
      });

      await page.goto("/school-manager/member-requests/instructors");
      await expect(
        page.getByTestId("manager-requests-instructors-pending-section").first(),
      ).toBeVisible();

      const pendingSection = page.locator("[data-testid='manager-requests-instructors-pending-section']");
      const pendingCard = pendingSection
        .locator("[data-testid='manager-member-request-card']")
        .filter({ hasText: requesterEmail })
        .first();

      if (await pendingCard.count()) {
        await pendingCard.getByRole("button", { name: /approve/i }).click();
        const approvedSection = page.locator("[data-testid='manager-requests-instructors-approved-section']");
        await expect(
          approvedSection
            .locator("[data-testid='manager-member-request-card']")
            .filter({ hasText: requesterEmail })
            .first(),
        ).toBeVisible();
      }

      await logUserIn({
        page,
        user: {
          email: requesterEmail,
          password: "12345678",
        },
        expectedRedirectPath: "/registration",
      });

      await page.goto(
        "/registration?role=INSTRUCTOR&schoolId=seed-school-cloudbase-paragliding",
      );
      await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

      await page.locator("#fullName").fill("Seed User 02");
      await page.locator("#phone").fill("+1 555 0199");
      await submitRegistrationForm(page);
    }

    await expectSubmissionErrorVisible(page);
  });
});