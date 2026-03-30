import fs from "node:fs";
import path from "node:path";

const appRoot = process.cwd();
const sourceRoot = path.join(appRoot, "src");

const excludedSegments = [
  `${path.sep}client${path.sep}components${path.sep}ui${path.sep}`,
  `${path.sep}client${path.sep}components${path.sep}patterns${path.sep}`,
];

const intrinsicHtmlTagPattern =
  /<(div|span|button|form|li|ul|p|h1|h2|h3|h4|h5|h6|section|article|header|footer|main|nav|img|a|input|label)\b/g;

const classNamePattern = /\bclassName\s*=/g;

function collectTsxFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && absolutePath.endsWith(".tsx")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function toRelative(filePath) {
  return path.relative(appRoot, filePath).split(path.sep).join("/");
}

function isExcluded(filePath) {
  return excludedSegments.some((segment) => filePath.includes(segment));
}

function findViolations(filePath, pattern, kind) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      violations.push({ kind, line: index + 1 });
    }
    pattern.lastIndex = 0;
  });

  return violations;
}

const violations = [];

for (const filePath of collectTsxFiles(sourceRoot)) {
  if (isExcluded(filePath)) {
    continue;
  }

  const classNameViolations = findViolations(filePath, classNamePattern, "className");
  const intrinsicTagViolations = findViolations(
    filePath,
    intrinsicHtmlTagPattern,
    "intrinsic-html-tag",
  );

  for (const violation of [...classNameViolations, ...intrinsicTagViolations]) {
    violations.push({
      file: toRelative(filePath),
      kind: violation.kind,
      line: violation.line,
    });
  }
}

if (violations.length > 0) {
  console.error("UI boundary enforcement failed:\n");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} (${violation.kind})`);
  }
  process.exit(1);
}

console.log("UI boundary enforcement passed.");