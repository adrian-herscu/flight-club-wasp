import { type FormEvent, useState } from "react";
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

const {
  assignInstructorToCourse,
  createCourseFromFinalSyllabus,
  enrollStudentInCourse,
  getManagerCourseInstructorDetails,
  getManagerCourseEnrollmentDetails,
  getManagerCoursesForEnrollment,
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
  id: string;
  fullName: string;
  email: string | null;
};

type EnrollmentCourseItem = {
  courseId: string;
  syllabusName: string;
  syllabusVersion: number;
  startDate: Date | null;
};

type AssignmentInstructorItem = {
  id: string;
  fullName: string;
  email: string | null;
};

type CourseEnrollmentDetails = {
  remainingCapacity: number | null;
  enrolledStudentsCount: number;
  minCapacity: number | null;
  maxCapacity: number | null;
};

type CourseInstructorDetails = {
  instructorsAssignedCount: number;
};

type ManagerSyllabusCatalog = {
  courseOpeningCandidates: CatalogItem[];
  editableDrafts: CatalogItem[];
};

const ManagerCoursesPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  
  const { data: catalogData, isLoading: isCatalogLoading } = useQuery(getManagerSyllabusCatalog);
  const catalog = catalogData as ManagerSyllabusCatalog | undefined;
  const finalCandidates = catalog?.courseOpeningCandidates ?? [];

  const {
    data: coursesForEnrollmentData,
    refetch: refetchCoursesForEnrollment,
  } = useQuery(getManagerCoursesForEnrollment);
  const coursesForEnrollment = (coursesForEnrollmentData as EnrollmentCourseItem[] | undefined) ?? [];

  const {
    data: studentsForEnrollmentData,
    refetch: refetchStudentsForEnrollment,
  } = useQuery(getManagerStudentsForEnrollment);
  const studentsForEnrollment = (studentsForEnrollmentData as EnrollmentStudentItem[] | undefined) ?? [];

  const {
    data: instructorsForAssignmentData,
    refetch: refetchInstructorsForAssignment,
  } = useQuery(getManagerInstructorsForAssignment);
  const instructorsForAssignment = (instructorsForAssignmentData as AssignmentInstructorItem[] | undefined) ?? [];

  const [selectedEnrollmentCourseId, setSelectedEnrollmentCourseId] = useState<string | null>(null);
  const [selectedStudentIdToEnroll, setSelectedStudentIdToEnroll] = useState<string>("");
  const [selectedAssignmentCourseId, setSelectedAssignmentCourseId] = useState<string | null>(null);
  const [selectedInstructorIdToAssign, setSelectedInstructorIdToAssign] = useState<string>("");

  const {
    data: courseEnrollmentDetailsData,
    refetch: refetchCourseEnrollmentDetails,
  } = useQuery(getManagerCourseEnrollmentDetails, {
    courseId: selectedEnrollmentCourseId,
  });
  const courseEnrollmentDetails = courseEnrollmentDetailsData as CourseEnrollmentDetails;

  const {
    data: courseInstructorDetailsData,
    refetch: refetchCourseInstructorDetails,
  } = useQuery(getManagerCourseInstructorDetails, {
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
  const [newCourseDefaultPrice, setNewCourseDefaultPrice] = useState<string>("");

  const handleEnrollStudent = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedEnrollmentCourseId) {
      toast({
        title: t("syllabus.missingCourse"),
        description: t("syllabus.selectCourseFirst"),
        variant: "destructive",
      });
      return;
    }

    if (!selectedStudentIdToEnroll) {
      toast({
        title: t("syllabus.missingStudent"),
        description: t("syllabus.selectStudentFirst"),
        variant: "destructive",
      });
      return;
    }

    setIsEnrollingStudent(true);
    try {
      await enrollStudentInCourse({
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
        description: t("syllabus.successStudentEnrolled"),
      });
    } catch (enrollError: unknown) {
      toast({
        title: t("syllabus.enrollmentFailed"),
        description:
          enrollError instanceof Error ? enrollError.message : t("syllabus.enrollmentFailed_desc"),
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
        title: t("syllabus.missingCourse"),
        description: t("syllabus.selectCourseFirst"),
        variant: "destructive",
      });
      return;
    }

    if (!selectedInstructorIdToAssign) {
      toast({
        title: t("syllabus.missingInstructor"),
        description: t("syllabus.selectInstructorFirst"),
        variant: "destructive",
      });
      return;
    }

    setIsAssigningInstructor(true);
    try {
      await assignInstructorToCourse({
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
        description: t("syllabus.successInstructorAssigned"),
      });
    } catch (assignError: unknown) {
      toast({
        title: t("syllabus.assignmentFailed"),
        description:
          assignError instanceof Error ? assignError.message : t("syllabus.assignmentFailed_desc"),
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
    const parsedDefaultPrice =
      newCourseDefaultPrice.trim() === "" ? null : Number(newCourseDefaultPrice);

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
      parsedDefaultPrice != null &&
      (!Number.isInteger(parsedDefaultPrice) || parsedDefaultPrice <= 0)
    ) {
      toast({
        title: t("syllabus.invalidLessonPrice"),
        description: t("syllabus.lessonPricePositiveInteger"),
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCourse(true);
    try {
      await createCourseFromFinalSyllabus({
        syllabusVersionId: newCourseTemplateVersionId,
        startDate: newCourseStartDate ? new Date(newCourseStartDate).toISOString() : null,
        minCapacity: parsedMinCapacity,
        maxCapacity: parsedMaxCapacity,
        defaultLessonPrice: parsedDefaultPrice,
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
      setNewCourseDefaultPrice("");

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
            : t("syllabus.courseCreationFailed_desc"),
        variant: "destructive",
      });
    } finally {
      setIsCreatingCourse(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Courses" showTitle={false} />

      <div className="grid gap-6 2xl:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.openCourseFromFinalSyllabus")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isCatalogLoading ? (
              <p className="text-sm text-muted-foreground">Loading syllabuses...</p>
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
                    type="datetime-local"
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
                    {t("syllabus.defaultLessonPriceLabel")}
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={newCourseDefaultPrice}
                    onChange={(event) => setNewCourseDefaultPrice(event.target.value)}
                  />
                </div>

                <Button type="submit" disabled={isCreatingCourse || finalCandidates.length === 0}>
                  {isCreatingCourse ? t("syllabus.creatingCourse") : t("syllabus.createCourseButton")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-2">
        {/* Enrollment Component */}
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
                    <SelectValue placeholder={t("syllabus.selectManagerOwnedCourse")} />
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
                    <SelectValue placeholder={t("syllabus.selectStudentFromSchool")} />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsForEnrollment.map((student: EnrollmentStudentItem) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.fullName} • {student.email ?? t("syllabus.noEmail")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isEnrollingStudent}>
                {isEnrollingStudent ? t("syllabus.enrolling") : t("syllabus.enrollStudent")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assignment Component */}
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
                    <SelectValue placeholder={t("syllabus.selectManagerOwnedCourse")} />
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
                    <SelectValue placeholder={t("syllabus.selectInstructorFromSchool")} />
                  </SelectTrigger>
                  <SelectContent>
                    {instructorsForAssignment.map((inst: AssignmentInstructorItem) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.fullName} • {inst.email ?? t("syllabus.noEmail")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isAssigningInstructor}>
                {isAssigningInstructor ? t("syllabus.assigning") : t("syllabus.assignInstructor")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DefaultLayout>
  );
};

export default ManagerCoursesPage;
