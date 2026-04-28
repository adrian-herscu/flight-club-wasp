import React, { type FormEvent, type ReactNode, type RefObject } from "react";
import { type TFunction } from "i18next";
import { Button } from "../ui/button";

// ---------------------------------------------------------------------------
// Tab types & StickyTabs
// ---------------------------------------------------------------------------

export type ManagerCoursesSection = "courses" | "enrollment" | "instructors";

export const validCoursesSections: ManagerCoursesSection[] = ["courses", "enrollment", "instructors"];

export const CoursesStickyTabs = ({
  activeSection,
  goToSection,
  t,
}: {
  activeSection: ManagerCoursesSection;
  goToSection: (section: ManagerCoursesSection) => void;
  t: TFunction;
}) => {
  const maskStyle = {
    maskImage:
      document.documentElement.dir === "rtl"
        ? "linear-gradient(to left, black 0, black calc(100% - 20px), transparent 100%)"
        : "linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)",
    WebkitMaskImage:
      document.documentElement.dir === "rtl"
        ? "linear-gradient(to left, black 0, black calc(100% - 20px), transparent 100%)"
        : "linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)",
  } as React.CSSProperties;

  return (
    <div className="sticky top-0 z-20 mb-2 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="relative flex overflow-x-auto" style={maskStyle}>
        <Button
          type="button"
          className="shrink-0 rounded-none border-s"
          variant={activeSection === "courses" ? "secondary" : "outline"}
          onClick={() => goToSection("courses")}
        >
          {t("admin.courses")}
        </Button>
        <Button
          type="button"
          className="shrink-0 rounded-none border-s"
          variant={activeSection === "enrollment" ? "secondary" : "outline"}
          onClick={() => goToSection("enrollment")}
        >
          {t("syllabus.enrollment")}
        </Button>
        <Button
          type="button"
          className="shrink-0 rounded-none border-s"
          variant={activeSection === "instructors" ? "secondary" : "outline"}
          onClick={() => goToSection("instructors")}
        >
          {t("admin.instructors")}
        </Button>
      </div>
    </div>
  );
};

export const CoursesSectionContent = ({
  children,
  sectionContentRef,
}: {
  children: ReactNode;
  sectionContentRef: RefObject<HTMLDivElement | null>;
}) => (
  <div ref={sectionContentRef} className="scroll-mt-20">
    {children}
  </div>
);

type GridVariant = "top" | "bottom";

const gridClasses: Record<GridVariant, string> = {
  top: "mb-6 grid gap-6 2xl:grid-cols-2",
  bottom: "grid gap-6 2xl:grid-cols-2",
};

export const ManagerCoursesGrid = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: GridVariant;
}) => {
  return <div className={gridClasses[variant]}>{children}</div>;
};

type FormVariant = "compact" | "spacious";

const formClasses: Record<FormVariant, string> = {
  compact: "space-y-3",
  spacious: "space-y-4",
};

export const ManagerCoursesForm = ({
  children,
  onSubmit,
  variant,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  variant: FormVariant;
}) => {
  return (
    <form onSubmit={onSubmit} className={formClasses[variant]}>
      {children}
    </form>
  );
};

export const ManagerCoursesDisclosure = ({
  children,
  summary,
}: {
  children: ReactNode;
  summary: ReactNode;
}) => {
  return (
    <details className="mt-4 rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">{summary}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
};

export const ManagerCoursesDetailsPanel = ({
  children,
  title,
}: {
  children: ReactNode;
  title: ReactNode;
}) => {
  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
};

