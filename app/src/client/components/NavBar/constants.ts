import { BlogUrl, DocsUrl } from "../../../shared/common";
import type { NavigationItem } from "./NavBar";

const staticNavigationItems: NavigationItem[] = [
  { name: "Documentation", to: DocsUrl },
  { name: "Blog", to: BlogUrl },
];

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Features", to: "/#features" },
  ...staticNavigationItems,
] as const;

export const demoNavigationitems: NavigationItem[] = [
  ...staticNavigationItems,
] as const;
