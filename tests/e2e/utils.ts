import { expect, type Page } from "@playwright/test";
import { randomUUID } from "crypto";

export type User = {
  id?: number;
  email: string;
  password?: string;
};

const DEFAULT_PASSWORD = "12345678";

export const waitForLandingReady = async (page: Page) => {
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("landing-schools-section")).toBeVisible({ timeout: 15000 });
  await expect
    .poll(async () => page.getByTestId("landing-school-card").count(), {
      timeout: 15000,
    })
    .toBeGreaterThan(0);
};

export const logUserIn = async ({
  page,
  user,
  expectedRedirectPath = "/",
}: {
  page: Page;
  user: User;
  expectedRedirectPath?: string;
}) => {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForURL("**/login", {
    waitUntil: "domcontentloaded",
  });

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password ?? DEFAULT_PASSWORD);

  // Wait for the form to be ready
  await page.waitForLoadState("networkidle").catch(() => {});

  const rejectAllButton = page.getByRole("button", { name: /reject all/i }).first();
  const isRejectVisible = await rejectAllButton.isVisible().catch(() => false);
  if (isRejectVisible) {
    await rejectAllButton.click({ force: true }).catch(() => {});
  }

  // Find login button - it could be "Log in", "Login", "כניסה" (Hebrew), or any translation
  const loginButton = page.locator("button[type='submit']").first();
  await expect(loginButton).toBeVisible({ timeout: 5000 });

  // Click the login button
  await loginButton.click();

  await page
    .waitForURL(
      (url) => {
        if (expectedRedirectPath === "/") {
          return url.pathname === "/";
        }

        return url.pathname === expectedRedirectPath;
      },
      {
        timeout: 15000,
      },
    )
    .catch(() => null);

  const currentPath = new URL(page.url()).pathname;
  if (currentPath === "/login") {
    const performApiLogin = async () =>
      page.request.post("http://127.0.0.1:3001/auth/email/login", {
        data: {
          email: user.email,
          password: user.password ?? DEFAULT_PASSWORD,
        },
        timeout: 60000,
      });

    let loginResponse = await performApiLogin().catch(() => null);
    if (!loginResponse) {
      loginResponse = await performApiLogin();
    }

    if (!loginResponse.ok()) {
      throw new Error(`Login failed with status ${loginResponse.status()}`);
    }

    const loginPayload = (await loginResponse.json()) as { sessionId?: string };
    if (!loginPayload.sessionId) {
      throw new Error("Login response did not contain sessionId.");
    }

    await page.evaluate((sessionId) => {
      localStorage.setItem("sessionId", sessionId);
      localStorage.setItem("wasp:sessionId", sessionId);
    }, loginPayload.sessionId);

    await page.goto(expectedRedirectPath, { waitUntil: "domcontentloaded", timeout: 60000 });
  }

  // Also wait a bit for any redirects
  await page.waitForLoadState("networkidle").catch(() => {});
};

export const signUserUp = async ({
  page,
  user,
}: {
  page: Page;
  user: User;
}) => {
  await page.goto("/signup");

  await page.evaluate(() => {
    try {
      const sessionId = localStorage.getItem("wasp:sessionId");
      if (sessionId) {
        localStorage.removeItem("wasp:sessionId");
      }
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear localStorage:", e);
    }
  });

  await page.waitForLoadState("domcontentloaded");

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', DEFAULT_PASSWORD);

  await page.click('button:has-text("Sign up")');

  await page
    .waitForResponse((response) => {
      return response.url().includes("signup") && response.status() === 200;
    })
    .catch((err) => console.error(err.message));
};

export const createRandomUser = () => {
  const email = `${randomUUID()}@test.com`;
  return { email, password: DEFAULT_PASSWORD } as User;
};

export const provisionFreshEmailUser = async (): Promise<User> => {
  const user = { email: `${randomUUID()}@test.com`, password: "12345678" } as User;
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

  const seedIdentity = await prisma.authIdentity.findUnique({
    where: {
      providerName_providerUserId: {
        providerName: "email",
        providerUserId: "seed+user.01@example.test",
      },
    },
  });

  if (!seedIdentity) {
    throw new Error("Seed auth identity for email provider was not found.");
  }

  const createdUser = await prisma.user.create({
    data: {
      email: user.email,
      fullName: user.email,
    },
  });

  const createdAuth = await prisma.auth.create({
    data: {
      userId: createdUser.id,
    },
  });

  await prisma.authIdentity.create({
    data: {
      providerName: "email",
      providerUserId: user.email.toLowerCase(),
      providerData: seedIdentity.providerData,
      authId: createdAuth.id,
    },
  });

  await prisma.$disconnect();

  return user;
};

/**
 * Creates a complete test object graph server-side:
 * - School with unique name
 * - Syllabus published version
 * - Course from that syllabus
 * - Owned by a test manager user
 *
 * This avoids the need for UI flows to create these in tests.
 */
