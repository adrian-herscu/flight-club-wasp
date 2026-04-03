import { expect, test } from '@playwright/test';

import { createTestCourseWithManager, logUserIn, createTestStudentUser } from './utils.js';

test.describe('4.17 manager students page - course enrollment approval', () => {
  test('[STD-CIN-015][STD-CIN-016] manager can cancel a pending interest before enrollment', async ({ page }) => {
    const { manager, schoolName, syllabusName, courseStartDate } = await createTestCourseWithManager();
    const interestedStudent = await createTestStudentUser();

    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    await logUserIn({ page, user: interestedStudent, expectedRedirectPath: '/' });
    await page.goto('/');

    const schoolCard = page.getByTestId('landing-school-card').filter({ hasText: schoolName }).first();
    const targetCourseCard = schoolCard
      .getByTestId('landing-course-item')
      .filter({ hasText: syllabusName })
      .filter({ hasText: courseDateStr })
      .first();

    await targetCourseCard.getByTestId('express-interest-btn').click();
    await expect(targetCourseCard.getByTestId('express-interest-btn')).toContainText(/interested/i);

    await logUserIn({ page, user: manager, expectedRedirectPath: '/' });
    await page.goto('/school-manager/member-requests/students');
    await expect(page.getByText(interestedStudent.email).first()).toBeVisible();

    await page.getByRole('button', { name: /cancel interest/i }).first().click();
    await expect(page.getByText(interestedStudent.email).first()).toHaveCount(0);

    await logUserIn({ page, user: interestedStudent, expectedRedirectPath: '/' });
    await page.goto('/');
    await expect(targetCourseCard.getByTestId('express-interest-btn')).toContainText(/i('| a)m interested/i);
  });

  test('[STD-MGR-003][STD-MGR-007][STD-CIN-010] manager sees student-course pair and can approve enrollment', async ({ page }) => {
    // Set up test data server-side: manager + school + syllabus + course
    const { manager, schoolName, syllabusName, courseStartDate } = await createTestCourseWithManager();
    const interestedStudent = await createTestStudentUser();

    // Format course date for display
    const courseDateStr = courseStartDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    await test.step('Fresh student expresses interest in a manager-owned course', async () => {
      await logUserIn({
        page,
        user: interestedStudent,
        expectedRedirectPath: '/',
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const schoolCard = page
        .getByTestId('landing-school-card')
        .filter({ hasText: schoolName })
        .first();
      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId('landing-course-item')
        .filter({ hasText: syllabusName })
        .filter({ hasText: courseDateStr })
        .first();
      await expect(targetCourseCard).toBeVisible();

      const interestButton = targetCourseCard.getByTestId('express-interest-btn');
      await expect(interestButton).toBeEnabled();
      await interestButton.click();
      await expect(interestButton).toContainText(/interested/i);
      await expect(interestButton).toBeEnabled();
    });

    await test.step('Manager opens Students page and sees student-course pair with approval CTA', async () => {
      await logUserIn({
        page,
        user: manager,
        expectedRedirectPath: '/',
      });

      await page.goto('/school-manager/member-requests/students');
      await expect(page).toHaveURL(/\/school-manager\/member-requests\/students\/?$/);

      await expect(page.getByText(interestedStudent.email).first()).toBeVisible();
      await expect(page.getByText(syllabusName).first()).toBeVisible();
      const approveEnrollmentButton = page.getByRole('button', { name: /approve enrollment/i }).first();
      await expect(approveEnrollmentButton).toBeVisible();
      await approveEnrollmentButton.click();
    });

    await test.step('Approved student sees enrolled label on the landing course card', async () => {
      await logUserIn({
        page,
        user: interestedStudent,
        expectedRedirectPath: '/',
      });

      await page.goto('/');

      const schoolCard = page
        .getByTestId('landing-school-card')
        .filter({ hasText: schoolName })
        .first();
      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId('landing-course-item')
        .filter({ hasText: syllabusName })
        .filter({ hasText: courseDateStr })
        .first();
      await expect(targetCourseCard).toBeVisible();

      await expect(targetCourseCard.getByTestId('landing-course-enrolled-label')).toBeVisible();
    });
  });
});
