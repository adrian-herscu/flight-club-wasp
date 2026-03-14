import { expect, test, type Browser, type Page } from "@playwright/test";
import { detectLanguageFromText } from "./utils";

async function selectLanguage(page: Page, languageLabel: string) {
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: languageLabel }).click();
}

test.describe("Internationalization & Translation Tests", () => {
  test("language smoke: body text should match selected language on login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    const englishAuthText = (
      await page.locator("h2, label, button[type='submit']").allInnerTexts()
    ).join(" ");
    expect(detectLanguageFromText(englishAuthText)).toBe("en");

    await selectLanguage(page, "עברית");
    await page.waitForFunction(() => document.documentElement.lang === "he");

    const hebrewAuthText = (
      await page.locator("h2, label, button[type='submit']").allInnerTexts()
    ).join(" ");
    expect(detectLanguageFromText(hebrewAuthText)).toBe("he");

    await selectLanguage(page, "Română");
    await page.waitForFunction(() => document.documentElement.lang === "ro");

    const romanianAuthText = (
      await page.locator("h2, label, button[type='submit']").allInnerTexts()
    ).join(" ");
    expect(detectLanguageFromText(romanianAuthText)).toBe("ro");
  });

  test("Google sign-in button remains visible in English, Hebrew, and Romanian", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Continue with Google")).toBeVisible();
    const googleLink = page.locator('a[href$="/auth/google/login"]');
    await expect(googleLink).toBeVisible();

    await selectLanguage(page, "עברית");
    await page.waitForFunction(() => document.documentElement.lang === "he");

    await expect(page.getByText("המשך עם Google")).toBeVisible();
    await expect(googleLink).toBeVisible();

    await selectLanguage(page, "Română");
    await page.waitForFunction(() => document.documentElement.lang === "ro");

    await expect(page.getByText("Continuă cu Google")).toBeVisible();
    await expect(googleLink).toBeVisible();
  });

  test("lang and dir attributes track language switching", async ({ page }) => {
    await page.goto("/login");

    await expect.poll(async () => page.getAttribute("html", "lang")).toBe("en");
    await expect.poll(async () => page.getAttribute("html", "dir")).toBe("ltr");

    await selectLanguage(page, "עברית");

    await expect.poll(async () => page.getAttribute("html", "lang")).toBe("he");
    await expect.poll(async () => page.getAttribute("html", "dir")).toBe("rtl");

    await selectLanguage(page, "Română");

    await expect.poll(async () => page.getAttribute("html", "lang")).toBe("ro");
    await expect.poll(async () => page.getAttribute("html", "dir")).toBe("ltr");
  });

  test("primary login affordances are translated", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign Up/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Reset it/i })).toBeVisible();

    await selectLanguage(page, "עברית");
    await page.waitForFunction(() => document.documentElement.lang === "he");

    await expect(page.getByRole("button", { name: "כניסה" })).toBeVisible();
    await expect(page.getByRole("link", { name: /הרשמה/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /אפס/ })).toBeVisible();

    await selectLanguage(page, "Română");
    await page.waitForFunction(() => document.documentElement.lang === "ro");

    await expect(page.getByRole("button", { name: "Autentificare" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Înregistrare/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Reseteaz-o/ })).toBeVisible();
  });

  test("language selector remains stable across multiple switches", async ({ page }) => {
    await page.goto("/login");

    const sequence: Array<[string, string]> = [
      ["עברית", "he"],
      ["Română", "ro"],
      ["English", "en"],
      ["Română", "ro"],
      ["English", "en"],
    ];

    for (const [label, lang] of sequence) {
      await selectLanguage(page, label);
      await expect.poll(async () => page.getAttribute("html", "lang")).toBe(lang);
    }
  });
});

// ---------------------------------------------------------------------------
// Browser language auto-detection
// Each test opens a FRESH context (no localStorage) with a specific browser
// locale so that detectBrowserLanguage() is the sole deciding factor.
// ---------------------------------------------------------------------------
test.describe("Browser language auto-detection (no localStorage)", () => {
  async function openFreshPage(browser: Browser, locale: string) {
    const ctx = await browser.newContext({ locale });
    const page = await ctx.newPage();
    // Clear any stale locale that may have leaked from a previous context.
    await page.addInitScript(() => localStorage.removeItem("locale"));
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    return { page, ctx };
  }

  test("opens in Hebrew when browser locale is he", async ({ browser }) => {
    const { page, ctx } = await openFreshPage(browser, "he");
    try {
      await expect.poll(() => page.getAttribute("html", "lang")).toBe("he");
      const text = (await page.locator("h2, label, button[type='submit']").allInnerTexts()).join(" ");
      expect(detectLanguageFromText(text)).toBe("he");
    } finally {
      await ctx.close();
    }
  });

  test("opens in Romanian when browser locale is ro", async ({ browser }) => {
    const { page, ctx } = await openFreshPage(browser, "ro");
    try {
      await expect.poll(() => page.getAttribute("html", "lang")).toBe("ro");
      const text = (await page.locator("h2, label, button[type='submit']").allInnerTexts()).join(" ");
      expect(detectLanguageFromText(text)).toBe("ro");
    } finally {
      await ctx.close();
    }
  });

  test("falls back to English for unsupported browser locale (fr)", async ({ browser }) => {
    const { page, ctx } = await openFreshPage(browser, "fr");
    try {
      await expect.poll(() => page.getAttribute("html", "lang")).toBe("en");
      const text = (await page.locator("h2, label, button[type='submit']").allInnerTexts()).join(" ");
      expect(detectLanguageFromText(text)).toBe("en");
    } finally {
      await ctx.close();
    }
  });
});

