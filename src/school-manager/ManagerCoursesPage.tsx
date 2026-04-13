import { type CourseInterestStatus } from "@prisma/client";
import { type ReactNode, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import { getDefaultCourseStartDate } from "../shared/utils";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import LabeledInputField from "../client/components/patterns/LabeledInputField";
import LabeledSelectField from "../client/components/patterns/LabeledSelectField";
import {
  ManagerCoursesCardContent,
  ManagerCoursesCourseListItem,
  ManagerCoursesDetailsPanel,
  ManagerCoursesDisclosure,
  ManagerCoursesForm,
  ManagerCoursesGrid,
  ManagerCoursesInterestListItem,
  ManagerCoursesList,
  ManagerCoursesLoadingText,
  ManagerCoursesMutedText,
  ManagerCoursesParticipantListItem,
  ManagerCoursesSectionTopSpacing,
  ManagerCoursesTwoColumnFields,
} from "../client/components/patterns/ManagerCoursesPagePatterns";
import { Button } from "../client/components/ui/button";
import { Card, CardHeader, CardTitle } from "../client/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import { SelectItem } from "../client/components/ui/select";
import { usePerItemMutation } from "../client/hooks/usePerItemMutation";
import { useWaspMutation } from "../client/hooks/useWaspMutation";
import { useManagedSchoolSelection } from "./useManagedSchoolSelection";

const {
  assignInstructorToCourse,
  cancelCourseInterestForManager,
  closeCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerClosedCourses,
  getManagerCourseInstructorDetails,
  getManagerCourseEnrollmentDetails,
  getManagerCoursesForEnrollment,
  getManagerCourseInterests,
  getMyManagedSchool,
  getManagerSyllabusCatalog,
  getManagerInstructorsForAssignment,
  getManagerStudentsForEnrollment,
  reopenCourse,
  useQuery,
} = operations as any;

type CatalogItem = {
  syllabusId: string;
  syllabusName: string;
  syllabusVersionId: string;
  version: number;
  schoolName: string | null;
};

type EnrollmentStudentItem = {
  studentId: string;
  userId: string;
  displayName: string;
  email: string | null;
};

type EnrollmentCourseItem = {
  courseId: string;
  syllabusName: string;
  syllabusVersion: number;
  startDate: string | null;
  hourlyRate: number | null;
  status: "OPEN" | "CLOSED";
  enrolledCount: number;
};

type AssignmentInstructorItem = {
  instructorId: string;
  userId: string;
  displayName: string;
  email: string | null;
};

type CourseEnrollmentDetails = {
  courseId: string;
  enrolledCount: number;
  enrolledStudents: EnrollmentStudentItem[];
} | null;

type CourseInstructorDetails = {
  courseId: string;
  assignedCount: number;
  assignedInstructors: AssignmentInstructorItem[];
} | null;

type CourseInterestItem = {
  id: string;
  status: CourseInterestStatus;
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
  };
  course: {
    id: string;
    title: string;
  };
};

type ManagerSyllabusCatalog = {
  courseOpeningCandidates: CatalogItem[];
  editableDrafts: CatalogItem[];
};

type ManagedSchool = {
  id: string;
  name: string;
  defaultHourlyRate: number | null;
};

// ---------------------------------------------------------------------------
// Zod schema for the "open course" form
// ---------------------------------------------------------------------------

const createCourseSchema = z
  .object({
    templateVersionId: z.string().min(1),
    startDate: z.string(),
    minCapacity: z.string(),
    maxCapacity: z.string(),
    hourlyRate: z.string(),
  })
  .superRefine((data, ctx) => {
    const min = data.minCapacity.trim() === "" ? null : Number(data.minCapacity);
    const max = data.maxCapacity.trim() === "" ? null : Number(data.maxCapacity);
    const rate = data.hourlyRate.trim() === "" ? null : Number(data.hourlyRate);

    if (min != null && (!Number.isInteger(min) || min <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["minCapacity"], message: "Must be a positive integer" });
    }
    if (max != null && (!Number.isInteger(max) || max <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxCapacity"], message: "Must be a positive integer" });
    }
    if (min != null && max != null && min > max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["minCapacity"], message: "Min cannot exceed max" });
    }
    if (rate != null && (!Number.isInteger(rate) || rate <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hourlyRate"], message: "Must be a positive integer" });
    }
  });

