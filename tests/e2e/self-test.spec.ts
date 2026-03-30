import { expect, test } from "@playwright/test";

test.describe("self tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("app opens and has title", async ({ page }) => {
    await expect(page).toHaveTitle("Flight Club");
  });

});