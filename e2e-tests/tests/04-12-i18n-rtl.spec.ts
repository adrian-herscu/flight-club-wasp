import { expect, test, type Browser, type Page } from "@playwright/test";
import { detectLanguageFromText } from "./utils";

async function selectLanguage(page: Page, languageLabel: string) {
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: languageLabel }).click();
}

test.describe("4.12 internationalization and RTL", () => {
  test("[4.12][STD-I18N-001] language smoke: body text should match selected language on login", async ({ page }) => {
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

  test("[4.12][STD-I18N-004] Google sign-in button remains visible in English, Hebrew, and Romanian", async ({ page }) => {
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

  test("[4.12][STD-I18N-002] lang and dir attributes track language switching", async ({ page }) => {
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

  test("[4.12][STD-I18N-001] primary login affordances are translated", async ({ page }) => {
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

  test("[4.12][STD-I18N-002] language selector remains stable across multiple switches", async ({ page }) => {
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

  test("[4.12][STD-I18N-008] landing discovery labels are translated in Romanian", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("locale", "ro"));
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Școli și cursuri disponibile" }),
    ).toBeVisible();
    await expect(
      page.getByText("Răsfoiește școlile aprobate și cursurile publicate în prezent."),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Filtrează după numele cursului…")).toBeVisible();
    await expect(page.getByPlaceholder("Filtrează după locație…")).toBeVisible();
    await expect(page.getByTestId("filter-country")).toContainText("Toate țările");
  });
});

// ---------------------------------------------------------------------------
// Browser language auto-detection
// Each test opens a FRESH context (no localStorage) with a specific browser
// locale so that detectBrowserLanguage() is the sole deciding factor.
// ---------------------------------------------------------------------------
test.describe("4.12 browser language auto-detection (no localStorage)", () => {
  async function openFreshPage(browser: Browser, locale: string) {
    const ctx = await browser.newContext({ locale });
    const page = await ctx.newPage();
    // Clear any stale locale that may have leaked from a previous context.
    await page.addInitScript(() => localStorage.removeItem("locale"));
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    return { page, ctx };
  }

  test("[4.12][STD-I18N-003] opens in Hebrew when browser locale is he", async ({ browser }) => {
    const { page, ctx } = await openFreshPage(browser, "he");
    try {
      await expect.poll(() => page.getAttribute("html", "lang")).toBe("he");
      const text = (await page.locator("h2, label, button[type='submit']").allInnerTexts()).join(" ");
      expect(detectLanguageFromText(text)).toBe("he");
    } finally {
      await ctx.close();
    }
  });

  test("[4.12][STD-I18N-003] opens in Romanian when browser locale is ro", async ({ browser }) => {
    const { page, ctx } = await openFreshPage(browser, "ro");
    try {
      await expect.poll(() => page.getAttribute("html", "lang")).toBe("ro");
      const text = (await page.locator("h2, label, button[type='submit']").allInnerTexts()).join(" ");
      expect(detectLanguageFromText(text)).toBe("ro");
    } finally {
      await ctx.close();
    }
  });

  test("[4.12][STD-I18N-003] falls back to English for unsupported browser locale (fr)", async ({ browser }) => {
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

