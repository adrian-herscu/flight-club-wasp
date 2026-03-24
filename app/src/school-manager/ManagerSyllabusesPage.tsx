import { SyllabusVersionStatus, UserRole } from "@prisma/client";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import {
  type ManagerSyllabusesSection,
  ManagerSyllabusesPageContent,
} from "../client/components/patterns/ManagerSyllabusesPagePatterns";
import { toast } from "../client/hooks/use-toast";
import { useManagedSchoolSelection } from "./useManagedSchoolSelection";

const {
  createDraftSyllabusFromScratch,
  createDraftSyllabusFromTemplate,
  deleteAllEditableDraftSyllabusVersions,
  deleteDraftSyllabusVersion,
  getMyManagedSchool,
  getManagerSyllabusCatalog,
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

type ManagedSchool = {
  id: string;
  name: string;
};

const validSections: ManagerSyllabusesSection[] = ["catalog", "create", "details", "editor"];

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
  const { data: managedSchoolsData } = useQuery(getMyManagedSchool);
  const managedSchools = (managedSchoolsData as ManagedSchool[] | undefined) ?? [];
  const { selectedSchoolId, setSelectedSchoolId } = useManagedSchoolSelection(managedSchools);

  const {
    data: catalogData,
    isLoading,
    error,
    refetch: refetchCatalog,
  } = useQuery(getManagerSyllabusCatalog, { schoolId: selectedSchoolId });

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const {
    data: versionDetailsData,
    isLoading: isVersionLoading,
    refetch: refetchVersion,
  } = useQuery(getSyllabusVersionDetails, {
    schoolId: selectedSchoolId,
    syllabusVersionId: selectedVersionId,
  });

  const catalog = catalogData as ManagerSyllabusCatalog | undefined;
  const versionDetails = versionDetailsData as SyllabusVersionDetails;

  const finalCandidates = catalog?.courseOpeningCandidates ?? [];
  const editableDrafts = catalog?.editableDrafts ?? [];

  const [templateVersionId, setTemplateVersionId] = useState<string>("");
  const [newSyllabusName, setNewSyllabusName] = useState("");
  const [scratchName, setScratchName] = useState("");
  const sectionContentRef = useRef<HTMLDivElement | null>(null);
  const hasChangedSectionRef = useRef(false);

  const activeSection = useMemo<ManagerSyllabusesSection>(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (section && validSections.includes(section as ManagerSyllabusesSection)) {
      return section as ManagerSyllabusesSection;
    }
    return "catalog";
  }, [location.search]);

  const [lessonDrafts, setLessonDrafts] = useState<LessonDraft[]>([initialLesson()]);
  const [isSavingRevision, setIsSavingRevision] = useState(false);
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState(false);
  const [isCreatingFromScratch, setIsCreatingFromScratch] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftPendingDelete, setDraftPendingDelete] = useState<CatalogItem | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isDeletingAllDrafts, setIsDeletingAllDrafts] = useState(false);
  const syllabusesBasePath =
    user.role === UserRole.SYSTEM_ADMIN ? "/system-admin/syllabuses" : "/school-manager/syllabuses";

  const goToSection = (section: ManagerSyllabusesSection) => {
    hasChangedSectionRef.current = true;
    const params = new URLSearchParams(location.search);
    params.set("section", section);
    navigate(
      {
        pathname: syllabusesBasePath,
        search: `?${params.toString()}`,
      },
      { replace: false },
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (section && validSections.includes(section as ManagerSyllabusesSection)) {
      return;
    }

    params.set("section", "catalog");
    navigate(
      {
        pathname: syllabusesBasePath,
        search: `?${params.toString()}`,
      },
      { replace: true },
    );
  }, [location.search, navigate, syllabusesBasePath]);

  useEffect(() => {
    if (!hasChangedSectionRef.current) return;

    sectionContentRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeSection]);

  const selectedSaveSourceId = useMemo(() => {
    if (!versionDetails) return null;

    const isEditableStatus =
      versionDetails.status === SyllabusVersionStatus.DRAFT ||
      versionDetails.status === SyllabusVersionStatus.FINAL;
    if (!isEditableStatus) return null;

    if (user.role === UserRole.SYSTEM_ADMIN && versionDetails.schoolId !== null) {
      return null;
    }

    if (
      user.role === UserRole.SCHOOL_MANAGER &&
      (versionDetails.schoolId === null || versionDetails.schoolId !== selectedSchoolId)
    ) {
      return null;
    }

    return versionDetails.syllabusVersionId;
  }, [selectedSchoolId, user.role, versionDetails]);

  const selectedDraftId = useMemo(() => {
    if (!versionDetails) return null;
    if (versionDetails.status !== SyllabusVersionStatus.DRAFT) return null;

    if (user.role === UserRole.SYSTEM_ADMIN && versionDetails.schoolId !== null) {
      return null;
    }

    if (
      user.role === UserRole.SCHOOL_MANAGER &&
      (versionDetails.schoolId === null || versionDetails.schoolId !== selectedSchoolId)
    ) {
      return null;
    }

    return versionDetails.syllabusVersionId;
  }, [selectedSchoolId, user.role, versionDetails]);

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
        schoolId: selectedSchoolId,
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
        schoolId: selectedSchoolId,
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
    if (!selectedSaveSourceId) {
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
        schoolId: selectedSchoolId,
        sourceVersionId: selectedSaveSourceId,
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
      const result = await publishDraftSyllabusVersion({
        schoolId: selectedSchoolId,
        sourceVersionId: selectedDraftId,
      });
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

  const handleDeleteDraft = async () => {
    if (!draftPendingDelete) {
      return;
    }

    setIsDeletingDraft(true);
    try {
      const result = await deleteDraftSyllabusVersion({
        schoolId: selectedSchoolId,
        sourceVersionId: draftPendingDelete.syllabusVersionId,
      });

      await refetchCatalog();

      if (selectedVersionId === result.deletedSyllabusVersionId) {
        setSelectedVersionId(null);
        await refetchVersion();
      }

      setDraftPendingDelete(null);

      toast({
        title: t("syllabus.draftDeleted"),
        description: t("syllabus.draftDeleted_desc"),
      });
    } catch (deleteError: unknown) {
      toast({
        title: t("syllabus.deleteDraftFailed"),
        description:
          deleteError instanceof Error
            ? deleteError.message
            : t("syllabus.unableDeleteDraft"),
        variant: "destructive",
      });
    } finally {
      setIsDeletingDraft(false);
    }
  };

  const handleDeleteAllDrafts = async () => {
    setIsDeletingAllDrafts(true);
    try {
      const result = await deleteAllEditableDraftSyllabusVersions({
        schoolId: selectedSchoolId,
      });

      await refetchCatalog();

      if (selectedVersionId) {
        setSelectedVersionId(null);
        await refetchVersion();
      }

      setIsDeleteAllDialogOpen(false);

      toast({
        title: t("syllabus.draftsDeleted"),
        description:
          result.skippedInUseCount > 0
            ? t("syllabus.draftsDeletedWithSkipped_desc", {
                deletedCount: result.deletedCount,
                skippedCount: result.skippedInUseCount,
              })
            : t("syllabus.draftsDeleted_desc", {
                count: result.deletedCount,
              }),
      });
    } catch (deleteError: unknown) {
      toast({
        title: t("syllabus.deleteAllDraftsFailed"),
        description:
          deleteError instanceof Error
            ? deleteError.message
            : t("syllabus.unableDeleteAllDrafts"),
        variant: "destructive",
      });
    } finally {
      setIsDeletingAllDrafts(false);
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
      <Breadcrumb pageName={t("syllabus.syllabuses")} showTitle={false} />

      <ManagerSyllabusesPageContent
        t={t}
        isLoading={isLoading}
        errorMessage={error?.message ?? null}
        activeSection={activeSection}
        goToSection={goToSection}
        sectionContentRef={sectionContentRef}
        finalCandidates={finalCandidates}
        editableDrafts={editableDrafts}
        onSelectVersion={(syllabusVersionId) => {
          setSelectedVersionId(syllabusVersionId);
          goToSection("details");
        }}
        onOpenDeleteAllDialog={() => setIsDeleteAllDialogOpen(true)}
        templateVersionId={templateVersionId}
        onTemplateVersionChange={setTemplateVersionId}
        newSyllabusName={newSyllabusName}
        onNewSyllabusNameChange={setNewSyllabusName}
        onCreateFromTemplateSubmit={handleCreateFromTemplate}
        isCreatingFromTemplate={isCreatingFromTemplate}
        scratchName={scratchName}
        onScratchNameChange={setScratchName}
        onCreateFromScratchSubmit={handleCreateFromScratch}
        isCreatingFromScratch={isCreatingFromScratch}
        lessonDrafts={lessonDrafts}
        onUpdateLessonDraft={updateLessonDraft}
        onRemoveLessonDraft={removeLessonDraft}
        onAddLessonDraft={addLessonDraft}
        versionDetails={versionDetails}
        isVersionLoading={isVersionLoading}
        onLoadLessonsIntoEditor={loadLessonsIntoEditor}
        onSaveRevision={handleSaveRevision}
        isSavingRevision={isSavingRevision}
        selectedSaveSourceId={selectedSaveSourceId}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        selectedDraftId={selectedDraftId}
        draftPendingDelete={draftPendingDelete}
        onDraftPendingDeleteChange={setDraftPendingDelete}
        onDeleteDraft={handleDeleteDraft}
        isDeletingDraft={isDeletingDraft}
        isDeleteAllDialogOpen={isDeleteAllDialogOpen}
        onDeleteAllDialogOpenChange={setIsDeleteAllDialogOpen}
        onDeleteAllDrafts={handleDeleteAllDrafts}
        isDeletingAllDrafts={isDeletingAllDrafts}
      />
    </DefaultLayout>
  );
};

export default ManagerSyllabusesPage;
