#!/usr/bin/env node

import { argv, exit } from "node:process";

const [roleArg, pageSlugArg, componentPathArg] = argv.slice(2);

const validRoles = ["SYSTEM_ADMIN", "SCHOOL_MANAGER", "INSTRUCTOR", "STUDENT"];

if (!roleArg || !pageSlugArg || !componentPathArg) {
  console.error(
    "Usage: node scripts/scaffold-dashboard-page.mjs <ROLE> <page-slug> <component-import-path>\n" +
      "Example: node scripts/scaffold-dashboard-page.mjs INSTRUCTOR courses @src/portal/instructor/InstructorCoursesPage",
  );
  exit(1);
}

if (!validRoles.includes(roleArg)) {
  console.error(`Invalid role: ${roleArg}. Allowed: ${validRoles.join(", ")}`);
  exit(1);
}

const roleBasePathByKey = {
  SYSTEM_ADMIN: "/system-admin",
  SCHOOL_MANAGER: "/school-manager",
  INSTRUCTOR: "/instructor",
  STUDENT: "/student",
};

const role = roleArg;
const pageSlug = pageSlugArg.replace(/^\/+/, "").replace(/\/+$/, "");
const basePath = roleBasePathByKey[role];
const routePath = pageSlug === "dashboard" ? basePath : `${basePath}/${pageSlug}`;

const pascal = (value) =>
  value
    .split(/[-_\/]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const rolePrefixByKey = {
  SYSTEM_ADMIN: "SystemAdmin",
  SCHOOL_MANAGER: "SchoolManager",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student",
};

const pageName = `${rolePrefixByKey[role]}${pascal(pageSlug)}Page`;
const routeName = `${rolePrefixByKey[role]}${pascal(pageSlug)}Route`;

const roleNavLabelKeyHints = {
  dashboard: "admin.dashboard",
  courses: "admin.courses",
  users: "admin.users",
  schools: "admin.schools",
  syllabuses: "admin.syllabuses",
};

const navLabelKey = roleNavLabelKeyHints[pageSlug] ?? "admin.<new_label_key>";

console.log("\n=== 1) main.wasp: page + route declarations ===\n");
console.log(`page ${pageName} {`);
console.log("  authRequired: true,");
console.log(`  component: import ${pageName} from \"${componentPathArg}\"`);
console.log("}");
console.log(`route ${routeName} { path: \"${routePath}\", to: ${pageName} }`);

console.log("\n=== 2) src/shared/navigation/dashboardNavigation.ts ===\n");
console.log("Add this item in DASHBOARD_NAV_ITEMS_BY_ROLE[" + role + "]:\n");
console.log("{");
console.log(`  nameKey: \"${navLabelKey}\",`);
console.log(`  to: \"${routePath}\",`);
console.log("  iconKey: \"<choose_icon_key>\",");
console.log(`  matchPrefix: \"${routePath}\",`);
console.log("},");

console.log("\n=== 3) i18n checklist ===\n");
console.log("Ensure any new translation keys are added in:");
console.log("- src/client/i18n/en.ts");
console.log("- src/client/i18n/he.ts");
console.log("- src/client/i18n/ro.ts");
console.log("- src/client/i18n/ru.ts");

console.log("\n=== 4) Validation checklist ===\n");
console.log("- npm run wasp:lint");
console.log("- npm run wasp:build");
