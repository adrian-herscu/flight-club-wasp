import { expect, test } from "@playwright/test";
import { createTestCourseWithManager, logUserIn, createTestStudentUser } from "./utils.js";
import { randomUUID } from "crypto";

const PENDING_ANON_INTEREST_KEY = "landing.pendingAnonCourseInterest";

async function createGlobalUnscopedCourseFixture(): Promise<{ title: string }> {
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
    const actor = await prisma.user.findFirst({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!actor) {
      throw new Error("No user available for creating lifecycle events.");
    }

    const uniqueName = `GlobalLeakGuard-${Date.now()}-${randomUUID().slice(0, 6)}`;

    const syllabus = await prisma.syllabus.create({
      data: {
        name: uniqueName,
        schoolId: null,
      },
    });

    const syllabusVersion = await prisma.syllabusVersion.create({
      data: {
        syllabusId: syllabus.id,
        version: 1,
        status: "FINAL",
        lessons: {
          create: [
            {
              position: 1,
              name: "Global fixture intro",
              description: "Regression fixture lesson",
              durationMinutes: 30,
            },
          ],
        },
      },
    });

    const course = await prisma.course.create({
      data: {
        syllabusVersionId: syllabusVersion.id,
        schoolId: null,
        startDate: new Date("2027-01-15T00:00:00.000Z"),
      },
    });

    await prisma.courseLifecycleEvent.create({
      data: {
        courseId: course.id,
        changedByUserId: actor.id,
        status: "REOPENED",
      },
    });

    return { title: `${uniqueName} v1` };
  } finally {
    await prisma.$disconnect();
  }
}

test.describe("4.16 course interest flow", () => {
  test("[4.16][STD-CIN-005] landing does not show globally-unscoped courses under school cards", async ({ page }) => {
    const fixture = await createGlobalUnscopedCourseFixture();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("filter-course-name").fill(fixture.title);

    await expect(page.getByTestId("landing-course-item").filter({ hasText: fixture.title })).toHaveCount(0);
  });

  test("[4.16][STD-CIN-003][STD-CIN-011][STD-CIN-012] first anonymous click redirects to login and resumes as interested after login", async ({ page }) => {
    const { schoolName, syllabusName, courseStartDate } = await createTestCourseWithManager();
    const interestedStudent = await createTestStudentUser();

    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    await test.step("Anonymous user clicks I'm Interested and is redirected to login", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const schoolCard = page
        .getByTestId("landing-school-card")
        .filter({ hasText: schoolName })
        .first();
      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId("landing-course-item")
        .filter({ hasText: syllabusName })
        .filter({ hasText: courseDateStr })
        .first();
      await expect(targetCourseCard).toBeVisible();

      const interestButton = targetCourseCard.getByTestId("express-interest-login-btn");
      await expect(interestButton).toBeEnabled();
      await interestButton.click();

      await expect(page).toHaveURL(/\/login\/?$/);

      const pendingIntent = await page.evaluate((storageKey) => {
        return window.localStorage.getItem(storageKey);
      }, PENDING_ANON_INTEREST_KEY);
      expect(pendingIntent).toBeTruthy();
    });

    await test.step("After login, the selected course is automatically marked as interested and button is disabled", async () => {
      await logUserIn({
        page,
        user: interestedStudent,
        expectedRedirectPath: "/",
      });

      await page.goto("/");

      const schoolCard = page
        .getByTestId("landing-school-card")
        .filter({ hasText: schoolName })
        .first();
      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId("landing-course-item")
        .filter({ hasText: syllabusName })
        .filter({ hasText: courseDateStr })
        .first();
      await expect(targetCourseCard).toBeVisible();

      const interestButton = targetCourseCard.getByTestId("express-interest-btn");
      await expect(interestButton).toBeDisabled();
      await expect(interestButton).toContainText(/interested/i);

      const pendingIntent = await page.evaluate((storageKey) => {
        return window.localStorage.getItem(storageKey);
      }, PENDING_ANON_INTEREST_KEY);
      expect(pendingIntent).toBeNull();
    });
  });

  test("[4.16][STD-CIN-001][STD-CIN-005] logged-in user can express course interest and manager can view it", async ({ page }) => {
    // Set up test data server-side: manager + school + syllabus + course
    const { manager, schoolName, syllabusName, courseStartDate } = await createTestCourseWithManager();
    const interestedStudent = await createTestStudentUser();

    // Format course date for display (e.g., "Jan 15, 2027")
    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    let matchedCourseFound = false;

    await test.step("Create a fresh student account and sign in", async () => {
      await logUserIn({
        page,
        user: interestedStudent,
        expectedRedirectPath: "/",
      });
    });

    await test.step("Express interest in the test course from the landing page", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const schoolCard = page
        .getByTestId("landing-school-card")
        .filter({ hasText: schoolName })
        .first();

      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId("landing-course-item")
        .filter({ hasText: syllabusName })
        .filter({ hasText: courseDateStr })
        .first();

      await expect(targetCourseCard).toBeVisible();

      const interestButton = targetCourseCard.getByTestId("express-interest-btn");
      await expect(interestButton).toBeEnabled();
      await interestButton.click();

      await expect.poll(async () => interestButton.isEnabled()).toBe(false);
      await expect(interestButton).toContainText(/interested/i);
    });

    await test.step("Manager opens the course interest panel for the same course", async () => {
      await logUserIn({
        page,
        user: manager,
        expectedRedirectPath: "/",
      });

      await page.goto("/school-manager/courses");
      await expect(page).toHaveURL(/\/school-manager\/courses\/?$/);
      await expect(
        page.getByRole("heading", { name: /open course from final syllabus/i }).first(),
      ).toBeVisible();

      await page.locator("#interests-course-select").click();
      const optionNames = (await page.getByRole("option").allTextContents())
        .map((name) => name.trim())
        .filter(Boolean);

      await page.keyboard.press("Escape");

      for (const optionName of optionNames) {
        await page.locator("#interests-course-select").click();
        await page.getByRole("option", { name: optionName }).first().click();

        const isVisible = await expect
          .poll(async () => {
            return await page
              .getByText(interestedStudent.email)
              .first()
              .isVisible()
              .catch(() => false);
          }, { timeout: 1500 })
          .toBe(true)
          .then(() => true)
          .catch(() => false);

        if (isVisible) {
          matchedCourseFound = true;
          break;
        }
      }
    });

    await test.step("Manager sees the interested student on that course", async () => {
      expect(matchedCourseFound).toBeTruthy();

      const interestEntry = page.getByText(interestedStudent.email).first();
      await expect(interestEntry).toBeVisible();
      await expect(page.getByTestId("interest-status-badge").first()).toContainText("INTERESTED");
      await expect(page.getByTestId("mark-contacted-btn").first()).toBeVisible();
    });
  });
});

