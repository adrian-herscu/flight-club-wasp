import { SyllabusVersionStatus } from "@prisma/client";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
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
import { Textarea } from "../client/components/ui/textarea";
import { toast } from "../client/hooks/use-toast";

const {
  assignInstructorToCourse,
  createCourseFromFinalSyllabus,
  createDraftSyllabusFromScratch,
  createDraftSyllabusFromTemplate,
  enrollStudentInCourse,
  getManagerCourseInstructorDetails,
  getManagerCourseEnrollmentDetails,
  getManagerCoursesForEnrollment,
  getManagerInstructorsForAssignment,
  getManagerSyllabusCatalog,
  getManagerStudentsForEnrollment,
  getSyllabusVersionDetails,
  publishDraftSyllabusVersion,
  saveDraftSyllabusRevision,
  useQuery,
} = operations as any;

type LessonDraft = {
  position: number;
  name: string;
  description: string;
  durationMinutes: number;
};

type CatalogItem = {
  syllabusId: string;
  syllabusName: string;
  schoolId: string | null;
  schoolName: string | null;
  syllabusVersionId: string;
  version: number;
  status: SyllabusVersionStatus;
  lessonCount: number;
};

type SyllabusVersionDetails = {
  syllabusVersionId: string;
  syllabusId: string;
  syllabusName: string;
  status: SyllabusVersionStatus;
  version: number;
  schoolId: string | null;
  schoolName: string | null;
  lessons: Array<{
    id: string;
    position: number;
    name: string;
    description: string;
    durationMinutes: number;
  }>;
} | null;

type ManagerSyllabusCatalog = {
  courseOpeningCandidates: CatalogItem[];
  editableDrafts: CatalogItem[];
};

type EnrollmentCourseItem = {
  courseId: string;
  syllabusName: string;
  syllabusVersion: number;
  startDate: string | null;
  enrolledCount: number;
};

