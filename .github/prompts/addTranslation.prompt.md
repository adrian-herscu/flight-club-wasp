---
name: addTranslation
description: Add a new locale translation to an i18n-enabled project.
argument-hint: The target language/locale to add (e.g., "Romanian / ro", "French / fr")
---
Add a complete translation for **[target language]** (locale code: `[locale code]`) to this project.

## Steps

1. **Discover the i18n setup** – locate existing locale files (e.g., `src/client/i18n/`, `public/locales/`, or similar) and identify the file format (JSON, YAML, PO, etc.) and directory convention.
2. **Identify the source locale** – use the default/fallback locale (typically `en`) as the reference for all keys.
3. **Create the new locale file(s)** – mirror the directory structure of the source locale, producing one file per namespace (if namespaced).
4. **Translate all keys** – provide accurate, natural translations for every key in the source file. Do not leave any key untranslated or use machine-literal placeholders.
5. **Register the locale** – add the new locale to the i18n configuration (e.g., `i18n.ts`, `i18next` config, framework config) so it is recognized at runtime.
6. **Add a locale switcher entry** (if a language-selector UI exists) – add the new language option with its native name (e.g., "Română").
7. **Verify completeness** – confirm no keys are missing compared to the source locale and that interpolation placeholders (`{{variable}}`, `%s`, etc.) are preserved exactly.

## Constraints
- Preserve all interpolation tokens and HTML tags inside translation values.
- Follow the existing code style and import conventions of the project.
- Do not remove or modify existing translations.
- If a term has no direct equivalent, use the most natural phrasing for native speakers.
