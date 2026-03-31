import { expect, test } from '@playwright/test';

import { logUserIn, provisionFreshEmailUser } from './utils.js';

const MANAGER_USER = {
  email: 'seed+school_manager.01@example.test',
  password: '12345678',
};

const TARGET_SCHOOL_NAME = 'Cloudbase Annex';
const TARGET_COURSE_TITLE = 'Tandem Flights v1';
const TARGET_COURSE_START_DATE = 'Aug 2, 2027';

test.describe('4.17 manager students page - course enrollment approval', () => {
  test('[STD-MGR-003][STD-MGR-007] manager sees student-course pair and can approve enrollment', async ({ page }) => {
    const interestedUser = await provisionFreshEmailUser();

    await test.step('Fresh user expresses interest in a manager-owned course', async () => {
      await logUserIn({
        page,
        user: interestedUser,
        expectedRedirectPath: '/',
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const schoolCard = page
        .getByTestId('landing-school-card')
        .filter({ hasText: TARGET_SCHOOL_NAME })
        .first();
      await expect(schoolCard).toBeVisible();

      const targetCourseCard = schoolCard
        .getByTestId('landing-course-item')
        .filter({ hasText: TARGET_COURSE_TITLE })
        .filter({ hasText: TARGET_COURSE_START_DATE })
        .first();
      await expect(targetCourseCard).toBeVisible();

      const interestButton = targetCourseCard.getByTestId('express-interest-btn');
      await expect(interestButton).toBeEnabled();
      await interestButton.click();
      await expect.poll(async () => interestButton.isEnabled()).toBe(false);
    });

    await test.step('Manager opens Students page and sees student-course pair with approval CTA', async () => {
      await logUserIn({
        page,
        user: MANAGER_USER,
        expectedRedirectPath: '/',
      });

      await page.goto('/school-manager/member-requests/students');
      await expect(page).toHaveURL(/\/school-manager\/member-requests\/students\/?$/);

      await expect(page.getByText(interestedUser.email).first()).toBeVisible();
      await expect(page.getByText(TARGET_COURSE_TITLE).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /approve enrollment/i }).first()).toBeVisible();
    });
  });
});