type EnrollmentStudentItem = {
  studentId: string;
  userId: string;
  displayName: string;
  email: string | null;
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

type SyllabusesSection = "catalog" | "create" | "details" | "editor";
const validSections: SyllabusesSection[] = ["catalog", "create", "details", "editor"];

const initialLesson = (position = 1): LessonDraft => ({
  position,
  name: "",
  description: "",
  durationMinutes: 45,
});

const ManagerSyllabusesPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data: catalogData,
    isLoading,
    error,
    refetch: refetchCatalog,
  } = useQuery(getManagerSyllabusCatalog);

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const {
    data: versionDetailsData,
    isLoading: isVersionLoading,
    refetch: refetchVersion,
  } = useQuery(getSyllabusVersionDetails, { syllabusVersionId: selectedVersionId });

  const {
    data: coursesForEnrollmentData,
    refetch: refetchCoursesForEnrollment,
  } = useQuery(getManagerCoursesForEnrollment);

  const {
    data: studentsForEnrollmentData,
    refetch: refetchStudentsForEnrollment,
  } = useQuery(getManagerStudentsForEnrollment);

  const {
    data: instructorsForAssignmentData,
    refetch: refetchInstructorsForAssignment,
  } = useQuery(getManagerInstructorsForAssignment);

  const catalog = catalogData as ManagerSyllabusCatalog | undefined;
  const versionDetails = versionDetailsData as SyllabusVersionDetails;
  const coursesForEnrollment =
    (coursesForEnrollmentData as EnrollmentCourseItem[] | undefined) ?? [];
  const studentsForEnrollment =
    (studentsForEnrollmentData as EnrollmentStudentItem[] | undefined) ?? [];
  const instructorsForAssignment =
    (instructorsForAssignmentData as AssignmentInstructorItem[] | undefined) ?? [];

  const finalCandidates = catalog?.courseOpeningCandidates ?? [];
  const editableDrafts = catalog?.editableDrafts ?? [];

  const [selectedEnrollmentCourseId, setSelectedEnrollmentCourseId] = useState<
    string | null
  >(null);
  const [selectedStudentIdToEnroll, setSelectedStudentIdToEnroll] = useState<string>("");
  const [selectedAssignmentCourseId, setSelectedAssignmentCourseId] = useState<string | null>(null);
  const [selectedInstructorIdToAssign, setSelectedInstructorIdToAssign] =
    useState<string>("");

  const {
    data: courseEnrollmentDetailsData,
    refetch: refetchCourseEnrollmentDetails,
  } = useQuery(getManagerCourseEnrollmentDetails, {
    courseId: selectedEnrollmentCourseId,
  });
  const courseEnrollmentDetails =
    courseEnrollmentDetailsData as CourseEnrollmentDetails;

  const {
    data: courseInstructorDetailsData,
    refetch: refetchCourseInstructorDetails,
  } = useQuery(getManagerCourseInstructorDetails, {
    courseId: selectedAssignmentCourseId,
  });
  const courseInstructorDetails =
    courseInstructorDetailsData as CourseInstructorDetails;

  const [templateVersionId, setTemplateVersionId] = useState<string>("");
  const [newSyllabusName, setNewSyllabusName] = useState("");
  const [scratchName, setScratchName] = useState("");
  const sectionContentRef = useRef<HTMLDivElement | null>(null);
  const hasChangedSectionRef = useRef(false);

  const activeSection = useMemo<SyllabusesSection>(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (section && validSections.includes(section as SyllabusesSection)) {
      return section as SyllabusesSection;
    }
    return "catalog";
  }, [location.search]);

  const [lessonDrafts, setLessonDrafts] = useState<LessonDraft[]>([initialLesson()]);
  const [isSavingRevision, setIsSavingRevision] = useState(false);
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);
  const [isCreatingFromScratch, setIsCreatingFromScratch] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEnrollingStudent, setIsEnrollingStudent] = useState(false);
  const [isAssigningInstructor, setIsAssigningInstructor] = useState(false);
  const [newCourseTemplateVersionId, setNewCourseTemplateVersionId] = useState<string>("");
  const [newCourseStartDate, setNewCourseStartDate] = useState<string>("");
  const [newCourseMinCapacity, setNewCourseMinCapacity] = useState<string>("");
  const [newCourseMaxCapacity, setNewCourseMaxCapacity] = useState<string>("");
  const [newCourseDefaultPrice, setNewCourseDefaultPrice] = useState<string>("");

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

  const goToSection = (section: SyllabusesSection) => {
    hasChangedSectionRef.current = true;
    const params = new URLSearchParams(location.search);
    params.set("section", section);
    navigate(
      {
        pathname: "/admin/syllabuses",
        search: `?${params.toString()}`,
      },
      { replace: false },
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (section && validSections.includes(section as SyllabusesSection)) {
      return;
    }

    params.set("section", "catalog");
    navigate(
      {
        pathname: "/admin/syllabuses",
        search: `?${params.toString()}`,
      },
      { replace: true },
    );
  }, [location.search, navigate]);

  useEffect(() => {
    if (!hasChangedSectionRef.current) return;

    sectionContentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeSection]);

  const selectedDraftId = useMemo(() => {
    if (!versionDetails) return null;
    if (versionDetails.status !== SyllabusVersionStatus.DRAFT) return null;

    return versionDetails.syllabusVersionId;
  }, [versionDetails]);

  const handleCreateFromTemplate = async (event: FormEvent) => {
    event.preventDefault();

    if (!templateVersionId || !newSyllabusName.trim()) {
      toast({
        title: t("syllabus.missingInput"),
        description: t("syllabus.chooseTemplate_desc"),
        variant: "destructive",
      });
      return;
    }

    setIsCreatingFromTemplate(true);
    try {
      const created = await createDraftSyllabusFromTemplate({
        templateVersionId,
        name: newSyllabusName.trim(),
      });
      await refetchCatalog();
      setSelectedVersionId(created.syllabusVersionId);
      await refetchVersion();
      goToSection("details");
      setTemplateVersionId("");
      setNewSyllabusName("");
      toast({
        title: t("syllabus.draftCreated"),
        description: t("syllabus.draftCreated_desc"),
      });
    } catch (creationError: unknown) {
      toast({
        title: t("syllabus.createFromTemplateFailed"),
        description:
          creationError instanceof Error
            ? creationError.message
            : t("syllabus.missingName"),
        variant: "destructive",
      });
    } finally {
      setIsCreatingFromTemplate(false);
    }
  };

  const handleCreateFromScratch = async (event: FormEvent) => {
    event.preventDefault();

    if (!scratchName.trim()) {
      toast({
        title: t("syllabus.missingName"),
        description: t("syllabus.provideName"),
        variant: "destructive",
      });
      return;
    }

    if (lessonDrafts.some((lesson) => !lesson.name.trim())) {
      toast({
        title: t("syllabus.missingLessonNames"),
        description: t("syllabus.eachLessonMustHaveName"),
        variant: "destructive",
      });
      return;
    }

    setIsCreatingFromScratch(true);
    try {
      const created = await createDraftSyllabusFromScratch({
        name: scratchName.trim(),
        lessons: lessonDrafts.map((lesson, index) => ({
          ...lesson,
          position: index + 1,
          name: lesson.name.trim(),
          description: lesson.description.trim(),
        })),
      });
      await refetchCatalog();
      setSelectedVersionId(created.syllabusVersionId);
      await refetchVersion();
      goToSection("details");
      setScratchName("");
      setLessonDrafts([initialLesson()]);
      toast({
        title: t("syllabus.draftCreated"),
        description: t("syllabus.draftCreated_scratch_desc"),
      });
    } catch (creationError: unknown) {
      toast({
        title: t("syllabus.createFromScratchFailed"),
        description:
          creationError instanceof Error
            ? creationError.message
            : t("syllabus.unableCreateScratch"),
        variant: "destructive",
      });
    } finally {
      setIsCreatingFromScratch(false);
    }
  };

  const loadLessonsIntoEditor = () => {
    if (!versionDetails) return;

    setLessonDrafts(
      versionDetails.lessons.map((lesson) => ({
        position: lesson.position,
        name: lesson.name,
        description: lesson.description,
        durationMinutes: lesson.durationMinutes,
      })),
    );
    goToSection("editor");
  };

  const handleSaveRevision = async () => {
    if (!selectedDraftId) {
      toast({
        title: t("syllabus.noEditableDraft"),
        description: t("syllabus.selectDraftBeforeSaving"),
        variant: "destructive",
      });
      return;
    }

    if (lessonDrafts.some((lesson) => !lesson.name.trim())) {
      toast({
        title: t("syllabus.missingLessonNames"),
        description: t("syllabus.eachLessonMustHaveName"),
        variant: "destructive",
      });
      return;
    }

    setIsSavingRevision(true);
    try {
      const result = await saveDraftSyllabusRevision({
        sourceVersionId: selectedDraftId,
        lessons: lessonDrafts.map((lesson, index) => ({
          ...lesson,
          position: index + 1,
          name: lesson.name.trim(),
          description: lesson.description.trim(),
        })),
      });

      await refetchCatalog();
      setSelectedVersionId(result.syllabusVersionId);
      await refetchVersion();
      goToSection("details");

      toast({
        title: t("syllabus.draftRevisionSaved"),
        description: `${t("syllabus.draftRevisionSaved_desc")} ${result.version}.`,
      });
    } catch (saveError: unknown) {
      toast({
        title: t("syllabus.saveFailed"),
        description:
          saveError instanceof Error
            ? saveError.message
            : t("syllabus.unableSaveRevision"),
        variant: "destructive",
      });
    } finally {
      setIsSavingRevision(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedDraftId) {
      toast({
        title: t("syllabus.noDraftSelected"),
        description: t("syllabus.chooseDraftBeforePublishing"),
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const result = await publishDraftSyllabusVersion({ sourceVersionId: selectedDraftId });
      await refetchCatalog();
      setSelectedVersionId(result.syllabusVersionId);
      await refetchVersion();
      goToSection("details");
      toast({
        title: t("syllabus.published"),
        description: `${t("syllabus.published_desc")} (${result.version}) ${t("syllabus.isNowAvailableForCourseOpening")}.`,
      });
    } catch (publishError: unknown) {
      toast({
        title: t("syllabus.publishFailed"),
        description:
          publishError instanceof Error
            ? publishError.message
            : t("syllabus.unablePublish"),
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedEnrollmentCourseId) {
      toast({
        title: "No course selected",
        description: "Select a course before enrolling a student.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedStudentIdToEnroll) {
      toast({
        title: "No student selected",
        description: "Select a student to enroll.",
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
        refetchCoursesForEnrollment(),
        refetchStudentsForEnrollment(),
        refetchCourseEnrollmentDetails(),
      ]);

      toast({
        title: "Student enrolled",
        description: "Enrollment was saved successfully.",
      });
    } catch (enrollError: unknown) {
      toast({
        title: "Enrollment failed",
        description:
          enrollError instanceof Error
            ? enrollError.message
            : "Unable to enroll student in selected course.",
        variant: "destructive",
      });
    } finally {
      setIsEnrollingStudent(false);
    }
  };

  const handleAssignInstructor = async () => {
    if (!selectedAssignmentCourseId) {
      toast({
        title: "No course selected",
        description: "Select a course before assigning an instructor.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedInstructorIdToAssign) {
      toast({
        title: "No instructor selected",
        description: "Select an instructor to assign.",
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
        refetchCoursesForEnrollment(),
        refetchInstructorsForAssignment(),
        refetchCourseInstructorDetails(),
      ]);

      toast({
        title: "Instructor assigned",
        description: "Instructor assignment was saved successfully.",
      });
    } catch (assignError: unknown) {
      toast({
        title: "Assignment failed",
        description:
          assignError instanceof Error
            ? assignError.message
            : "Unable to assign instructor to selected course.",
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
        title: "Missing template",
        description: "Select a FINAL syllabus version for the new course.",
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
        title: "Invalid min capacity",
        description: "Minimum capacity must be a positive integer.",
        variant: "destructive",
      });
      return;
    }

    if (parsedMaxCapacity != null && (!Number.isInteger(parsedMaxCapacity) || parsedMaxCapacity <= 0)) {
      toast({
        title: "Invalid max capacity",
        description: "Maximum capacity must be a positive integer.",
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
        title: "Invalid capacity range",
        description: "Minimum capacity cannot be greater than maximum capacity.",
        variant: "destructive",
      });
      return;
    }

    if (
      parsedDefaultPrice != null &&
      (!Number.isInteger(parsedDefaultPrice) || parsedDefaultPrice <= 0)
    ) {
      toast({
        title: "Invalid lesson price",
        description: "Default lesson price must be a positive integer in minor units.",
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
        title: "Course created",
        description: "A new course was opened from FINAL syllabus version.",
      });
    } catch (createCourseError: unknown) {
      toast({
        title: "Course creation failed",
        description:
          createCourseError instanceof Error
            ? createCourseError.message
            : "Unable to create course from selected FINAL syllabus.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const updateLessonDraft = (index: number, patch: Partial<LessonDraft>) => {
    setLessonDrafts((current) =>
      current.map((lesson, lessonIndex) =>
        lessonIndex === index ? { ...lesson, ...patch } : lesson,
      ),
    );
  };

  const addLessonDraft = () => {
    setLessonDrafts((current) => [...current, initialLesson(current.length + 1)]);
  };

  const removeLessonDraft = (index: number) => {
    setLessonDrafts((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, lessonIndex) => lessonIndex !== index);
    });
  };

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Syllabuses" showTitle={false} />

      {isLoading && <p className="text-muted-foreground text-sm">Loading syllabus catalog...</p>}
      {error && <p className="text-sm text-red-500">{error.message}</p>}

      <div className="sticky top-0 z-20 mb-2 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div
          className="relative flex overflow-x-auto"
          style={{
            maskImage:
              document.documentElement.dir === "rtl"
                ? "linear-gradient(to left, black 0, black calc(100% - 20px), transparent 100%)"
                : "linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)",
            WebkitMaskImage:
              document.documentElement.dir === "rtl"
                ? "linear-gradient(to left, black 0, black calc(100% - 20px), transparent 100%)"
                : "linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)",
          }}
        >
          <Button
            type="button"
            className="shrink-0 rounded-none border-s"
            variant={activeSection === "catalog" ? "secondary" : "outline"}
            onClick={() => goToSection("catalog")}
          >
            Catalog
          </Button>
          <Button
            type="button"
            className="shrink-0 rounded-none border-s"
            variant={activeSection === "create" ? "secondary" : "outline"}
            onClick={() => goToSection("create")}
          >
            Create
          </Button>
          <Button
            type="button"
            className="shrink-0 rounded-none border-s"
            variant={activeSection === "details" ? "secondary" : "outline"}
            onClick={() => goToSection("details")}
          >
            Details
          </Button>
          <Button
            type="button"
            className="shrink-0 rounded-none"
            variant={activeSection === "editor" ? "secondary" : "outline"}
            onClick={() => goToSection("editor")}
          >
            Editor
          </Button>
        </div>
      </div>

      <div ref={sectionContentRef} className="scroll-mt-20">

      {activeSection === "catalog" && (
        <div className="space-y-6">
          <div className="rounded-md border p-4 text-sm">
            <p className="font-semibold">Visibility and usage policy</p>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 ps-5">
              <li>Course opening can use only FINAL syllabus versions.</li>
              <li>Drafts are private to the manager&apos;s school.</li>
              <li>Only school-local drafts can be edited and published.</li>
            </ul>
          </div>

          <div className="grid gap-6 2xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Available for Course Opening (FINAL)</CardTitle>
            </CardHeader>
            <CardContent>
              {finalCandidates.length === 0 ? (
                <p className="text-muted-foreground text-sm">No FINAL syllabuses are available.</p>
              ) : (
                <ul className="space-y-2">
                  {finalCandidates.map((item: CatalogItem) => (
                    <li key={item.syllabusVersionId}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVersionId(item.syllabusVersionId);
                          goToSection("details");
                        }}
                        className="hover:bg-accent w-full rounded-md border p-3 text-start"
                      >
                        <p className="text-sm font-medium">{item.syllabusName}</p>
                        <p className="text-muted-foreground text-xs">
                          v{item.version} • {item.lessonCount} lessons • {item.schoolName ?? "System"}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Editable School Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              {editableDrafts.length === 0 ? (
                <p className="text-muted-foreground text-sm">You currently have no editable drafts.</p>
              ) : (
                <ul className="space-y-2">
                  {editableDrafts.map((item: CatalogItem) => (
                    <li key={item.syllabusVersionId}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVersionId(item.syllabusVersionId);
                          goToSection("details");
                        }}
                        className="hover:bg-accent w-full rounded-md border p-3 text-start"
                      >
                        <p className="text-sm font-medium">{item.syllabusName}</p>
                        <p className="text-muted-foreground text-xs">
                          draft v{item.version} • {item.lessonCount} lessons
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
            </div>

          <Card>
            <CardHeader>
              <CardTitle>Workflow 2 MVP: Single Student Enrollment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Course</label>
                    <Select
                      value={selectedEnrollmentCourseId ?? ""}
                      onValueChange={(value) => setSelectedEnrollmentCourseId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager-owned course" />
                      </SelectTrigger>
                      <SelectContent>
                        {coursesForEnrollment.map((course) => (
                          <SelectItem key={course.courseId} value={course.courseId}>
                            {course.syllabusName} (v{course.syllabusVersion}) • enrolled {course.enrolledCount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Student</label>
                    <Select
                      value={selectedStudentIdToEnroll}
                      onValueChange={setSelectedStudentIdToEnroll}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {studentsForEnrollment.map((student) => (
                          <SelectItem key={student.studentId} value={student.studentId}>
                            {student.displayName}
                            {student.email ? ` • ${student.email}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    onClick={handleEnrollStudent}
                    disabled={
                      isEnrollingStudent || !selectedEnrollmentCourseId || !selectedStudentIdToEnroll
                    }
                  >
                    {isEnrollingStudent ? "Enrolling..." : "Enroll student"}
                  </Button>
                </div>

                <div className="rounded-md border p-3">
                  {!selectedEnrollmentCourseId && (
                    <p className="text-muted-foreground text-sm">Select a course to view enrolled students.</p>
                  )}

                  {selectedEnrollmentCourseId && !courseEnrollmentDetails && (
                    <p className="text-muted-foreground text-sm">No details available for selected course.</p>
                  )}

                  {courseEnrollmentDetails && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Enrolled students ({courseEnrollmentDetails.enrolledCount})
                      </p>

                      {courseEnrollmentDetails.enrolledStudents.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No students are currently enrolled.</p>
                      ) : (
                        <ul className="space-y-1">
                          {courseEnrollmentDetails.enrolledStudents.map((student) => (
                            <li key={`${courseEnrollmentDetails.courseId}-${student.studentId}`}>
                              <p className="text-sm">
                                {student.displayName}
                                {student.email ? ` • ${student.email}` : ""}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow 2 MVP: Instructor Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Course</label>
                    <Select
                      value={selectedAssignmentCourseId ?? ""}
                      onValueChange={(value) => setSelectedAssignmentCourseId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager-owned course" />
                      </SelectTrigger>
                      <SelectContent>
                        {coursesForEnrollment.map((course) => (
                          <SelectItem key={`assign-course-${course.courseId}`} value={course.courseId}>
                            {course.syllabusName} (v{course.syllabusVersion}) • enrolled {course.enrolledCount}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Instructor</label>
                    <Select
                      value={selectedInstructorIdToAssign}
                      onValueChange={setSelectedInstructorIdToAssign}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructorsForAssignment.map((instructor) => (
                          <SelectItem key={instructor.instructorId} value={instructor.instructorId}>
                            {instructor.displayName}
                            {instructor.email ? ` • ${instructor.email}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAssignInstructor}
                    disabled={
                      isAssigningInstructor || !selectedAssignmentCourseId || !selectedInstructorIdToAssign
                    }
                  >
                    {isAssigningInstructor ? "Assigning..." : "Assign instructor"}
                  </Button>
                </div>

                <div className="rounded-md border p-3">
                  {!selectedAssignmentCourseId && (
                    <p className="text-muted-foreground text-sm">Select a course to view assigned instructors.</p>
                  )}

                  {selectedAssignmentCourseId && !courseInstructorDetails && (
                    <p className="text-muted-foreground text-sm">No details available for selected course.</p>
                  )}

                  {courseInstructorDetails && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Assigned instructors ({courseInstructorDetails.assignedCount})
                      </p>

                      {courseInstructorDetails.assignedInstructors.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No instructors are currently assigned.</p>
                      ) : (
                        <ul className="space-y-1">
                          {courseInstructorDetails.assignedInstructors.map((instructor) => (
                            <li key={`${courseInstructorDetails.courseId}-${instructor.instructorId}`}>
                              <p className="text-sm">
                                {instructor.displayName}
                                {instructor.email ? ` • ${instructor.email}` : ""}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === "create" && (
        <div className="grid gap-6 2xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Create School Draft from FINAL Template</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFromTemplate} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">FINAL template</label>
                  <Select value={templateVersionId} onValueChange={setTemplateVersionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select FINAL syllabus version" />
                    </SelectTrigger>
                    <SelectContent>
                      {finalCandidates.map((item: CatalogItem) => (
                        <SelectItem key={item.syllabusVersionId} value={item.syllabusVersionId}>
                          {item.syllabusName} (v{item.version}) • {item.schoolName ?? "System"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">New syllabus name</label>
                  <Input
                    value={newSyllabusName}
                    onChange={(event) => setNewSyllabusName(event.target.value)}
                    placeholder="Cloudbase Tandem Advanced"
                  />
                </div>

                <Button type="submit" disabled={isCreatingFromTemplate}>
                  {isCreatingFromTemplate ? "Creating..." : "Create from template"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create School Draft from Scratch</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFromScratch} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Syllabus name</label>
                  <Input
                    value={scratchName}
                    onChange={(event) => setScratchName(event.target.value)}
                    placeholder="Cloudbase Ground Handling"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium">Initial lessons</p>
                  {lessonDrafts.map((lesson, index) => (
                    <div key={`scratch-${index}`} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold">Lesson {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLessonDraft(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Lesson name"
                          value={lesson.name}
                          onChange={(event) =>
                            updateLessonDraft(index, { name: event.target.value })
                          }
                        />
                        <Textarea
                          placeholder="Lesson description"
                          value={lesson.description}
                          onChange={(event) =>
                            updateLessonDraft(index, { description: event.target.value })
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          value={lesson.durationMinutes}
                          onChange={(event) =>
                            updateLessonDraft(index, {
                              durationMinutes: Number(event.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addLessonDraft}>
                    Add lesson
                  </Button>
                </div>

                <Button type="submit" disabled={isCreatingFromScratch}>
                  {isCreatingFromScratch ? "Creating..." : "Create from scratch"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open Course from FINAL Syllabus</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCourse} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">FINAL syllabus version</label>
                  <Select
                    value={newCourseTemplateVersionId}
                    onValueChange={setNewCourseTemplateVersionId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select FINAL syllabus version" />
                    </SelectTrigger>
                    <SelectContent>
                      {finalCandidates.map((item: CatalogItem) => (
                        <SelectItem key={item.syllabusVersionId} value={item.syllabusVersionId}>
                          {item.syllabusName} (v{item.version}) • {item.schoolName ?? "System"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium">Start date and time (optional)</label>
                  <Input
                    type="datetime-local"
                    value={newCourseStartDate}
                    onChange={(event) => setNewCourseStartDate(event.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Min capacity (optional)</label>
                    <Input
                      type="number"
                      min={1}
                      value={newCourseMinCapacity}
                      onChange={(event) => setNewCourseMinCapacity(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Max capacity (optional)</label>
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
                    Default lesson price in minor units (optional)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={newCourseDefaultPrice}
                    onChange={(event) => setNewCourseDefaultPrice(event.target.value)}
                  />
                </div>

                <Button type="submit" disabled={isCreatingCourse}>
                  {isCreatingCourse ? "Creating course..." : "Open course"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Syllabus Version Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isVersionLoading && (
              <p className="text-muted-foreground text-sm">Loading selected version details...</p>
            )}

            {!isVersionLoading && !versionDetails && (
              <p className="text-muted-foreground text-sm">
                Select a syllabus version from Catalog first.
              </p>
            )}

            {versionDetails && (
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium">{versionDetails.syllabusName}</p>
                  <p className="text-muted-foreground text-xs">
                    v{versionDetails.version} • {versionDetails.status} •{" "}
                    {versionDetails.schoolName ?? "System"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={loadLessonsIntoEditor}>
                    Load lessons into editor
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveRevision}
                    disabled={!selectedDraftId || isSavingRevision}
                  >
                    {isSavingRevision ? "Saving..." : "Save as new draft revision"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePublish}
                    disabled={!selectedDraftId || isPublishing}
                  >
                    {isPublishing ? "Publishing..." : "Publish as FINAL version"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "editor" && (
        <Card>
          <CardHeader>
            <CardTitle>Lesson Editor</CardTitle>
          </CardHeader>
          <CardContent>
            {!versionDetails && (
              <p className="text-muted-foreground text-sm">
                Select a syllabus in Catalog, open Details, and load lessons into editor.
              </p>
            )}

            {versionDetails && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {lessonDrafts.map((lesson, index) => (
                    <div key={`editor-${index}`} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold">Lesson {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLessonDraft(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Input
                          value={lesson.name}
                          placeholder="Lesson name"
                          onChange={(event) =>
                            updateLessonDraft(index, { name: event.target.value })
                          }
                        />
                        <Textarea
                          value={lesson.description}
                          placeholder="Lesson description"
                          onChange={(event) =>
                            updateLessonDraft(index, { description: event.target.value })
                          }
                        />
                        <Input
                          type="number"
                          min={1}
                          value={lesson.durationMinutes}
                          onChange={(event) =>
                            updateLessonDraft(index, {
                              durationMinutes: Number(event.target.value) || 1,
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addLessonDraft}>
                    Add lesson
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveRevision}
                    disabled={!selectedDraftId || isSavingRevision}
                  >
                    {isSavingRevision ? "Saving..." : "Save as new draft revision"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePublish}
                    disabled={!selectedDraftId || isPublishing}
                  >
                    {isPublishing ? "Publishing..." : "Publish as FINAL version"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </DefaultLayout>
  );
};

export default ManagerSyllabusesPage;
