import { expect, test } from "@playwright/test";
import { logUserIn } from "./utils";

const SCHOOL_MANAGER_EMAIL = "seed+school_manager.01@example.test";
const SCHOOL_MANAGER_PASSWORD = "12345678";

const navigateToSyllabusesSection = async (
  page: import("@playwright/test").Page,
  section: "catalog" | "create" | "details" | "editor",
) => {
  const targetPath = "/school-manager/syllabuses";
  const targetUrl = `${targetPath}?section=${section}`;

  // Guard: parallel tests sharing school_manager.01 can invalidate session;
  // re-login and retry a few times before failing.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(targetUrl);
    const current = new URL(page.url());

    if (current.pathname === targetPath && current.search === `?section=${section}`) {
      break;
    }

    if (current.pathname === "/login") {
      await logUserIn({
        page,
        user: { email: SCHOOL_MANAGER_EMAIL, password: SCHOOL_MANAGER_PASSWORD },
        expectedRedirectPath: targetPath,
      });
      continue;
    }
  }

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
    "[STD-SYL-004][STD-SYL-005][STD-SYL-010][@smoke] manager can edit lessons and save a new draft revision from the editor",
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
    "[STD-SYL-006][STD-SYL-010] save draft button is enabled for a manager-owned FINAL syllabus loaded into editor",
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

  test(
    "[STD-SYL-011] manager can delete a single draft from catalog after confirmation",
    async ({ page }) => {
      const draftName = `E2E delete one ${Date.now()}`;

      await test.step("Create a draft from FINAL template", async () => {
        await createDraftFromTemplate(page, draftName);
      });

      await test.step("Open catalog and start single-draft delete", async () => {
        await navigateToSyllabusesSection(page, "catalog");
        const targetDraft = page.locator("li").filter({ hasText: draftName }).first();
        await expect(targetDraft).toBeVisible();
        await targetDraft.getByRole("button", { name: /^Delete$/ }).click();
      });

      await test.step("Confirm deletion in popup and verify draft disappears", async () => {
        await expect(page.getByRole("heading", { name: "Delete draft?" })).toBeVisible();
        await page.getByRole("button", { name: "Delete draft" }).click();

        await expect(page.locator("li").filter({ hasText: draftName })).toHaveCount(0);
      });
    },
  );

  test(
    "[STD-SYL-012] manager can delete all editable drafts from catalog after confirmation",
    async ({ page }) => {
      const draftNameA = `E2E delete all A ${Date.now()}`;
      const draftNameB = `E2E delete all B ${Date.now()}`;

      await test.step("Create two drafts from FINAL template", async () => {
        await createDraftFromTemplate(page, draftNameA);
        await createDraftFromTemplate(page, draftNameB);
      });

      await test.step("Open catalog and trigger delete-all action", async () => {
        await navigateToSyllabusesSection(page, "catalog");
        await expect(page.locator("li").filter({ hasText: draftNameA }).first()).toBeVisible();
        await expect(page.locator("li").filter({ hasText: draftNameB }).first()).toBeVisible();
        await page.getByRole("button", { name: "Delete all drafts" }).click();
      });

      await test.step("Confirm delete-all and verify created drafts are removed", async () => {
        await expect(page.getByRole("heading", { name: "Delete all drafts?" })).toBeVisible();
        await page.getByRole("button", { name: "Confirm delete all" }).click();

        await expect(page.locator("li").filter({ hasText: draftNameA })).toHaveCount(0);
        await expect(page.locator("li").filter({ hasText: draftNameB })).toHaveCount(0);
      });
    },
  );
});
