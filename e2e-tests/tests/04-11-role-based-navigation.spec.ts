import { expect, test, type Page } from "@playwright/test";
import { logUserIn } from "./utils";

const selectLanguage = async (page: Page, languageLabel: string) => {
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: languageLabel }).click();
};

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

type VisibilityRule = {
  name: string;
  visible: boolean;
};

type NavStep = {
  linkName: string;
  expectedUrl: RegExp;
  additionalAssertions?: (page: Page) => Promise<void>;
};

type RoleScenario = {
  testName: string;
  email: string;
  visibilityRules: VisibilityRule[];
  navSteps: NavStep[];
};

const roleScenarios: RoleScenario[] = [
  {
    testName: "[4.11][STD-NAV-001][STD-NAV-003][@smoke] system admin can open each visible sidebar menu route",
    email: "seed+system_admin.01@example.test",
    visibilityRules: [
      { name: "Schools", visible: true },
      { name: "Member Requests", visible: false },
      { name: "My School", visible: false },
      { name: "Syllabuses", visible: true },
    ],
    navSteps: [
      { linkName: "Dashboard", expectedUrl: /\/admin\/?$/ },
      { linkName: "Users", expectedUrl: /\/admin\/users\/?$/ },
      { linkName: "Schools", expectedUrl: /\/admin\/school-requests\/?$/ },
      { linkName: "Syllabuses", expectedUrl: /\/admin\/syllabuses\?section=catalog$/ },
      { linkName: "Calendar", expectedUrl: /\/admin\/calendar\/?$/ },
    ],
  },
  {
    testName: "[4.11][STD-NAV-002][STD-NAV-004] school manager can open each visible sidebar menu route",
    email: "seed+school_manager.01@example.test",
    visibilityRules: [
      { name: "Schools", visible: true },
      { name: "Member Requests", visible: false },
      { name: "Instructors", visible: true },
      { name: "Students", visible: true },
      { name: "My School", visible: false },
      { name: "Syllabuses", visible: true },
    ],
    navSteps: [
      { linkName: "Dashboard", expectedUrl: /\/admin\/?$/ },
      {
        linkName: "Instructors",
        expectedUrl: /\/admin\/member-requests\/instructors\/?$/,
      },
      {
        linkName: "Students",
        expectedUrl: /\/admin\/member-requests\/students\/?$/,
      },
      {
        linkName: "Schools",
        expectedUrl: /\/admin\/school\/?$/,
        additionalAssertions: async (page) => {
          await expect(page.getByRole("heading", { name: "Schools" }).first()).toBeVisible();
          await expect(page.getByTestId("manager-schools-list")).toBeVisible();
        },
      },
      { linkName: "Syllabuses", expectedUrl: /\/admin\/syllabuses\?section=catalog$/ },
      { linkName: "Calendar", expectedUrl: /\/admin\/calendar\/?$/ },
    ],
  },
];

test.describe("4.11 role-based navigation", () => {
  roleScenarios.forEach((scenario) => {
    test(scenario.testName, async ({ page }) => {
      await logUserIn({
        page,
        user: {
          email: scenario.email,
          password: "12345678",
        },
        expectedRedirectPath: "/",
      });

      await page.goto("/admin");
      await page.waitForLoadState("networkidle");

      await expectSidebarOnScreen(page);

      const sidebar = page.locator("aside");
      for (const rule of scenario.visibilityRules) {
        const link = sidebar.getByRole("link", { name: rule.name });
        if (rule.visible) {
          await expect(link).toBeVisible();
        } else {
          await expect(link).toHaveCount(0);
        }
      }

      for (const step of scenario.navSteps) {
        await clickSidebarLinkAndExpectUrl(page, step.linkName, step.expectedUrl);
        await step.additionalAssertions?.(page);
      }

      const uiElementsLink = sidebar.getByRole("link", { name: "UI Elements" }).first();
      await expect(uiElementsLink).toBeVisible();
      await uiElementsLink.click();
      await expect(sidebar.getByRole("link", { name: "Buttons" }).first()).toBeVisible();
      await clickSidebarLinkAndExpectUrl(page, "Buttons", /\/admin\/ui\/buttons\/?$/);
    });
  });

});
