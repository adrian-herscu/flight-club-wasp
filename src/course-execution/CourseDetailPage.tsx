import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import {
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
} from "../client/components/patterns/CourseDetailPagePatterns";

const { getCourseDetail, useQuery } = operations as any;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

const CourseDetailPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();

  const {
    data: course,
    isLoading,
    error,
  } = useQuery(getCourseDetail, courseId ? { courseId } : undefined, {
    enabled: Boolean(courseId),
  });

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

            <CourseLessonsSection>
              <CourseLessonsSectionHeading>{t("admin.lessons")}</CourseLessonsSectionHeading>
              <CourseLessonsList>
                {course.lessons.map(
                  (lesson: {
                    syllabusLessonId: string;
                    position: number;
                    lessonName: string;
                    durationMinutes: number;
                    date: string | Date | null;
                    location: string | null;
                    status: string;
                  }) => (
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
                    />
                  ),
                )}
              </CourseLessonsList>
            </CourseLessonsSection>
          </>
        ) : null}
      </CourseDetailPageRoot>
    </DefaultLayout>
  );
};

export default CourseDetailPage;
