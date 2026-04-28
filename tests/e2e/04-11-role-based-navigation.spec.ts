import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  createTestCourseWithManager,
  createTestSystemAdmin,
  ensureSidebarOpen,
  logUserIn,
  provisionFreshEmailUser,
  type User,
} from "./utils.js";

const createStudentNavigationFixture = async (): Promise<User> => {
  const [firstCourse, secondCourse, student] = await Promise.all([
    createTestCourseWithManager(),
    createTestCourseWithManager(),
    provisionFreshEmailUser(),
  ]);

  const [{ PrismaClient }, { config }, { resolve }] = await Promise.all([
    import("@prisma/client"),
    import("dotenv"),
    import("path"),
  ]);

  config({
    path: resolve(process.cwd(), ".env.server"),
    override: false,
  });

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: student.email },
      select: { id: true },
    });

    if (!user) {
      throw new Error(`Student user not found after provisioning: ${student.email}`);
    }

    const schools = await prisma.school.findMany({
      where: { id: { in: [firstCourse.schoolId, secondCourse.schoolId] } },
      select: { id: true, adminId: true, currency: true },
    });

    const schoolById = new Map(schools.map((school) => [school.id, school]));

    const studentProfile = await prisma.student.create({
      data: { userId: user.id },
      select: { id: true },
    });

    for (const courseFixture of [firstCourse, secondCourse]) {
      const school = schoolById.get(courseFixture.schoolId);
      if (!school?.adminId) {
        throw new Error(`School fixture not found for course school: ${courseFixture.schoolId}`);
      }

      const requestId = `e2e-request-student-${randomUUID()}`;
      await prisma.registrationRequest.create({
        data: {
          id: requestId,
          requesterId: user.id,
          requestedRole: "STUDENT",
          status: "APPROVED",
          targetSchoolId: school.id,
          reviewerId: school.adminId,
          reviewedAt: new Date(),
        },
      });

      await prisma.registrationRequestDecision.create({
        data: {
          id: `e2e-request-decision-student-${randomUUID()}`,
          decisionType: "APPROVED",
          requestId,
          reviewerId: school.adminId,
        },
      });

      await prisma.userSchoolRole.create({
        data: {
          userId: user.id,
          schoolId: school.id,
          role: "STUDENT",
          sourceRegistrationRequestId: requestId,
          grantedByUserId: school.adminId,
        },
      });

      await prisma.account.create({
        data: {
          userId: user.id,
          schoolId: school.id,
          currency: school.currency,
        },
      });

      await prisma.enrolledStudent.create({
        data: {
          courseId: courseFixture.courseId,
          studentId: studentProfile.id,
        },
      });
    }

    return student;
  } finally {
    await prisma.$disconnect();
  }
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
  provisionUser: () => Promise<User>;
  dashboardRoot: string;
  visibilityRules: VisibilityRule[];
  navSteps: NavStep[];
};

