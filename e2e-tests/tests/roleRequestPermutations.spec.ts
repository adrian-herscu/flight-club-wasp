import { expect, test, type Page } from "@playwright/test";
import { logUserIn } from "./utils";

async function submitRegistrationForm(page: Page) {
  await page.locator(".flex.justify-end button").click();
}

async function expectPendingOrDuplicate(page: Page, requestedRole: RegExp) {
  await expect
    .poll(async () => {
      const pendingCount = await page.getByText("PENDING").count();
      const duplicateCount = await page
        .getByText(/pending request for this role/i)
        .count();
      const roleCount = await page.getByText(requestedRole).count();

      if (pendingCount > 0 && roleCount > 0) {
        return "pending";
      }

      if (duplicateCount > 0) {
        return "duplicate";
      }

      return "waiting";
    })
    .toMatch(/pending|duplicate/);
}

test.describe("registration role permutations", () => {
  test("student can submit an instructor request for a school", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+student.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto(
      "/registration?role=INSTRUCTOR&schoolId=seed-school-cloudbase-paragliding",
    );
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

    await page.locator("#fullName").fill("Student One");
    await page.locator("#phone").fill("+1 555 0101");

    await submitRegistrationForm(page);

    await expectPendingOrDuplicate(page, /INSTRUCTOR/i);
  });

  test("instructor can submit a school registration request", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+instructor.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/registration?role=SCHOOL_MANAGER");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

    await page.locator("#fullName").fill("Instructor One");
    await page.locator("#phone").fill("+1 555 0102");

    await page.locator("#requestedSchoolName").fill("Skyward Academy Test");
    await page.locator("#requestedWebsiteUrl").fill("https://skyward.example.test");
    await page.locator("#requestedAddressLine1").fill("100 Launch Road");
    await page.locator("#requestedCity").fill("Annecy");
    await page.locator("#requestedPostalCode").fill("74000");
    await page.locator("#requestedCountry").fill("FR");
    await page.locator("#requestedCurrency").fill("EUR");

    await submitRegistrationForm(page);

    await expectPendingOrDuplicate(page, /SCHOOL_MANAGER/i);
  });

  test("school manager can submit a student request for a school", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+school_manager.02@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto(
      "/registration?role=STUDENT&schoolId=seed-school-cloudbase-paragliding",
    );
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

    await page.locator("#fullName").fill("Manager Two");
    await page.locator("#phone").fill("+1 555 0103");

    await submitRegistrationForm(page);

    await expectPendingOrDuplicate(page, /STUDENT/i);
  });
});