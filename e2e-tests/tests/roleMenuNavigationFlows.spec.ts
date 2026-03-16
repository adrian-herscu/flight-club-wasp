import { expect, test, type Page } from "@playwright/test";
import { logUserIn } from "./utils";

const expectSidebarOnScreen = async (page: Page) => {
  const sidebar = page.locator("aside");
  await expect(sidebar).toBeVisible();

  const rect = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return null;
    const { left, right } = aside.getBoundingClientRect();
    return { left, right, viewport: window.innerWidth };
  });

  expect(rect).not.toBeNull();
  expect(rect!.left).toBeGreaterThanOrEqual(0);
  expect(rect!.right).toBeLessThanOrEqual(rect!.viewport + 1);
};

const clickSidebarLinkAndExpectUrl = async (
  page: Page,
  linkName: string,
  expectedUrl: RegExp,
) => {
  const sidebar = page.locator("aside");
  const link = sidebar.getByRole("link", { name: linkName }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(expectedUrl);
};

test.describe("role menu navigation flows", () => {
  test("system admin can open each visible sidebar menu route", async ({ page }) => {
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

    await expectSidebarOnScreen(page);

    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Schools" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Member Requests" })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: "My School" })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: "Syllabuses" })).toBeVisible();

    await clickSidebarLinkAndExpectUrl(page, "Dashboard", /\/admin\/?$/);
    await clickSidebarLinkAndExpectUrl(page, "Users", /\/admin\/users\/?$/);
    await clickSidebarLinkAndExpectUrl(page, "Schools", /\/admin\/school-requests\/?$/);
    await clickSidebarLinkAndExpectUrl(page, "Syllabuses", /\/admin\/syllabuses\?section=catalog$/);
    await clickSidebarLinkAndExpectUrl(page, "Calendar", /\/admin\/calendar\/?$/);

    const uiElementsLink = sidebar.getByRole("link", { name: "UI Elements" }).first();
    await expect(uiElementsLink).toBeVisible();
    await uiElementsLink.click();
    await expect(sidebar.getByRole("link", { name: "Buttons" }).first()).toBeVisible();
    await clickSidebarLinkAndExpectUrl(page, "Buttons", /\/admin\/ui\/buttons\/?$/);
  });

  test("school manager can open each visible sidebar menu route", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+school_manager.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expectSidebarOnScreen(page);

    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("link", { name: "Schools" })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: "Member Requests" })).toHaveCount(0);
    await expect(sidebar.getByRole("link", { name: "Instructors" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Students" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "My School" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Syllabuses" })).toBeVisible();

    await clickSidebarLinkAndExpectUrl(page, "Dashboard", /\/admin\/?$/);
    await clickSidebarLinkAndExpectUrl(page, "Instructors", /\/admin\/member-requests\/instructors\/?$/);
    await clickSidebarLinkAndExpectUrl(page, "Students", /\/admin\/member-requests\/students\/?$/);
    await clickSidebarLinkAndExpectUrl(page, "My School", /\/admin\/school\/?$/);
    await clickSidebarLinkAndExpectUrl(page, "Syllabuses", /\/admin\/syllabuses\?section=catalog$/);
    await clickSidebarLinkAndExpectUrl(page, "Calendar", /\/admin\/calendar\/?$/);

    const uiElementsLink = sidebar.getByRole("link", { name: "UI Elements" }).first();
    await expect(uiElementsLink).toBeVisible();
    await uiElementsLink.click();
    await expect(sidebar.getByRole("link", { name: "Buttons" }).first()).toBeVisible();
    await clickSidebarLinkAndExpectUrl(page, "Buttons", /\/admin\/ui\/buttons\/?$/);
  });
});