const roleScenarios: RoleScenario[] = [
  {
    testName: "[4.11][STD-NAV-001][STD-NAV-003][@smoke] system admin can open each visible sidebar menu route",
    provisionUser: () => createTestSystemAdmin(),
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
    provisionUser: async () => {
      const { manager } = await createTestCourseWithManager();
      return manager;
    },
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
    // Any authenticated user can visit /instructor — the page has no role guard.
    // The sidebar shows INSTRUCTOR nav items based on the URL path alone.
    testName: "[4.11][STD-NAV-005][STD-NAV-005A] instructor sees only instructor-appropriate sidebar links",
    provisionUser: () => provisionFreshEmailUser(),
    dashboardRoot: "/instructor",
    visibilityRules: [
      { name: "Dashboard", visible: true },
      { name: "Users", visible: false },
      { name: "Schools", visible: false },
      { name: "Instructors", visible: false },
      { name: "Students", visible: false },
      { name: "Courses", visible: true },
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
      {
        linkName: "Courses",
        expectedUrl: /\/instructor\/courses\/?$/,
        additionalAssertions: async (page) => {
          await expect(page.getByTestId("instructor-courses-page")).toBeVisible();
        },
      },
    ],
  },
  {
    testName: "[4.11][STD-NAV-006][STD-NAV-006A] student sees only student-appropriate sidebar links",
    provisionUser: () => createStudentNavigationFixture(),
    dashboardRoot: "/student",
    visibilityRules: [
      { name: "Dashboard", visible: true },
      { name: "Users", visible: false },
      { name: "Schools", visible: false },
      { name: "Instructors", visible: false },
      { name: "Students", visible: false },
      { name: "Courses", visible: true },
      { name: "Syllabuses", visible: false },
    ],
    navSteps: [
      {
        linkName: "Dashboard",
        expectedUrl: /\/student\/?$/,
        additionalAssertions: async (page) => {
          await expect(page.getByTestId("student-dashboard-placeholder")).toBeVisible();
          await expect(page.getByText(/under construction/i)).toBeVisible();
        },
      },
      {
        linkName: "Courses",
        expectedUrl: /\/student\/courses\/?$/,
        additionalAssertions: async (page) => {
          await expect(page.getByTestId("student-courses-page")).toBeVisible();
          await expect(page.getByRole("combobox", { name: /select school/i })).toBeVisible();
        },
      },
    ],
  },
];