export const createTestCourseWithManager = async (): Promise<{
  manager: User;
  schoolId: string;
  schoolName: string;
  syllabusId: string;
  syllabusVersionId: string;
  courseId: string;
  syllabusName: string;
  courseStartDate: Date;
}> => {
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
    // Create manager user
    const manager = await provisionFreshEmailUser();
    const managerUser = await prisma.user.findUnique({
      where: { email: manager.email },
    });
    if (!managerUser) throw new Error(`Manager user not found: ${manager.email}`);

    // Generate unique identifiers
    const timestamp = Date.now();
    const uuidPart = randomUUID().substring(0, 8);
    const schoolName = `School-${timestamp}-${uuidPart}`;
    const syllabusName = `Syllabus-${timestamp}-${uuidPart}`;

    // Create School (manager will be the admin)
    const school = await prisma.school.create({
      data: {
        name: schoolName,
        country: "US",
        city: "Test City",
        addressLine1: "123 Test St",
        postalCode: "12345",
        currency: "USD",
        adminId: managerUser.id,
      },
    });

    // Create Account (manager -> school relationship)
    await prisma.account.create({
      data: {
        userId: managerUser.id,
        schoolId: school.id,
        currency: "USD",
      },
    });

    // Create UserSchoolRole (required by ensureSchoolManager guard)
    await prisma.userSchoolRole.create({
      data: {
        userId: managerUser.id,
        schoolId: school.id,
        role: "SCHOOL_MANAGER",
      },
    });

    // Create Syllabus
    const syllabus = await prisma.syllabus.create({
      data: {
        name: syllabusName,
        schoolId: school.id,
      },
    });

    // Create SyllabusVersion (final/published)
    const courseStartDate = new Date();
    courseStartDate.setMonth(courseStartDate.getMonth() + 3);

    const { syllabusVersion, course } = await prisma.$transaction(async (tx) => {
      const createdSyllabusVersion = await tx.syllabusVersion.create({
        data: {
          syllabusId: syllabus.id,
          version: 1,
          status: "FINAL",
        },
      });

      await tx.syllabusLesson.createMany({
        data: [
          {
            syllabusVersionId: createdSyllabusVersion.id,
            position: 1,
            name: "Intro ground briefing",
            description: "Initial lesson created by E2E fixture for valid FINAL syllabus data.",
            durationMinutes: 45,
          },
          {
            syllabusVersionId: createdSyllabusVersion.id,
            position: 2,
            name: "Basic flight preparation",
            description: "Follow-up lesson created by E2E fixture for course-based workflows.",
            durationMinutes: 60,
          },
        ],
      });

      const createdCourse = await tx.course.create({
        data: {
          syllabusVersionId: createdSyllabusVersion.id,
          schoolId: school.id,
          startDate: courseStartDate,
          hourlyRate: 100,
        },
      });

      await tx.courseLifecycleEvent.create({
        data: {
          courseId: createdCourse.id,
          changedByUserId: managerUser.id,
          status: "REOPENED",
        },
      });

      return {
        syllabusVersion: createdSyllabusVersion,
        course: createdCourse,
      };
    });

    await prisma.$disconnect();

    return {
      manager,
      schoolId: school.id,
      schoolName: school.name,
      syllabusId: syllabus.id,
      syllabusVersionId: syllabusVersion.id,
      courseId: course.id,
      syllabusName: syllabus.name,
      courseStartDate: course.startDate!,
    };
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
};

/**
 * Creates a course fixture that is guaranteed to expose instructor contacts on landing.
 */
export const createTestCourseWithAssignedInstructor = async (): Promise<{
  manager: User;
  instructor: User;
  schoolId: string;
  schoolName: string;
  courseId: string;
}> => {
  const baseFixture = await createTestCourseWithManager();

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
    const instructor = await provisionFreshEmailUser();
    const instructorUser = await prisma.user.findUnique({
      where: { email: instructor.email },
      select: { id: true },
    });

    if (!instructorUser) {
      throw new Error(`Instructor user not found: ${instructor.email}`);
    }

    const instructorProfile = await prisma.instructor.create({
      data: {
        userId: instructorUser.id,
      },
      select: { id: true },
    });

    await prisma.assignedInstructor.create({
      data: {
        courseId: baseFixture.courseId,
        instructorId: instructorProfile.id,
      },
    });

    return {
      manager: baseFixture.manager,
      instructor,
      schoolId: baseFixture.schoolId,
      schoolName: baseFixture.schoolName,
      courseId: baseFixture.courseId,
    };
  } finally {
    await prisma.$disconnect();
  }
};

const getNextYearLastTwoDigits = () => {
  const nextYear = new Date().getFullYear() + 1;
  return nextYear.toString().slice(-2);
};

