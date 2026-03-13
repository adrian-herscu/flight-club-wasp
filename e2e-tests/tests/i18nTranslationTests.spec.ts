import { expect, test } from "@playwright/test";
import { detectLanguageFromText } from "./utils";

test.describe("Internationalization & Translation Tests", () => {
  test("language smoke: body text should match selected language on login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    const englishAuthText = (
      await page.locator("h2, label, button[type='submit']").allInnerTexts()
    ).join(" ");
    expect(detectLanguageFromText(englishAuthText)).toBe("en");

    await page.getByRole("button", { name: /עברית/ }).click();
    await page.waitForFunction(() => document.documentElement.lang === "he");

    const hebrewAuthText = (
      await page.locator("h2, label, button[type='submit']").allInnerTexts()
    ).join(" ");
    expect(detectLanguageFromText(hebrewAuthText)).toBe("he");
  });

  test("Google sign-in button remains visible in English and Hebrew", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Continue with Google")).toBeVisible();
    const googleLink = page.locator('a[href$="/auth/google/login"]');
    await expect(googleLink).toBeVisible();

    await page.getByRole("button", { name: /עברית/ }).click();
    await page.waitForFunction(() => document.documentElement.lang === "he");

    await expect(page.getByText("המשך עם Google")).toBeVisible();
    await expect(googleLink).toBeVisible();
  });

  test("lang and dir attributes track language switching", async ({ page }) => {
    await page.goto("/login");

    await expect.poll(async () => page.getAttribute("html", "lang")).toBe("en");
    await expect.poll(async () => page.getAttribute("html", "dir")).toBe("ltr");

    await page.getByRole("button", { name: /עברית/ }).click();

    await expect.poll(async () => page.getAttribute("html", "lang")).toBe("he");
    await expect.poll(async () => page.getAttribute("html", "dir")).toBe("rtl");
  });

  test("primary login affordances are translated", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign Up/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Reset it/i })).toBeVisible();

    await page.getByRole("button", { name: /עברית/ }).click();
    await page.waitForFunction(() => document.documentElement.lang === "he");

    await expect(page.getByRole("button", { name: "כניסה" })).toBeVisible();
    await expect(page.getByRole("link", { name: /הרשמה/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /אפס/ })).toBeVisible();
  });

  test("language toggle remains stable across multiple switches", async ({ page }) => {
    await page.goto("/login");

    for (let i = 0; i < 3; i++) {
      const lang = await page.getAttribute("html", "lang");
      if (lang === "en") {
        await page.getByRole("button", { name: /עברית/ }).click();
        await expect.poll(async () => page.getAttribute("html", "lang")).toBe("he");
      } else {
        await page.getByRole("button", { name: /English/ }).click();
        await expect.poll(async () => page.getAttribute("html", "lang")).toBe("en");
      }
    }
  });
});

