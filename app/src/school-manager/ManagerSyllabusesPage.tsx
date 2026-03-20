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
  createDraftSyllabusFromScratch,
  createDraftSyllabusFromTemplate,
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

    if (user.role === UserRole.SYSTEM_ADMIN && versionDetails.schoolId !== null) {
      return null;
    }

    if (user.role === UserRole.SCHOOL_MANAGER && versionDetails.schoolId === null) {
      return null;
    }

    return versionDetails.syllabusVersionId;
  }, [user.role, versionDetails]);

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
              <CardTitle>{t("syllabus.editableSchoolDrafts")}</CardTitle>
            </CardHeader>
            <CardContent>
              {editableDrafts.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("syllabus.noEditableDraftsAvailable")}</p>
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
                        <Input
                          placeholder={t("syllabus.lessonNamePlaceholder")}
                          value={lesson.name}
                          onChange={(event) =>
                            updateLessonDraft(index, { name: event.target.value })
                          }
                        />
                        <Textarea
                          placeholder={t("syllabus.lessonDescPlaceholder")}
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
                    disabled={!selectedDraftId || isSavingRevision}
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
                        <Input
                          value={lesson.name}
                          placeholder={t("syllabus.lessonNamePlaceholder")}
                          onChange={(event) =>
                            updateLessonDraft(index, { name: event.target.value })
                          }
                        />
                        <Textarea
                          value={lesson.description}
                          placeholder={t("syllabus.lessonDescPlaceholder")}
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
                    {t("syllabus.addLessonButton")}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveRevision}
                    disabled={!selectedDraftId || isSavingRevision}
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
      </div>
    </DefaultLayout>
  );
};

export default ManagerSyllabusesPage;