type CreateCourseFormValues = z.infer<typeof createCourseSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ManagerCoursesPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();

  const { data: managedSchoolsData } = useQuery(getMyManagedSchool);
  const managedSchools = (managedSchoolsData as ManagedSchool[] | undefined) ?? [];
  const { selectedSchool, selectedSchoolId } = useManagedSchoolSelection(managedSchools);
  const managedSchoolDefaultHourlyRate = selectedSchool?.defaultHourlyRate ?? null;

  const { data: catalogData, isLoading: isCatalogLoading } = useQuery(getManagerSyllabusCatalog, {
    schoolId: selectedSchoolId,
  });
  const catalog = catalogData as ManagerSyllabusCatalog | undefined;
  const finalCandidates = catalog?.courseOpeningCandidates ?? [];

  const { data: coursesForEnrollmentData } = useQuery(getManagerCoursesForEnrollment, {
    schoolId: selectedSchoolId,
  });
  const coursesForEnrollment = (coursesForEnrollmentData as EnrollmentCourseItem[] | undefined) ?? [];

  const { data: closedCoursesData } = useQuery(getManagerClosedCourses, { schoolId: selectedSchoolId });
  const closedCourses = (closedCoursesData as EnrollmentCourseItem[] | undefined) ?? [];

  const { data: studentsForEnrollmentData } = useQuery(getManagerStudentsForEnrollment, {
    schoolId: selectedSchoolId,
  });
  const studentsForEnrollment = (studentsForEnrollmentData as EnrollmentStudentItem[] | undefined) ?? [];

  const { data: instructorsForAssignmentData } = useQuery(getManagerInstructorsForAssignment, {
    schoolId: selectedSchoolId,
  });
  const instructorsForAssignment = (instructorsForAssignmentData as AssignmentInstructorItem[] | undefined) ?? [];

  // -------------------------------------------------------------------------
  // Derived selection state (useMemo + override pattern — replaces 4 syncing effects)
  // -------------------------------------------------------------------------

  const [enrollmentCourseOverride, setEnrollmentCourseOverride] = useState<string | null>(null);
  const selectedEnrollmentCourseId = useMemo(() => {
    if (enrollmentCourseOverride && coursesForEnrollment.some((c) => c.courseId === enrollmentCourseOverride))
      return enrollmentCourseOverride;
    return coursesForEnrollment[0]?.courseId ?? null;
  }, [coursesForEnrollment, enrollmentCourseOverride]);

  const [assignmentCourseOverride, setAssignmentCourseOverride] = useState<string | null>(null);
  const selectedAssignmentCourseId = useMemo(() => {
    if (assignmentCourseOverride && coursesForEnrollment.some((c) => c.courseId === assignmentCourseOverride))
      return assignmentCourseOverride;
    return coursesForEnrollment[0]?.courseId ?? null;
  }, [coursesForEnrollment, assignmentCourseOverride]);

  const [studentOverride, setStudentOverride] = useState<string>("");
  const selectedStudentIdToEnroll = useMemo(() => {
    if (studentOverride && studentsForEnrollment.some((s) => s.studentId === studentOverride))
      return studentOverride;
    return studentsForEnrollment[0]?.studentId ?? "";
  }, [studentsForEnrollment, studentOverride]);

  const [instructorOverride, setInstructorOverride] = useState<string>("");
  const selectedInstructorIdToAssign = useMemo(() => {
    if (instructorOverride && instructorsForAssignment.some((i) => i.instructorId === instructorOverride))
      return instructorOverride;
    return instructorsForAssignment[0]?.instructorId ?? "";
  }, [instructorsForAssignment, instructorOverride]);

  // -------------------------------------------------------------------------
  // Detail queries
  // -------------------------------------------------------------------------

  const { data: courseEnrollmentDetailsData } = useQuery(getManagerCourseEnrollmentDetails, {
    schoolId: selectedSchoolId,
    courseId: selectedEnrollmentCourseId,
  });
  const courseEnrollmentDetails = courseEnrollmentDetailsData as CourseEnrollmentDetails;

  const { data: courseInstructorDetailsData } = useQuery(getManagerCourseInstructorDetails, {
    schoolId: selectedSchoolId,
    courseId: selectedAssignmentCourseId,
  });
  const courseInstructorDetails = courseInstructorDetailsData as CourseInstructorDetails;

  const [selectedInterestsCourseId, setSelectedInterestsCourseId] = useState<string | null>(null);
  const { data: courseInterestsData } = useQuery(getManagerCourseInterests, {
    schoolId: selectedSchoolId,
    courseId: selectedInterestsCourseId,
  });
  const courseInterests = (courseInterestsData as CourseInterestItem[] | undefined) ?? [];

  // -------------------------------------------------------------------------
  // Dialog state (UI only)
  // -------------------------------------------------------------------------

  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [pendingCloseCourse, setPendingCloseCourse] = useState<EnrollmentCourseItem | null>(null);
  const [pendingReopenCourse, setPendingReopenCourse] = useState<EnrollmentCourseItem | null>(null);

  // -------------------------------------------------------------------------
  // Create-course form (RHF + Zod — replaces 5 form useState hooks + 2 effects)
  // -------------------------------------------------------------------------

  const form = useForm<CreateCourseFormValues>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      templateVersionId: "",
      startDate: getDefaultCourseStartDate(),
      minCapacity: "",
      maxCapacity: "",
      hourlyRate: managedSchoolDefaultHourlyRate != null ? String(managedSchoolDefaultHourlyRate) : "",
    },
  });

  // -------------------------------------------------------------------------
  // Mutations (useWaspMutation — replaces 6 loading flags + try/catch/toast blocks)
  // -------------------------------------------------------------------------

  const [handleCancelInterest, cancellingInterestId] = usePerItemMutation(
    (id) => cancelCourseInterestForManager({ schoolId: selectedSchoolId, interestId: id }),
    {
      successToast: { title: t("admin.interestCancelled") },
      errorToast: { title: t("admin.interestCancelFailed") },
    },
  );

  const createCourse = useWaspMutation(
    (args: Parameters<typeof createCourseFromFinalSyllabus>[0]) => createCourseFromFinalSyllabus(args),
    {
      successToast: {
        title: t("syllabus.courseCreated"),
        description: t("syllabus.courseCreated_desc"),
      },
      errorToast: {
        title: t("syllabus.courseCreationFailed"),
        fallbackDescription: t("syllabus.unableCreateCourse"),
      },
      onSuccess: () =>
        form.reset({
          templateVersionId: "",
          startDate: getDefaultCourseStartDate(),
          minCapacity: "",
          maxCapacity: "",
          hourlyRate: managedSchoolDefaultHourlyRate != null ? String(managedSchoolDefaultHourlyRate) : "",
        }),
    },
  );

  const handleCreateCourse = form.handleSubmit(async (values) => {
    const parsedMinCapacity = values.minCapacity.trim() === "" ? null : Number(values.minCapacity);
    const parsedMaxCapacity = values.maxCapacity.trim() === "" ? null : Number(values.maxCapacity);
    const parsedHourlyRate = values.hourlyRate.trim() === "" ? null : Number(values.hourlyRate);

    if (parsedHourlyRate == null && managedSchoolDefaultHourlyRate == null) {
      form.setError("hourlyRate", { message: t("syllabus.hourlyRateRequired") });
      return;
    }

    await createCourse.mutate({
      schoolId: selectedSchoolId,
      syllabusVersionId: values.templateVersionId,
      startDate: values.startDate ? new Date(`${values.startDate}T00:00:00.000Z`).toISOString() : null,
      minCapacity: parsedMinCapacity,
      maxCapacity: parsedMaxCapacity,
      hourlyRate: parsedHourlyRate,
    });
  });

  const enrollStudent = useWaspMutation(
    (args: { schoolId: string; courseId: string; studentId: string }) => enrollStudentInCourse(args),
    {
      successToast: {
        title: t("syllabus.studentEnrolled"),
        description: t("syllabus.studentEnrolled_desc"),
      },
      errorToast: { title: t("syllabus.enrollmentFailed"), fallbackDescription: t("syllabus.unableEnrollStudent") },
      onSuccess: () => setStudentOverride(""),
    },
  );

  async function handleEnrollStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEnrollmentCourseId || !selectedStudentIdToEnroll) return;
    await enrollStudent.mutate({
      schoolId: selectedSchoolId,
      courseId: selectedEnrollmentCourseId,
      studentId: selectedStudentIdToEnroll,
    });
  }

  const assignInstructor = useWaspMutation(
    (args: { schoolId: string; courseId: string; instructorId: string }) => assignInstructorToCourse(args),
    {
      successToast: {
        title: t("syllabus.instructorAssigned"),
        description: t("syllabus.instructorAssigned_desc"),
      },
      errorToast: {
        title: t("syllabus.assignmentFailed"),
        fallbackDescription: t("syllabus.unableAssignInstructor"),
      },
      onSuccess: () => setInstructorOverride(""),
    },
  );

  async function handleAssignInstructor(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssignmentCourseId || !selectedInstructorIdToAssign) return;
    await assignInstructor.mutate({
      schoolId: selectedSchoolId,
      courseId: selectedAssignmentCourseId,
      instructorId: selectedInstructorIdToAssign,
    });
  }

  const closeCourseAction = useWaspMutation(
    (args: { schoolId: string; courseId: string }) => closeCourse(args),
    {
      successToast: { title: t("syllabus.courseClosed"), description: t("syllabus.courseClosed_desc") },
      errorToast: { title: t("syllabus.closeCourseFailed"), fallbackDescription: t("syllabus.unableCloseCourse") },
      onSuccess: () => {
        setIsCloseDialogOpen(false);
        setPendingCloseCourse(null);
      },
    },
  );

  async function handleCloseCourse() {
    if (!pendingCloseCourse) return;
    await closeCourseAction.mutate({ schoolId: selectedSchoolId, courseId: pendingCloseCourse.courseId });
  }

  const reopenCourseAction = useWaspMutation(
    (args: { schoolId: string; courseId: string }) => reopenCourse(args),
    {
      successToast: { title: t("syllabus.courseReopened"), description: t("syllabus.courseReopened_desc") },
      errorToast: {
        title: t("syllabus.reopenCourseFailed"),
        fallbackDescription: t("syllabus.unableReopenCourse"),
      },
      onSuccess: () => {
        setIsReopenDialogOpen(false);
        setPendingReopenCourse(null);
      },
    },
  );

  async function handleReopenCourse() {
    if (!pendingReopenCourse) return;
    await reopenCourseAction.mutate({ schoolId: selectedSchoolId, courseId: pendingReopenCourse.courseId });
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderCourseSelectField = (
    id: string,
    label: string,
    value: string,
    onValueChange: (value: string) => void,
  ) => (
    <LabeledSelectField
      id={id}
      label={label}
      value={value}
      onValueChange={onValueChange}
      placeholder={t("syllabus.coursePlaceholder")}
    >
      {coursesForEnrollment.map((course: EnrollmentCourseItem) => (
        <SelectItem key={course.courseId} value={course.courseId}>
          {course.syllabusName} (v{course.syllabusVersion}) •{" "}
          {course.startDate ? new Date(course.startDate).toLocaleDateString() : t("syllabus.noStartDate")}
        </SelectItem>
      ))}
    </LabeledSelectField>
  );

  const renderCourseRow = (
    course: EnrollmentCourseItem,
    actionButton: ReactNode,
    includeTotalPrice: boolean,
    includeSummaryTestId: boolean,
  ) => (
    <ManagerCoursesCourseListItem
      key={course.courseId}
      action={actionButton}
      title={`${course.syllabusName} (v${course.syllabusVersion})`}
      summaryTestId={includeSummaryTestId ? `manager-course-summary-${course.courseId}` : undefined}
      summary={
        <>
          {t("syllabus.enrolledStudents", { count: course.enrolledCount })} •{" "}
          {includeTotalPrice
            ? course.hourlyRate != null
              ? t("syllabus.totalPriceValue", { price: course.hourlyRate * course.enrolledCount })
              : t("syllabus.noTotalPrice")
            : null}
          {includeTotalPrice ? " • " : null}
          {course.startDate ? new Date(course.startDate).toLocaleDateString() : t("syllabus.startDate")}
        </>
      }
    />
  );

  const renderParticipantRow = (id: string, displayName: string, email: string | null) => (
    <ManagerCoursesParticipantListItem key={id} displayName={displayName} email={email ?? "—"} />
  );

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.courses")} showTitle={false} />

      <ManagerCoursesGrid variant="top">
        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.openCourseFromFinalSyllabus")}</CardTitle>
          </CardHeader>
          <ManagerCoursesCardContent>
            {isCatalogLoading ? (
              <ManagerCoursesLoadingText>{t("syllabus.loadingCatalog")}</ManagerCoursesLoadingText>
            ) : (
              <ManagerCoursesForm onSubmit={handleCreateCourse} variant="compact">
                <Controller
                  control={form.control}
                  name="templateVersionId"
                  render={({ field }) => (
                    <LabeledSelectField
                      id="create-course-template-version"
                      label={t("syllabus.selectFinalVersion")}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("syllabus.finalTemplatePlaceholder")}
                    >
                      {finalCandidates.map((item: CatalogItem) => (
                        <SelectItem key={item.syllabusVersionId} value={item.syllabusVersionId}>
                          {item.syllabusName} (v{item.version}) • {item.schoolName ?? t("syllabus.system")}
                        </SelectItem>
                      ))}
                    </LabeledSelectField>
                  )}
                />

                <Controller
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <LabeledInputField
                      id="manager-course-start-date"
                      label={t("syllabus.startDateLabel")}
                      type="date"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <ManagerCoursesTwoColumnFields>
                  <Controller
                    control={form.control}
                    name="minCapacity"
                    render={({ field }) => (
                      <LabeledInputField
                        id="manager-course-min-capacity"
                        label={t("syllabus.minCapacityLabel")}
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="maxCapacity"
                    render={({ field }) => (
                      <LabeledInputField
                        id="manager-course-max-capacity"
                        label={t("syllabus.maxCapacityLabel")}
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </ManagerCoursesTwoColumnFields>

                <Controller
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <LabeledInputField
                      id="manager-course-hourly-rate"
                      label={
                        managedSchoolDefaultHourlyRate != null
                          ? t("syllabus.courseHourlyRateLabel")
                          : t("syllabus.courseHourlyRateRequiredLabel")
                      }
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={field.onChange}
                      required={managedSchoolDefaultHourlyRate == null}
                    />
                  )}
                />

                <Button type="submit" disabled={createCourse.isPending || finalCandidates.length === 0}>
                  {createCourse.isPending ? t("syllabus.creatingCourse") : t("syllabus.createCourseButton")}
                </Button>
              </ManagerCoursesForm>
            )}
          </ManagerCoursesCardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.courses")}</CardTitle>
          </CardHeader>
          <ManagerCoursesCardContent>
            {coursesForEnrollment.length === 0 ? (
              <ManagerCoursesMutedText>{t("syllabus.noDetailsAvailable")}</ManagerCoursesMutedText>
            ) : (
              <ManagerCoursesList>
                {coursesForEnrollment.map((course: EnrollmentCourseItem) =>
                  renderCourseRow(
                    course,
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => { setPendingCloseCourse(course); setIsCloseDialogOpen(true); }}
                    >
                      {t("syllabus.closeCourseButton")}
                    </Button>,
                    true,
                    true,
                  ),
                )}
              </ManagerCoursesList>
            )}

            <ManagerCoursesDisclosure summary={t("syllabus.closedCoursesPanel", { count: closedCourses.length })}>
              {closedCourses.length === 0 ? (
                <ManagerCoursesMutedText>{t("syllabus.noClosedCourses")}</ManagerCoursesMutedText>
              ) : (
                <ManagerCoursesList>
                  {closedCourses.map((course: EnrollmentCourseItem) =>
                    renderCourseRow(
                      course,
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setPendingReopenCourse(course); setIsReopenDialogOpen(true); }}
                      >
                        {t("syllabus.reopenCourseButton")}
                      </Button>,
                      false,
                      false,
                    ),
                  )}
                </ManagerCoursesList>
              )}
            </ManagerCoursesDisclosure>
          </ManagerCoursesCardContent>
        </Card>
      </ManagerCoursesGrid>

      <ManagerCoursesGrid variant="bottom">
        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.workflowSingleStudentEnrollment")}</CardTitle>
          </CardHeader>
          <ManagerCoursesCardContent variant="spacious">
            <ManagerCoursesForm onSubmit={handleEnrollStudent} variant="spacious">
              {renderCourseSelectField(
                "enrollment-course-select",
                t("syllabus.course"),
                selectedEnrollmentCourseId ?? "",
                (val) => setEnrollmentCourseOverride(val || null),
              )}

              <LabeledSelectField
                id="enrollment-student-select"
                label={t("syllabus.student")}
                value={selectedStudentIdToEnroll}
                onValueChange={setStudentOverride}
                placeholder={t("syllabus.studentPlaceholder")}
              >
                {studentsForEnrollment.map((student: EnrollmentStudentItem) => (
                  <SelectItem key={student.studentId} value={student.studentId}>
                    {student.displayName} • {student.email ?? "—"}
                  </SelectItem>
                ))}
              </LabeledSelectField>

              <Button type="submit" disabled={enrollStudent.isPending}>
                {enrollStudent.isPending ? t("syllabus.enrollingButton") : t("syllabus.enrollStudent")}
              </Button>
            </ManagerCoursesForm>

            <ManagerCoursesDetailsPanel
              title={t("syllabus.enrolledStudents", { count: courseEnrollmentDetails?.enrolledCount ?? 0 })}
            >
              {!selectedEnrollmentCourseId ? (
                <ManagerCoursesMutedText>{t("syllabus.selectCourseToViewEnrolled")}</ManagerCoursesMutedText>
              ) : !courseEnrollmentDetails ? (
                <ManagerCoursesMutedText>{t("syllabus.noDetailsAvailable")}</ManagerCoursesMutedText>
              ) : courseEnrollmentDetails.enrolledStudents.length === 0 ? (
                <ManagerCoursesMutedText>{t("syllabus.noStudentsEnrolled")}</ManagerCoursesMutedText>
              ) : (
                <ManagerCoursesList>
                  {courseEnrollmentDetails.enrolledStudents.map((student) =>
                    renderParticipantRow(student.studentId, student.displayName, student.email),
                  )}
                </ManagerCoursesList>
              )}
            </ManagerCoursesDetailsPanel>
          </ManagerCoursesCardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.workflowInstructorAssignment")}</CardTitle>
          </CardHeader>
          <ManagerCoursesCardContent variant="spacious">
            <ManagerCoursesForm onSubmit={handleAssignInstructor} variant="spacious">
              {renderCourseSelectField(
                "assignment-course-select",
                t("syllabus.course"),
                selectedAssignmentCourseId ?? "",
                (val) => setAssignmentCourseOverride(val || null),
              )}

              <LabeledSelectField
                id="assignment-instructor-select"
                label={t("syllabus.instructor")}
                value={selectedInstructorIdToAssign}
                onValueChange={setInstructorOverride}
                placeholder={t("syllabus.instructorPlaceholder")}
              >
                {instructorsForAssignment.map((inst: AssignmentInstructorItem) => (
                  <SelectItem key={inst.instructorId} value={inst.instructorId}>
                    {inst.displayName} • {inst.email ?? "—"}
                  </SelectItem>
                ))}
              </LabeledSelectField>

              <Button type="submit" disabled={assignInstructor.isPending}>
                {assignInstructor.isPending ? t("syllabus.assigningButton") : t("syllabus.assignInstructor")}
              </Button>
            </ManagerCoursesForm>

            <ManagerCoursesDetailsPanel
              title={t("syllabus.assignedInstructors", { count: courseInstructorDetails?.assignedCount ?? 0 })}
            >
              {!selectedAssignmentCourseId ? (
                <ManagerCoursesMutedText>{t("syllabus.selectCourseToViewAssigned")}</ManagerCoursesMutedText>
              ) : !courseInstructorDetails ? (
                <ManagerCoursesMutedText>{t("syllabus.noDetailsAvailable")}</ManagerCoursesMutedText>
              ) : courseInstructorDetails.assignedInstructors.length === 0 ? (
                <ManagerCoursesMutedText>{t("syllabus.noInstructorsAssigned")}</ManagerCoursesMutedText>
              ) : (
                <ManagerCoursesList>
                  {courseInstructorDetails.assignedInstructors.map((instructor) =>
                    renderParticipantRow(instructor.instructorId, instructor.displayName, instructor.email),
                  )}
                </ManagerCoursesList>
              )}
            </ManagerCoursesDetailsPanel>
          </ManagerCoursesCardContent>
        </Card>
      </ManagerCoursesGrid>

      <ManagerCoursesSectionTopSpacing>
        <Card>
          <CardHeader>
            <CardTitle>{t("student.courseInterests")}</CardTitle>
          </CardHeader>
          <ManagerCoursesCardContent>
            <ManagerCoursesTwoColumnFields>
              <LabeledSelectField
                id="interests-course-select"
                label={t("syllabus.coursePlaceholder")}
                value={selectedInterestsCourseId ?? ""}
                onValueChange={(v) => setSelectedInterestsCourseId(v || null)}
                placeholder={t("syllabus.coursePlaceholder")}
              >
                {coursesForEnrollment.map((course: EnrollmentCourseItem) => (
                  <SelectItem key={course.courseId} value={course.courseId}>
                    {course.syllabusName} v{course.syllabusVersion}
                  </SelectItem>
                ))}
              </LabeledSelectField>
            </ManagerCoursesTwoColumnFields>

            {courseInterests.length === 0 ? (
              <ManagerCoursesMutedText data-testid="no-course-interests">
                {t("student.noInterestsForCourse")}
              </ManagerCoursesMutedText>
            ) : (
              <ManagerCoursesList>
                {courseInterests.map((interest: CourseInterestItem) => (
                  <ManagerCoursesInterestListItem
                    key={interest.id}
                    displayName={interest.user.fullName ?? interest.user.email ?? interest.user.id}
                    email={interest.user.email && interest.user.fullName ? interest.user.email : undefined}
                    status={interest.status}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={cancellingInterestId === interest.id}
                        onClick={() => handleCancelInterest(interest.id)}
                        data-testid="cancel-interest-btn"
                      >
                        {cancellingInterestId === interest.id
                          ? t("admin.cancellingInterest")
                          : t("admin.cancelInterest")}
                      </Button>
                    }
                  />
                ))}
              </ManagerCoursesList>
            )}
          </ManagerCoursesCardContent>
        </Card>
      </ManagerCoursesSectionTopSpacing>

      <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("syllabus.confirmCloseCourseTitle")}</DialogTitle>
            <DialogDescription>
              {t("syllabus.confirmCloseCourse_desc", {
                name: pendingCloseCourse
                  ? `${pendingCloseCourse.syllabusName} (v${pendingCloseCourse.syllabusVersion})`
                  : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsCloseDialogOpen(false); setPendingCloseCourse(null); }}
            >
              {t("syllabus.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleCloseCourse} disabled={closeCourseAction.isPending}>
              {closeCourseAction.isPending ? t("syllabus.closingCourse") : t("syllabus.confirmCloseCourseButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("syllabus.confirmReopenCourseTitle")}</DialogTitle>
            <DialogDescription>
              {t("syllabus.confirmReopenCourse_desc", {
                name: pendingReopenCourse
                  ? `${pendingReopenCourse.syllabusName} (v${pendingReopenCourse.syllabusVersion})`
                  : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsReopenDialogOpen(false); setPendingReopenCourse(null); }}
            >
              {t("syllabus.cancel")}
            </Button>
            <Button type="button" onClick={handleReopenCourse} disabled={reopenCourseAction.isPending}>
              {reopenCourseAction.isPending ? t("syllabus.reopeningCourse") : t("syllabus.confirmReopenCourseButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DefaultLayout>
  );
};

export default ManagerCoursesPage;