export const makeStripePayment = async ({
  test,
  page,
  planId,
}: {
  test: any;
  page: Page;
  planId: "hobby" | "pro" | "credits10";
}) => {
  test.slow(); // Stripe payments take a long time to confirm and can cause tests to fail so we use a longer timeout

  await page.goto("/pricing");
  await page.waitForURL("**/pricing");

  const buyBtn = page.locator(`button[aria-describedby="${planId}"]`);

  await expect(buyBtn).toBeVisible();
  await expect(buyBtn).toBeEnabled();
  await buyBtn.click();

  await page.waitForURL("https://checkout.stripe.com/**", {
    waitUntil: "domcontentloaded",
  });
  await page.fill('input[name="cardNumber"]', "4242424242424242");
  await page.getByPlaceholder("MM / YY").fill(`12${getNextYearLastTwoDigits()}`);
  await page.getByPlaceholder("CVC").fill("123");
  await page.getByPlaceholder("Full name on card").fill("Test User");
  const countrySelect = page.getByLabel("Country or region");
  await countrySelect.selectOption("Germany");
  // This is a weird edge case where the `payBtn` assertion tests pass, but the button click still isn't registered.
  // That's why we wait for stripe responses below to finish loading before clicking the button.
  await page.waitForResponse(
    (response) =>
      response.url().includes("trusted-types-checker") &&
      response.status() === 200,
  );
  const payBtn = page.getByTestId("hosted-payment-submit-button");
  await expect(payBtn).toBeVisible();
  await expect(payBtn).toBeEnabled();
  await payBtn.click();

  await page.waitForURL("**/checkout?status=success");
  await page.waitForURL("**/account");
  if (planId === "credits10") {
    await expect(page.getByText("13 credits")).toBeVisible();
  } else {
    await expect(page.getByText(planId)).toBeVisible();
  }
};

/**
 * Creates a complete test object graph: manager user + school + syllabus + course.
 * All data is generated uniquely per test to avoid collisions in parallel runs.
 */
export const createTestManagerWithSchoolAndCourse = async (): Promise<{
  manager: User;
  schoolName: string;
  courseName: string;
  courseDateStr: string;
}> => {
  const manager = await provisionFreshEmailUser();
  
  // Generate unique identifiers using timestamps + partial UUID
  const timestamp = Date.now();
  const uuidPart = randomUUID().substring(0, 8);
  const schoolName = `School-${timestamp}-${uuidPart}`;
  const courseName = `Course-${timestamp}-${uuidPart}`;
  const courseDate = new Date();
  courseDate.setMonth(courseDate.getMonth() + 3); // 3 months ahead
  const courseDateStr = courseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Register school for this manager via the signup/registration flow
  // This happens implicitly in the UI tests
  return {
    manager,
    schoolName,
    courseName,
    courseDateStr,
  };
};

/**
 * Creates a user with isSystemAdmin: true.
 * Used for tests that need access to the /system-admin routes.
 */
