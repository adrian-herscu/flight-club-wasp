import { SyllabusVersionStatus } from "@prisma/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../system-admin/layout/Breadcrumb";
import DefaultLayout from "../system-admin/layout/DefaultLayout";
import {
  type ManagerSyllabusesSection,
  ManagerSyllabusesPageContent,
} from "../../client/components/patterns/ManagerSyllabusesPagePatterns";
import { toast } from "../../shared/hooks/use-toast";
import { useWaspMutation } from "../../shared/hooks/useWaspMutation";
import { useManagedSchoolSelection } from "../../features/school-context/useManagedSchoolSelection";

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

// ---------------------------------------------------------------------------
// Zod schemas for the two create forms
// ---------------------------------------------------------------------------

const createFromTemplateSchema = z.object({
  templateVersionId: z.string().min(1),
  newSyllabusName: z.string().min(1),
});

const createFromScratchSchema = z.object({
  scratchName: z.string().min(1),
});

type CreateFromTemplateValues = z.infer<typeof createFromTemplateSchema>;
type CreateFromScratchValues = z.infer<typeof createFromScratchSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  } = useQuery(getManagerSyllabusCatalog, { schoolId: selectedSchoolId });

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const {
    data: versionDetailsData,
    isLoading: isVersionLoading,
  } = useQuery(getSyllabusVersionDetails, {
    schoolId: selectedSchoolId,
    syllabusVersionId: selectedVersionId,
  });

  const catalog = catalogData as ManagerSyllabusCatalog | undefined;
  const versionDetails = versionDetailsData as SyllabusVersionDetails;

  const finalCandidates = catalog?.courseOpeningCandidates ?? [];
  const editableDrafts = catalog?.editableDrafts ?? [];

  const sectionContentRef = useRef<HTMLDivElement | null>(null);
  const hasChangedSectionRef = useRef(false);

  const syllabusesBasePath =
    user.isSystemAdmin ? "/system-admin/syllabuses" : "/school-manager/syllabuses";

  const activeSection = useMemo<ManagerSyllabusesSection>(() => {
    const section = new URLSearchParams(location.search).get("section");
    if (section && validSections.includes(section as ManagerSyllabusesSection)) {
      return section as ManagerSyllabusesSection;
    }
    return "catalog";
  }, [location.search]);

  const goToSection = (section: ManagerSyllabusesSection) => {
    hasChangedSectionRef.current = true;
    const params = new URLSearchParams(location.search);
    params.set("section", section);
    navigate({ pathname: syllabusesBasePath, search: `?${params.toString()}` }, { replace: false });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (section && validSections.includes(section as ManagerSyllabusesSection)) return;

    params.set("section", "catalog");
    navigate({ pathname: syllabusesBasePath, search: `?${params.toString()}` }, { replace: true });
  }, [location.search, navigate, syllabusesBasePath]);

  useEffect(() => {
    if (!hasChangedSectionRef.current) return;
    sectionContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSection]);

  const selectedSaveSourceId = useMemo(() => {
    if (!versionDetails) return null;
    const isEditableStatus =
      versionDetails.status === SyllabusVersionStatus.DRAFT ||
      versionDetails.status === SyllabusVersionStatus.FINAL;
    if (!isEditableStatus) return null;
    if (user.isSystemAdmin && versionDetails.schoolId !== null) return null;
    if (!user.isSystemAdmin && (versionDetails.schoolId === null || versionDetails.schoolId !== selectedSchoolId))
      return null;
    return versionDetails.syllabusVersionId;
  }, [selectedSchoolId, user.isSystemAdmin, versionDetails]);

  const selectedDraftId = useMemo(() => {
    if (!versionDetails) return null;
    if (versionDetails.status !== SyllabusVersionStatus.DRAFT) return null;
    if (user.isSystemAdmin && versionDetails.schoolId !== null) return null;
    if (!user.isSystemAdmin && (versionDetails.schoolId === null || versionDetails.schoolId !== selectedSchoolId))
      return null;
    return versionDetails.syllabusVersionId;
  }, [selectedSchoolId, user.isSystemAdmin, versionDetails]);

  // -------------------------------------------------------------------------
  // RHF forms (Change 1 — replaces 3 form-field useState hooks)
  // -------------------------------------------------------------------------

  const templateForm = useForm<CreateFromTemplateValues>({
    resolver: zodResolver(createFromTemplateSchema),
    defaultValues: { templateVersionId: "", newSyllabusName: "" },
  });

  const scratchForm = useForm<CreateFromScratchValues>({
    resolver: zodResolver(createFromScratchSchema),
    defaultValues: { scratchName: "" },
  });

  const [lessonDrafts, setLessonDrafts] = useState<LessonDraft[]>([initialLesson()]);

  // Delete dialog UI state
  const [draftPendingDelete, setDraftPendingDelete] = useState<CatalogItem | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  // -------------------------------------------------------------------------
  // Mutations (Change 4 — replaces 6 loading-flag state + try/catch/toast)
  // -------------------------------------------------------------------------

  const createFromTemplate = useWaspMutation(
    (args: Parameters<typeof createDraftSyllabusFromTemplate>[0]) => createDraftSyllabusFromTemplate(args),
    {
      successToast: { title: t("syllabus.draftCreated"), description: t("syllabus.draftCreated_desc") },
      errorToast: {
        title: t("syllabus.createFromTemplateFailed"),
        fallbackDescription: t("syllabus.missingName"),
      },
      onSuccess: (created) => {
        setSelectedVersionId(created.syllabusVersionId);
        goToSection("details");
        templateForm.reset();
      },
    },
  );

  const handleCreateFromTemplate = templateForm.handleSubmit(async (values) => {
    await createFromTemplate.mutate({
      schoolId: selectedSchoolId,
      templateVersionId: values.templateVersionId,
      name: values.newSyllabusName.trim(),
    });
  });

  const createFromScratch = useWaspMutation(
    (args: Parameters<typeof createDraftSyllabusFromScratch>[0]) => createDraftSyllabusFromScratch(args),
    {
      successToast: {
        title: t("syllabus.draftCreated"),
        description: t("syllabus.draftCreated_scratch_desc"),
      },
      errorToast: {
        title: t("syllabus.createFromScratchFailed"),
        fallbackDescription: t("syllabus.unableCreateScratch"),
      },
      onSuccess: (created) => {
        setSelectedVersionId(created.syllabusVersionId);
        goToSection("details");
        scratchForm.reset();
        setLessonDrafts([initialLesson()]);
      },
    },
  );

  const handleCreateFromScratch = scratchForm.handleSubmit(async (values) => {
    if (lessonDrafts.some((lesson) => !lesson.name.trim())) {
      scratchForm.setError("scratchName", { message: t("syllabus.eachLessonMustHaveName") });
      return;
    }
    await createFromScratch.mutate({
      schoolId: selectedSchoolId,
      name: values.scratchName.trim(),
      lessons: lessonDrafts.map((lesson, index) => ({
        ...lesson,
        position: index + 1,
        name: lesson.name.trim(),
        description: lesson.description.trim(),
      })),
    });
  });

  const saveRevision = useWaspMutation(
    (args: Parameters<typeof saveDraftSyllabusRevision>[0]) => saveDraftSyllabusRevision(args),
    {
      errorToast: {
        title: t("syllabus.saveFailed"),
        fallbackDescription: t("syllabus.unableSaveRevision"),
      },
      onSuccess: (result) => {
        setSelectedVersionId(result.syllabusVersionId);
        goToSection("details");
        toast({
          title: t("syllabus.draftRevisionSaved"),
          description: `${t("syllabus.draftRevisionSaved_desc")} ${result.version}.`,
        });
      },
    },
  );

  const handleSaveRevision = async () => {
    if (!selectedSaveSourceId) return;
    if (lessonDrafts.some((lesson) => !lesson.name.trim())) return;
    await saveRevision.mutate({
      schoolId: selectedSchoolId,
      sourceVersionId: selectedSaveSourceId,
      lessons: lessonDrafts.map((lesson, index) => ({
        ...lesson,
        position: index + 1,
        name: lesson.name.trim(),
        description: lesson.description.trim(),
      })),
    });
  };

  const publish = useWaspMutation(
    (args: Parameters<typeof publishDraftSyllabusVersion>[0]) => publishDraftSyllabusVersion(args),
    {
      errorToast: {
        title: t("syllabus.publishFailed"),
        fallbackDescription: t("syllabus.unablePublish"),
      },
      onSuccess: (result) => {
        setSelectedVersionId(result.syllabusVersionId);
        goToSection("details");
        toast({
          title: t("syllabus.published"),
          description: `${t("syllabus.published_desc")} (${result.version}) ${t("syllabus.isNowAvailableForCourseOpening")}.`,
        });
      },
    },
  );

  const handlePublish = async () => {
    if (!selectedDraftId) return;
    await publish.mutate({ schoolId: selectedSchoolId, sourceVersionId: selectedDraftId });
  };

  const deleteDraft = useWaspMutation(
    (args: Parameters<typeof deleteDraftSyllabusVersion>[0]) => deleteDraftSyllabusVersion(args),
    {
      successToast: { title: t("syllabus.draftDeleted"), description: t("syllabus.draftDeleted_desc") },
      errorToast: {
        title: t("syllabus.deleteDraftFailed"),
        fallbackDescription: t("syllabus.unableDeleteDraft"),
      },
      onSuccess: (result) => {
        if (selectedVersionId === result.deletedSyllabusVersionId) {
          setSelectedVersionId(null);
        }
        setDraftPendingDelete(null);
      },
    },
  );

  const handleDeleteDraft = async () => {
    if (!draftPendingDelete) return;
    await deleteDraft.mutate({
      schoolId: selectedSchoolId,
      sourceVersionId: draftPendingDelete.syllabusVersionId,
    });
  };

  const deleteAllDrafts = useWaspMutation(
    (args: Parameters<typeof deleteAllEditableDraftSyllabusVersions>[0]) =>
      deleteAllEditableDraftSyllabusVersions(args),
    {
      errorToast: {
        title: t("syllabus.deleteAllDraftsFailed"),
        fallbackDescription: t("syllabus.unableDeleteAllDrafts"),
      },
      onSuccess: (result) => {
        if (selectedVersionId) setSelectedVersionId(null);
        setIsDeleteAllDialogOpen(false);
        toast({
          title: t("syllabus.draftsDeleted"),
          description:
            result.skippedInUseCount > 0
              ? t("syllabus.draftsDeletedWithSkipped_desc", {
                  deletedCount: result.deletedCount,
                  skippedCount: result.skippedInUseCount,
                })
              : t("syllabus.draftsDeleted_desc", { count: result.deletedCount }),
        });
      },
    },
  );

  const handleDeleteAllDrafts = async () => {
    await deleteAllDrafts.mutate({ schoolId: selectedSchoolId });
  };

  // -------------------------------------------------------------------------
  // Lesson editor helpers (unchanged — not a form input)
  // -------------------------------------------------------------------------

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

  const updateLessonDraft = (index: number, patch: Partial<LessonDraft>) => {
    setLessonDrafts((current) =>
      current.map((lesson, lessonIndex) => (lessonIndex === index ? { ...lesson, ...patch } : lesson)),
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
        templateVersionId={templateForm.watch("templateVersionId")}
        onTemplateVersionChange={(v) => templateForm.setValue("templateVersionId", v)}
        newSyllabusName={templateForm.watch("newSyllabusName")}
        onNewSyllabusNameChange={(v) => templateForm.setValue("newSyllabusName", v)}
        onCreateFromTemplateSubmit={handleCreateFromTemplate}
        isCreatingFromTemplate={createFromTemplate.isPending}
        scratchName={scratchForm.watch("scratchName")}
        onScratchNameChange={(v) => scratchForm.setValue("scratchName", v)}
        onCreateFromScratchSubmit={handleCreateFromScratch}
        isCreatingFromScratch={createFromScratch.isPending}
        lessonDrafts={lessonDrafts}
        onUpdateLessonDraft={updateLessonDraft}
        onRemoveLessonDraft={removeLessonDraft}
        onAddLessonDraft={addLessonDraft}
        versionDetails={versionDetails}
        isVersionLoading={isVersionLoading}
        onLoadLessonsIntoEditor={loadLessonsIntoEditor}
        onSaveRevision={handleSaveRevision}
        isSavingRevision={saveRevision.isPending}
        selectedSaveSourceId={selectedSaveSourceId}
        onPublish={handlePublish}
        isPublishing={publish.isPending}
        selectedDraftId={selectedDraftId}
        draftPendingDelete={draftPendingDelete}
        onDraftPendingDeleteChange={setDraftPendingDelete}
        onDeleteDraft={handleDeleteDraft}
        isDeletingDraft={deleteDraft.isPending}
        isDeleteAllDialogOpen={isDeleteAllDialogOpen}
        onDeleteAllDialogOpenChange={setIsDeleteAllDialogOpen}
        onDeleteAllDrafts={handleDeleteAllDrafts}
        isDeletingAllDrafts={deleteAllDrafts.isPending}
      />
    </DefaultLayout>
  );
};

export default ManagerSyllabusesPage;
