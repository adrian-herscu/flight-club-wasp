import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

const SCHOOL_MANAGER_EMAIL = "seed+school_manager.01@example.test";
const SCHOOL_MANAGER_PASSWORD = "12345678";

const navigateToSyllabusesSection = async (
  page: import("@playwright/test").Page,
  section: "catalog" | "create" | "details" | "editor",
) => {
  await page.goto(`/school-manager/syllabuses?section=${section}`);
  await expect(page).toHaveURL(new RegExp(`/school-manager/syllabuses\\?section=${section}$`));
  await page.waitForLoadState("networkidle");
};

const createDraftFromTemplate = async (
  page: import("@playwright/test").Page,
  draftName: string,
) => {
  await navigateToSyllabusesSection(page, "create");

  const templateForm = page.locator("form").first();
  await templateForm.getByRole("combobox").click();
  await page.getByRole("option").first().click();

  await templateForm.getByPlaceholder("Cloudbase Tandem Advanced").fill(draftName);
  await templateForm.getByRole("button", { name: "Create from template" }).click();

  await expect(page).toHaveURL(/section=details/, { timeout: 10_000 });
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/v\d+\s*•\s*DRAFT\s*•/).first()).toBeVisible();
};

/** Load the currently-selected version lessons into the editor. */
const loadIntoEditor = async (page: import("@playwright/test").Page) => {
  await page.getByRole("button", { name: "Load Lessons Into Editor" }).click();
  await expect(page).toHaveURL(/section=editor/);
  await page.waitForLoadState("networkidle");
  await expect(lessonNameInputs(page).first()).toBeVisible();
};

/** Return all lesson-name inputs currently visible in the editor. */
const lessonNameInputs = (page: import("@playwright/test").Page) =>
  page.getByPlaceholder("Lesson name");

test.describe("4.13 Syllabus editor - save draft revision", () => {
  test.beforeEach(async ({ page }) => {
    await logUserIn({
      page,
      user: { email: SCHOOL_MANAGER_EMAIL, password: SCHOOL_MANAGER_PASSWORD },
      expectedRedirectPath: "/",
    });
  });

  test(
    "[STD-SYL-010][@smoke] manager can edit lessons and save a new draft revision from the editor",
    async ({ page }) => {
      await test.step("Create a draft from FINAL template", async () => {
        await createDraftFromTemplate(page, `E2E draft ${Date.now()}`);
      });

      await test.step("Load draft lessons into editor", async () => {
        await loadIntoEditor(page);
      });

      await expect(lessonNameInputs(page).first()).toBeVisible();
      const initialLessonCount = await lessonNameInputs(page).count();

      await test.step("Edit the first lesson name", async () => {
        const firstInput = lessonNameInputs(page).first();
        await expect(firstInput).toBeVisible();
        await firstInput.fill("E2E Edited Lesson");
        await expect(firstInput).toHaveValue("E2E Edited Lesson");
      });

      await test.step("Add a new lesson", async () => {
        await page.getByRole("button", { name: "Add lesson" }).click();
        const lastInput = lessonNameInputs(page).last();
        await lastInput.fill("E2E Added Lesson");
        await expect(lastInput).toHaveValue("E2E Added Lesson");
        await expect(lessonNameInputs(page)).toHaveCount(initialLessonCount + 1);
      });

      await test.step("Save as new draft revision", async () => {
        await page.getByRole("button", { name: "Save as new draft revision" }).click();
        await expect(page).toHaveURL(/section=details/, { timeout: 10_000 });
        await page.waitForLoadState("networkidle");
      });

      await test.step("Verify new draft is shown in Details with confirmation toast", async () => {
        await expect(page.getByText(/v\d+\s*•\s*DRAFT\s*•/).first()).toBeVisible();
        await expect(page.getByText("Draft revision saved").first()).toBeVisible({ timeout: 8_000 });
      });
    },
  );

  test(
    "[STD-SYL-010] manager can remove a lesson and save a new draft revision",
    async ({ page }) => {
      await test.step("Create a draft from FINAL template and open in editor", async () => {
        await createDraftFromTemplate(page, `E2E remove draft ${Date.now()}`);
        await loadIntoEditor(page);
      });

      await test.step("Ensure at least 2 lessons exist (add one if needed)", async () => {
        await expect(lessonNameInputs(page).first()).toBeVisible();
        const count = await lessonNameInputs(page).count();
        if (count < 2) {
          await page.getByRole("button", { name: "Add lesson" }).click();
          const lastInput = lessonNameInputs(page).last();
          await lastInput.fill("Extra Lesson For Remove Test");
          await expect(lessonNameInputs(page)).toHaveCount(count + 1);
        }
      });

      await test.step("Remove the last lesson", async () => {
        const before = await lessonNameInputs(page).count();
        await page.getByRole("button", { name: "Remove" }).last().click();
        await expect(lessonNameInputs(page)).toHaveCount(before - 1);
      });

      await test.step("Save as new draft revision and verify confirmation", async () => {
        await page.getByRole("button", { name: "Save as new draft revision" }).click();
        await expect(page).toHaveURL(/section=details/, { timeout: 10_000 });
        await page.waitForLoadState("networkidle");
        await expect(page.getByText("Draft revision saved").first()).toBeVisible({ timeout: 8_000 });
      });
    },
  );

  test(
    "[STD-SYL-010] save draft button is enabled for a manager-owned FINAL syllabus loaded into editor",
    async ({ page }) => {
      await test.step("Create a manager-owned draft", async () => {
        await createDraftFromTemplate(page, `E2E final source ${Date.now()}`);
      });

      await test.step("Publish draft to manager-owned FINAL and open in editor", async () => {
        await page.getByRole("button", { name: "Publish as FINAL version" }).click();
        await expect(page).toHaveURL(/section=details/, { timeout: 10_000 });
        await page.waitForLoadState("networkidle");
        await expect(page.getByText(/v\d+\s*•\s*FINAL\s*•/).first()).toBeVisible();

        await loadIntoEditor(page);
      });

      await test.step("Save as new draft revision button is enabled", async () => {
        const saveBtn = page.getByRole("button", { name: "Save as new draft revision" });
        await expect(saveBtn).toBeVisible();
        await expect(saveBtn).toBeEnabled();
      });
    },
  );
});