export const createTestSystemAdmin = async (): Promise<User> => {
  const user = await provisionFreshEmailUser();
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
    await prisma.user.update({
      where: { email: user.email },
      data: { isSystemAdmin: true },
    });
    return user;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Creates a school manager user with TWO managed schools.
 * Used for tests that verify the school-switching combobox.
 */
export const createTestManagerWithTwoSchools = async (): Promise<{
  manager: User;
  school1Id: string;
  school1Name: string;
  school2Id: string;
  school2Name: string;
}> => {
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
    const manager = await provisionFreshEmailUser();
    const managerUser = await prisma.user.findUnique({ where: { email: manager.email } });
    if (!managerUser) throw new Error(`Manager user not found: ${manager.email}`);

    const ts = Date.now();
    const u1 = randomUUID().substring(0, 8);
    const u2 = randomUUID().substring(0, 8);
    const school1Name = `SchoolA-${ts}-${u1}`;
    const school2Name = `SchoolB-${ts}-${u2}`;

    const school1 = await prisma.school.create({
      data: {
        name: school1Name,
        country: "US",
        city: "City A",
        addressLine1: "1 School Ave",
        postalCode: "10001",
        currency: "USD",
        adminId: managerUser.id,
      },
    });
    await prisma.account.create({
      data: { userId: managerUser.id, schoolId: school1.id, currency: "USD" },
    });
    await prisma.userSchoolRole.create({
      data: { userId: managerUser.id, schoolId: school1.id, role: "SCHOOL_MANAGER" },
    });

    const school2 = await prisma.school.create({
      data: {
        name: school2Name,
        country: "US",
        city: "City B",
        addressLine1: "2 School Blvd",
        postalCode: "20002",
        currency: "USD",
        adminId: managerUser.id,
      },
    });
    await prisma.account.create({
      data: { userId: managerUser.id, schoolId: school2.id, currency: "USD" },
    });
    await prisma.userSchoolRole.create({
      data: { userId: managerUser.id, schoolId: school2.id, role: "SCHOOL_MANAGER" },
    });

    return { manager, school1Id: school1.id, school1Name, school2Id: school2.id, school2Name };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Creates a unique student user for testing course interests and enrollments.
 */
export const createTestStudentUser = async (): Promise<User> => {
  return provisionFreshEmailUser();
};

/**
 * Creates a unique instructor user for testing course assignments.
 */
export const createTestInstructorUser = async (): Promise<User> => {
  return provisionFreshEmailUser();
};

/**
 * Generates a unique school name for tests.
 */
export const generateUniqueSchoolName = (): string => {
  const timestamp = Date.now();
  const uuidPart = randomUUID().substring(0, 8);
  return `School-${timestamp}-${uuidPart}`;
};

/**
 * Generates a unique course name for tests.
 */
export const generateUniqueSyllabusName = (): string => {
  const timestamp = Date.now();
  const uuidPart = randomUUID().substring(0, 8);
  return `Syllabus-${timestamp}-${uuidPart}`;
};

/**
 * Generates a date string for a course start date (3 months from now).
 */
export const generateFutureCourseDate = (): string => {
  const courseDate = new Date();
  courseDate.setMonth(courseDate.getMonth() + 3);
  return courseDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const acceptAllCookies = async (page: Page) => {
  await page.waitForSelector('button:has-text("Accept all")');
  await page.click('button:has-text("Accept all")');
};

export const ensureSidebarOpen = async (page: Page) => {
  const sidebar = page.locator("aside").first();
  if ((await sidebar.count()) === 0) return;

  const sidebarRect = await sidebar.boundingBox();
  const viewport = page.viewportSize();
  const isOnScreen =
    !!sidebarRect &&
    !!viewport &&
    sidebarRect.width > 0 &&
    sidebarRect.height > 0 &&
    sidebarRect.x >= -2 &&
    sidebarRect.x + sidebarRect.width <= viewport.width + 2;

  if (isOnScreen) {
    return;
  }

  await page.evaluate(() => {
    const headerToggle = document.querySelector(
      "header button[aria-controls='sidebar']",
    ) as HTMLButtonElement | null;
    headerToggle?.click();
  });

  await expect
    .poll(async () => {
      const nextRect = await sidebar.boundingBox();
      const nextViewport = page.viewportSize();
      if (!nextRect || !nextViewport) return false;
      return (
        nextRect.width > 0 &&
        nextRect.height > 0 &&
        nextRect.x >= -2 &&
        nextRect.x + nextRect.width <= nextViewport.width + 2
      );
    })
    .toBe(true);
};

export type DetectedLanguage = "en" | "he" | "ro" | "ru" | "unknown";

/**
 * Lightweight language detector for E2E assertions.
 * It is intentionally simple and optimized for English/Hebrew/Romanian/Russian UI text.
 */
export const detectLanguageFromText = (text: string): DetectedLanguage => {
  const sample = text
    .replace(/\s+/g, " ")
    .trim();

  if (!sample) return "unknown";

  const hebrewChars = (sample.match(/[\u0590-\u05FF]/g) ?? []).length;
  const cyrillicChars = (sample.match(/[\u0400-\u04FF]/g) ?? []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) ?? []).length;
  const romanianDiacritics = (sample.match(/[ăâîșțĂÂÎȘȚ]/g) ?? []).length;

  // Quick dominant-script decision first.
  if (hebrewChars > latinChars * 1.5 && hebrewChars > 10) return "he";
  if (cyrillicChars > latinChars * 1.5 && cyrillicChars > 10) return "ru";
  if (romanianDiacritics >= 2) return "ro";
  if (latinChars > hebrewChars * 1.5 && latinChars > 10) return "en";

  // Fallback with common stop-words.
  const lower = sample.toLowerCase();
  const englishHints = ["the", "and", "log in", "password", "email", "forgot"];
  const hebrewHints = ["התחבר", "כניסה", "סיסמה", "דוא", "הרשמה", "שכחת"];
  const romanianHints = ["autentificare", "parolă", "email", "înregistrare", "reseteaz", "cont"];
  const russianHints = ["вход", "пароль", "почта", "регистрац", "сброс", "аккаунт"];

  const enScore = englishHints.reduce(
    (score, token) => score + (lower.includes(token) ? 1 : 0),
    0,
  );
  const heScore = hebrewHints.reduce(
    (score, token) => score + (sample.includes(token) ? 1 : 0),
    0,
  );
  const roScore = romanianHints.reduce(
    (score, token) => score + (lower.includes(token) ? 1 : 0),
    0,
  );
  const ruScore = russianHints.reduce(
    (score, token) => score + (lower.includes(token) ? 1 : 0),
    0,
  );

  if (heScore > enScore && heScore > roScore && heScore > ruScore) return "he";
  if (roScore > enScore && roScore > heScore && roScore > ruScore) return "ro";
  if (ruScore > enScore && ruScore > heScore && ruScore > roScore) return "ru";
  if (enScore > heScore && enScore > roScore && enScore > ruScore) return "en";

  return "unknown";
};

// ---------------------------------------------------------------------------
// Course-execution lifecycle fixtures
// ---------------------------------------------------------------------------

/**
 * Creates a STARTED course with an enrolled student, a lead instructor,
 * and one SCHEDULED future lesson (with a MeetingAttendance NO_RESPONSE for the student).
 */
export const createStartedCourseWithLesson = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  courseId: string;
  schoolId: string;
  lessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
}> => {
  const DEFAULT_ENROLLMENT_LIST_PRICE_MINOR = 175;
  const baseFixture = await createTestCourseWithManager();

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
    const managerUser = await prisma.user.findUnique({
      where: { email: baseFixture.manager.email },
      select: { id: true },
    });
    if (!managerUser) throw new Error("Manager user not found");

    // Create student (no UserSchoolRole needed — getCourseDetail checks enrolledStudents)
    const student = await provisionFreshEmailUser();
    const studentUser = await prisma.user.findUnique({
      where: { email: student.email },
      select: { id: true },
    });
    if (!studentUser) throw new Error("Student user not found");

    const studentProfile = await prisma.student.create({
      data: { userId: studentUser.id },
      select: { id: true },
    });
    await prisma.account.create({
      data: { userId: studentUser.id, schoolId: baseFixture.schoolId, currency: "USD" },
    });
    await prisma.enrolledStudent.create({
      data: {
        courseId: baseFixture.courseId,
        studentId: studentProfile.id,
        status: "ACTIVE",
        listPriceMinor: DEFAULT_ENROLLMENT_LIST_PRICE_MINOR,
      },
    });

    // Create lead instructor (no UserSchoolRole needed — getCourseDetail checks assignedInstructor)
    const instructor = await provisionFreshEmailUser();
    const instructorUser = await prisma.user.findUnique({
      where: { email: instructor.email },
      select: { id: true },
    });
    if (!instructorUser) throw new Error("Instructor user not found");

    const instructorProfile = await prisma.instructor.create({
      data: { userId: instructorUser.id },
      select: { id: true },
    });
    await prisma.assignedInstructor.create({
      data: {
        courseId: baseFixture.courseId,
        instructorId: instructorProfile.id,
        isLead: true,
        agreedWagePerHour: 5000,
      },
    });

    // Transition course to STARTED
    await prisma.courseLifecycleEvent.create({
      data: {
        courseId: baseFixture.courseId,
        changedByUserId: managerUser.id,
        status: "STARTED",
      },
    });

    // Get first syllabus lesson to schedule
    const syllabusLesson = await prisma.syllabusLesson.findFirst({
      where: { syllabusVersionId: baseFixture.syllabusVersionId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    if (!syllabusLesson) throw new Error("No syllabus lesson found");

    // Schedule a future lesson
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);

    const courseLesson = await prisma.courseLesson.create({
      data: {
        courseId: baseFixture.courseId,
        syllabusLessonId: syllabusLesson.id,
        date: futureDate,
        location: "Main training ground",
        status: "SCHEDULED",
        proposedById: managerUser.id,
      },
      select: { id: true },
    });

    // Create MeetingAttendance for the student
    await prisma.meetingAttendance.create({
      data: {
        courseLessonId: courseLesson.id,
        studentId: studentProfile.id,
        status: "NO_RESPONSE",
      },
    });

    return {
      manager: baseFixture.manager,
      student,
      instructor,
      courseId: baseFixture.courseId,
      schoolId: baseFixture.schoolId,
      lessonId: courseLesson.id,
      syllabusLessonId: syllabusLesson.id,
      studentId: studentProfile.id,
      instructorId: instructorProfile.id,
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Creates a LESSON_UNDERWAY fixture (STARTED course + 1 active lesson in LESSON_UNDERWAY state).
 * Suitable for testing assessments and refund requests.
 */
export const createLessonUnderwayFixture = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  courseId: string;
  schoolId: string;
  lessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
}> => {
  const base = await createStartedCourseWithLesson();

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
    // Advance lesson status to LESSON_UNDERWAY directly via DB
    await prisma.courseLesson.update({
      where: { id: base.lessonId },
      data: { status: "LESSON_UNDERWAY", date: new Date(Date.now() - 60_000) },
    });

    return base;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Creates an OPEN course with one instructor assigned but with NO lead instructor
 * (isLead=false). Useful for testing FC-018 start-course guard for missing lead.
 */
export const createOpenCourseNoLead = async (): Promise<{
  manager: User;
  instructor: User;
  courseId: string;
  schoolId: string;
  instructorId: string;
}> => {
  const DEFAULT_ENROLLMENT_LIST_PRICE_MINOR = 175;
  const baseFixture = await createTestCourseWithManager();

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
    const instructor = await provisionFreshEmailUser();
    const instructorUser = await prisma.user.findUnique({
      where: { email: instructor.email },
      select: { id: true },
    });
    if (!instructorUser) throw new Error("Instructor user not found");

    const instructorProfile = await prisma.instructor.create({
      data: { userId: instructorUser.id },
      select: { id: true },
    });
    // Assign as non-lead with a wage so the only failing guard is the missing lead
    await prisma.assignedInstructor.create({
      data: {
        courseId: baseFixture.courseId,
        instructorId: instructorProfile.id,
        isLead: false,
        agreedWagePerHour: 5000,
      },
    });

    // Enroll one student so the course has minimum capacity
    const student = await provisionFreshEmailUser();
    const studentUser = await prisma.user.findUnique({
      where: { email: student.email },
      select: { id: true },
    });
    if (!studentUser) throw new Error("Student user not found");
    const studentProfile = await prisma.student.create({
      data: { userId: studentUser.id },
      select: { id: true },
    });
    await prisma.account.create({
      data: { userId: studentUser.id, schoolId: baseFixture.schoolId, currency: "USD" },
    });
    await prisma.enrolledStudent.create({
      data: {
        courseId: baseFixture.courseId,
        studentId: studentProfile.id,
        status: "ACTIVE",
        listPriceMinor: DEFAULT_ENROLLMENT_LIST_PRICE_MINOR,
      },
    });

    return {
      manager: baseFixture.manager,
      instructor,
      courseId: baseFixture.courseId,
      schoolId: baseFixture.schoolId,
      instructorId: instructorProfile.id,
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Creates an OPEN course with a lead instructor but with NO agreedWagePerHour set.
 * Useful for testing FC-018 start-course guard for missing instructor wage.
 */
export const createOpenCourseNoWage = async (): Promise<{
  manager: User;
  instructor: User;
  courseId: string;
  schoolId: string;
  instructorId: string;
}> => {
  const DEFAULT_ENROLLMENT_LIST_PRICE_MINOR = 175;
  const baseFixture = await createTestCourseWithManager();

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
    const instructor = await provisionFreshEmailUser();
    const instructorUser = await prisma.user.findUnique({
      where: { email: instructor.email },
      select: { id: true },
    });
    if (!instructorUser) throw new Error("Instructor user not found");

    const instructorProfile = await prisma.instructor.create({
      data: { userId: instructorUser.id },
      select: { id: true },
    });
    // Lead instructor with null wage — triggers INV-18 wage guard
    await prisma.assignedInstructor.create({
      data: {
        courseId: baseFixture.courseId,
        instructorId: instructorProfile.id,
        isLead: true,
        agreedWagePerHour: null,
      },
    });

    // Enroll one student
    const student = await provisionFreshEmailUser();
    const studentUser = await prisma.user.findUnique({
      where: { email: student.email },
      select: { id: true },
    });
    if (!studentUser) throw new Error("Student user not found");
    const studentProfile = await prisma.student.create({
      data: { userId: studentUser.id },
      select: { id: true },
    });
    await prisma.account.create({
      data: { userId: studentUser.id, schoolId: baseFixture.schoolId, currency: "USD" },
    });
    await prisma.enrolledStudent.create({
      data: {
        courseId: baseFixture.courseId,
        studentId: studentProfile.id,
        status: "ACTIVE",
        listPriceMinor: DEFAULT_ENROLLMENT_LIST_PRICE_MINOR,
      },
    });

    return {
      manager: baseFixture.manager,
      instructor,
      courseId: baseFixture.courseId,
      schoolId: baseFixture.schoolId,
      instructorId: instructorProfile.id,
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Creates a STARTED course with a BELOW_CAPACITY lesson (lesson date in the past,
 * status set to BELOW_CAPACITY directly). Suitable for testing FC-019 reschedule
 * and FC-021 below-capacity resolution UI flows.
 */
export const createBelowCapacityFixture = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  courseId: string;
  schoolId: string;
  lessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
}> => {
  const base = await createStartedCourseWithLesson();

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
    // Set lesson date to past and status to BELOW_CAPACITY
    await prisma.courseLesson.update({
      where: { id: base.lessonId },
      data: { status: "BELOW_CAPACITY", date: new Date(Date.now() - 3_600_000) },
    });

    // PROCEED_WITH_PARTIAL requires at least one ACCEPTED meeting attendance
    await prisma.meetingAttendance.updateMany({
      where: { courseLessonId: base.lessonId, studentId: base.studentId },
      data: { status: "ACCEPTED" },
    });

    return base;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Creates a STARTED course with a CONFIRMED future lesson. Suitable for testing
 * that a CONFIRMED lesson can be rescheduled before its date (FC-019).
 */
export const createConfirmedLessonFixture = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  courseId: string;
  schoolId: string;
  lessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
}> => {
  const base = await createStartedCourseWithLesson();

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
    // Advance lesson status to CONFIRMED (future date, capacity met)
    await prisma.courseLesson.update({
      where: { id: base.lessonId },
      data: { status: "CONFIRMED" },
    });

    return base;
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Creates a STARTED course with TWO instructors: one lead and one non-lead co-instructor.
 * Suitable for testing FC-020 non-lead presence hints and FC-023 mark-absent flows.
 */
export const createCourseWithNonLeadInstructor = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  coInstructor: User;
  courseId: string;
  schoolId: string;
  lessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
  coInstructorId: string;
}> => {
  const base = await createStartedCourseWithLesson();

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
    // Create a second instructor (non-lead co-instructor)
    const coInstructor = await provisionFreshEmailUser();
    const coInstructorUser = await prisma.user.findUnique({
      where: { email: coInstructor.email },
      select: { id: true },
    });
    if (!coInstructorUser) throw new Error("Co-instructor user not found");

    const coInstructorProfile = await prisma.instructor.create({
      data: { userId: coInstructorUser.id },
      select: { id: true },
    });
    await prisma.assignedInstructor.create({
      data: {
        courseId: base.courseId,
        instructorId: coInstructorProfile.id,
        isLead: false,
        agreedWagePerHour: 4000,
      },
    });

    // Create InstructorLessonPresence for non-lead (EXPECTED = awaiting response)
    await prisma.instructorLessonPresence.create({
      data: {
        courseLessonId: base.lessonId,
        instructorId: coInstructorProfile.id,
        status: "EXPECTED",
      },
    });

    return {
      ...base,
      coInstructor,
      coInstructorId: coInstructorProfile.id,
    };
  } finally {
    await prisma.$disconnect();
  }
};

// ---------------------------------------------------------------------------
// createReadyToStartCourse — OPEN course that passes all start guards
// Lead instructor with wage + enrolled student. Suitable for FC-018 happy path.
// ---------------------------------------------------------------------------

export const createReadyToStartCourse = async (): Promise<{
  manager: User;
  instructor: User;
  student: User;
  courseId: string;
  schoolId: string;
}> => {
  const DEFAULT_ENROLLMENT_LIST_PRICE_MINOR = 175;
  const baseFixture = await createTestCourseWithManager();

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
    const instructor = await provisionFreshEmailUser();
    const instructorUser = await prisma.user.findUnique({
      where: { email: instructor.email },
      select: { id: true },
    });
    if (!instructorUser) throw new Error("Instructor user not found");

    const instructorProfile = await prisma.instructor.create({
      data: { userId: instructorUser.id },
      select: { id: true },
    });
    await prisma.assignedInstructor.create({
      data: {
        courseId: baseFixture.courseId,
        instructorId: instructorProfile.id,
        isLead: true,
        agreedWagePerHour: 5000,
      },
    });

    const student = await provisionFreshEmailUser();
    const studentUser = await prisma.user.findUnique({
      where: { email: student.email },
      select: { id: true },
    });
    if (!studentUser) throw new Error("Student user not found");

    const studentProfile = await prisma.student.create({
      data: { userId: studentUser.id },
      select: { id: true },
    });
    await prisma.account.create({
      data: { userId: studentUser.id, schoolId: baseFixture.schoolId, currency: "USD" },
    });
    await prisma.enrolledStudent.create({
      data: {
        courseId: baseFixture.courseId,
        studentId: studentProfile.id,
        status: "ACTIVE",
        listPriceMinor: DEFAULT_ENROLLMENT_LIST_PRICE_MINOR,
      },
    });

    // startCourse charges enrolled students at STARTED transition, so fund this fixture account.
    await prisma.transaction.create({
      data: {
        accountId: (
          await prisma.account.findUniqueOrThrow({
            where: {
              userId_schoolId: {
                userId: studentUser.id,
                schoolId: baseFixture.schoolId,
              },
            },
            select: { id: true },
          })
        ).id,
        type: "DEPOSIT",
        amountMinor: 10_000,
        currency: "USD",
        description: "E2E fixture funding before course start",
      },
    });

    return {
      manager: baseFixture.manager,
      instructor,
      student,
      courseId: baseFixture.courseId,
      schoolId: baseFixture.schoolId,
    };
  } finally {
    await prisma.$disconnect();
  }
};

// ---------------------------------------------------------------------------
// createClosedCourseFixture — CLOSED course (for FC-018 reopen test)
// ---------------------------------------------------------------------------

export const createClosedCourseFixture = async (): Promise<{
  manager: User;
  courseId: string;
  schoolId: string;
}> => {
  const baseFixture = await createTestCourseWithManager();

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
    const managerUser = await prisma.user.findUnique({
      where: { email: baseFixture.manager.email },
      select: { id: true },
    });
    if (!managerUser) throw new Error("Manager user not found");

    await prisma.courseLifecycleEvent.create({
      data: {
        courseId: baseFixture.courseId,
        changedByUserId: managerUser.id,
        status: "CLOSED",
      },
    });

    return {
      manager: baseFixture.manager,
      courseId: baseFixture.courseId,
      schoolId: baseFixture.schoolId,
    };
  } finally {
    await prisma.$disconnect();
  }
};

// ---------------------------------------------------------------------------
// createDeclinedPresenceUnderwayFixture — LESSON_UNDERWAY + co-instructor DECLINED
// Suitable for testing FC-023 mark-absent flow.
// ---------------------------------------------------------------------------

export const createDeclinedPresenceUnderwayFixture = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  coInstructor: User;
  courseId: string;
  schoolId: string;
  lessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
  coInstructorId: string;
}> => {
  const base = await createCourseWithNonLeadInstructor();

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
    // Advance lesson to LESSON_UNDERWAY with a past date
    await prisma.courseLesson.update({
      where: { id: base.lessonId },
      data: { status: "LESSON_UNDERWAY", date: new Date(Date.now() - 60_000) },
    });

    // Set co-instructor presence to DECLINED
    await prisma.instructorLessonPresence.updateMany({
      where: { courseLessonId: base.lessonId, instructorId: base.coInstructorId },
      data: { status: "DECLINED" },
    });

    return base;
  } finally {
    await prisma.$disconnect();
  }
};

// ---------------------------------------------------------------------------
// createLateEnrollmentFixture — STARTED course + an enrollable school student
// The enrollable student has a UserSchoolRole + Student profile + Account balance.
// Suitable for testing FC-012 late enrollment.
// ---------------------------------------------------------------------------

export const createLateEnrollmentFixture = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  enrollableStudent: User;
  enrollableStudentId: string;
  courseId: string;
  schoolId: string;
  lessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
}> => {
  const base = await createStartedCourseWithLesson();

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
    const enrollableStudent = await provisionFreshEmailUser();
    const enrollableStudentUser = await prisma.user.findUnique({
      where: { email: enrollableStudent.email },
      select: { id: true },
    });
    if (!enrollableStudentUser) throw new Error("Enrollable student user not found");

    const enrollableStudentProfile = await prisma.student.create({
      data: { userId: enrollableStudentUser.id },
      select: { id: true },
    });

    // Account with sufficient balance to cover enrollment fee (hourlyRate=100, 105 mins = 175 minor units)
    await prisma.account.create({
      data: {
        userId: enrollableStudentUser.id,
        schoolId: base.schoolId,
        currency: "USD",
        balanceMinor: 10_000,
      },
    });

    // School role required so getCourseDetail includes this student in enrollableStudents.
    // The trigger requires sourceRegistrationRequestId; create a request first.
    const regRequest = await prisma.registrationRequest.create({
      data: {
        requesterId: enrollableStudentUser.id,
        requestedRole: "STUDENT",
        targetSchoolId: base.schoolId,
        status: "APPROVED",
        approvedSchoolId: base.schoolId,
      },
      select: { id: true },
    });
    await prisma.userSchoolRole.create({
      data: {
        userId: enrollableStudentUser.id,
        schoolId: base.schoolId,
        role: "STUDENT",
        sourceRegistrationRequestId: regRequest.id,
      },
    });

    return {
      ...base,
      enrollableStudent,
      enrollableStudentId: enrollableStudentProfile.id,
    };
  } finally {
    await prisma.$disconnect();
  }
};

// ---------------------------------------------------------------------------
// createBelowCapacityWithSuggestionFixture — BELOW_CAPACITY lesson + PENDING suggestion
// Suitable for testing FC-021 manager approval of PROCEED_WITH_PARTIAL.
// ---------------------------------------------------------------------------

export const createBelowCapacityWithSuggestionFixture = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  courseId: string;
  schoolId: string;
  lessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
  suggestionId: string;
}> => {
  const base = await createBelowCapacityFixture();

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
    const suggestion = await prisma.instructorSuggestion.create({
      data: {
        courseLessonId: base.lessonId,
        proposedByInstructorId: base.instructorId,
        type: "PROCEED_WITH_PARTIAL",
        status: "PENDING",
      },
      select: { id: true },
    });

    return {
      ...base,
      suggestionId: suggestion.id,
    };
  } finally {
    await prisma.$disconnect();
  }
};

