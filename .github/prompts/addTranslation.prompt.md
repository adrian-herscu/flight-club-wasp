---
name: addTranslation
description: Add a new locale translation to an i18n-enabled project.
argument-hint: The target language/locale to add (e.g., "Romanian / ro", "French / fr")
---
Add a complete translation for **[target language]** (locale code: `[locale code]`) to this project.

## Goal
Implement a new locale by extending the **existing i18n architecture only**.
Do **not** create a parallel localization system.

## Steps

1. **Discover the current i18n architecture (mandatory first)**
	- Inspect existing i18n files and language switcher before making changes.
	- Determine:
	  - source locale file
	  - locale registration location
	  - language selector location
	  - translation value format (TS object / JSON / etc.)

2. **Identify the source locale**
	- Use the app's default/fallback locale (typically `en`) as the single source of truth.
	- Mirror the full key structure exactly (including nested objects and arrays).

3. **Create the new locale file(s) in the same architecture**
	- Use the same directory and file conventions as existing locales.
	- For this repository's expected structure, prefer:
	  - `app/src/client/i18n/<locale>.ts`

4. **Translate all keys completely**
	- Translate every source key with natural native phrasing.
	- Do not leave keys in English.
	- Do not add placeholder/literal "TODO" translations.

5. **Register the locale in existing i18n config**
	- Add the locale to the current i18n resource registration (do not replace existing locales).

6. **Update language selector (if present)**
	- Add the new locale option in the existing selector UI.
	- Use the language's native display name (e.g., `Română`).

7. **Verify completeness and correctness**
	- Confirm no missing keys vs source locale.
	- Confirm no extra accidental keys.
	- Confirm interpolation tokens and formatting are preserved exactly (examples: `{{var}}`, `%s`, `{count}`, `{fields}`).
	- Preserve any embedded HTML tags or markup exactly.

8. **Run relevant tests/checks**
	- Run baseline relevant i18n tests first.
	- After changes, run relevant i18n tests again and confirm green.

## Constraints
- Follow existing project import and style conventions.
- Do not modify unrelated files.
- Do not remove or alter existing translations in other locales.
- If prior wrong-path locale files were created, remove them and align with the current architecture.
- Keep RTL/LTR behavior unchanged unless the new locale explicitly requires direction changes.
- If a term has no direct equivalent, use the most natural phrasing for native speakers.
