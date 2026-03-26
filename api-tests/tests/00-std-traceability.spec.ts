import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const stdPath = path.join(repoRoot, 'app/docs/std.md');
const testRoots = [
  path.join(repoRoot, 'api-tests/tests'),
  path.join(repoRoot, 'e2e-tests/tests'),
];

const STD_ID_PATTERN = /STD-[A-Z0-9]+-\d{3}/g;

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

function parseCoveredStdIds(stdMarkdown: string): Set<string> {
  const lines = stdMarkdown.split(/\r?\n/);
  const coveredStdIds = new Set<string>();

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

    if (/^Covered\b/.test(status)) {
      coveredStdIds.add(stdId);
    }
  }

  return coveredStdIds;
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
    const coveredStdIds = parseCoveredStdIds(stdMarkdown);

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
});