// ---------------------------------------------------------------------------
// createFinalLessonUnderwayFixture — STARTED course + FINAL lesson in LESSON_UNDERWAY
// The final syllabus lesson (highest position) is set to LESSON_UNDERWAY.
// Suitable for testing FC-025 course completion.
// ---------------------------------------------------------------------------

export const createFinalLessonUnderwayFixture = async (): Promise<{
  manager: User;
  student: User;
  instructor: User;
  courseId: string;
  schoolId: string;
  lessonId: string;
  finalLessonId: string;
  syllabusLessonId: string;
  studentId: string;
  instructorId: string;
}> => {
  const base = await createStartedCourseWithLesson();

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
    const managerUser = await prisma.user.findUnique({
      where: { email: base.manager.email },
      select: { id: true },
    });
    if (!managerUser) throw new Error("Manager user not found");

    // Get the final syllabus lesson (highest position)
    const finalSyllabusLesson = await prisma.syllabusLesson.findFirst({
      where: { syllabusVersionId: (await prisma.course.findUnique({ where: { id: base.courseId }, select: { syllabusVersionId: true } }))!.syllabusVersionId },
      orderBy: { position: "desc" },
      select: { id: true },
    });
    if (!finalSyllabusLesson) throw new Error("Final syllabus lesson not found");

    // Create a CourseLesson for the final lesson in LESSON_UNDERWAY state
    const finalLesson = await prisma.courseLesson.create({
      data: {
        courseId: base.courseId,
        syllabusLessonId: finalSyllabusLesson.id,
        date: new Date(Date.now() - 60_000),
        location: "Final flight site",
        status: "LESSON_UNDERWAY",
        proposedById: managerUser.id,
      },
      select: { id: true },
    });

    return {
      ...base,
      finalLessonId: finalLesson.id,
    };
  } finally {
    await prisma.$disconnect();
  }
};
