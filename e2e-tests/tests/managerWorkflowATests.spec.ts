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

  test.skip("manager can view school profile", async ({ page }) => {
    await page.goto("/admin/school");
    await page.waitForURL("**/admin/school");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "My School" })).toBeVisible();
    await expect(page.getByText("Cloudbase Paragliding")).toBeVisible();
    await expect(page.getByText("123 Mountain Ridge Road")).toBeVisible();
    await expect(page.getByText("Boulder")).toBeVisible();
    await expect(page.getByText("USD").first()).toBeVisible();
  });

  test.skip("manager can discover final syllabuses with policy hints", async ({
    page,
  }) => {
    await page.goto("/admin/syllabuses");
    await page.waitForURL("**/admin/syllabuses");
    await page.waitForLoadState("networkidle");

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

  test("rtl layout: sidebar stays anchored to right on syllabuses page", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "seed+school_manager.01@example.test");
    await page.fill('input[name="password"]', "12345678");
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");

    await page.goto("/admin/syllabuses?section=catalog");
    await page.waitForURL("**/admin/syllabuses?section=catalog");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/syllabuses\?section=catalog/);

    const cookieAcceptButton = page.getByRole("button", { name: /Accept all/i });
    if (await cookieAcceptButton.count()) {
      await cookieAcceptButton.first().click();
    }

    await page.evaluate(() => {
      localStorage.setItem("locale", "he");
      document.documentElement.lang = "he";
      document.documentElement.dir = "rtl";
    });

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect
      .poll(async () => page.getAttribute("html", "dir"))
      .toBe("rtl");

    const geometry = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const main = document.querySelector("main");
      if (!aside || !main) {
        return {
          viewportWidth: window.innerWidth,
          asideFound: !!aside,
          mainFound: !!main,
          pathname: window.location.pathname,
          search: window.location.search,
        };
      }

      const asideRect = aside.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();

      return {
        viewportWidth: window.innerWidth,
        asideRight: asideRect.right,
        mainLeft: mainRect.left,
        asideFound: true,
        mainFound: true,
        pathname: window.location.pathname,
        search: window.location.search,
      };
    });

    expect((geometry as any).asideFound).toBe(true);
    expect((geometry as any).mainFound).toBe(true);
    expect((geometry as any).pathname).toBe("/admin/syllabuses");

    expect(Math.abs((geometry as any).asideRight - (geometry as any).viewportWidth)).toBeLessThanOrEqual(2);
    expect((geometry as any).mainLeft).toBeGreaterThanOrEqual(0);
  });
});
