import { SyllabusVersionStatus } from "@prisma/client";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

  const activeSectionLabel = useMemo(() => {
    switch (activeSection) {
      case "catalog":
        return "Catalog";
      case "create":
        return "Create";
      case "details":
        return "Details";
      case "editor":
        return "Editor";
      default:
        return "Catalog";
    }
  }, [activeSection]);

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
        title: "Missing input",
        description: "Choose a FINAL template and provide a new syllabus name.",
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
        title: "Draft created",
        description: "A new school-private draft was created from the selected template.",
      });
    } catch (creationError: unknown) {
      toast({
        title: "Create from template failed",
        description:
          creationError instanceof Error
            ? creationError.message
            : "Unable to create syllabus draft from template.",
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
        title: "Missing name",
        description: "Provide a syllabus name before creating a draft.",
        variant: "destructive",
      });
      return;
    }

    if (lessonDrafts.some((lesson) => !lesson.name.trim())) {
      toast({
        title: "Missing lesson names",
        description: "Each lesson must have a name.",
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
        title: "Draft created",
        description: "A new draft syllabus was created from scratch.",
      });
    } catch (creationError: unknown) {
      toast({
        title: "Create from scratch failed",
        description:
          creationError instanceof Error
            ? creationError.message
            : "Unable to create draft syllabus from scratch.",
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
        title: "No editable draft selected",
        description: "Select one of your draft versions before saving.",
        variant: "destructive",
      });
      return;
    }

    if (lessonDrafts.some((lesson) => !lesson.name.trim())) {
      toast({
        title: "Missing lesson names",
        description: "Each lesson must have a name.",
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
        title: "Draft revision saved",
        description: `Saved as draft version ${result.version}.`,
      });
    } catch (saveError: unknown) {
      toast({
        title: "Save failed",
        description:
          saveError instanceof Error
            ? saveError.message
            : "Unable to create a new draft revision.",
        variant: "destructive",
      });
    } finally {
      setIsSavingRevision(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedDraftId) {
      toast({
        title: "No draft selected",
        description: "Choose one of your editable drafts before publishing.",
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
        title: "Published",
        description: `A FINAL version (${result.version}) is now available for course opening.`,
      });
    } catch (publishError: unknown) {
      toast({
        title: "Publish failed",
        description:
          publishError instanceof Error
            ? publishError.message
            : "Unable to publish this draft.",
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
      <Breadcrumb pageName="Syllabuses" />

      {isLoading && <p className="text-muted-foreground text-sm">Loading syllabus catalog...</p>}
      {error && <p className="text-sm text-red-500">{error.message}</p>}

      <div className="bg-background/95 sticky top-0 z-20 mb-6 rounded-md border p-2 backdrop-blur supports-backdrop-filter:bg-background/70">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            type="button"
            className="shrink-0"
            variant={activeSection === "catalog" ? "secondary" : "outline"}
            onClick={() => goToSection("catalog")}
          >
            Catalog
          </Button>
          <Button
            type="button"
            className="shrink-0"
            variant={activeSection === "create" ? "secondary" : "outline"}
            onClick={() => goToSection("create")}
          >
            Create
          </Button>
          <Button
            type="button"
            className="shrink-0"
            variant={activeSection === "details" ? "secondary" : "outline"}
            onClick={() => goToSection("details")}
          >
            Details
          </Button>
          <Button
            type="button"
            className="shrink-0"
            variant={activeSection === "editor" ? "secondary" : "outline"}
            onClick={() => goToSection("editor")}
          >
            Editor
          </Button>
        </div>

        <p className="text-muted-foreground px-1 text-sm">
          Active section: <span className="text-foreground font-medium">{activeSectionLabel}</span>
        </p>
      </div>

      <div ref={sectionContentRef} className="scroll-mt-20">

      {activeSection === "catalog" && (
        <div className="space-y-6">
          <div className="rounded-md border p-4 text-sm">
            <p className="font-semibold">Visibility and usage policy</p>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5">
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
                        className="hover:bg-accent w-full rounded-md border p-3 text-left"
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
                        className="hover:bg-accent w-full rounded-md border p-3 text-left"
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
        <div className="grid gap-6 2xl:grid-cols-2">
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
