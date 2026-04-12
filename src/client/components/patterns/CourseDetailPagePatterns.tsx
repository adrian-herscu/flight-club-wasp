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
  extra,
}: {
  position: number;
  lessonName: string;
  durationLabel: string;
  dateLabel: string;
  location: string | null;
  status: string;
  action?: ReactNode;
  extra?: ReactNode;
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
    {extra}
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

// ---------------------------------------------------------------------------
// FC-020 — Attendance hint row (student)
// ---------------------------------------------------------------------------

export const AttendanceHintRow = ({
  status,
  isLocked,
  isSubmitting,
  onAccept,
  onDecline,
}: {
  status: string | null;
  isLocked: boolean;
  isSubmitting: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) => (
  <div className="flex items-center gap-2 mt-2">
    <span className="text-xs text-muted-foreground shrink-0">Attendance:</span>
    {isLocked ? (
      <span className="text-xs text-muted-foreground">Locked</span>
    ) : (
      <>
        <Button
          size="sm"
          variant={status === "ACCEPTED" ? "default" : "outline"}
          onClick={onAccept}
          disabled={isSubmitting}
          className="h-6 px-2 text-xs"
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant={status === "DECLINED" ? "destructive" : "outline"}
          onClick={onDecline}
          disabled={isSubmitting}
          className="h-6 px-2 text-xs"
        >
          Decline
        </Button>
      </>
    )}
    {status && status !== "NO_RESPONSE" && (
      <span className="text-xs font-medium">{status === "ACCEPTED" ? "✓ Accepted" : "✗ Declined"}</span>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// FC-020 — Presence hint row (non-lead instructor)
// ---------------------------------------------------------------------------

export const PresenceHintRow = ({
  status,
  isLocked,
  isSubmitting,
  onConfirm,
  onUnavailable,
}: {
  status: string | null;
  isLocked: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onUnavailable: () => void;
}) => (
  <div className="flex items-center gap-2 mt-2">
    <span className="text-xs text-muted-foreground shrink-0">Presence:</span>
    {isLocked ? (
      <span className="text-xs text-muted-foreground">Locked</span>
    ) : (
      <>
        <Button
          size="sm"
          variant={status === "EXPECTED" ? "default" : "outline"}
          onClick={onConfirm}
          disabled={isSubmitting}
          className="h-6 px-2 text-xs"
        >
          Confirm
        </Button>
        <Button
          size="sm"
          variant={status === "DECLINED" ? "destructive" : "outline"}
          onClick={onUnavailable}
          disabled={isSubmitting}
          className="h-6 px-2 text-xs"
        >
          Unavailable
        </Button>
      </>
    )}
    {status && (
      <span className="text-xs font-medium">
        {status === "EXPECTED" ? "✓ Confirmed" : status === "DECLINED" ? "✗ Unavailable" : "—"}
      </span>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// FC-021 — Below-capacity suggestion bar (lead instructor)
// ---------------------------------------------------------------------------

export const BelowCapacityLeadBar = ({
  hasPendingSuggestion,
  suggestionType,
  isSubmitting,
  onSubmitProceed,
  onSubmitClose,
}: {
  hasPendingSuggestion: boolean;
  suggestionType: string | null;
  isSubmitting: boolean;
  onSubmitProceed: () => void;
  onSubmitClose: () => void;
}) => (
  <div className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-xs space-y-1.5 dark:bg-yellow-950 dark:border-yellow-800">
    <span className="font-medium">Below minimum capacity</span>
    {hasPendingSuggestion ? (
      <p className="text-muted-foreground">
        Suggestion submitted: {suggestionType === "PROCEED_WITH_PARTIAL" ? "Proceed with partial group" : "Close course"}. Awaiting manager approval.
      </p>
    ) : (
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={onSubmitProceed} disabled={isSubmitting} className="h-6 px-2 text-xs">
          Suggest: Proceed with partial
        </Button>
        <Button size="sm" variant="destructive" onClick={onSubmitClose} disabled={isSubmitting} className="h-6 px-2 text-xs">
          Suggest: Close course
        </Button>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// FC-021 — Pending suggestion approval bar (manager)
// ---------------------------------------------------------------------------

export const BelowCapacityManagerBar = ({
  suggestionId,
  suggestionType,
  isSubmitting,
  onApprove,
}: {
  suggestionId: string;
  suggestionType: string;
  isSubmitting: boolean;
  onApprove: (suggestionId: string) => void;
}) => (
  <div className="mt-2 rounded-md border border-blue-300 bg-blue-50 p-2 text-xs space-y-1.5 dark:bg-blue-950 dark:border-blue-800">
    <span className="font-medium">Instructor suggestion pending approval:</span>
    <p>{suggestionType === "PROCEED_WITH_PARTIAL" ? "Proceed with partial group" : "Close the course"}</p>
    <Button size="sm" onClick={() => onApprove(suggestionId)} disabled={isSubmitting} className="h-6 px-2 text-xs">
      {isSubmitting ? "Approving…" : "Approve"}
    </Button>
  </div>
);

// ---------------------------------------------------------------------------
// FC-022 — Student assessment section (lead instructor, LESSON_UNDERWAY)
// ---------------------------------------------------------------------------

export const AssessmentSection = ({ children }: { children: ReactNode }) => (
  <div className="mt-3 space-y-2">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student Assessments</p>
    {children}
  </div>
);

export const AssessmentStudentRow = ({
  displayName,
  hasEvaluation,
  evaluationStatus,
  attended,
  onAttendedChange,
  onStatusChange,
  onNotesChange,
  notes,
  onSubmit,
  isSubmitting,
}: {
  displayName: string;
  hasEvaluation: boolean;
  evaluationStatus: string | null;
  attended: boolean;
  onAttendedChange: (v: boolean) => void;
  onStatusChange: (v: "PASS" | "FAIL") => void;
  onNotesChange: (v: string) => void;
  notes: string;
  onSubmit: () => void;
  isSubmitting: boolean;
}) => (
  <div className="rounded-md border p-2 space-y-1.5">
    <p className="text-sm font-medium">{displayName}</p>
    {hasEvaluation ? (
      <p className="text-xs text-muted-foreground">
        {evaluationStatus} {evaluationStatus === "PASS" ? "✓" : "✗"}
      </p>
    ) : (
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={attended}
              onChange={(e) => onAttendedChange(e.target.checked)}
              className="rounded"
            />
            Attended
          </label>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={attended ? "default" : "outline"}
              className="h-6 px-2 text-xs"
              onClick={() => onStatusChange("PASS")}
              disabled={!attended}
            >
              PASS
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-6 px-2 text-xs opacity-70"
              onClick={() => onStatusChange("FAIL")}
            >
              FAIL
            </Button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button size="sm" onClick={onSubmit} disabled={isSubmitting} className="h-7 text-xs">
          {isSubmitting ? "Saving…" : "Submit"}
        </Button>
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// FC-023 — Co-instructor absence row (lead instructor, LESSON_UNDERWAY)
// ---------------------------------------------------------------------------

export const CoInstructorSection = ({ children }: { children: ReactNode }) => (
  <div className="mt-2 space-y-1">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Co-instructors</p>
    {children}
  </div>
);

export const CoInstructorAbsenceRow = ({
  displayName,
  presenceStatus,
  isSubmitting,
  onMarkAbsent,
}: {
  displayName: string;
  presenceStatus: string;
  isSubmitting: boolean;
  onMarkAbsent: () => void;
}) => (
  <div className="flex items-center justify-between rounded-md border p-2 text-xs">
    <span className="font-medium">{displayName}</span>
    <span className="text-muted-foreground mr-2">{presenceStatus}</span>
    {presenceStatus === "DECLINED" && (
      <Button size="sm" variant="destructive" onClick={onMarkAbsent} disabled={isSubmitting} className="h-6 px-2 text-xs">
        Mark Absent
      </Button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// FC-024 — Student refund section
// ---------------------------------------------------------------------------

export const RefundRequestSection = ({
  refundStatus,
  onRequestRefund,
}: {
  refundStatus: string | null;
  onRequestRefund: () => void;
}) => (
  <div className="mt-4 rounded-md border p-3 space-y-1.5">
    <p className="text-sm font-medium">Refund</p>
    {refundStatus === null ? (
      <Button size="sm" variant="outline" onClick={onRequestRefund} className="text-xs">
        Request Refund
      </Button>
    ) : (
      <p className="text-xs text-muted-foreground">
        Refund request: <span className="font-medium">{refundStatus}</span>
      </p>
    )}
  </div>
);

export const RefundRequestModal = ({
  open,
  onClose,
  reason,
  onReasonChange,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  open: boolean;
  onClose: () => void;
  reason: string;
  onReasonChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) => (
  <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Request a Refund</DialogTitle>
        <DialogDescription>Optionally describe why you are requesting a refund.</DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-3 mt-2">
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Reason (optional)"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);

// ---------------------------------------------------------------------------
// FC-024 — Manager refund approval panel
// ---------------------------------------------------------------------------

export const PendingRefundItem = ({
  studentName,
  reason,
  refundRequestId,
  amountMinorInput,
  onAmountChange,
  onApprove,
  onDecline,
  isSubmitting,
}: {
  studentName: string;
  reason: string | null;
  refundRequestId: string;
  amountMinorInput: string;
  onAmountChange: (v: string) => void;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  isSubmitting: boolean;
}) => (
  <div className="rounded-md border p-3 space-y-2">
    <p className="text-sm font-medium">{studentName}</p>
    {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="number"
        min="1"
        placeholder="Amount (minor units)"
        value={amountMinorInput}
        onChange={(e) => onAmountChange(e.target.value)}
        className="flex h-8 w-36 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <Button size="sm" onClick={() => onApprove(refundRequestId)} disabled={isSubmitting || !amountMinorInput} className="h-8 text-xs">
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => onDecline(refundRequestId)} disabled={isSubmitting} className="h-8 text-xs">
        Decline
      </Button>
    </div>
  </div>
);

export const PendingRefundsSection = ({ children }: { children: ReactNode }) => (
  <div className="mt-4 space-y-2">
    <p className="text-sm font-semibold">Pending Refund Requests</p>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Late enrollment — manager panel
// ---------------------------------------------------------------------------

export const LateEnrollmentSection = ({
  options,
  selectedStudentId,
  onSelectStudent,
  onEnroll,
  isSubmitting,
}: {
  options: { studentId: string; displayName: string }[];
  selectedStudentId: string;
  onSelectStudent: (v: string) => void;
  onEnroll: () => void;
  isSubmitting: boolean;
}) => (
  options.length === 0 ? null : (
    <div className="mt-4 rounded-md border p-3 space-y-2">
      <p className="text-sm font-semibold">Late Enrollment</p>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selectedStudentId}
          onChange={(e) => onSelectStudent(e.target.value)}
          className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select student…</option>
          {options.map((s) => (
            <option key={s.studentId} value={s.studentId}>{s.displayName}</option>
          ))}
        </select>
        <Button size="sm" onClick={onEnroll} disabled={isSubmitting || !selectedStudentId} className="h-8 text-xs">
          {isSubmitting ? "Enrolling…" : "Enroll"}
        </Button>
      </div>
    </div>
  )
);

// ---------------------------------------------------------------------------
// Instructor assignment — manager panel (OPEN / STARTED courses)
// ---------------------------------------------------------------------------

export const InstructorAssignmentSection = ({
  assignedInstructors,
  assignableOptions,
  selectedInstructorId,
  isLead,
  wagePerHour,
  onSelectInstructor,
  onToggleLead,
  onWageChange,
  onAssign,
  isSubmitting,
}: {
  assignedInstructors: { instructorId: string; displayName: string; isLead: boolean }[];
  assignableOptions: { instructorId: string; displayName: string }[];
  selectedInstructorId: string;
  isLead: boolean;
  wagePerHour: number | "";
  onSelectInstructor: (v: string) => void;
  onToggleLead: (v: boolean) => void;
  onWageChange: (v: number | "") => void;
  onAssign: () => void;
  isSubmitting: boolean;
}) => (
  <div className="mt-4 rounded-md border p-3 space-y-3">
    <p className="text-sm font-semibold">Instructors</p>
    {assignedInstructors.length === 0 ? (
      <p className="text-xs text-muted-foreground">No instructors assigned yet.</p>
    ) : (
      <ul className="space-y-1">
        {assignedInstructors.map((ai) => (
          <li key={ai.instructorId} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{ai.displayName}</span>
            {ai.isLead && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">Lead</span>
            )}
          </li>
        ))}
      </ul>
    )}
    {assignableOptions.length > 0 && (
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
        <select
          value={selectedInstructorId}
          onChange={(e) => onSelectInstructor(e.target.value)}
          className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Assign instructor…</option>
          {assignableOptions.map((i) => (
            <option key={i.instructorId} value={i.instructorId}>{i.displayName}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={isLead}
            onChange={(e) => onToggleLead(e.target.checked)}
            className="rounded"
          />
          Lead instructor
        </label>
        <input
          type="number"
          min={0}
          value={wagePerHour}
          onChange={(e) => onWageChange(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
          placeholder="Wage/hr"
          className="w-24 h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button
          size="sm"
          onClick={onAssign}
          disabled={isSubmitting || !selectedInstructorId || wagePerHour === ""}
          className="h-8 text-xs"
        >
          {isSubmitting ? "Assigning…" : "Assign"}
        </Button>
      </div>
    )}
  </div>
);
