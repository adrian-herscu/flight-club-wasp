import { type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export const CourseDetailPageRoot = ({
  testId,
  children,
}: {
  testId: string;
  children: ReactNode;
}) => <div data-testid={testId}>{children}</div>;

export const CourseDetailLoadingText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-sm py-2">{children}</p>
);

export const CourseDetailErrorText = ({ children }: { children: ReactNode }) => (
  <p className="text-destructive text-sm py-4">{children}</p>
);

// ---------------------------------------------------------------------------
// Course header
// ---------------------------------------------------------------------------

export const CourseDetailHeaderSection = ({ children }: { children: ReactNode }) => (
  <div className="mb-6 space-y-1">{children}</div>
);

export const CourseDetailTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
);

export const CourseDetailMetaRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">{children}</div>
);

export const CourseDetailMetaItem = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <span>
    <span className="font-medium text-foreground">{label}:</span> {value}
  </span>
);

// ---------------------------------------------------------------------------
// Lifecycle status badge for the course
// ---------------------------------------------------------------------------

const COURSE_STATUS_CLASSES: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  STARTED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-slate-100 text-slate-600",
  CLOSED: "bg-slate-100 text-slate-500",
};

export const CourseLifecycleStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
      COURSE_STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground"
    }`}
  >
    {status}
  </span>
);

// ---------------------------------------------------------------------------
// Lesson list
// ---------------------------------------------------------------------------

export const CourseLessonsSection = ({ children }: { children: ReactNode }) => (
  <div className="space-y-2">{children}</div>
);

export const CourseLessonsSectionHeading = ({ children }: { children: ReactNode }) => (
  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
    {children}
  </h3>
);

export const CourseLessonsList = ({ children }: { children: ReactNode }) => (
  <ul className="space-y-2">{children}</ul>
);

// ---------------------------------------------------------------------------
// Lesson status badge
// ---------------------------------------------------------------------------

const LESSON_STATUS_CLASSES: Record<string, string> = {
  UNSCHEDULED: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-50 text-blue-700",
  CONFIRMED: "bg-green-50 text-green-700",
  BELOW_CAPACITY: "bg-amber-50 text-amber-700",
  LESSON_UNDERWAY: "bg-orange-50 text-orange-700",
  LESSON_CONCLUDED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export const LessonStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
      LESSON_STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground"
    }`}
  >
    {status}
  </span>
);

// ---------------------------------------------------------------------------
// Individual lesson row
// ---------------------------------------------------------------------------

export const CourseLessonListItem = ({
  position,
  lessonName,
  durationLabel,
  dateLabel,
  location,
  status,
}: {
  position: number;
  lessonName: string;
  durationLabel: string;
  dateLabel: string;
  location: string | null;
  status: string;
}) => (
  <li className="rounded-md border p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {position}. {lessonName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {durationLabel}
          {location ? ` · ${location}` : ""}
        </p>
      </div>
      <LessonStatusBadge status={status} />
    </div>
    <p className="text-xs text-muted-foreground mt-1">{dateLabel}</p>
  </li>
);