test.describe("4.11 role-based navigation", () => {
  roleScenarios.forEach((scenario) => {
    test(scenario.testName, async ({ page }) => {
      const user = await scenario.provisionUser();

      await logUserIn({
        page,
        user,
        expectedRedirectPath: "/",
      });

      await page.goto(scenario.dashboardRoot, { waitUntil: "domcontentloaded" });
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
        await page.goto(scenario.dashboardRoot, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
        await expectSidebarOnScreen(page);
        await clickSidebarLinkAndExpectUrl(page, step.linkName, step.expectedUrl);
        await step.additionalAssertions?.(page);
      }
    });
  });

  test("[4.11][STD-NAV-009] wide screens keep sidebar open", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const { manager } = await createTestCourseWithManager();
    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/syllabuses?section=catalog", { waitUntil: "domcontentloaded" });
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

    const { manager } = await createTestCourseWithManager();
    await logUserIn({
      page,
      user: manager,
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

  test("[4.11][STD-NAV-011] narrow dashboard keeps a single start-edge menu trigger and moves account controls into the sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 960 });

    const { manager } = await createTestCourseWithManager();
    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/school");
    await page.waitForLoadState("networkidle");

    const headerToggle = page.locator("header button[aria-controls='sidebar']").first();
    await expect(headerToggle).toBeVisible();

    const messageButton = page.locator("header a[href*='messages']");
    await expect(messageButton).toHaveCount(0);

    const headerComboboxes = page.locator("header [role='combobox']");
    await expect(headerComboboxes).toHaveCount(0);

    const headerUserTrigger = page.locator("header button:has(svg.lucide-user)");
    await expect(headerUserTrigger).toHaveCount(0);

    const controlsGeometry = await page.evaluate(() => {
      const header = document.querySelector("header");
      const trigger = document.querySelector("header button[aria-controls='sidebar']") as HTMLElement | null;
      if (!header || !trigger) return null;
      const headerRect = header.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      return {
        dir: document.documentElement.dir || "ltr",
        headerMidX: headerRect.left + headerRect.width / 2,
        triggerCenterX: triggerRect.left + triggerRect.width / 2,
      };
    });

    expect(controlsGeometry).not.toBeNull();
    if (controlsGeometry!.dir === "rtl") {
      expect(controlsGeometry!.triggerCenterX).toBeGreaterThan(controlsGeometry!.headerMidX - 20);
    } else {
      expect(controlsGeometry!.triggerCenterX).toBeLessThan(controlsGeometry!.headerMidX + 20);
    }

    await headerToggle.click();

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    const openGeometry = await page.evaluate(() => {
      const aside = document.querySelector("aside") as HTMLElement | null;
      if (!aside) return null;

      const asideRect = aside.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      return {
        dir: document.documentElement.dir || "ltr",
        viewportWidth,
        sidebarLeft: asideRect.left,
        sidebarRight: asideRect.right,
      };
    });

    expect(openGeometry).not.toBeNull();
    if (openGeometry!.dir === "rtl") {
      expect(openGeometry!.sidebarRight).toBeGreaterThanOrEqual(openGeometry!.viewportWidth - 2);
    } else {
      expect(openGeometry!.sidebarLeft).toBeLessThanOrEqual(2);
    }

    const allSidebarToggles = page.locator("button[aria-controls='sidebar']");
    await expect(allSidebarToggles).toHaveCount(1);

    await expect(sidebar.getByRole("combobox").first()).toBeVisible();
    await expect(sidebar.locator("input[type='checkbox']").first()).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /account settings/i })).toBeVisible();
  });

  test("[4.11][STD-NAV-012] opened mobile sidebar keeps the header toggle on the same edge and allows language selection", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 960 });

    const { manager } = await createTestCourseWithManager();
    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.goto("/school-manager/school");
    await page.waitForLoadState("networkidle");

    const headerToggle = page.locator("header button[aria-controls='sidebar']").first();
    await expect(headerToggle).toBeVisible();
    await headerToggle.click();

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    const sidebarToggle = sidebar.locator("button[aria-controls='sidebar']");
    await expect(sidebarToggle).toHaveCount(0);

    await expect(headerToggle).toBeVisible();

    const rejectAllButton = page.getByRole("button", { name: /reject all/i });
    if (await rejectAllButton.count()) {
      await rejectAllButton.first().click();
    }

    const languageSelect = sidebar.locator("[role='combobox']").first();
    await languageSelect.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sidebar).toBeVisible();
  });

  test("[4.11][STD-NAV-013] mobile landing menu stays on LTR start edge with no duplicate close button and keeps sheet open during language change", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 960 });

    const { manager } = await createTestCourseWithManager();
    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.addInitScript(() => {
      window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect.poll(async () => page.getAttribute("html", "dir")).toBe("ltr");

    const mobileTrigger = page.locator("button:has(svg.lucide-menu)").first();
    await expect(mobileTrigger).toBeVisible();
    await mobileTrigger.click();

    const sheet = page.locator("[data-slot='sheet-content']").first();
    await expect(sheet).toBeVisible();

    const ltrGeometry = await page.evaluate(() => {
      const trigger = document.querySelector("button:has(svg.lucide-menu)") as HTMLElement | null;
      const panel = document.querySelector("[data-slot='sheet-content']") as HTMLElement | null;
      if (!trigger || !panel) {
        return null;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      return {
        dir: document.documentElement.dir || "ltr",
        viewportWidth: window.innerWidth,
        triggerCenterX: triggerRect.left + triggerRect.width / 2,
        viewportMidX: window.innerWidth / 2,
        panelLeft: panelRect.left,
      };
    });

    expect(ltrGeometry).not.toBeNull();
    expect(ltrGeometry!.dir).toBe("ltr");
    expect(ltrGeometry!.triggerCenterX).toBeLessThan(ltrGeometry!.viewportMidX + 20);
    expect(ltrGeometry!.panelLeft).toBeLessThanOrEqual(2);

    // We keep a single close affordance (the hamburger toggle), not an extra Sheet X button.
    await expect(page.locator("[data-slot='sheet-content'] [data-slot='sheet-close']")).toHaveCount(0);

    const languageSelect = sheet.locator("[role='combobox']").first();
    await languageSelect.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.getByRole("option", { name: "עברית" }).click();

    await expect(sheet).toBeVisible();
    await expect.poll(async () => page.getAttribute("html", "dir")).toBe("rtl");
  });

  test("[4.11][STD-NAV-007] authenticated plain user does not see admin/manager sidebar links", async ({ page }) => {
    const user = await provisionFreshEmailUser();
    await logUserIn({
      page,
      user,
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
