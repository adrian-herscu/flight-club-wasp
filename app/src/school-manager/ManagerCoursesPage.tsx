import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { toast } from "../client/hooks/use-toast";
import { useManagedSchoolSelection } from "./useManagedSchoolSelection";

const {
  assignInstructorToCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerCourseInstructorDetails,
  getManagerCourseEnrollmentDetails,
  getManagerCoursesForEnrollment,
  getMyManagedSchool,
  getManagerSyllabusCatalog,
  getManagerInstructorsForAssignment,
  getManagerStudentsForEnrollment,
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

  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isEnrollingStudent, setIsEnrollingStudent] = useState(false);
  const [isAssigningInstructor, setIsAssigningInstructor] = useState(false);
  const [newCourseTemplateVersionId, setNewCourseTemplateVersionId] = useState<string>("");
  const [newCourseStartDate, setNewCourseStartDate] = useState<string>("");
  const [newCourseMinCapacity, setNewCourseMinCapacity] = useState<string>("");
  const [newCourseMaxCapacity, setNewCourseMaxCapacity] = useState<string>("");
  const [newCourseHourlyRate, setNewCourseHourlyRate] = useState<string>("");

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

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.courses")} showTitle={false} />

      <div className="mb-6 grid gap-6 2xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.openCourseFromFinalSyllabus")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isCatalogLoading ? (
              <p className="text-sm text-muted-foreground">{t("syllabus.loadingCatalog")}</p>
            ) : (
              <form onSubmit={handleCreateCourse} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">{t("syllabus.selectFinalVersion")}</label>
                  <Select
                    value={newCourseTemplateVersionId}
                    onValueChange={setNewCourseTemplateVersionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("syllabus.finalTemplatePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {finalCandidates.map((item: CatalogItem) => (
                        <SelectItem key={item.syllabusVersionId} value={item.syllabusVersionId}>
                          {item.syllabusName} (v{item.version}) • {item.schoolName ?? t("syllabus.system")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">{t("syllabus.startDateLabel")}</label>
                  <Input
                    type="date"
                    value={newCourseStartDate}
                    onChange={(event) => setNewCourseStartDate(event.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">{t("syllabus.minCapacityLabel")}</label>
                    <Input
                      type="number"
                      min={1}
                      value={newCourseMinCapacity}
                      onChange={(event) => setNewCourseMinCapacity(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">{t("syllabus.maxCapacityLabel")}</label>
                    <Input
                      type="number"
                      min={1}
                      value={newCourseMaxCapacity}
                      onChange={(event) => setNewCourseMaxCapacity(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">
                    {t("syllabus.courseHourlyRateLabel")}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={newCourseHourlyRate}
                    onChange={(event) => setNewCourseHourlyRate(event.target.value)}
                  />
                </div>

                <Button type="submit" disabled={isCreatingCourse || finalCandidates.length === 0}>
                  {isCreatingCourse ? t("syllabus.creatingCourse") : t("syllabus.createCourseButton")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.courses")}</CardTitle>
          </CardHeader>
          <CardContent>
            {coursesForEnrollment.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("syllabus.noDetailsAvailable")}</p>
            ) : (
              <ul className="space-y-2">
                {coursesForEnrollment.map((course: EnrollmentCourseItem) => (
                  <li key={course.courseId} className="rounded-md border p-3">
                    <p className="text-sm font-medium">
                      {course.syllabusName} (v{course.syllabusVersion})
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("syllabus.enrolledStudents", { count: course.enrolledCount })} • {" "}
                      {course.hourlyRate != null
                        ? t("syllabus.courseHourlyRateValue", { rate: course.hourlyRate })
                        : t("syllabus.noHourlyRate")} • {" "}
                      {course.startDate
                        ? new Date(course.startDate).toLocaleDateString()
                        : t("syllabus.startDate")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.workflowSingleStudentEnrollment")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("syllabus.course")}</label>
                <Select
                  value={selectedEnrollmentCourseId ?? ""}
                  onValueChange={(val) => setSelectedEnrollmentCourseId(val || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("syllabus.coursePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesForEnrollment.map((course: EnrollmentCourseItem) => (
                      <SelectItem key={course.courseId} value={course.courseId}>
                        {course.syllabusName} (v{course.syllabusVersion}) •{" "}
                        {course.startDate
                          ? new Date(course.startDate).toLocaleDateString()
                          : t("syllabus.noStartDate")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("syllabus.student")}</label>
                <Select
                  value={selectedStudentIdToEnroll}
                  onValueChange={setSelectedStudentIdToEnroll}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("syllabus.studentPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsForEnrollment.map((student: EnrollmentStudentItem) => (
                      <SelectItem key={student.studentId} value={student.studentId}>
                        {student.displayName} • {student.email ?? "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isEnrollingStudent}>
                {isEnrollingStudent ? t("syllabus.enrollingButton") : t("syllabus.enrollStudent")}
              </Button>
            </form>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">
                {t("syllabus.enrolledStudents", {
                  count: courseEnrollmentDetails?.enrolledCount ?? 0,
                })}
              </p>
              {!selectedEnrollmentCourseId ? (
                <p className="text-muted-foreground text-sm">
                  {t("syllabus.selectCourseToViewEnrolled")}
                </p>
              ) : !courseEnrollmentDetails ? (
                <p className="text-muted-foreground text-sm">{t("syllabus.noDetailsAvailable")}</p>
              ) : courseEnrollmentDetails.enrolledStudents.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("syllabus.noStudentsEnrolled")}</p>
              ) : (
                <ul className="space-y-2">
                  {courseEnrollmentDetails.enrolledStudents.map((student) => (
                    <li key={student.studentId} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{student.displayName}</p>
                      <p className="text-muted-foreground text-xs">{student.email ?? "—"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.workflowInstructorAssignment")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAssignInstructor} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("syllabus.course")}</label>
                <Select
                  value={selectedAssignmentCourseId ?? ""}
                  onValueChange={(val) => setSelectedAssignmentCourseId(val || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("syllabus.coursePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesForEnrollment.map((course: EnrollmentCourseItem) => (
                      <SelectItem key={course.courseId} value={course.courseId}>
                        {course.syllabusName} (v{course.syllabusVersion}) •{" "}
                        {course.startDate
                          ? new Date(course.startDate).toLocaleDateString()
                          : t("syllabus.noStartDate")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("syllabus.instructor")}</label>
                <Select
                  value={selectedInstructorIdToAssign}
                  onValueChange={setSelectedInstructorIdToAssign}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("syllabus.instructorPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {instructorsForAssignment.map((inst: AssignmentInstructorItem) => (
                      <SelectItem key={inst.instructorId} value={inst.instructorId}>
                        {inst.displayName} • {inst.email ?? "—"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isAssigningInstructor}>
                {isAssigningInstructor ? t("syllabus.assigningButton") : t("syllabus.assignInstructor")}
              </Button>
            </form>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">
                {t("syllabus.assignedInstructors", {
                  count: courseInstructorDetails?.assignedCount ?? 0,
                })}
              </p>
              {!selectedAssignmentCourseId ? (
                <p className="text-muted-foreground text-sm">
                  {t("syllabus.selectCourseToViewAssigned")}
                </p>
              ) : !courseInstructorDetails ? (
                <p className="text-muted-foreground text-sm">{t("syllabus.noDetailsAvailable")}</p>
              ) : courseInstructorDetails.assignedInstructors.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("syllabus.noInstructorsAssigned")}</p>
              ) : (
                <ul className="space-y-2">
                  {courseInstructorDetails.assignedInstructors.map((instructor) => (
                    <li key={instructor.instructorId} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">{instructor.displayName}</p>
                      <p className="text-muted-foreground text-xs">{instructor.email ?? "—"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
};

export default ManagerCoursesPage;
