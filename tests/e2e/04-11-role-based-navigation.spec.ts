import { expect, test, type Page } from "@playwright/test";
import { ensureSidebarOpen, logUserIn } from "./utils";

const selectLanguage = async (page: Page, languageLabel: string) => {
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: languageLabel }).click();
};

const expectSidebarOnScreen = async (page: Page) => {
  await ensureSidebarOpen(page);

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
  await ensureSidebarOpen(page);

  const sidebar = page.locator("aside");
  let link = sidebar.getByRole("link", { name: linkName }).first();
  const isVisible = await link.isVisible().catch(() => false);
  if (!isVisible) {
    await sidebar.hover();
    await page.mouse.wheel(0, 600);
    link = sidebar.getByRole("link", { name: linkName }).first();
  }
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
  dashboardRoot: string;
  visibilityRules: VisibilityRule[];
  navSteps: NavStep[];
};

const roleScenarios: RoleScenario[] = [
  {
    testName: "[4.11][STD-NAV-001][STD-NAV-003][@smoke] system admin can open each visible sidebar menu route",
    email: "seed+system_admin.01@example.test",
    dashboardRoot: "/system-admin",
    visibilityRules: [
      { name: "Dashboard", visible: true },
      { name: "Users", visible: true },
      { name: "Schools", visible: true },
      { name: "Member Requests", visible: false },
      { name: "Instructors", visible: false },
      { name: "Students", visible: false },
      { name: "My School", visible: false },
      { name: "Courses", visible: false },
      { name: "Syllabuses", visible: true },
    ],
    navSteps: [
      { linkName: "Dashboard", expectedUrl: /\/system-admin\/?$/ },
      { linkName: "Users", expectedUrl: /\/system-admin\/users\/?$/ },
      { linkName: "Schools", expectedUrl: /\/system-admin\/school-requests\/?$/ },
      {
        linkName: "Syllabuses",
        expectedUrl: /\/system-admin\/syllabuses\?section=catalog$/,
        additionalAssertions: async (page) => {
          await expect(page.getByRole("heading", { name: "404" })).toHaveCount(0);
          await expect(page.getByText(/visibility and usage policy/i)).toBeVisible();
        },
      },
    ],
  },
  {
    testName: "[4.11][STD-NAV-002][STD-NAV-004] school manager can open each visible sidebar menu route",
    email: "seed+school_manager.01@example.test",
    dashboardRoot: "/school-manager",
    visibilityRules: [
      { name: "Dashboard", visible: true },
      { name: "Users", visible: false },
      { name: "Schools", visible: true },
      { name: "Member Requests", visible: false },
      { name: "Instructors", visible: true },
      { name: "Students", visible: true },
      { name: "My School", visible: false },
      { name: "Courses", visible: true },
      { name: "Syllabuses", visible: true },
    ],
    navSteps: [
      { linkName: "Dashboard", expectedUrl: /\/school-manager\/?$/ },
      {
        linkName: "Instructors",
        expectedUrl: /\/school-manager\/member-requests\/instructors\/?$/,
      },
      {
        linkName: "Students",
        expectedUrl: /\/school-manager\/member-requests\/students\/?$/,
      },
      {
        linkName: "Schools",
        expectedUrl: /\/school-manager\/school\/?$/,
        additionalAssertions: async (page) => {
          await expect(page.getByRole("heading", { name: "Schools" }).first()).toBeVisible();
          await expect(page.getByTestId("manager-schools-list")).toBeVisible();
        },
      },
      {
        linkName: "Courses",
        expectedUrl: /\/school-manager\/courses\/?$/,
        additionalAssertions: async (page) => {
          await expect(
            page.getByRole("heading", { name: /open course from final syllabus/i }).first(),
          ).toBeVisible();

          const startDateDateInput = page.locator('input[type="date"]').first();
          await expect(startDateDateInput).toBeVisible();

          const startDateDateTimeInput = page.locator('input[type="datetime-local"]');
          await expect(startDateDateTimeInput).toHaveCount(0);
        },
      },
      { linkName: "Syllabuses", expectedUrl: /\/school-manager\/syllabuses\?section=catalog$/ },
    ],
  },
  {
    testName: "[4.11][STD-NAV-005] instructor sees only instructor-appropriate sidebar links",
    email: "seed+instructor.01@example.test",
    dashboardRoot: "/instructor",
    visibilityRules: [
      { name: "Dashboard", visible: true },
      { name: "Users", visible: false },
      { name: "Schools", visible: false },
      { name: "Instructors", visible: false },
      { name: "Students", visible: false },
      { name: "Courses", visible: false },
      { name: "Syllabuses", visible: false },
    ],
    navSteps: [
      {
        linkName: "Dashboard",
        expectedUrl: /\/instructor\/?$/,
        additionalAssertions: async (page) => {
          await expect(page.getByTestId("instructor-dashboard-placeholder")).toBeVisible();
        },
      },
    ],
  },
  {
    testName: "[4.11][STD-NAV-006] student sees only student-appropriate sidebar links",
    email: "seed+student.01@example.test",
    dashboardRoot: "/student",
    visibilityRules: [
      { name: "Dashboard", visible: true },
      { name: "Users", visible: false },
      { name: "Schools", visible: false },
      { name: "Instructors", visible: false },
      { name: "Students", visible: false },
      { name: "Courses", visible: false },
      { name: "Syllabuses", visible: false },
    ],
    navSteps: [
      {
        linkName: "Dashboard",
        expectedUrl: /\/student\/?$/,
        additionalAssertions: async (page) => {
          await expect(page.getByTestId("student-dashboard-placeholder")).toBeVisible();
        },
      },
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

      await page.goto(scenario.dashboardRoot);
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
        await page.goto(scenario.dashboardRoot);
        await page.waitForLoadState("networkidle");
        await expectSidebarOnScreen(page);
        await clickSidebarLinkAndExpectUrl(page, step.linkName, step.expectedUrl);
        await step.additionalAssertions?.(page);
      }
    });
  });

  test("[4.11][STD-NAV-009] wide screens keep sidebar open", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await logUserIn({
      page,
      user: {
        email: "seed+school_manager.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/syllabuses?section=catalog");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible();

    const beforeGeometry = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      if (!aside) return null;
      const { left, right } = aside.getBoundingClientRect();
      return { left, right, viewport: window.innerWidth };
    });

    expect(beforeGeometry).not.toBeNull();
    expect(beforeGeometry!.left).toBeGreaterThanOrEqual(0);
    expect(beforeGeometry!.right).toBeLessThanOrEqual(beforeGeometry!.viewport + 1);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    await page.mouse.click((viewport?.width ?? 1440) - 24, 120);
    await page.keyboard.press("Escape");

    const afterGeometry = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      if (!aside) return null;
      const { left, right } = aside.getBoundingClientRect();
      return { left, right, viewport: window.innerWidth };
    });

    expect(afterGeometry).not.toBeNull();
    expect(afterGeometry!.left).toBeGreaterThanOrEqual(0);
    expect(afterGeometry!.right).toBeLessThanOrEqual(afterGeometry!.viewport + 1);
  });

  test("[4.11][STD-NAV-010] wide screens keep main content clear of the persistent sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await logUserIn({
      page,
      user: {
        email: "seed+school_manager.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/school");
    await page.waitForLoadState("networkidle");

    const geometry = await page.evaluate(() => {
      const aside = document.querySelector("aside");
      const main = document.querySelector("main");
      if (!aside || !main) return null;
      const asideRect = aside.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      return {
        asideRight: asideRect.right,
        mainLeft: mainRect.left,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry!.mainLeft).toBeGreaterThanOrEqual(geometry!.asideRight - 2);
    await expect(page.getByRole("combobox").first()).toBeVisible();
    await expect(page.locator("header a[href*='messages']")).toHaveCount(0);
  });

  test("[4.11][STD-NAV-011] narrow dashboard keeps a 3-line menu button and right-aligned controls", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 960 });

    await logUserIn({
      page,
      user: {
        email: "seed+school_manager.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/school");
    await page.waitForLoadState("networkidle");

    const headerToggle = page.locator("header button[aria-controls='sidebar']").first();
    await expect(headerToggle).toBeVisible();

    const closedLineWidths = await page.evaluate(() => {
      const button = document.querySelector("header button[aria-controls='sidebar']") as HTMLButtonElement | null;
      const menuLineWrapper = button?.querySelector("span > span") as HTMLSpanElement | null;
      if (!menuLineWrapper) return [] as number[];
      return Array.from(menuLineWrapper.children).map((line) => line.getBoundingClientRect().width);
    });

    expect(closedLineWidths.length).toBe(3);
    expect(closedLineWidths.every((width) => width >= 8)).toBe(true);

    const messageButton = page.locator("header a[href*='messages']");
    await expect(messageButton).toHaveCount(0);

    const controlsGeometry = await page.evaluate(() => {
      const header = document.querySelector("header");
      const languageTrigger = document.querySelector("header [role='combobox']") as HTMLElement | null;
      if (!header || !languageTrigger) return null;
      const headerRect = header.getBoundingClientRect();
      const languageRect = languageTrigger.getBoundingClientRect();
      return {
        headerMidX: headerRect.left + headerRect.width / 2,
        languageLeft: languageRect.left,
      };
    });

    expect(controlsGeometry).not.toBeNull();
    expect(controlsGeometry!.languageLeft).toBeGreaterThan(controlsGeometry!.headerMidX - 40);
  });

  test("[4.11][STD-NAV-007] authenticated plain user does not see admin/manager sidebar links", async ({ page }) => {
    await logUserIn({
      page,
      user: {
        email: "seed+user.01@example.test",
        password: "12345678",
      },
      expectedRedirectPath: "/registration",
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("aside")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Schools" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Instructors" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Students" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Courses" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Syllabuses" })).toHaveCount(0);
  });

});
