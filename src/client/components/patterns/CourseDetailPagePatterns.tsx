import { type ReactNode, type FormEvent } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

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
  action,
}: {
  position: number;
  lessonName: string;
  durationLabel: string;
  dateLabel: string;
  location: string | null;
  status: string;
  action?: ReactNode;
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
      <div className="flex items-center gap-2 shrink-0">
        <LessonStatusBadge status={status} />
        {action}
      </div>
    </div>
    <p className="text-xs text-muted-foreground mt-1">{dateLabel}</p>
  </li>
);

// ---------------------------------------------------------------------------
// Actions bar (below header, above lesson list)
// ---------------------------------------------------------------------------

export const CourseDetailActionsBar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-2 mb-4">{children}</div>
);

// ---------------------------------------------------------------------------
// Start course — hard guard error list
// ---------------------------------------------------------------------------

export const StartCourseGuardList = ({ errors }: { errors: string[] }) => (
  <ul className="mt-2 space-y-1">
    {errors.map((e) => (
      <li key={e} className="flex items-start gap-2 text-sm text-destructive">
        <span className="mt-0.5 shrink-0">✕</span>
        <span>{e}</span>
      </li>
    ))}
  </ul>
);

// ---------------------------------------------------------------------------
// Start course — soft capacity confirmation modal
// ---------------------------------------------------------------------------

export const StartCourseCapacityModal = ({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  enrolledCount,
  minCapacity,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  enrolledCount: number;
  minCapacity: number;
}) => (
  <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Start course below minimum capacity?</DialogTitle>
        <DialogDescription>
          {enrolledCount} student{enrolledCount !== 1 ? "s" : ""} enrolled, minimum is{" "}
          {minCapacity}. You can still start the course — confirm to proceed.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? "Starting…" : "Start anyway"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ---------------------------------------------------------------------------
// Schedule / reschedule lesson — side sheet
// ---------------------------------------------------------------------------

export const ScheduleLessonSheet = ({
  open,
  onClose,
  title,
  onSubmit,
  isSubmitting,
  date,
  onDateChange,
  location,
  onLocationChange,
  errorMessage,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  date: string;
  onDateChange: (v: string) => void;
  location: string;
  onLocationChange: (v: string) => void;
  errorMessage: string | null;
}) => (
  <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="lesson-date">
            Date
          </label>
          <input
            id="lesson-date"
            type="date"
            required
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="lesson-location">
            Location
          </label>
          <input
            id="lesson-location"
            type="text"
            required
            placeholder="e.g. Airfield North"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </SheetContent>
  </Sheet>
);
