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
import {
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
  ScheduleLessonSheet,
  StartCourseCapacityModal,
  StartCourseGuardList,
} from "../client/components/patterns/CourseDetailPagePatterns";

const {
  getCourseDetail,
  rescheduleLesson,
  scheduleLesson,
  startCourse,
  useQuery,
} = operations as any;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

const CourseDetailPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const { pathname } = useLocation();

  const viewerRole = pathname.startsWith("/school-manager/")
    ? "manager"
    : pathname.startsWith("/instructor/")
      ? "instructor"
      : "student";

  // --- Manager: start course state ---
  const [guardErrors, setGuardErrors] = useState<string[]>([]);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [startingCourse, setStartingCourse] = useState(false);

  // --- Instructor: schedule lesson state ---
  const [schedulingLesson, setSchedulingLesson] = useState<CourseLessonDetail | null>(null);
  const [sheetDate, setSheetDate] = useState("");
  const [sheetLocation, setSheetLocation] = useState("");
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetSubmitting, setSheetSubmitting] = useState(false);

  const {
    data: course,
    isLoading,
    error,
    refetch,
  } = useQuery(getCourseDetail, courseId ? { courseId } : undefined, {
    enabled: Boolean(courseId),
  });

  const handleStartCourse = async (overrideCapacity?: boolean) => {
    if (!courseId) return;
    setStartingCourse(true);
    setGuardErrors([]);
    try {
      await startCourse({ courseId, overrideCapacity });
      setShowCapacityModal(false);
      await refetch();
      toast({ title: t("courseDetail.courseStarted") });
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? String(err);
      if (msg.includes("overrideCapacity")) {
        setShowCapacityModal(true);
      } else {
        setGuardErrors([msg]);
        toast({ title: t("courseDetail.startFailed"), variant: "destructive" });
      }
    } finally {
      setStartingCourse(false);
    }
  };

  const openScheduleSheet = (lesson: CourseLessonDetail) => {
    setSchedulingLesson(lesson);
    setSheetDate(
      lesson.date ? new Date(lesson.date).toISOString().split("T")[0] : "",
    );
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
      if (schedulingLesson.lessonId) {
        await rescheduleLesson({
          courseLessonId: schedulingLesson.lessonId,
          date: new Date(sheetDate),
          location: sheetLocation,
        });
      } else {
        await scheduleLesson({
          courseId,
          syllabusLessonId: schedulingLesson.syllabusLessonId,
          date: new Date(sheetDate),
          location: sheetLocation,
        });
      }
      closeScheduleSheet();
      await refetch();
      toast({ title: t("courseDetail.lessonScheduled") });
    } catch (err: unknown) {
      setSheetError((err as { message?: string }).message ?? String(err));
    } finally {
      setSheetSubmitting(false);
    }
  };

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

            {viewerRole === "manager" && course.lifecycleStatus === "OPEN" && (
              <>
                <CourseDetailActionsBar>
                  <Button
                    onClick={() => handleStartCourse()}
                    disabled={startingCourse}
                  >
                    {startingCourse
                      ? t("courseDetail.starting")
                      : t("courseDetail.startCourse")}
                  </Button>
                </CourseDetailActionsBar>
                {guardErrors.length > 0 && (
                  <StartCourseGuardList errors={guardErrors} />
                )}
                <StartCourseCapacityModal
                  open={showCapacityModal}
                  onClose={() => setShowCapacityModal(false)}
                  onConfirm={() => handleStartCourse(true)}
                  isSubmitting={startingCourse}
                  enrolledCount={course.enrolledCount}
                  minCapacity={course.minCapacity ?? 0}
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
                          {lesson.lessonId
                            ? t("courseDetail.reschedule")
                            : t("courseDetail.schedule")}
                        </Button>
                      ) : undefined
                    }
                  />
                ))}
              </CourseLessonsList>
            </CourseLessonsSection>

            {viewerRole === "instructor" && course.isLeadInstructor && (
              <ScheduleLessonSheet
                open={schedulingLesson !== null}
                onClose={closeScheduleSheet}
                title={
                  schedulingLesson?.lessonId
                    ? t("courseDetail.rescheduleLesson")
                    : t("courseDetail.scheduleLesson")
                }
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

