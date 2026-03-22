import { SyllabusVersionStatus, UserRole } from "@prisma/client";
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
import { Slider } from "../client/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { Textarea } from "../client/components/ui/textarea";
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

type SyllabusesSection = "catalog" | "create" | "details" | "editor";
const validSections: SyllabusesSection[] = ["catalog", "create", "details", "editor"];

const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
};

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
  const [isPublishing, setIsPublishing] = useState(false);
  const [draftPendingDelete, setDraftPendingDelete] = useState<CatalogItem | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isDeletingAllDrafts, setIsDeletingAllDrafts] = useState(false);
  const syllabusesBasePath =
    user.role === UserRole.SYSTEM_ADMIN ? "/system-admin/syllabuses" : "/school-manager/syllabuses";

  const goToSection = (section: SyllabusesSection) => {
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
    if (section && validSections.includes(section as SyllabusesSection)) {
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

      {isLoading && <p className="text-muted-foreground text-sm">{t("syllabus.loadingCatalog")}</p>}
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
            {t("syllabus.catalog")}
          </Button>
          <Button
            type="button"
            className="shrink-0 rounded-none border-s"
            variant={activeSection === "create" ? "secondary" : "outline"}
            onClick={() => goToSection("create")}
          >
            {t("syllabus.create")}
          </Button>
          <Button
            type="button"
            className="shrink-0 rounded-none border-s"
            variant={activeSection === "details" ? "secondary" : "outline"}
            onClick={() => goToSection("details")}
          >
            {t("syllabus.details")}
          </Button>
          <Button
            type="button"
            className="shrink-0 rounded-none"
            variant={activeSection === "editor" ? "secondary" : "outline"}
            onClick={() => goToSection("editor")}
          >
            {t("syllabus.editor")}
          </Button>
        </div>
      </div>

      <div ref={sectionContentRef} className="scroll-mt-20">

      {activeSection === "catalog" && (
        <div className="space-y-6">
          <div className="rounded-md border p-4 text-sm">
            <p className="font-semibold">{t("syllabus.visibilityAndUsagePolicy")}</p>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 ps-5">
              <li>{t("syllabus.courseOpeningCanUseOnlyFinal")}</li>
              <li>{t("syllabus.draftsArePrivate")}</li>
              <li>{t("syllabus.onlySchoolLocalDraftsCanBeEdited")}</li>
            </ul>
          </div>

          <div className="grid gap-6 2xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("syllabus.availableForCourseOpening")}</CardTitle>
            </CardHeader>
            <CardContent>
              {finalCandidates.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("syllabus.noFinalSyllabuses")}</p>
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
                          v{item.version} • {item.lessonCount} {t("syllabus.lessons").toLowerCase()} • {item.schoolName ?? t("syllabus.system")}
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
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{t("syllabus.editableSchoolDrafts")}</CardTitle>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={editableDrafts.length === 0 || isDeletingAllDrafts}
                  onClick={() => setIsDeleteAllDialogOpen(true)}
                >
                  {isDeletingAllDrafts
                    ? t("syllabus.deleting")
                    : t("syllabus.deleteAllDraftsButton")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editableDrafts.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("syllabus.noEditableDraftsAvailable")}</p>
              ) : (
                <ul className="space-y-2">
                  {editableDrafts.map((item: CatalogItem) => (
                    <li key={item.syllabusVersionId}>
                      <div className="flex items-stretch gap-2">
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
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="self-center"
                          onClick={() => setDraftPendingDelete(item)}
                        >
                          {t("syllabus.deleteDraftButton")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

        </div>
        </div>
      )}

      {activeSection === "create" && (
        <div className="grid gap-6 2xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("syllabus.createSchoolDraftFromTemplate")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFromTemplate} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">{t("syllabus.finalTemplate")}</label>
                  <Select value={templateVersionId} onValueChange={setTemplateVersionId}>
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
                  <label className="text-xs font-medium">{t("syllabus.newSyllabusName")}</label>
                  <Input
                    value={newSyllabusName}
                    onChange={(event) => setNewSyllabusName(event.target.value)}
                    placeholder={t("syllabus.newSyllabusNamePlaceholder")}
                  />
                </div>

                <Button type="submit" disabled={isCreatingFromTemplate}>
                  {isCreatingFromTemplate
                    ? t("syllabus.creatingFromTemplate")
                    : t("syllabus.createFromTemplateButton")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("syllabus.createSchoolDraftFromScratch")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateFromScratch} className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">{t("syllabus.syllabusName")}</label>
                  <Input
                    value={scratchName}
                    onChange={(event) => setScratchName(event.target.value)}
                    placeholder={t("syllabus.syllabusNamePlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium">{t("syllabus.initialLessons")}</p>
                  {lessonDrafts.map((lesson, index) => (
                    <div key={`scratch-${index}`} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold">
                          {t("syllabus.lessonNumberTitle", { number: index + 1 })}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLessonDraft(index)}
                        >
                          {t("syllabus.removeButton")}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t("syllabus.lessonNamePlaceholder")}</label>
                          <Input
                            placeholder={t("syllabus.lessonNamePlaceholder")}
                            value={lesson.name}
                            onChange={(event) =>
                              updateLessonDraft(index, { name: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t("syllabus.lessonDescPlaceholder")}</label>
                          <Textarea
                            placeholder={t("syllabus.lessonDescPlaceholder")}
                            value={lesson.description}
                            onChange={(event) =>
                              updateLessonDraft(index, { description: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t("syllabus.lessonDurationLabel")}</label>
                          <div className="space-y-2">
                            <Slider
                              value={[lesson.durationMinutes]}
                              onValueChange={(value: number[]) =>
                                updateLessonDraft(index, {
                                  durationMinutes: value[0],
                                })
                              }
                              min={15}
                              max={480}
                              step={15}
                              className="w-full"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-primary">
                                {formatDuration(lesson.durationMinutes)}
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={480}
                                value={lesson.durationMinutes}
                                onChange={(event) =>
                                  updateLessonDraft(index, {
                                    durationMinutes: Math.max(1, Math.min(480, Number(event.target.value) || 1)),
                                  })
                                }
                                className="h-8 w-20"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addLessonDraft}>
                    {t("syllabus.addLessonButton")}
                  </Button>
                </div>

                <Button type="submit" disabled={isCreatingFromScratch}>
                  {isCreatingFromScratch
                    ? t("syllabus.creatingFromTemplate")
                    : t("syllabus.createFromScratchButton")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeSection === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.selectedVersionDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isVersionLoading && (
              <p className="text-muted-foreground text-sm">{t("syllabus.loadingVersionDetails")}</p>
            )}

            {!isVersionLoading && !versionDetails && (
              <p className="text-muted-foreground text-sm">
                {t("syllabus.selectVersionFromCatalog")}
              </p>
            )}

            {versionDetails && (
              <div className="space-y-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium">{versionDetails.syllabusName}</p>
                  <p className="text-muted-foreground text-xs">
                    v{versionDetails.version} • {versionDetails.status} •{" "}
                    {versionDetails.schoolName ?? t("syllabus.system")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={loadLessonsIntoEditor}>
                    {t("syllabus.loadLessonsIntoEditor")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveRevision}
                    disabled={!selectedSaveSourceId || isSavingRevision}
                  >
                    {isSavingRevision ? t("syllabus.saving") : t("syllabus.saveAsNewDraftRevision")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePublish}
                    disabled={!selectedDraftId || isPublishing}
                  >
                    {isPublishing ? t("syllabus.publishing") : t("syllabus.publishAsFinalVersion")}
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
            <CardTitle>{t("syllabus.lessonEditor")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!versionDetails && (
              <p className="text-muted-foreground text-sm">
                {t("syllabus.selectSyllabusToEdit")}
              </p>
            )}

            {versionDetails && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {lessonDrafts.map((lesson, index) => (
                    <div key={`editor-${index}`} className="rounded-md border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold">
                          {t("syllabus.lessonNumberTitle", { number: index + 1 })}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLessonDraft(index)}
                        >
                          {t("syllabus.removeButton")}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t("syllabus.lessonNamePlaceholder")}</label>
                          <Input
                            value={lesson.name}
                            placeholder={t("syllabus.lessonNamePlaceholder")}
                            onChange={(event) =>
                              updateLessonDraft(index, { name: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t("syllabus.lessonDescPlaceholder")}</label>
                          <Textarea
                            value={lesson.description}
                            placeholder={t("syllabus.lessonDescPlaceholder")}
                            onChange={(event) =>
                              updateLessonDraft(index, { description: event.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">{t("syllabus.lessonDurationLabel")}</label>
                          <div className="space-y-2">
                            <Slider
                              value={[lesson.durationMinutes]}
                              onValueChange={(value: number[]) =>
                                updateLessonDraft(index, {
                                  durationMinutes: value[0],
                                })
                              }
                              min={15}
                              max={480}
                              step={15}
                              className="w-full"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-primary">
                                {formatDuration(lesson.durationMinutes)}
                              </span>
                              <Input
                                type="number"
                                min={1}
                                max={480}
                                value={lesson.durationMinutes}
                                onChange={(event) =>
                                  updateLessonDraft(index, {
                                    durationMinutes: Math.max(1, Math.min(480, Number(event.target.value) || 1)),
                                  })
                                }
                                className="h-8 w-20"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addLessonDraft}>
                    {t("syllabus.addLessonButton")}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveRevision}
                    disabled={!selectedSaveSourceId || isSavingRevision}
                  >
                    {isSavingRevision ? t("syllabus.saving") : t("syllabus.saveAsNewDraftRevision")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePublish}
                    disabled={!selectedDraftId || isPublishing}
                  >
                    {isPublishing ? t("syllabus.publishing") : t("syllabus.publishAsFinalVersion")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={draftPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingDraft) {
            setDraftPendingDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("syllabus.confirmDeleteDraftTitle")}</DialogTitle>
            <DialogDescription>
              {t("syllabus.confirmDeleteDraft_desc", {
                name: draftPendingDelete?.syllabusName ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingDraft}
              onClick={() => setDraftPendingDelete(null)}
            >
              {t("syllabus.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingDraft}
              onClick={handleDeleteDraft}
            >
              {isDeletingDraft ? t("syllabus.deleting") : t("syllabus.confirmDeleteDraftButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("syllabus.confirmDeleteAllDraftsTitle")}</DialogTitle>
            <DialogDescription>{t("syllabus.confirmDeleteAllDrafts_desc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeletingAllDrafts}
              onClick={() => setIsDeleteAllDialogOpen(false)}
            >
              {t("syllabus.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingAllDrafts}
              onClick={handleDeleteAllDrafts}
            >
              {isDeletingAllDrafts
                ? t("syllabus.deleting")
                : t("syllabus.confirmDeleteAllDraftsButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </DefaultLayout>
  );
};

export default ManagerSyllabusesPage;
