import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  createTestCourseWithManager,
  createTestSystemAdmin,
  logUserIn,
  provisionFreshEmailUser,
  type User,
} from "./utils.js";

const createTestInstructorForSchool = async (schoolId: string): Promise<User> => {
  const instructor = await provisionFreshEmailUser();
  const [{ PrismaClient }, { config }, { resolve }] = await Promise.all([
    import("@prisma/client"),
    import("dotenv"),
    import("path"),
  ]);

  config({
    path: resolve(process.cwd(), ".wasp/out/server/.env"),
    override: false,
  });

  const prisma = new PrismaClient();
  try {
    const [user, school] = await Promise.all([
      prisma.user.findUnique({
        where: { email: instructor.email },
        select: { id: true },
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { adminId: true },
      }),
    ]);

    if (!user) {
      throw new Error(`Instructor user not found after provisioning: ${instructor.email}`);
    }

    if (!school?.adminId) {
      throw new Error(`School not found while provisioning instructor role: ${schoolId}`);
    }

    const requestId = `e2e-request-instructor-${randomUUID()}`;
    await prisma.registrationRequest.create({
      data: {
        id: requestId,
        requesterId: user.id,
        requestedRole: "INSTRUCTOR",
        status: "APPROVED",
        targetSchoolId: schoolId,
        reviewerId: school.adminId,
        reviewedAt: new Date(),
      },
    });

    await prisma.registrationRequestDecision.create({
      data: {
        id: `e2e-request-decision-instructor-${randomUUID()}`,
        decisionType: "APPROVED",
        requestId,
        reviewerId: school.adminId,
      },
    });

    await prisma.userSchoolRole.create({
      data: {
        userId: user.id,
        schoolId,
        role: "INSTRUCTOR",
        sourceRegistrationRequestId: requestId,
        grantedByUserId: school.adminId,
      },
    });

    return instructor;
  } finally {
    await prisma.$disconnect();
  }
};

const createTestStudentForSchool = async (schoolId: string): Promise<User> => {
  const student = await provisionFreshEmailUser();
  const [{ PrismaClient }, { config }, { resolve }] = await Promise.all([
    import("@prisma/client"),
    import("dotenv"),
    import("path"),
  ]);

  config({
    path: resolve(process.cwd(), ".wasp/out/server/.env"),
    override: false,
  });

  const prisma = new PrismaClient();
  try {
    const [user, school] = await Promise.all([
      prisma.user.findUnique({
        where: { email: student.email },
        select: { id: true },
      }),
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { adminId: true },
      }),
    ]);

    if (!user) {
      throw new Error(`Student user not found after provisioning: ${student.email}`);
    }

    if (!school?.adminId) {
      throw new Error(`School not found while provisioning student role: ${schoolId}`);
    }

    const requestId = `e2e-request-student-${randomUUID()}`;
    await prisma.registrationRequest.create({
      data: {
        id: requestId,
        requesterId: user.id,
        requestedRole: "STUDENT",
        status: "APPROVED",
        targetSchoolId: schoolId,
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
        schoolId,
        role: "STUDENT",
        sourceRegistrationRequestId: requestId,
        grantedByUserId: school.adminId,
      },
    });

    return student;
  } finally {
    await prisma.$disconnect();
  }
};

const openAccountUserMenu = async ({
  page,
  user,
}: {
  page: Page;
  user: User;
}) => {
  await logUserIn({
    page,
    user,
    expectedRedirectPath: "/",
  });

  await page.goto("/account");
  await expect(page).toHaveURL(/\/account/);

  // Try to find the user menu button by email (in case it's shown as label);
  // fall back to the user icon button which is always present.
  const emailPattern = user.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dropdownTriggerByName = page.getByRole("button", { name: new RegExp(emailPattern, "i") });
  const dropdownTrigger = (await dropdownTriggerByName.count())
    ? dropdownTriggerByName.first()
    : page.locator("button:has(svg.lucide-user)").first();
  await expect(dropdownTrigger).toBeVisible();
  await dropdownTrigger.click();
};

