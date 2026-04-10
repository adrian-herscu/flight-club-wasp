import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const stdPath = path.join(repoRoot, 'docs/std.md');
const testRoots = [
  path.join(repoRoot, 'tests/api'),
  path.join(repoRoot, 'tests/e2e'),
];

const STD_ID_PATTERN = /STD-[A-Z0-9]+-\d{3}(?:[A-Z]+)?/g;

function collectSpecFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSpecFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith('.spec.ts')) {
      files.push(absolutePath);
    }
  }

  return files;
}

function parseStdIdsByStatusPredicate(
  stdMarkdown: string,
  predicate: (status: string) => boolean,
): Set<string> {
  const lines = stdMarkdown.split(/\r?\n/);
  const matchingStdIds = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('| STD-')) {
      continue;
    }

    const columns = line
      .split('|')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (columns.length < 5) {
      continue;
    }

    const stdId = columns[0];
    const status = columns[4];

    if (predicate(status)) {
      matchingStdIds.add(stdId);
    }
  }

  return matchingStdIds;
}

function collectTaggedStdIds(specFilePaths: string[]) {
  const active = new Set<string>();
  const inactive = new Set<string>();

  for (const specFilePath of specFilePaths) {
    const content = fs.readFileSync(specFilePath, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const taggedIds = line.match(STD_ID_PATTERN);
      if (!taggedIds) {
        continue;
      }

      const isSkipped = /\b(?:test|it)\.skip\s*\(/.test(line);
      const isInactive = /\[inactive\]/i.test(line);

      if (isSkipped || isInactive) {
        taggedIds.forEach((id) => inactive.add(id));
      } else {
        taggedIds.forEach((id) => active.add(id));
      }
    }
  }

  return { active, inactive };
}

describe('STD traceability guard', () => {
  it('all STD rows marked Covered have at least one active tagged test', () => {
    const stdMarkdown = fs.readFileSync(stdPath, 'utf8');
    const coveredStdIds = parseStdIdsByStatusPredicate(stdMarkdown, (status) =>
      /^Covered\b/.test(status),
    );

    const specFilePaths = testRoots.flatMap((testRoot) => collectSpecFiles(testRoot));
    const { active: activeTaggedStdIds, inactive: inactiveTaggedStdIds } =
      collectTaggedStdIds(specFilePaths);

    const missingCoveredIds = [...coveredStdIds]
      .filter((stdId) => !activeTaggedStdIds.has(stdId))
      .sort();

    const onlyInactiveMatches = missingCoveredIds.filter((stdId) => inactiveTaggedStdIds.has(stdId));

    if (missingCoveredIds.length > 0) {
      console.warn(
        `[STD traceability] Covered IDs without active tagged tests (${missingCoveredIds.length}): ${missingCoveredIds.join(', ')}`,
      );
    }

    if (onlyInactiveMatches.length > 0) {
      console.warn(
        `[STD traceability] Covered IDs mapped only to inactive tests (${onlyInactiveMatches.length}): ${onlyInactiveMatches.join(', ')}`,
      );
    }

    expect(
      {
        missingCoveredIds,
        onlyInactiveMatches,
        coveredCount: coveredStdIds.size,
        activeTaggedCount: activeTaggedStdIds.size,
      },
      `Found ${missingCoveredIds.length} Covered STD IDs without active tagged tests.`,
    ).toEqual({
      missingCoveredIds: [],
      onlyInactiveMatches: [],
      coveredCount: coveredStdIds.size,
      activeTaggedCount: activeTaggedStdIds.size,
    });
  });

  it('all STD rows marked Covered (API*) have at least one active tagged API test', () => {
    const stdMarkdown = fs.readFileSync(stdPath, 'utf8');
    const coveredApiStdIds = parseStdIdsByStatusPredicate(
      stdMarkdown,
      (status) => /^Covered\b/.test(status) && /\(API(?:\+E2E)?\)/.test(status),
    );

    const apiSpecFilePaths = collectSpecFiles(path.join(repoRoot, 'tests/api'));
    const { active: activeApiTaggedStdIds, inactive: inactiveApiTaggedStdIds } =
      collectTaggedStdIds(apiSpecFilePaths);

    const missingCoveredApiIds = [...coveredApiStdIds]
      .filter((stdId) => !activeApiTaggedStdIds.has(stdId))
      .sort();

    const onlyInactiveApiMatches = missingCoveredApiIds.filter((stdId) =>
      inactiveApiTaggedStdIds.has(stdId),
    );

    if (missingCoveredApiIds.length > 0) {
      console.warn(
        `[STD traceability][API] Covered API IDs without active API tagged tests (${missingCoveredApiIds.length}): ${missingCoveredApiIds.join(', ')}`,
      );
    }

    if (onlyInactiveApiMatches.length > 0) {
      console.warn(
        `[STD traceability][API] Covered API IDs mapped only to inactive API tests (${onlyInactiveApiMatches.length}): ${onlyInactiveApiMatches.join(', ')}`,
      );
    }

    expect(
      {
        missingCoveredApiIds,
        onlyInactiveApiMatches,
        coveredApiCount: coveredApiStdIds.size,
        activeApiTaggedCount: activeApiTaggedStdIds.size,
      },
      `Found ${missingCoveredApiIds.length} Covered (API*) STD IDs without active tagged API tests.`,
    ).toEqual({
      missingCoveredApiIds: [],
      onlyInactiveApiMatches: [],
      coveredApiCount: coveredApiStdIds.size,
      activeApiTaggedCount: activeApiTaggedStdIds.size,
    });
  });
});
