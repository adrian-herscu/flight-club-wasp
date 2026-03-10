import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

test.describe("manager workflow A", () => {
  test.beforeEach(async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+school_manager.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });
  });

  test("manager can view school profile", async ({ page }) => {
    await page.goto("/admin/school");
    await page.waitForURL("**/admin/school");

    await expect(page.getByRole("heading", { name: "My School" })).toBeVisible();
    await expect(page.getByText("Cloudbase Paragliding")).toBeVisible();
    await expect(page.getByText("123 Mountain Ridge Road")).toBeVisible();
    await expect(page.getByText("Boulder")).toBeVisible();
    await expect(page.getByText("USD").first()).toBeVisible();
  });

  test("manager can discover final syllabuses with policy hints", async ({
    page,
  }) => {
    await page.goto("/admin/syllabuses");
    await page.waitForURL("**/admin/syllabuses");

    await expect(page.getByText("Visibility and usage policy")).toBeVisible();

    await expect(page.getByText("Tandem Flights")).toBeVisible();
    await expect(page.getByText("Paragliding Intro")).toBeVisible();
    await expect(
      page.getByText("Course opening can use only FINAL syllabus versions."),
    ).toBeVisible();
    await expect(
      page.getByText("Drafts are private to the manager's school."),
    ).toBeVisible();
  });
});
