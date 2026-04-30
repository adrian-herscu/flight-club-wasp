import { type FormEvent, type ReactNode, type RefObject } from "react";
import { type TFunction } from "i18next";
import { SegmentedTabButton, SegmentedTabs } from "./SegmentedTabs";

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
  return (
    <SegmentedTabs sticky withMask>
      <SegmentedTabButton
        active={activeSection === "courses"}
        onClick={() => goToSection("courses")}
      >
          {t("admin.courses")}
      </SegmentedTabButton>
      <SegmentedTabButton
        active={activeSection === "enrollment"}
        onClick={() => goToSection("enrollment")}
      >
          {t("syllabus.enrollment")}
      </SegmentedTabButton>
      <SegmentedTabButton
        active={activeSection === "instructors"}
        onClick={() => goToSection("instructors")}
        isLast
      >
          {t("admin.instructors")}
      </SegmentedTabButton>
    </SegmentedTabs>
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

