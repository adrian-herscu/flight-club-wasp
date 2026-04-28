import { expect, test } from "@playwright/test";
import {
  createTestCourseWithManager,
  createTestSystemAdmin,
  logUserIn,
  provisionFreshEmailUser,
  type User,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function submitSchoolManagerRequest(
  page: Parameters<typeof logUserIn>[0]["page"],
  user: User,
  schoolName: string,
): Promise<void> {
  await logUserIn({ page, user, expectedRedirectPath: "/registration" });
  await page.goto("/registration");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

  await page.locator("#registration-requested-role").click();
  await page.getByRole("option", { name: /school manager/i }).first().click();

  await page.locator("#fullName").fill("Reg History User");
  await page.locator("#phone").fill("+1 555 0190");
  await page.locator("#requestedSchoolName").fill(schoolName);
  await page.locator("#requestedWebsiteUrl").fill("https://reg-history.example.test");
  await page.locator("#requestedAddressLine1").fill("1 History Lane");
  await page.locator("#requestedCity").fill("Vienna");
  await page.locator("#requestedPostalCode").fill("1010");
  await page.locator("#requestedCountry").fill("AT");
  await page.locator("#requestedCurrency").fill("EUR");

  const submitBtn = page.getByRole("button", { name: /submit|continue|next/i }).last();
  await submitBtn.waitFor({ state: "visible", timeout: 5000 });
  await submitBtn.click();
  // Wait for history panel to appear with the new request
  await expect(page.getByText(/SCHOOL_MANAGER/)).toBeVisible({ timeout: 10000 });
}

async function submitInstructorRequest(
  page: Parameters<typeof logUserIn>[0]["page"],
  user: User,
  schoolName: string,
): Promise<void> {
  await logUserIn({ page, user, expectedRedirectPath: "/registration" });
  await page.goto("/registration");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: /registration/i }).first()).toBeVisible();

  await page.locator("#registration-requested-role").click();
  await page.getByRole("option", { name: /instructor/i }).first().click();

  await page.locator("#registration-school-select").click();
  await page.waitForSelector('[role="option"]', { state: "visible" });
  await page.evaluate((targetSchoolName) => {
    const options = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]'),
    ).filter((option) => option.offsetParent !== null);
    const match = options.find((o) =>
      o.textContent?.toLowerCase().includes(targetSchoolName.toLowerCase()),
    );
    if (!match) throw new Error(`School option not found: ${targetSchoolName}`);
    match.scrollIntoView({ block: "center" });
    match.click();
  }, schoolName);

  await page.locator("#fullName").fill("Instructor Requester");
  await page.locator("#phone").fill("+1 555 0191");

  const submitBtn = page.getByRole("button", { name: /submit|continue|next/i }).last();
  await submitBtn.waitFor({ state: "visible", timeout: 5000 });
  await submitBtn.click();
  // Wait for history panel with the new request
  await expect(page.getByText(/INSTRUCTOR/)).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("4.19 rejection history visibility", () => {
  test("[STD-REG-015] submitted school-manager request appears in registration history panel", async ({ page }) => {
    const user = await provisionFreshEmailUser();
    const schoolName = `E2E History School ${Date.now()}`;

    await submitSchoolManagerRequest(page, user, schoolName);

    // Navigate away and come back to prove persistent history
    await page.goto("/");
    await page.goto("/registration");
    await page.waitForLoadState("networkidle");

    // History panel should show the pending request with role and status
    await expect(page.getByText(/SCHOOL_MANAGER/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/PENDING/)).toBeVisible();
    await expect(page.getByText(schoolName)).toBeVisible();
  });

  test("[STD-ADM-005][STD-INT-002] admin rejection is visible to requester with rejection reason after re-navigation", async ({ page }) => {
    test.slow();

    const [requester, adminUser] = await Promise.all([
      provisionFreshEmailUser(),
      createTestSystemAdmin(),
    ]);
    const schoolName = `E2E Reject School ${Date.now()}`;
    const rejectionReason = `E2E rejection reason ${Date.now()}`;

    // Step 1: requester submits school manager request
    await submitSchoolManagerRequest(page, requester, schoolName);

    // Step 2: admin logs in and rejects the request
    await logUserIn({ page, user: adminUser, expectedRedirectPath: "/" });
    await page.goto("/system-admin/school-requests");
    await page.waitForURL("**/system-admin/school-requests");
    await expect(
      page.locator("[data-testid='schools-panel-pending-section']"),
    ).toBeVisible();

    const pendingCard = page
      .locator("[data-testid='schools-panel-pending-section']")
      .getByText(schoolName)
      .first();
    const requestCard = pendingCard
      .locator("xpath=ancestor::*[@data-testid='school-request-card']")
      .first();

    // Fill in rejection reason and click reject
    await requestCard.locator("input, textarea").last().fill(rejectionReason);
    await requestCard.getByRole("button", { name: /reject/i }).click();

    // Request should disappear from pending section (moves to REJECTED state, which admin doesn't show)
    await expect.poll(async () => {
      const cards = await page
        .locator("[data-testid='schools-panel-pending-section']")
        .getByText(schoolName)
        .count();
      return cards;
    }, { timeout: 10000 }).toBe(0);

    // Step 3: requester navigates to /registration and sees REJECTED status + reason
    await logUserIn({ page, user: requester, expectedRedirectPath: "/registration" });
    await page.goto("/registration");
    await page.waitForLoadState("networkidle");

    // History panel should show REJECTED status
    await expect(page.getByText("REJECTED")).toBeVisible({ timeout: 10000 });
    // Rejection reason should be visible
    await expect(page.getByText(rejectionReason)).toBeVisible();
  });

  test("[STD-MGR-008] manager rejection of instructor request is visible to requester with status on re-navigation", async ({ page }) => {
    test.slow();

    const { manager, schoolName } = await createTestCourseWithManager();
    const instructorRequester = await provisionFreshEmailUser();
    const rejectionReason = `E2E instructor rejection ${Date.now()}`;

    // Step 1: instructor requester submits instructor request
    await submitInstructorRequest(page, instructorRequester, schoolName);

    // Step 2: manager logs in and rejects the request
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto("/school-manager/member-requests/instructors");
    await page.waitForURL("**/school-manager/member-requests/instructors");
    await expect(
      page.getByTestId("manager-requests-instructors-pending-section").first(),
    ).toBeVisible({ timeout: 10000 });

    const pendingSection = page.locator(
      "[data-testid='manager-requests-instructors-pending-section']",
    );
    const requestCard = pendingSection
      .locator("[data-testid='manager-member-request-card']")
      .filter({ hasText: instructorRequester.email })
      .first();

    await requestCard.waitFor({ state: "visible", timeout: 10000 });

    // Fill in rejection reason
    const reasonInput = requestCard.locator("input, textarea").last();
    await reasonInput.fill(rejectionReason);
    await requestCard.getByRole("button", { name: /reject/i }).click();

    // Wait until the card disappears from the pending section (REJECTED requests are excluded from manager list)
    await expect.poll(async () => {
      return requestCard.count();
    }, { timeout: 10000 }).toBe(0);

    // Step 3: instructor requester navigates to /registration and sees REJECTED status
    await logUserIn({ page, user: instructorRequester, expectedRedirectPath: "/registration" });
    await page.goto("/registration");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("REJECTED")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(rejectionReason)).toBeVisible();
  });
});
