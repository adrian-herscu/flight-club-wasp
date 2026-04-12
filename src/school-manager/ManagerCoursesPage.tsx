import { type CourseInterestStatus } from "@prisma/client";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { toast } from "../client/hooks/use-toast";
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

  const {
    data: coursesForEnrollmentData,
    refetch: refetchCoursesForEnrollment,
  } = useQuery(getManagerCoursesForEnrollment, { schoolId: selectedSchoolId });
  const coursesForEnrollment = (coursesForEnrollmentData as EnrollmentCourseItem[] | undefined) ?? [];

  const {
    data: closedCoursesData,
    refetch: refetchClosedCourses,
  } = useQuery(getManagerClosedCourses, { schoolId: selectedSchoolId });
  const closedCourses = (closedCoursesData as EnrollmentCourseItem[] | undefined) ?? [];

  const {
    data: studentsForEnrollmentData,
    refetch: refetchStudentsForEnrollment,
  } = useQuery(getManagerStudentsForEnrollment, { schoolId: selectedSchoolId });
  const studentsForEnrollment = (studentsForEnrollmentData as EnrollmentStudentItem[] | undefined) ?? [];

  const {
    data: instructorsForAssignmentData,
    refetch: refetchInstructorsForAssignment,
  } = useQuery(getManagerInstructorsForAssignment, { schoolId: selectedSchoolId });
  const instructorsForAssignment = (instructorsForAssignmentData as AssignmentInstructorItem[] | undefined) ?? [];

  const [selectedEnrollmentCourseId, setSelectedEnrollmentCourseId] = useState<string | null>(null);
  const [selectedStudentIdToEnroll, setSelectedStudentIdToEnroll] = useState<string>("");
  const [selectedAssignmentCourseId, setSelectedAssignmentCourseId] = useState<string | null>(null);
  const [selectedInstructorIdToAssign, setSelectedInstructorIdToAssign] = useState<string>("");

  const {
    data: courseEnrollmentDetailsData,
    refetch: refetchCourseEnrollmentDetails,
  } = useQuery(getManagerCourseEnrollmentDetails, {
    schoolId: selectedSchoolId,
    courseId: selectedEnrollmentCourseId,
  });
  const courseEnrollmentDetails = courseEnrollmentDetailsData as CourseEnrollmentDetails;

  const {
    data: courseInstructorDetailsData,
    refetch: refetchCourseInstructorDetails,
  } = useQuery(getManagerCourseInstructorDetails, {
    schoolId: selectedSchoolId,
    courseId: selectedAssignmentCourseId,
  });
  const courseInstructorDetails = courseInstructorDetailsData as CourseInstructorDetails;

  const [selectedInterestsCourseId, setSelectedInterestsCourseId] = useState<string | null>(null);

  const {
    data: courseInterestsData,
    refetch: refetchCourseInterests,
  } = useQuery(getManagerCourseInterests, {
    schoolId: selectedSchoolId,
    courseId: selectedInterestsCourseId,
  });
  const courseInterests = (courseInterestsData as CourseInterestItem[] | undefined) ?? [];

  const [cancellingInterestId, setCancellingInterestId] = useState<string | null>(null);

  async function handleCancelInterest(interestId: string) {
    if (cancellingInterestId) return;
    setCancellingInterestId(interestId);
    try {
      await cancelCourseInterestForManager({ schoolId: selectedSchoolId, interestId });
      await refetchCourseInterests();
      toast({ title: t("admin.interestCancelled") });
    } catch (err) {
      toast({
        title: t("admin.interestCancelFailed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCancellingInterestId(null);
    }
  }

  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isEnrollingStudent, setIsEnrollingStudent] = useState(false);
  const [isAssigningInstructor, setIsAssigningInstructor] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [isClosingCourse, setIsClosingCourse] = useState(false);
  const [isReopeningCourse, setIsReopeningCourse] = useState(false);
  const [pendingCloseCourse, setPendingCloseCourse] = useState<EnrollmentCourseItem | null>(null);
  const [pendingReopenCourse, setPendingReopenCourse] = useState<EnrollmentCourseItem | null>(null);
  const [newCourseTemplateVersionId, setNewCourseTemplateVersionId] = useState<string>("");
  const [newCourseStartDate, setNewCourseStartDate] = useState<string>("");
  const [newCourseMinCapacity, setNewCourseMinCapacity] = useState<string>("");
  const [newCourseMaxCapacity, setNewCourseMaxCapacity] = useState<string>("");
  const [newCourseHourlyRate, setNewCourseHourlyRate] = useState<string>("");

  useEffect(() => {
    setNewCourseStartDate(getDefaultCourseStartDate());
  }, []);

  useEffect(() => {
    if (newCourseHourlyRate.trim() !== "") {
      return;
    }

    if (managedSchoolDefaultHourlyRate == null) {
      return;
    }

    setNewCourseHourlyRate(String(managedSchoolDefaultHourlyRate));
  }, [managedSchoolDefaultHourlyRate, newCourseHourlyRate]);

  useEffect(() => {
    if (!coursesForEnrollment.length) {
      setSelectedEnrollmentCourseId(null);
      return;
    }

    if (
      selectedEnrollmentCourseId &&
      coursesForEnrollment.some((course) => course.courseId === selectedEnrollmentCourseId)
    ) {
      return;
    }

    setSelectedEnrollmentCourseId(coursesForEnrollment[0]?.courseId ?? null);
  }, [coursesForEnrollment, selectedEnrollmentCourseId]);

  useEffect(() => {
    if (!coursesForEnrollment.length) {
      setSelectedAssignmentCourseId(null);
      return;
    }

    if (
      selectedAssignmentCourseId &&
      coursesForEnrollment.some((course) => course.courseId === selectedAssignmentCourseId)
    ) {
      return;
    }

    setSelectedAssignmentCourseId(coursesForEnrollment[0]?.courseId ?? null);
  }, [coursesForEnrollment, selectedAssignmentCourseId]);

  useEffect(() => {
    if (!studentsForEnrollment.length) {
      setSelectedStudentIdToEnroll("");
      return;
    }

    if (
      selectedStudentIdToEnroll &&
      studentsForEnrollment.some((student) => student.studentId === selectedStudentIdToEnroll)
    ) {
      return;
    }

    setSelectedStudentIdToEnroll(studentsForEnrollment[0]?.studentId ?? "");
  }, [selectedStudentIdToEnroll, studentsForEnrollment]);

  useEffect(() => {
    if (!instructorsForAssignment.length) {
      setSelectedInstructorIdToAssign("");
      return;
    }

    if (
      selectedInstructorIdToAssign &&
      instructorsForAssignment.some(
        (instructor) => instructor.instructorId === selectedInstructorIdToAssign,
      )
    ) {
      return;
    }

    setSelectedInstructorIdToAssign(instructorsForAssignment[0]?.instructorId ?? "");
  }, [instructorsForAssignment, selectedInstructorIdToAssign]);

  const handleEnrollStudent = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedEnrollmentCourseId) {
      toast({
        title: t("syllabus.noCoursSelected"),
        description: t("syllabus.selectCourseBeforeEnrolling"),
        variant: "destructive",
      });
      return;
    }

    if (!selectedStudentIdToEnroll) {
      toast({
        title: t("syllabus.noStudentSelected"),
        description: t("syllabus.selectStudentToEnroll"),
        variant: "destructive",
      });
      return;
    }

    setIsEnrollingStudent(true);
    try {
      await enrollStudentInCourse({
        schoolId: selectedSchoolId,
        courseId: selectedEnrollmentCourseId,
        studentId: selectedStudentIdToEnroll,
      });

      await Promise.all([
        refetchCourseEnrollmentDetails(),
        refetchCoursesForEnrollment(),
        refetchClosedCourses(),
        refetchStudentsForEnrollment(),
      ]);

      setSelectedStudentIdToEnroll("");
      toast({
        title: t("syllabus.studentEnrolled"),
        description: t("syllabus.studentEnrolled_desc"),
      });
    } catch (enrollError: unknown) {
      toast({
        title: t("syllabus.enrollmentFailed"),
        description:
          enrollError instanceof Error ? enrollError.message : t("syllabus.unableEnrollStudent"),
        variant: "destructive",
      });
    } finally {
      setIsEnrollingStudent(false);
    }
  };

  const handleAssignInstructor = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedAssignmentCourseId) {
      toast({
        title: t("syllabus.noCoursSelected"),
        description: t("syllabus.selectCourseBeforeAssigning"),
        variant: "destructive",
      });
      return;
    }

    if (!selectedInstructorIdToAssign) {
      toast({
        title: t("syllabus.noInstructorSelected"),
        description: t("syllabus.selectInstructorToAssign"),
        variant: "destructive",
      });
      return;
    }

    setIsAssigningInstructor(true);
    try {
      await assignInstructorToCourse({
        schoolId: selectedSchoolId,
        courseId: selectedAssignmentCourseId,
        instructorId: selectedInstructorIdToAssign,
      });

      await Promise.all([
        refetchCourseInstructorDetails(),
        refetchCoursesForEnrollment(),
        refetchClosedCourses(),
        refetchInstructorsForAssignment(),
      ]);

      setSelectedInstructorIdToAssign("");

      toast({
        title: t("syllabus.instructorAssigned"),
        description: t("syllabus.instructorAssigned_desc"),
      });
    } catch (assignError: unknown) {
      toast({
        title: t("syllabus.assignmentFailed"),
        description:
          assignError instanceof Error ? assignError.message : t("syllabus.unableAssignInstructor"),
        variant: "destructive",
      });
    } finally {
      setIsAssigningInstructor(false);
    }
  };

  const handleCreateCourse = async (event: FormEvent) => {
    event.preventDefault();

    if (!newCourseTemplateVersionId) {
      toast({
        title: t("syllabus.missingTemplate"),
        description: t("syllabus.selectFinalVersion"),
        variant: "destructive",
      });
      return;
    }

    const parsedMinCapacity =
      newCourseMinCapacity.trim() === "" ? null : Number(newCourseMinCapacity);
    const parsedMaxCapacity =
      newCourseMaxCapacity.trim() === "" ? null : Number(newCourseMaxCapacity);
    const parsedHourlyRate =
      newCourseHourlyRate.trim() === "" ? null : Number(newCourseHourlyRate);

    if (parsedMinCapacity != null && (!Number.isInteger(parsedMinCapacity) || parsedMinCapacity <= 0)) {
      toast({
        title: t("syllabus.invalidMinCapacity"),
        description: t("syllabus.minCapacityPositiveInteger"),
        variant: "destructive",
      });
      return;
    }

    if (parsedMaxCapacity != null && (!Number.isInteger(parsedMaxCapacity) || parsedMaxCapacity <= 0)) {
      toast({
        title: t("syllabus.invalidMaxCapacity"),
        description: t("syllabus.maxCapacityPositiveInteger"),
        variant: "destructive",
      });
      return;
    }

    if (
      parsedMinCapacity != null &&
      parsedMaxCapacity != null &&
      parsedMinCapacity > parsedMaxCapacity
    ) {
      toast({
        title: t("syllabus.invalidCapacityRange"),
        description: t("syllabus.minCannotGreaterThanMax"),
        variant: "destructive",
      });
      return;
    }

    if (
      parsedHourlyRate != null &&
      (!Number.isInteger(parsedHourlyRate) || parsedHourlyRate <= 0)
    ) {
      toast({
        title: t("syllabus.invalidHourlyRate"),
        description: t("syllabus.hourlyRatePositiveInteger"),
        variant: "destructive",
      });
      return;
    }

    if (parsedHourlyRate == null && managedSchoolDefaultHourlyRate == null) {
      toast({
        title: t("syllabus.missingHourlyRate"),
        description: t("syllabus.hourlyRateRequired"),
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCourse(true);
    try {
      await createCourseFromFinalSyllabus({
        schoolId: selectedSchoolId,
        syllabusVersionId: newCourseTemplateVersionId,
        startDate: newCourseStartDate
          ? new Date(`${newCourseStartDate}T00:00:00.000Z`).toISOString()
          : null,
        minCapacity: parsedMinCapacity,
        maxCapacity: parsedMaxCapacity,
        hourlyRate: parsedHourlyRate,
      });

      await Promise.all([
        refetchCoursesForEnrollment(),
        refetchClosedCourses(),
        refetchCourseEnrollmentDetails(),
        refetchCourseInstructorDetails(),
      ]);

      setNewCourseTemplateVersionId("");
      setNewCourseStartDate("");
      setNewCourseMinCapacity("");
      setNewCourseMaxCapacity("");
      setNewCourseHourlyRate(managedSchoolDefaultHourlyRate != null ? String(managedSchoolDefaultHourlyRate) : "");

      toast({
        title: t("syllabus.courseCreated"),
        description: t("syllabus.courseCreated_desc"),
      });
    } catch (createCourseError: unknown) {
      toast({
        title: t("syllabus.courseCreationFailed"),
        description:
          createCourseError instanceof Error
            ? createCourseError.message
            : t("syllabus.unableCreateCourse"),
        variant: "destructive",
      });
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleOpenCloseCourseDialog = (course: EnrollmentCourseItem) => {
    setPendingCloseCourse(course);
    setIsCloseDialogOpen(true);
  };

  const handleOpenReopenCourseDialog = (course: EnrollmentCourseItem) => {
    setPendingReopenCourse(course);
    setIsReopenDialogOpen(true);
  };

  const handleCloseCourse = async () => {
    if (!pendingCloseCourse) {
      return;
    }

    setIsClosingCourse(true);
    try {
      await closeCourse({
        schoolId: selectedSchoolId,
        courseId: pendingCloseCourse.courseId,
      });

      await Promise.all([
        refetchCoursesForEnrollment(),
        refetchClosedCourses(),
        refetchCourseEnrollmentDetails(),
        refetchCourseInstructorDetails(),
      ]);

      toast({
        title: t("syllabus.courseClosed"),
        description: t("syllabus.courseClosed_desc"),
      });

      setIsCloseDialogOpen(false);
      setPendingCloseCourse(null);
    } catch (closeCourseError: unknown) {
      toast({
        title: t("syllabus.closeCourseFailed"),
        description:
          closeCourseError instanceof Error
            ? closeCourseError.message
            : t("syllabus.unableCloseCourse"),
        variant: "destructive",
      });
    } finally {
      setIsClosingCourse(false);
    }
  };

  const handleReopenCourse = async () => {
    if (!pendingReopenCourse) {
      return;
    }

    setIsReopeningCourse(true);
    try {
      await reopenCourse({
        schoolId: selectedSchoolId,
        courseId: pendingReopenCourse.courseId,
      });

      await Promise.all([
        refetchCoursesForEnrollment(),
        refetchClosedCourses(),
        refetchCourseEnrollmentDetails(),
        refetchCourseInstructorDetails(),
      ]);

      toast({
        title: t("syllabus.courseReopened"),
        description: t("syllabus.courseReopened_desc"),
      });

      setIsReopenDialogOpen(false);
      setPendingReopenCourse(null);
    } catch (reopenCourseError: unknown) {
      toast({
        title: t("syllabus.reopenCourseFailed"),
        description:
          reopenCourseError instanceof Error
            ? reopenCourseError.message
            : t("syllabus.unableReopenCourse"),
        variant: "destructive",
      });
    } finally {
      setIsReopeningCourse(false);
    }
  };

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
          {course.startDate
            ? new Date(course.startDate).toLocaleDateString()
            : t("syllabus.noStartDate")}
        </SelectItem>
      ))}
    </LabeledSelectField>
  );

  const renderCourseRow = (
    course: EnrollmentCourseItem,
    actionButton: ReactNode,
    includeTotalPrice: boolean,
    includeSummaryTestId: boolean,
    includeDetailLink = false,
  ) => (
    <ManagerCoursesCourseListItem
      key={course.courseId}
      action={actionButton}
      detailHref={includeDetailLink ? `/school-manager/courses/${course.courseId}` : undefined}
      title={`${course.syllabusName} (v${course.syllabusVersion})`}
      summaryTestId={includeSummaryTestId ? `manager-course-summary-${course.courseId}` : undefined}
      summary={
        <>
          {t("syllabus.enrolledStudents", { count: course.enrolledCount })} •{" "}
          {includeTotalPrice
            ? course.hourlyRate != null
              ? t("syllabus.totalPriceValue", {
                  price: course.hourlyRate * course.enrolledCount,
                })
              : t("syllabus.noTotalPrice")
            : null}
          {includeTotalPrice ? " • " : null}
          {course.startDate
            ? new Date(course.startDate).toLocaleDateString()
            : t("syllabus.startDate")}
        </>
      }
    />
  );

  const renderParticipantRow = (id: string, displayName: string, email: string | null) => (
    <ManagerCoursesParticipantListItem
      key={id}
      displayName={displayName}
      email={email ?? "—"}
    />
  );

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
                <LabeledSelectField
                  id="create-course-template-version"
                  label={t("syllabus.selectFinalVersion")}
                  value={newCourseTemplateVersionId}
                  onValueChange={setNewCourseTemplateVersionId}
                  placeholder={t("syllabus.finalTemplatePlaceholder")}
                >
                  {finalCandidates.map((item: CatalogItem) => (
                    <SelectItem key={item.syllabusVersionId} value={item.syllabusVersionId}>
                      {item.syllabusName} (v{item.version}) • {item.schoolName ?? t("syllabus.system")}
                    </SelectItem>
                  ))}
                </LabeledSelectField>

                <LabeledInputField
                  id="manager-course-start-date"
                  label={t("syllabus.startDateLabel")}
                  type="date"
                  value={newCourseStartDate}
                  onChange={setNewCourseStartDate}
                />

                <ManagerCoursesTwoColumnFields>
                  <LabeledInputField
                    id="manager-course-min-capacity"
                    label={t("syllabus.minCapacityLabel")}
                    type="number"
                    min={1}
                    value={newCourseMinCapacity}
                    onChange={setNewCourseMinCapacity}
                  />
                  <LabeledInputField
                    id="manager-course-max-capacity"
                    label={t("syllabus.maxCapacityLabel")}
                    type="number"
                    min={1}
                    value={newCourseMaxCapacity}
                    onChange={setNewCourseMaxCapacity}
                  />
                </ManagerCoursesTwoColumnFields>

                <LabeledInputField
                  id="manager-course-hourly-rate"
                  label={
                    managedSchoolDefaultHourlyRate != null
                      ? t("syllabus.courseHourlyRateLabel")
                      : t("syllabus.courseHourlyRateRequiredLabel")
                  }
                  type="number"
                  min={1}
                  value={newCourseHourlyRate}
                  onChange={setNewCourseHourlyRate}
                  required={managedSchoolDefaultHourlyRate == null}
                />

                <Button type="submit" disabled={isCreatingCourse || finalCandidates.length === 0}>
                  {isCreatingCourse ? t("syllabus.creatingCourse") : t("syllabus.createCourseButton")}
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
                {coursesForEnrollment.map((course: EnrollmentCourseItem) => (
                  renderCourseRow(
                    course,
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleOpenCloseCourseDialog(course)}
                    >
                      {t("syllabus.closeCourseButton")}
                    </Button>,
                    true,
                    true,
                    true,
                  )
                ))}
              </ManagerCoursesList>
            )}

            <ManagerCoursesDisclosure summary={t("syllabus.closedCoursesPanel", { count: closedCourses.length })}>
                {closedCourses.length === 0 ? (
                  <ManagerCoursesMutedText>{t("syllabus.noClosedCourses")}</ManagerCoursesMutedText>
                ) : (
                  <ManagerCoursesList>
                    {closedCourses.map((course: EnrollmentCourseItem) => (
                      renderCourseRow(
                        course,
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReopenCourseDialog(course)}
                        >
                          {t("syllabus.reopenCourseButton")}
                        </Button>,
                        false,
                        false,
                      )
                    ))}
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
                (val) => setSelectedEnrollmentCourseId(val || null),
              )}

              <LabeledSelectField
                id="enrollment-student-select"
                label={t("syllabus.student")}
                value={selectedStudentIdToEnroll}
                onValueChange={setSelectedStudentIdToEnroll}
                placeholder={t("syllabus.studentPlaceholder")}
              >
                {studentsForEnrollment.map((student: EnrollmentStudentItem) => (
                  <SelectItem key={student.studentId} value={student.studentId}>
                    {student.displayName} • {student.email ?? "—"}
                  </SelectItem>
                ))}
              </LabeledSelectField>

              <Button type="submit" disabled={isEnrollingStudent}>
                {isEnrollingStudent ? t("syllabus.enrollingButton") : t("syllabus.enrollStudent")}
              </Button>
            </ManagerCoursesForm>

            <ManagerCoursesDetailsPanel
              title={t("syllabus.enrolledStudents", {
                count: courseEnrollmentDetails?.enrolledCount ?? 0,
              })}
            >
              {!selectedEnrollmentCourseId ? (
                <ManagerCoursesMutedText>
                  {t("syllabus.selectCourseToViewEnrolled")}
                </ManagerCoursesMutedText>
              ) : !courseEnrollmentDetails ? (
                <ManagerCoursesMutedText>{t("syllabus.noDetailsAvailable")}</ManagerCoursesMutedText>
              ) : courseEnrollmentDetails.enrolledStudents.length === 0 ? (
                <ManagerCoursesMutedText>{t("syllabus.noStudentsEnrolled")}</ManagerCoursesMutedText>
              ) : (
                <ManagerCoursesList>
                  {courseEnrollmentDetails.enrolledStudents.map((student) => (
                    renderParticipantRow(student.studentId, student.displayName, student.email)
                  ))}
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
                (val) => setSelectedAssignmentCourseId(val || null),
              )}

              <LabeledSelectField
                id="assignment-instructor-select"
                label={t("syllabus.instructor")}
                value={selectedInstructorIdToAssign}
                onValueChange={setSelectedInstructorIdToAssign}
                placeholder={t("syllabus.instructorPlaceholder")}
              >
                {instructorsForAssignment.map((inst: AssignmentInstructorItem) => (
                  <SelectItem key={inst.instructorId} value={inst.instructorId}>
                    {inst.displayName} • {inst.email ?? "—"}
                  </SelectItem>
                ))}
              </LabeledSelectField>

              <Button type="submit" disabled={isAssigningInstructor}>
                {isAssigningInstructor ? t("syllabus.assigningButton") : t("syllabus.assignInstructor")}
              </Button>
            </ManagerCoursesForm>

            <ManagerCoursesDetailsPanel
              title={t("syllabus.assignedInstructors", {
                count: courseInstructorDetails?.assignedCount ?? 0,
              })}
            >
              {!selectedAssignmentCourseId ? (
                <ManagerCoursesMutedText>
                  {t("syllabus.selectCourseToViewAssigned")}
                </ManagerCoursesMutedText>
              ) : !courseInstructorDetails ? (
                <ManagerCoursesMutedText>{t("syllabus.noDetailsAvailable")}</ManagerCoursesMutedText>
              ) : courseInstructorDetails.assignedInstructors.length === 0 ? (
                <ManagerCoursesMutedText>{t("syllabus.noInstructorsAssigned")}</ManagerCoursesMutedText>
              ) : (
                <ManagerCoursesList>
                  {courseInstructorDetails.assignedInstructors.map((instructor) => (
                    renderParticipantRow(
                      instructor.instructorId,
                      instructor.displayName,
                      instructor.email,
                    )
                  ))}
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
              onClick={() => {
                setIsCloseDialogOpen(false);
                setPendingCloseCourse(null);
              }}
            >
              {t("syllabus.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCloseCourse}
              disabled={isClosingCourse}
            >
              {isClosingCourse ? t("syllabus.closingCourse") : t("syllabus.confirmCloseCourseButton")}
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
              onClick={() => {
                setIsReopenDialogOpen(false);
                setPendingReopenCourse(null);
              }}
            >
              {t("syllabus.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleReopenCourse}
              disabled={isReopeningCourse}
            >
              {isReopeningCourse ? t("syllabus.reopeningCourse") : t("syllabus.confirmReopenCourseButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DefaultLayout>
  );
};

export default ManagerCoursesPage;
