import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import { type CourseLessonDetail } from "./operations";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import { Button } from "../client/components/ui/button";
import { toast } from "../client/hooks/use-toast";
import { useWaspMutation } from "../client/hooks/useWaspMutation";
import {
  AssessmentSection,
  AssessmentStudentRow,
  AttendanceHintRow,
  BelowCapacityLeadBar,
  BelowCapacityManagerBar,
  CoInstructorAbsenceRow,
  CoInstructorSection,
  CourseDetailActionsBar,
  CourseDetailErrorText,
  CourseDetailHeaderSection,
  CourseDetailLoadingText,
  CourseDetailMetaItem,
  CourseDetailMetaRow,
  CourseDetailPageRoot,
  CourseDetailTitle,
  CourseLessonListItem,
  CourseLessonsList,
  CourseLessonsSection,
  CourseLessonsSectionHeading,
  CourseLifecycleStatusBadge,
  InstructorAssignmentSection,
  LateEnrollmentSection,
  PendingRefundItem,
  PendingRefundsSection,
  PresenceHintRow,
  RefundRequestModal,
  RefundRequestSection,
  ScheduleLessonSheet,
  StartCourseCapacityModal,
  StartCourseGuardList,
} from "../client/components/patterns/CourseDetailPagePatterns";

const {
  approveInstructorSuggestion,
  approveRefund,
  assignInstructorToCourse,
  declineRefund,
  enrollInStartedCourse,
  getCourseDetail,
  markInstructorAbsent,
  rescheduleLesson,
  scheduleLesson,
  startCourse,
  submitInstructorSuggestion,
  submitRefundRequest,
  submitStudentAssessment,
  updateInstructorPresence,
  updateMeetingAttendance,
  useQuery,
} = operations as any;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

type AssessmentDraft = { attended: boolean; status: "PASS" | "FAIL"; notes: string };

const CourseDetailPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { pathname } = useLocation();

  const viewerRole = pathname.startsWith("/school-manager/")
    ? "manager"
    : pathname.startsWith("/instructor/")
      ? "instructor"
      : "student";

  // --- Manager: start course ---
  const [guardErrors, setGuardErrors] = useState<string[]>([]);
  const [showCapacityModal, setShowCapacityModal] = useState(false);

  // --- Instructor: schedule lesson ---
  const [schedulingLesson, setSchedulingLesson] = useState<CourseLessonDetail | null>(null);
  const [sheetDate, setSheetDate] = useState("");
  const [sheetLocation, setSheetLocation] = useState("");
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetSubmitting, setSheetSubmitting] = useState(false);

  // --- FC-020: attendance (student) ---
  const [attendanceSubmitting, setAttendanceSubmitting] = useState<string | null>(null);

  // --- FC-020: presence (non-lead instructor) ---
  const [presenceSubmitting, setPresenceSubmitting] = useState<string | null>(null);

  // --- FC-021: below-capacity suggestion ---
  const [suggestionSubmitting, setSuggestionSubmitting] = useState<string | null>(null);
  const [approvalSubmitting, setApprovalSubmitting] = useState<string | null>(null);

  // --- FC-022: student assessments (lead instructor) ---
  const [assessmentDrafts, setAssessmentDrafts] = useState<Record<string, AssessmentDraft>>({});
  const [assessmentSubmitting, setAssessmentSubmitting] = useState<string | null>(null);

  // --- FC-023: mark co-instructor absent ---
  const [absentSubmitting, setAbsentSubmitting] = useState<string | null>(null);

  // --- FC-024: refund (student) ---
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // --- FC-024: refund management (manager) ---
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [refundActionSubmitting, setRefundActionSubmitting] = useState<string | null>(null);

  // --- Late enrollment (manager) ---
  const [lateEnrollStudentId, setLateEnrollStudentId] = useState("");

  // --- Instructor assignment (manager) ---
  const [assignInstructorId, setAssignInstructorId] = useState("");
  const [assignIsLead, setAssignIsLead] = useState(false);
  const [assignWagePerHour, setAssignWagePerHour] = useState<number | "">("")


  const {
    data: course,
    isLoading,
    error,
  } = useQuery(getCourseDetail, courseId ? { courseId } : undefined, {
    enabled: Boolean(courseId),
  });

  // -------------------------------------------------------------------------
  // Mutations (Change 4)
  // -------------------------------------------------------------------------

  const startCourseMutation = useWaspMutation(
    ({ courseId: id, overrideCapacity }: { courseId: string; overrideCapacity?: boolean }) =>
      startCourse({ courseId: id, overrideCapacity }),
    {
      successToast: { title: t("courseDetail.courseStarted") },
      onSuccess: () => setShowCapacityModal(false),
      onError: (err) => {
        const msg = (err as { message?: string }).message ?? String(err);
        if (msg.includes("overrideCapacity")) {
          setShowCapacityModal(true);
        } else {
          setGuardErrors([msg]);
          toast({ title: t("courseDetail.startFailed"), variant: "destructive" });
        }
      },
    },
  );

  const lateEnrollMutation = useWaspMutation(
    (args: { courseId: string; studentId: string }) => enrollInStartedCourse(args),
    {
      successToast: { title: t("courseDetail.lateEnrollSuccess") },
      errorToast: { title: t("courseDetail.lateEnrollFailed"), fallbackDescription: "An error occurred" },
      onSuccess: () => setLateEnrollStudentId(""),
    },
  );

  const assignInstructorMutation = useWaspMutation(
    (args: { courseId: string; instructorId: string; isLead: boolean; agreedWagePerHour: number }) =>
      assignInstructorToCourse(args),
    {
      successToast: { title: t("courseDetail.instructorAssigned") },
      errorToast: { title: t("courseDetail.assignFailed"), fallbackDescription: "An error occurred" },
      onSuccess: () => {
        setAssignInstructorId("");
        setAssignIsLead(false);
        setAssignWagePerHour("");
      },
    },
  );

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleStartCourse = (overrideCapacity?: boolean) => {
    if (!courseId) return;
    setGuardErrors([]);
    void startCourseMutation.mutate({ courseId, overrideCapacity });
  };

  const openScheduleSheet = (lesson: CourseLessonDetail) => {
    setSchedulingLesson(lesson);
    setSheetDate(lesson.date ? new Date(lesson.date).toISOString().split("T")[0] : "");
    setSheetLocation(lesson.location ?? "");
    setSheetError(null);
  };

  const closeScheduleSheet = () => {
    setSchedulingLesson(null);
    setSheetDate("");
    setSheetLocation("");
    setSheetError(null);
  };

  const handleScheduleLesson = async (e: FormEvent) => {
    e.preventDefault();
    if (!schedulingLesson || !courseId) return;
    setSheetSubmitting(true);
    setSheetError(null);
    try {
      if (schedulingLesson.lessonId && schedulingLesson.status !== "CANCELLED") {
        await rescheduleLesson({ courseLessonId: schedulingLesson.lessonId, date: new Date(sheetDate), location: sheetLocation });
      } else {
        await scheduleLesson({ courseId, syllabusLessonId: schedulingLesson.syllabusLessonId, date: new Date(sheetDate), location: sheetLocation });
      }
      closeScheduleSheet();
      toast({ title: t("courseDetail.lessonScheduled") });
    } catch (err: unknown) {
      setSheetError((err as { message?: string }).message ?? String(err));
    } finally {
      setSheetSubmitting(false);
    }
  };

  const handleUpdateAttendance = async (courseLessonId: string, status: string) => {
    setAttendanceSubmitting(courseLessonId);
    try {
      await updateMeetingAttendance({ courseLessonId, status });
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Error", variant: "destructive" });
    } finally {
      setAttendanceSubmitting(null);
    }
  };

  const handleUpdatePresence = async (courseLessonId: string, status: string) => {
    setPresenceSubmitting(courseLessonId);
    try {
      await updateInstructorPresence({ courseLessonId, status });
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Error", variant: "destructive" });
    } finally {
      setPresenceSubmitting(null);
    }
  };

  const handleSubmitSuggestion = async (courseLessonId: string, type: string) => {
    setSuggestionSubmitting(courseLessonId);
    try {
      await submitInstructorSuggestion({ courseLessonId, type });
      toast({ title: t("courseDetail.suggestionSubmitted") });
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Error", variant: "destructive" });
    } finally {
      setSuggestionSubmitting(null);
    }
  };

  const handleApproveSuggestion = async (suggestionId: string) => {
    setApprovalSubmitting(suggestionId);
    try {
      await approveInstructorSuggestion({ suggestionId });
      toast({ title: t("courseDetail.suggestionApproved") });
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Error", variant: "destructive" });
    } finally {
      setApprovalSubmitting(null);
    }
  };

  const handleSubmitAssessment = async (courseLessonId: string, studentId: string) => {
    const key = `${courseLessonId}:${studentId}`;
    const draft = assessmentDrafts[key] ?? { attended: true, status: "PASS" as const, notes: "" };
    setAssessmentSubmitting(key);
    try {
      await submitStudentAssessment({ courseLessonId, studentId, attended: draft.attended, status: draft.status, notes: draft.notes || undefined });
      setAssessmentDrafts((prev) => { const next = { ...prev }; delete next[key]; return next; });
      toast({ title: t("courseDetail.assessmentSubmitted") });
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Error", variant: "destructive" });
    } finally {
      setAssessmentSubmitting(null);
    }
  };

  const handleMarkAbsent = async (courseLessonId: string, instructorId: string) => {
    const key = `${courseLessonId}:${instructorId}`;
    setAbsentSubmitting(key);
    try {
      await markInstructorAbsent({ courseLessonId, instructorId });
      toast({ title: t("courseDetail.markedAbsent") });
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Error", variant: "destructive" });
    } finally {
      setAbsentSubmitting(null);
    }
  };

  const handleSubmitRefund = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setRefundSubmitting(true);
    setRefundError(null);
    try {
      await submitRefundRequest({ courseId, reason: refundReason || undefined });
      setRefundModalOpen(false);
      setRefundReason("");
      toast({ title: t("courseDetail.refundSubmitted") });
    } catch (err: unknown) {
      setRefundError((err as { message?: string }).message ?? "Error");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleApproveRefund = async (refundRequestId: string) => {
    const amountStr = refundAmounts[refundRequestId];
    const amountMinor = parseInt(amountStr ?? "", 10);
    if (!amountMinor || amountMinor <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    setRefundActionSubmitting(refundRequestId);
    try {
      await approveRefund({ refundRequestId, amountMinor });
      toast({ title: t("courseDetail.refundApproved") });
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Error", variant: "destructive" });
    } finally {
      setRefundActionSubmitting(null);
    }
  };

  const handleDeclineRefund = async (refundRequestId: string) => {
    setRefundActionSubmitting(refundRequestId);
    try {
      await declineRefund({ refundRequestId });
      toast({ title: t("courseDetail.refundDeclined") });
    } catch (err: unknown) {
      toast({ title: (err as { message?: string }).message ?? "Error", variant: "destructive" });
    } finally {
      setRefundActionSubmitting(null);
    }
  };

  const handleLateEnroll = () => {
    if (!courseId || !lateEnrollStudentId) return;
    void lateEnrollMutation.mutate({ courseId, studentId: lateEnrollStudentId });
  };

  const handleAssignInstructor = () => {
    if (!courseId || !assignInstructorId || assignWagePerHour === "") return;
    void assignInstructorMutation.mutate({
      courseId,
      instructorId: assignInstructorId,
      isLead: assignIsLead,
      agreedWagePerHour: assignWagePerHour as number,
    });
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderLessonExtra = (lesson: CourseLessonDetail) => {
    const isScheduledFuture = lesson.status === "SCHEDULED" && lesson.date && new Date(lesson.date) > new Date();
    const isUnderway = lesson.status === "LESSON_UNDERWAY";
    const isBelowCapacity = lesson.status === "BELOW_CAPACITY";

    if (viewerRole === "student") {
      if ((isScheduledFuture || isBelowCapacity) && lesson.myAttendanceStatus !== undefined && lesson.lessonId) {
        return (
          <AttendanceHintRow
            status={lesson.myAttendanceStatus}
            isLocked={false}
            isSubmitting={attendanceSubmitting === lesson.lessonId}
            onAccept={() => handleUpdateAttendance(lesson.lessonId!, "ACCEPTED")}
            onDecline={() => handleUpdateAttendance(lesson.lessonId!, "DECLINED")}
          />
        );
      }
    }

    if (viewerRole === "instructor" && course?.isNonLeadInstructor) {
      if ((isScheduledFuture || isBelowCapacity) && lesson.myPresenceStatus !== undefined && lesson.lessonId) {
        return (
          <PresenceHintRow
            status={lesson.myPresenceStatus}
            isLocked={false}
            isSubmitting={presenceSubmitting === lesson.lessonId}
            onConfirm={() => handleUpdatePresence(lesson.lessonId!, "EXPECTED")}
            onUnavailable={() => handleUpdatePresence(lesson.lessonId!, "DECLINED")}
          />
        );
      }
    }

    if (viewerRole === "instructor" && course?.isLeadInstructor) {
      const parts: React.ReactNode[] = [];

      if (isBelowCapacity && lesson.lessonId) {
        parts.push(
          <BelowCapacityLeadBar
            key="below-cap"
            hasPendingSuggestion={lesson.pendingSuggestion !== null}
            suggestionType={lesson.pendingSuggestion?.type ?? null}
            isSubmitting={suggestionSubmitting === lesson.lessonId}
            onSubmitProceed={() => handleSubmitSuggestion(lesson.lessonId!, "PROCEED_WITH_PARTIAL")}
            onSubmitClose={() => handleSubmitSuggestion(lesson.lessonId!, "CLOSE_COURSE")}
          />
        );
      }

      if (isUnderway && lesson.lessonId) {
        if (lesson.coInstructorPresences.length > 0) {
          parts.push(
            <CoInstructorSection key="co-instructors">
              {lesson.coInstructorPresences.map((p) => (
                <CoInstructorAbsenceRow
                  key={p.instructorId}
                  displayName={p.displayName}
                  presenceStatus={p.presenceStatus}
                  isSubmitting={absentSubmitting === `${lesson.lessonId}:${p.instructorId}`}
                  onMarkAbsent={() => handleMarkAbsent(lesson.lessonId!, p.instructorId)}
                />
              ))}
            </CoInstructorSection>
          );
        }

        if (lesson.enrolledActiveStudents.length > 0) {
          parts.push(
            <AssessmentSection key="assessments">
              {lesson.enrolledActiveStudents.map((s) => {
                const draftKey = `${lesson.lessonId}:${s.studentId}`;
                const draft = assessmentDrafts[draftKey] ?? { attended: true, status: "PASS" as const, notes: "" };
                return (
                  <AssessmentStudentRow
                    key={s.studentId}
                    displayName={s.displayName}
                    hasEvaluation={s.hasEvaluation}
                    evaluationStatus={s.evaluationStatus}
                    attended={draft.attended}
                    onAttendedChange={(v) =>
                      setAssessmentDrafts((prev) => ({ ...prev, [draftKey]: { ...draft, attended: v, status: v ? draft.status : "FAIL" } }))
                    }
                    onStatusChange={(v) =>
                      setAssessmentDrafts((prev) => ({ ...prev, [draftKey]: { ...draft, status: v } }))
                    }
                    onNotesChange={(v) =>
                      setAssessmentDrafts((prev) => ({ ...prev, [draftKey]: { ...draft, notes: v } }))
                    }
                    notes={draft.notes}
                    onSubmit={() => handleSubmitAssessment(lesson.lessonId!, s.studentId)}
                    isSubmitting={assessmentSubmitting === draftKey}
                  />
                );
              })}
            </AssessmentSection>
          );
        }
      }

      return parts.length > 0 ? <>{parts}</> : null;
    }

    if (viewerRole === "manager" && lesson.pendingSuggestion && lesson.lessonId) {
      return (
        <BelowCapacityManagerBar
          suggestionId={lesson.pendingSuggestion.id}
          suggestionType={lesson.pendingSuggestion.type}
          isSubmitting={approvalSubmitting === lesson.pendingSuggestion.id}
          onApprove={handleApproveSuggestion}
        />
      );
    }

    return null;
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.courses")} />
      <CourseDetailPageRoot testId="course-detail-page">
        {isLoading ? (
          <CourseDetailLoadingText>{t("admin.loading")}</CourseDetailLoadingText>
        ) : error ? (
          <CourseDetailErrorText>{String(error.message ?? error)}</CourseDetailErrorText>
        ) : course ? (
          <>
            <CourseDetailHeaderSection>
              <CourseDetailTitle>
                {course.syllabusName} v{course.syllabusVersion}
              </CourseDetailTitle>
              <CourseDetailMetaRow>
                <CourseDetailMetaItem label={t("admin.school")} value={course.schoolName} />
                <CourseDetailMetaItem
                  label={t("admin.status")}
                  value={<CourseLifecycleStatusBadge status={course.lifecycleStatus} />}
                />
                {course.startDate && (
                  <CourseDetailMetaItem
                    label={t("admin.startDate")}
                    value={new Date(course.startDate).toLocaleDateString()}
                  />
                )}
                {course.hourlyRate != null && (
                  <CourseDetailMetaItem
                    label={t("admin.hourlyRate")}
                    value={`${course.hourlyRate}`}
                  />
                )}
              </CourseDetailMetaRow>
            </CourseDetailHeaderSection>

            {viewerRole === "manager" && (course.lifecycleStatus === "OPEN" || course.lifecycleStatus === "REOPENED") && (
              <>
                <InstructorAssignmentSection
                  assignedInstructors={course.assignedInstructorsList ?? []}
                  assignableOptions={course.assignableInstructors ?? []}
                  selectedInstructorId={assignInstructorId}
                  isLead={assignIsLead}
                  wagePerHour={assignWagePerHour}
                  onSelectInstructor={setAssignInstructorId}
                  onToggleLead={setAssignIsLead}
                  onWageChange={setAssignWagePerHour}
                  onAssign={handleAssignInstructor}
                  isSubmitting={assignInstructorMutation.isPending}
                />
                <CourseDetailActionsBar>
                  <Button onClick={() => handleStartCourse()} disabled={startCourseMutation.isPending}>
                    {startCourseMutation.isPending ? t("courseDetail.starting") : t("courseDetail.startCourse")}
                  </Button>
                </CourseDetailActionsBar>
                {guardErrors.length > 0 && <StartCourseGuardList errors={guardErrors} />}
                <StartCourseCapacityModal
                  open={showCapacityModal}
                  onClose={() => setShowCapacityModal(false)}
                  onConfirm={() => handleStartCourse(true)}
                  isSubmitting={startCourseMutation.isPending}
                  enrolledCount={course.enrolledCount}
                  minCapacity={course.minCapacity ?? 0}
                />
              </>
            )}

            {viewerRole === "manager" && course.lifecycleStatus === "STARTED" && (
              <>
                <InstructorAssignmentSection
                  assignedInstructors={course.assignedInstructorsList ?? []}
                  assignableOptions={course.assignableInstructors ?? []}
                  selectedInstructorId={assignInstructorId}
                  isLead={assignIsLead}
                  wagePerHour={assignWagePerHour}
                  onSelectInstructor={setAssignInstructorId}
                  onToggleLead={setAssignIsLead}
                  onWageChange={setAssignWagePerHour}
                  onAssign={handleAssignInstructor}
                  isSubmitting={assignInstructorMutation.isPending}
                />
                <LateEnrollmentSection
                  options={course.enrollableStudents ?? []}
                  selectedStudentId={lateEnrollStudentId}
                  onSelectStudent={setLateEnrollStudentId}
                  onEnroll={handleLateEnroll}
                  isSubmitting={lateEnrollMutation.isPending}
                />
                {(course.pendingRefundRequests ?? []).length > 0 && (
                  <PendingRefundsSection>
                    {(course.pendingRefundRequests ?? []).map((r: { id: string; studentName: string; reason: string | null; createdAt: Date }) => (
                      <PendingRefundItem
                        key={r.id}
                        refundRequestId={r.id}
                        studentName={r.studentName}
                        reason={r.reason}
                        amountMinorInput={refundAmounts[r.id] ?? ""}
                        onAmountChange={(v) => setRefundAmounts((prev) => ({ ...prev, [r.id]: v }))}
                        onApprove={handleApproveRefund}
                        onDecline={handleDeclineRefund}
                        isSubmitting={refundActionSubmitting === r.id}
                      />
                    ))}
                  </PendingRefundsSection>
                )}
              </>
            )}

            {viewerRole === "student" && ["STARTED", "COMPLETED", "CLOSED"].includes(course.lifecycleStatus) && (
              <>
                <RefundRequestSection
                  refundStatus={course.myRefundRequest?.status ?? null}
                  onRequestRefund={() => setRefundModalOpen(true)}
                />
                <RefundRequestModal
                  open={refundModalOpen}
                  onClose={() => { setRefundModalOpen(false); setRefundReason(""); setRefundError(null); }}
                  reason={refundReason}
                  onReasonChange={setRefundReason}
                  onSubmit={handleSubmitRefund}
                  isSubmitting={refundSubmitting}
                  errorMessage={refundError}
                />
              </>
            )}

            <CourseLessonsSection>
              <CourseLessonsSectionHeading>{t("admin.lessons")}</CourseLessonsSectionHeading>
              <CourseLessonsList>
                {course.lessons.map((lesson: CourseLessonDetail) => (
                  <CourseLessonListItem
                    key={lesson.syllabusLessonId}
                    position={lesson.position}
                    lessonName={lesson.lessonName}
                    durationLabel={formatDuration(lesson.durationMinutes)}
                    dateLabel={
                      lesson.date
                        ? new Date(lesson.date).toLocaleDateString()
                        : t("courseDetail.notYetScheduled")
                    }
                    location={lesson.location}
                    status={lesson.status}
                    action={
                      viewerRole === "instructor" && course.isLeadInstructor ? (
                        <Button
                          size="sm"
                          variant={lesson.lessonId ? "outline" : "default"}
                          onClick={() => openScheduleSheet(lesson)}
                        >
                          {lesson.lessonId ? t("courseDetail.reschedule") : t("courseDetail.schedule")}
                        </Button>
                      ) : undefined
                    }
                    extra={renderLessonExtra(lesson)}
                  />
                ))}
              </CourseLessonsList>
            </CourseLessonsSection>

            {viewerRole === "instructor" && course.isLeadInstructor && (
              <ScheduleLessonSheet
                open={schedulingLesson !== null}
                onClose={closeScheduleSheet}
                title={schedulingLesson?.lessonId ? t("courseDetail.rescheduleLesson") : t("courseDetail.scheduleLesson")}
                onSubmit={handleScheduleLesson}
                isSubmitting={sheetSubmitting}
                date={sheetDate}
                onDateChange={setSheetDate}
                location={sheetLocation}
                onLocationChange={setSheetLocation}
                errorMessage={sheetError}
              />
            )}
          </>
        ) : null}
      </CourseDetailPageRoot>
    </DefaultLayout>
  );
};

export default CourseDetailPage;