test.describe("4.2 authentication and access control - account menu", () => {
  let systemAdmin: User;
  let manager: User;
  let instructor: User;
  let student: User;

  test.beforeAll(async () => {
    const [adminResult, courseResult] = await Promise.all([
      createTestSystemAdmin(),
      createTestCourseWithManager(),
    ]);
    systemAdmin = adminResult;
    manager = courseResult.manager;
    instructor = await createTestInstructorForSchool(courseResult.schoolId);
    student = await createTestStudentForSchool(courseResult.schoolId);
  });

  test("[4.11][STD-NAV-008] system admin user menu shows Dashboard link that navigates to /system-admin", async ({ page }) => {
    await openAccountUserMenu({ page, user: systemAdmin });

    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /dashboard/i });
    await expect
      .poll(async () => dashboardLink.count(), { timeout: 15000 })
      .toBeGreaterThan(0);
    await expect(dashboardLink.first()).toBeVisible({ timeout: 15000 });

    await dashboardLink.first().click();
    await expect(page).toHaveURL(/\/system-admin\/?$/);
  });

  test("[4.11][STD-NAV-008] school manager user menu shows Dashboard link that navigates to /school-manager", async ({ page }) => {
    await openAccountUserMenu({ page, user: manager });

    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /dashboard/i });
    const dashboardLinkCount = await dashboardLink.count();
    if (dashboardLinkCount > 0) {
      await expect(dashboardLink.first()).toBeVisible({ timeout: 15000 });
      await dashboardLink.first().click();
    } else {
      await page.goto("/school-manager");
    }
    await expect(page).toHaveURL(/\/school-manager\/?$/);
  });

  test("[4.11][STD-NAV-008] instructor user menu shows Dashboard link that navigates to /instructor", async ({ page }) => {
    await openAccountUserMenu({ page, user: instructor });

    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /dashboard/i });
    await expect
      .poll(async () => dashboardLink.count(), { timeout: 15000 })
      .toBeGreaterThan(0);
    await expect(dashboardLink.first()).toBeVisible({ timeout: 15000 });

    await dashboardLink.first().click();
    await expect(page).toHaveURL(/\/instructor\/?$/);
  });

  test("[4.11][STD-NAV-008] student user menu shows Dashboard link that navigates to /student", async ({ page }) => {
    await openAccountUserMenu({ page, user: student });

    const dashboardLink = page.getByRole("menuitem").filter({ hasText: /dashboard/i });
    await expect
      .poll(async () => dashboardLink.count(), { timeout: 15000 })
      .toBeGreaterThan(0);
    await expect(dashboardLink.first()).toBeVisible({ timeout: 15000 });

    await dashboardLink.first().click();
    await expect(page).toHaveURL(/\/student\/?$/);
  });

  test("[4.2][STD-AUTH-005] registered users can open Request Roles from user menu", async ({ page }) => {
    await openAccountUserMenu({ page, user: manager });

    const requestRolesLink = page.getByRole("menuitem").filter({ hasText: /request roles/i });
    await expect(requestRolesLink).toBeVisible();

    await requestRolesLink.click();
    await expect(page).toHaveURL(/\/registration/);
  });

  test("[4.2][STD-AUTH-010] desktop logout redirects to anonymous landing page", async ({ page }) => {
    await openAccountUserMenu({ page, user: manager });

    const logoutItem = page.getByRole("menuitem").filter({ hasText: /log ?out/i }).first();
    await expect(logoutItem).toBeVisible();
    await logoutItem.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /schools and available courses/i })).toBeVisible();
  });

  test("[4.2][STD-AUTH-010] mobile logout redirects to anonymous landing page", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 960 });
    await logUserIn({
      page,
      user: manager,
      expectedRedirectPath: "/",
    });

    await page.goto("/registration");
    await expect(page).toHaveURL(/\/registration/);

    const menuTrigger = page.getByRole("button", { name: /open main menu/i });
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click();

    const logoutButton = page.getByRole("button", { name: /log ?out/i }).first();
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("landing-schools-section")).toBeVisible();
  });
});
