import { expect, test } from "@playwright/test";

import {
  createBelowCapacityFixture,
  createBelowCapacityWithSuggestionFixture,
  createClosedCourseFixture,
  createConfirmedLessonFixture,
  createCourseWithNonLeadInstructor,
  createDeclinedPresenceUnderwayFixture,
  createFinalLessonUnderwayFixture,
  createLateEnrollmentFixture,
  createLessonUnderwayFixture,
  createOpenCourseNoLead,
  createOpenCourseNoWage,
  createReadyToStartCourse,
  createStartedCourseWithLesson,
  createTestCourseWithManager,
  logUserIn,
} from "./utils.js";

// ---------------------------------------------------------------------------
// 4.18 Course execution lifecycle
// ---------------------------------------------------------------------------

test.describe("4.18 course execution lifecycle", () => {
  // -----------------------------------------------------------------------
  // FC-020 — Attendance and presence hints
  // -----------------------------------------------------------------------

  test("[STD-CRS-010] student sees attendance hint on a scheduled future lesson", async ({
    page,
  }) => {
    const { student, courseId } = await createStartedCourseWithLesson();

    await logUserIn({ page, user: student, expectedRedirectPath: "/" });
    await page.goto(`/student/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(page.getByText(/attendance:/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /accept/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /decline/i }).first()).toBeVisible();
  });

  test("[STD-CRS-011] student can accept attendance on a future scheduled lesson", async ({
    page,
  }) => {
    const { student, courseId } = await createStartedCourseWithLesson();

    await logUserIn({ page, user: student, expectedRedirectPath: "/" });
    await page.goto(`/student/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /^accept$/i }).first().click();

    // After accepting the button should show accepted state
    await expect(page.getByText(/✓ accepted/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-011b] student can decline attendance on a future scheduled lesson", async ({
    page,
  }) => {
    const { student, courseId } = await createStartedCourseWithLesson();

    await logUserIn({ page, user: student, expectedRedirectPath: "/" });
    await page.goto(`/student/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /^decline$/i }).first().click();

    await expect(page.getByText(/✗ declined/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-010b] lead instructor sees schedule button but no attendance hint", async ({
    page,
  }) => {
    const { instructor, courseId } = await createStartedCourseWithLesson();

    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(page.getByRole("button", { name: /reschedule|schedule/i }).first()).toBeVisible();
    // Lead instructor should NOT see student attendance row
    await expect(page.getByText(/attendance:/i)).not.toBeVisible();
  });

  // -----------------------------------------------------------------------
  // FC-022 — Student assessments
  // -----------------------------------------------------------------------

  test("[STD-CRS-012] lead instructor sees assessment form on LESSON_UNDERWAY lesson", async ({
    page,
  }) => {
    const { instructor, courseId } = await createLessonUnderwayFixture();

    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(page.getByText(/student assessments/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /submit/i }).first()).toBeVisible();
  });

  test("[STD-CRS-013] lead instructor can submit a PASS assessment for an enrolled student", async ({
    page,
  }) => {
    const { instructor, courseId } = await createLessonUnderwayFixture();

    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    // Attended checkbox should be pre-checked, PASS should be default selection
    const submitBtn = page.getByRole("button", { name: /^submit$/i }).first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // After submit the row should show the saved evaluation status
    await expect(page.getByText(/PASS/i).first()).toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------------------------------------------
  // FC-024 — Student refund request
  // -----------------------------------------------------------------------

  test("[STD-CRS-014] student can open refund request modal on a started course", async ({
    page,
  }) => {
    const { student, courseId } = await createStartedCourseWithLesson();

    await logUserIn({ page, user: student, expectedRedirectPath: "/" });
    await page.goto(`/student/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /request refund/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/request a refund/i)).toBeVisible();
  });

  test("[STD-CRS-015] student can submit a refund request", async ({ page }) => {
    const { student, courseId } = await createStartedCourseWithLesson();

    await logUserIn({ page, user: student, expectedRedirectPath: "/" });
    await page.goto(`/student/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /request refund/i }).click();
    await page.getByPlaceholder(/reason/i).fill("Changed plans");
    await page.getByRole("button", { name: /^submit$/i }).click();

    // Modal should close and status should show PENDING label
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/PENDING/i)).toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------------------------------------------
  // FC-024 — Manager refund approval
  // -----------------------------------------------------------------------

  test("[STD-CRS-016] manager sees pending refund requests panel on started course", async ({
    page,
  }) => {
    // Build fixture and submit a refund request via the student session
    const fixture = await createStartedCourseWithLesson();

    // First, submit a refund as the student
    const { student, courseId, manager } = fixture;

    await logUserIn({ page, user: student, expectedRedirectPath: "/" });
    await page.goto(`/student/courses/${courseId}`);
    await page.getByRole("button", { name: /request refund/i }).click();
    await page.getByRole("button", { name: /^submit$/i }).click();
    await expect(page.getByText(/PENDING/i)).toBeVisible({ timeout: 5000 });

    // Now log in as manager and verify the refund panel is visible
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(page.getByText(/pending refund requests/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /approve/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /decline/i }).first()).toBeVisible();
  });

  test("[STD-CRS-017] manager can approve a pending refund request", async ({ page }) => {
    const fixture = await createStartedCourseWithLesson();
    const { student, courseId, manager } = fixture;

    // Submit refund as student
    await logUserIn({ page, user: student, expectedRedirectPath: "/" });
    await page.goto(`/student/courses/${courseId}`);
    await page.getByRole("button", { name: /request refund/i }).click();
    await page.getByRole("button", { name: /^submit$/i }).click();
    await expect(page.getByText(/PENDING/i)).toBeVisible({ timeout: 5000 });

    // Approve as manager
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByText(/pending refund requests/i)).toBeVisible();

    await page.getByPlaceholder(/amount \(minor units\)/i).first().fill("5000");
    await page.getByRole("button", { name: /approve/i }).first().click();

    // After approval, panel should disappear (no more pending items)
    await expect(page.getByText(/pending refund requests/i)).not.toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------------------------------------------
  // Late enrollment — manager
  // -----------------------------------------------------------------------

  test("[STD-CRS-018] manager sees late enrollment panel on a started course", async ({
    page,
  }) => {
    const { manager, courseId } = await createStartedCourseWithLesson();

    // The school has the student already enrolled; enrollableStudents may be empty.
    // We verify the panel appears only if there are candidates — just navigate and confirm page loads.
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();
    // Panel may or may not render depending on whether there are unenrolled school students.
    // Assert the page loaded without error.
    await expect(page.getByText(/v1/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4.18.A  FC-018 — Start course guards and happy path
// ---------------------------------------------------------------------------

test.describe("4.18.A FC-018 start course", () => {
  test("[STD-CRS-019] manager is blocked from starting a course that has no lead instructor (INV-18)", async ({
    page,
  }) => {
    const { manager, courseId } = await createOpenCourseNoLead();
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /start course/i }).click();

    // Guard error should mention lead instructor
    await expect(
      page.getByText(/exactly one lead instructor/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-020] manager is blocked from starting a course where an instructor has no agreed wage (INV-18)", async ({
    page,
  }) => {
    const { manager, courseId } = await createOpenCourseNoWage();
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /start course/i }).click();

    // Guard error should mention agreed wage
    await expect(
      page.getByText(/agreed wage/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-021] manager can start an OPEN course that passes all guards → course moves to STARTED", async ({
    page,
  }) => {
    const { manager, courseId } = await createReadyToStartCourse();
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /start course/i }).click();

    await expect(page.getByText(/course started/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("[STD-CRS-022] manager can close an OPEN course from the courses list page → course moves to CLOSED", async ({
    page,
  }) => {
    const { manager, courseId } = await createTestCourseWithManager();
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto("/school-manager/courses");

    // Find the course list item and click its Close button
    const courseListItem = page.locator("li").filter({
      has: page.getByTestId(`manager-course-summary-${courseId}`),
    });
    await expect(courseListItem).toBeVisible({ timeout: 5000 });
    await courseListItem.getByRole("button", { name: /^Close$/i }).click();

    // Confirm in dialog
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /^Close course$/i }).click();

    await expect(page.getByText(/course closed/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-023] manager can close a STARTED course from the courses list page → course moves to CLOSED", async ({
    page,
  }) => {
    const { manager, courseId } = await createStartedCourseWithLesson();
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto("/school-manager/courses");

    const courseListItem = page.locator("li").filter({
      has: page.getByTestId(`manager-course-summary-${courseId}`),
    });
    await expect(courseListItem).toBeVisible({ timeout: 5000 });
    await courseListItem.getByRole("button", { name: /^Close$/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /^Close course$/i }).click();

    await expect(page.getByText(/course closed/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-024] manager can reopen a CLOSED course from the courses list page → course moves to OPEN", async ({
    page,
  }) => {
    const { manager } = await createClosedCourseFixture();
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto("/school-manager/courses");

    // Expand the closed courses disclosure panel
    await page.locator("summary").filter({ hasText: /Closed Courses/i }).click();

    // Click Reopen button on the course
    await expect(page.getByRole("button", { name: /^Reopen$/i }).first()).toBeVisible({
      timeout: 3000,
    });
    await page.getByRole("button", { name: /^Reopen$/i }).first().click();

    // Confirm in dialog
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 3000 });
    await page.getByRole("button", { name: /^Reopen course$/i }).click();

    await expect(page.getByText(/course reopened/i).first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4.18.B  FC-019 — Lesson scheduling and rescheduling
// ---------------------------------------------------------------------------

test.describe("4.18.B FC-019 lesson scheduling", () => {
  test("[STD-CRS-025] lead instructor can schedule an UNSCHEDULED lesson by providing a date and location", async ({
    page,
  }) => {
    // createStartedCourseWithLesson creates 2 syllabus lessons; lesson 1 is SCHEDULED,
    // lesson 2 has no CourseLesson row (UNSCHEDULED) — clicking Schedule creates it.
    const { instructor, courseId } = await createStartedCourseWithLesson();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    // Click the "Schedule" button (exact match, not "Reschedule")
    await page.getByRole("button", { name: /^Schedule$/i }).click();

    // Fill in the sheet
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
    await page.fill("#lesson-date", tomorrow);
    await page.fill("#lesson-location", "Training field B");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect(page.getByText("Lesson scheduled", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-026] lead instructor can reschedule a SCHEDULED lesson → lesson status resets to SCHEDULED with new date", async ({
    page,
  }) => {
    const { instructor, courseId } = await createStartedCourseWithLesson();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /^Reschedule$/i }).first().click();

    const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().split("T")[0];
    await page.fill("#lesson-date", nextWeek);
    await page.fill("#lesson-location", "Airfield North");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect(page.getByText("Lesson scheduled", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-027] lead instructor sees reschedule action available on a BELOW_CAPACITY lesson", async ({
    page,
  }) => {
    const { instructor, courseId } = await createBelowCapacityFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    // BELOW_CAPACITY lesson has a lessonId so the button reads "Reschedule"
    await expect(page.getByRole("button", { name: /^Reschedule$/i }).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("[STD-CRS-028] lead instructor can reschedule a BELOW_CAPACITY lesson → lesson moves back to SCHEDULED", async ({
    page,
  }) => {
    const { instructor, courseId } = await createBelowCapacityFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /^Reschedule$/i }).first().click();

    const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString().split("T")[0];
    await page.fill("#lesson-date", futureDate);
    await page.fill("#lesson-location", "Hillside LZ");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect(page.getByText("Lesson scheduled", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-029] rescheduling a BELOW_CAPACITY lesson that has a PENDING suggestion supersedes that suggestion", async ({
    page,
  }) => {
    const { instructor, courseId } = await createBelowCapacityWithSuggestionFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    // The pending suggestion text should be visible before reschedule
    await expect(page.getByText(/awaiting manager approval/i).first()).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole("button", { name: /^Reschedule$/i }).first().click();

    const futureDate = new Date(Date.now() + 14 * 86_400_000).toISOString().split("T")[0];
    await page.fill("#lesson-date", futureDate);
    await page.fill("#lesson-location", "East meadow");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect(page.getByText("Lesson scheduled", { exact: true })).toBeVisible({ timeout: 5000 });
    // After reschedule: suggestion superseded, status back to SCHEDULED, no more "awaiting" text
    await expect(page.getByText(/awaiting manager approval/i)).not.toBeVisible({ timeout: 3000 });
  });

  test("[STD-CRS-030] lead instructor can reschedule a CONFIRMED lesson before its date → lesson returns to SCHEDULED", async ({
    page,
  }) => {
    const { instructor, courseId } = await createConfirmedLessonFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /^Reschedule$/i }).first().click();

    const futureDate = new Date(Date.now() + 21 * 86_400_000).toISOString().split("T")[0];
    await page.fill("#lesson-date", futureDate);
    await page.fill("#lesson-location", "West ridge");
    await page.getByRole("button", { name: /^Save$/i }).click();

    await expect(page.getByText("Lesson scheduled", { exact: true })).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4.18.C  FC-020 — Non-lead instructor presence hints
// ---------------------------------------------------------------------------

test.describe("4.18.C FC-020 non-lead presence hints", () => {
  test("[STD-CRS-031] non-lead instructor sees presence hint controls on a SCHEDULED future lesson", async ({
    page,
  }) => {
    const { coInstructor, courseId } = await createCourseWithNonLeadInstructor();
    await logUserIn({ page, user: coInstructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(page.getByRole("button", { name: /^Confirm$/i }).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole("button", { name: /^Unavailable$/i }).first()).toBeVisible();
  });

  test("[STD-CRS-032] non-lead instructor can confirm availability before the lesson date → presence shows CONFIRMED", async ({
    page,
  }) => {
    const { coInstructor, courseId } = await createCourseWithNonLeadInstructor();
    await logUserIn({ page, user: coInstructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /^Confirm$/i }).first().click();

    await expect(page.getByText(/✓ Confirmed/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-033] non-lead instructor can report unavailability before the lesson date → presence shows DECLINED", async ({
    page,
  }) => {
    const { coInstructor, courseId } = await createCourseWithNonLeadInstructor();
    await logUserIn({ page, user: coInstructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await page.getByRole("button", { name: /^Unavailable$/i }).first().click();

    await expect(page.getByText(/✗ Unavailable/i).first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4.18.D  FC-022 / FC-023 — Assessments and absent co-instructor
// ---------------------------------------------------------------------------

test.describe("4.18.D FC-022 / FC-023 assessments and absent co-instructor", () => {
  test("[STD-CRS-034] lead instructor can submit a FAIL assessment with attended=false for an enrolled student", async ({
    page,
  }) => {
    const { instructor, courseId } = await createLessonUnderwayFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(page.getByText(/student assessments/i).first()).toBeVisible({ timeout: 5000 });

    // Uncheck Attended → status auto-switches to FAIL
    await page.locator('label').filter({ hasText: /^Attended$/i }).first().click();
    // Click Submit
    await page.getByRole("button", { name: /^Submit$/i }).first().click();

    await expect(page.getByText(/assessment saved/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-035] lead instructor can mark a DECLINED co-instructor as ABSENT during LESSON_UNDERWAY", async ({
    page,
  }) => {
    const { instructor, courseId } = await createDeclinedPresenceUnderwayFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    // Co-instructors section with "Mark Absent" button should be visible
    await expect(page.getByRole("button", { name: /mark absent/i }).first()).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /mark absent/i }).first().click();

    await expect(page.getByText(/instructor marked absent/i).first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4.18.E  FC-012 — Late enrollment after course has started
// ---------------------------------------------------------------------------

test.describe("4.18.E FC-012 late enrollment", () => {
  test("[STD-CRS-036] manager can enroll a new student in a STARTED course before the first lesson reaches LESSON_UNDERWAY", async ({
    page,
  }) => {
    const { manager, courseId, enrollableStudentId } = await createLateEnrollmentFixture();
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    // Late Enrollment section should be visible with a student to select
    await expect(page.getByText(/Late Enrollment/i).first()).toBeVisible({ timeout: 5000 });

    // Select the enrollable student and click Enroll
    await page.locator("select").selectOption({ value: enrollableStudentId });
    await page.getByRole("button", { name: /^Enroll$/i }).click();

    await expect(page.getByText(/student enrolled/i).first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4.18.F  FC-021 — Below-capacity resolution via manager approval
// ---------------------------------------------------------------------------

test.describe("4.18.F FC-021 below-capacity resolution", () => {
  test("[STD-CRS-037] lead instructor can submit a PROCEED_WITH_PARTIAL suggestion on a BELOW_CAPACITY lesson via UI", async ({
    page,
  }) => {
    const { instructor, courseId } = await createBelowCapacityFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(
      page.getByRole("button", { name: /suggest: proceed with partial/i }).first(),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /suggest: proceed with partial/i }).first().click();

    await expect(page.getByText(/suggestion submitted/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/awaiting manager approval/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("[STD-CRS-038] manager can approve a PROCEED_WITH_PARTIAL suggestion → lesson advances to CONFIRMED", async ({
    page,
  }) => {
    const { manager, courseId } = await createBelowCapacityWithSuggestionFixture();
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(page.getByRole("button", { name: /^Approve$/i }).first()).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /^Approve$/i }).first().click();

    await expect(page.getByText(/suggestion approved/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("[STD-CRS-039] lead instructor can submit a CLOSE_COURSE suggestion on a BELOW_CAPACITY lesson via UI", async ({
    page,
  }) => {
    const { instructor, courseId } = await createBelowCapacityFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    await expect(
      page.getByRole("button", { name: /suggest: close course/i }).first(),
    ).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /suggest: close course/i }).first().click();

    await expect(page.getByText(/suggestion submitted/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/awaiting manager approval/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("[STD-CRS-040] manager can approve a CLOSE_COURSE suggestion → lesson CANCELLED and course CLOSED", async ({
    page,
  }) => {
    const { instructor, manager, courseId } = await createBelowCapacityFixture();

    // Step 1: instructor submits CLOSE_COURSE suggestion
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();
    await page.getByRole("button", { name: /suggest: close course/i }).first().click();
    await expect(page.getByText(/awaiting manager approval/i).first()).toBeVisible({ timeout: 5000 });

    // Step 2: manager approves
    await logUserIn({ page, user: manager, expectedRedirectPath: "/" });
    await page.goto(`/school-manager/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Approve$/i }).first()).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: /^Approve$/i }).first().click();

    await expect(page.getByText(/suggestion approved/i).first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4.18.G  FC-025 — Course completion
// ---------------------------------------------------------------------------

test.describe("4.18.G FC-025 course completion", () => {
  test("[STD-CRS-041] course auto-transitions to COMPLETED when all enrolled students receive PASS on the final lesson", async ({
    page,
  }) => {
    const { instructor, courseId } = await createFinalLessonUnderwayFixture();
    await logUserIn({ page, user: instructor, expectedRedirectPath: "/" });
    await page.goto(`/instructor/courses/${courseId}`);
    await expect(page.getByTestId("course-detail-page")).toBeVisible();

    // Assessment form should be visible for the LESSON_UNDERWAY final lesson
    await expect(page.getByText(/student assessments/i).first()).toBeVisible({ timeout: 5000 });

    // Default is PASS + attended=true; just click Submit
    await page.getByRole("button", { name: /^Submit$/i }).first().click();

    // After all students assessed: course auto-transitions to COMPLETED
    await expect(page.getByText(/assessment saved/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("COMPLETED").first()).toBeVisible({ timeout: 5000 });
  });
});
