import { SyllabusVersionStatus } from "@prisma/client";
import { type FormEvent, type ReactNode, type RefObject } from "react";
import { type TFunction } from "i18next";
import LabeledInputField from "./LabeledInputField";
import LabeledSelectField from "./LabeledSelectField";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { SelectItem } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { SegmentedTabButton, SegmentedTabs } from "./SegmentedTabs";

export type ManagerSyllabusesSection = "catalog" | "create" | "details" | "editor";

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

type ManagerSyllabusesPageContentProps = {
  t: TFunction;
  isLoading: boolean;
  errorMessage: string | null;
  activeSection: ManagerSyllabusesSection;
  goToSection: (section: ManagerSyllabusesSection) => void;
  sectionContentRef: RefObject<HTMLDivElement | null>;
  finalCandidates: CatalogItem[];
  editableDrafts: CatalogItem[];
  obsoleteVersions: CatalogItem[];
  onSelectVersion: (syllabusVersionId: string) => void;
  onOpenDeleteAllDialog: () => void;
  templateVersionId: string;
  onTemplateVersionChange: (value: string) => void;
  newSyllabusName: string;
  onNewSyllabusNameChange: (value: string) => void;
  onCreateFromTemplateSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  isCreatingFromTemplate: boolean;
  scratchName: string;
  onScratchNameChange: (value: string) => void;
  onCreateFromScratchSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  isCreatingFromScratch: boolean;
  lessonDrafts: LessonDraft[];
  onUpdateLessonDraft: (index: number, patch: Partial<LessonDraft>) => void;
  onRemoveLessonDraft: (index: number) => void;
  onAddLessonDraft: () => void;
  versionDetails: SyllabusVersionDetails;
  isVersionLoading: boolean;
  onLoadLessonsIntoEditor: () => void;
  onSaveRevision: () => void;
  isSavingRevision: boolean;
  selectedSaveSourceId: string | null;
  onPublish: () => void;
  isPublishing: boolean;
  selectedDraftId: string | null;
  draftPendingDelete: CatalogItem | null;
  onDraftPendingDeleteChange: (item: CatalogItem | null) => void;
  onDeleteDraft: () => void;
  isDeletingDraft: boolean;
  isDeleteAllDialogOpen: boolean;
  onDeleteAllDialogOpenChange: (open: boolean) => void;
  onDeleteAllDrafts: () => void;
  isDeletingAllDrafts: boolean;
};

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

const StickyTabs = ({
  activeSection,
  goToSection,
  t,
}: {
  activeSection: ManagerSyllabusesSection;
  goToSection: (section: ManagerSyllabusesSection) => void;
  t: TFunction;
}) => {
  return (
    <SegmentedTabs sticky withMask>
      <SegmentedTabButton
        active={activeSection === "catalog"}
        onClick={() => goToSection("catalog")}
      >
          {t("syllabus.catalog")}
      </SegmentedTabButton>
      <SegmentedTabButton
        active={activeSection === "create"}
        onClick={() => goToSection("create")}
      >
          {t("syllabus.create")}
      </SegmentedTabButton>
      <SegmentedTabButton
        active={activeSection === "details"}
        onClick={() => goToSection("details")}
      >
          {t("syllabus.details")}
      </SegmentedTabButton>
      <SegmentedTabButton
        active={activeSection === "editor"}
        onClick={() => goToSection("editor")}
        isLast
      >
          {t("syllabus.editor")}
      </SegmentedTabButton>
    </SegmentedTabs>
  );
};

const LessonDraftList = ({
  lessonDrafts,
  onRemoveLessonDraft,
  onUpdateLessonDraft,
  scope,
  t,
}: {
  lessonDrafts: LessonDraft[];
  onRemoveLessonDraft: (index: number) => void;
  onUpdateLessonDraft: (index: number, patch: Partial<LessonDraft>) => void;
  scope: "scratch" | "editor";
  t: TFunction;
}) => {
  return lessonDrafts.map((lesson, index) => (
    <div key={`${scope}-${index}`} className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">{t("syllabus.lessonNumberTitle", { number: index + 1 })}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveLessonDraft(index)}>
          {t("syllabus.removeButton")}
        </Button>
      </div>
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">{t("syllabus.lessonNamePlaceholder")}</label>
          <Input
            value={lesson.name}
            placeholder={t("syllabus.lessonNamePlaceholder")}
            onChange={(event) => onUpdateLessonDraft(index, { name: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">{t("syllabus.lessonDescPlaceholder")}</label>
          <Textarea
            value={lesson.description}
            placeholder={t("syllabus.lessonDescPlaceholder")}
            onChange={(event) => onUpdateLessonDraft(index, { description: event.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">{t("syllabus.lessonDurationLabel")}</label>
          <div className="space-y-2">
            <Slider
              value={[lesson.durationMinutes]}
              onValueChange={(value: number[]) =>
                onUpdateLessonDraft(index, {
                  durationMinutes: value[0],
                })
              }
              min={15}
              max={480}
              step={15}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-primary">{formatDuration(lesson.durationMinutes)}</span>
              <Input
                type="number"
                min={1}
                max={480}
                value={lesson.durationMinutes}
                onChange={(event) =>
                  onUpdateLessonDraft(index, {
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
  ));
};

const CatalogSection = ({
  editableDrafts,
  finalCandidates,
  obsoleteVersions,
  isDeletingAllDrafts,
  onOpenDeleteAllDialog,
  onDraftPendingDeleteChange,
  onSelectVersion,
  t,
}: {
  editableDrafts: CatalogItem[];
  finalCandidates: CatalogItem[];
  obsoleteVersions: CatalogItem[];
  isDeletingAllDrafts: boolean;
  onOpenDeleteAllDialog: () => void;
  onDraftPendingDeleteChange: (item: CatalogItem | null) => void;
  onSelectVersion: (syllabusVersionId: string) => void;
  t: TFunction;
}) => {
  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4 text-sm">
        <p className="font-semibold">{t("syllabus.visibilityAndUsagePolicy")}</p>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 ps-5">
          <li>{t("syllabus.courseOpeningCanUseOnlyFinal")}</li>
          <li>{t("syllabus.draftsArePrivate")}</li>
          <li>{t("syllabus.onlySchoolLocalDraftsCanBeEdited")}</li>
        </ul>
      </div>

      <div className="grid gap-6 2xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("syllabus.availableForCourseOpening")}</CardTitle>
          </CardHeader>
          <CardContent>
            {finalCandidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("syllabus.noFinalSyllabuses")}</p>
            ) : (
              <ul className="space-y-2">
                {finalCandidates.map((item) => (
                  <li key={item.syllabusVersionId}>
                    <button
                      type="button"
                      onClick={() => onSelectVersion(item.syllabusVersionId)}
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
                onClick={onOpenDeleteAllDialog}
              >
                {isDeletingAllDrafts ? t("syllabus.deleting") : t("syllabus.deleteAllDraftsButton")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editableDrafts.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("syllabus.noEditableDraftsAvailable")}</p>
            ) : (
              <ul className="space-y-2">
                {editableDrafts.map((item) => (
                  <li key={item.syllabusVersionId}>
                    <div className="flex items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectVersion(item.syllabusVersionId)}
                        className="hover:bg-accent w-full rounded-md border p-3 text-start"
                      >
                        <p className="text-sm font-medium">{item.syllabusName}</p>
                        <p className="text-muted-foreground text-xs">draft v{item.version} • {item.lessonCount} lessons</p>
                      </button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="self-center"
                        onClick={() => onDraftPendingDeleteChange(item)}
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

        <Card>
          <CardHeader>
            <CardTitle>Obsolete versions</CardTitle>
          </CardHeader>
          <CardContent>
            {obsoleteVersions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No obsolete versions yet.</p>
            ) : (
              <ul className="space-y-2">
                {obsoleteVersions.map((item) => (
                  <li key={item.syllabusVersionId}>
                    <button
                      type="button"
                      onClick={() => onSelectVersion(item.syllabusVersionId)}
                      className="hover:bg-accent w-full rounded-md border p-3 text-start"
                    >
                      <p className="text-sm font-medium">{item.syllabusName}</p>
                      <p className="text-muted-foreground text-xs">
                        obsolete v{item.version} • {item.lessonCount} lessons
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
  );
};

const CreateSection = ({
  finalCandidates,
  isCreatingFromScratch,
  isCreatingFromTemplate,
  lessonDrafts,
  newSyllabusName,
  onAddLessonDraft,
  onCreateFromScratchSubmit,
  onCreateFromTemplateSubmit,
  onNewSyllabusNameChange,
  onRemoveLessonDraft,
  onScratchNameChange,
  onTemplateVersionChange,
  onUpdateLessonDraft,
  scratchName,
  t,
  templateVersionId,
}: {
  finalCandidates: CatalogItem[];
  isCreatingFromScratch: boolean;
  isCreatingFromTemplate: boolean;
  lessonDrafts: LessonDraft[];
  newSyllabusName: string;
  onAddLessonDraft: () => void;
  onCreateFromScratchSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCreateFromTemplateSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onNewSyllabusNameChange: (value: string) => void;
  onRemoveLessonDraft: (index: number) => void;
  onScratchNameChange: (value: string) => void;
  onTemplateVersionChange: (value: string) => void;
  onUpdateLessonDraft: (index: number, patch: Partial<LessonDraft>) => void;
  scratchName: string;
  t: TFunction;
  templateVersionId: string;
}) => {
  return (
    <div className="grid gap-6 2xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{t("syllabus.createSchoolDraftFromTemplate")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreateFromTemplateSubmit} className="space-y-3">
            <LabeledSelectField
              id="create-draft-template-version"
              label={t("syllabus.finalTemplate")}
              value={templateVersionId}
              onValueChange={onTemplateVersionChange}
              placeholder={t("syllabus.finalTemplatePlaceholder")}

            >
              {finalCandidates.map((item) => (
                <SelectItem key={item.syllabusVersionId} value={item.syllabusVersionId}>
                  {item.syllabusName} (v{item.version}) • {item.schoolName ?? t("syllabus.system")}
                </SelectItem>
              ))}
            </LabeledSelectField>

            <div className="space-y-2">
              <LabeledInputField
                id="new-syllabus-name"
                label={t("syllabus.newSyllabusName")}
                value={newSyllabusName}
                onChange={onNewSyllabusNameChange}
                placeholder={t("syllabus.newSyllabusNamePlaceholder")}
              />
            </div>

            <Button type="submit" disabled={isCreatingFromTemplate}>
              {isCreatingFromTemplate ? t("syllabus.creatingFromTemplate") : t("syllabus.createFromTemplateButton")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("syllabus.createSchoolDraftFromScratch")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreateFromScratchSubmit} className="space-y-3">
            <div className="space-y-2">
              <LabeledInputField
                id="scratch-syllabus-name"
                label={t("syllabus.syllabusName")}
                value={scratchName}
                onChange={onScratchNameChange}
                placeholder={t("syllabus.syllabusNamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium">{t("syllabus.initialLessons")}</p>
              <LessonDraftList
                lessonDrafts={lessonDrafts}
                onRemoveLessonDraft={onRemoveLessonDraft}
                onUpdateLessonDraft={onUpdateLessonDraft}
                scope="scratch"
                t={t}
              />
              <Button type="button" variant="outline" onClick={onAddLessonDraft}>
                {t("syllabus.addLessonButton")}
              </Button>
            </div>

            <Button type="submit" disabled={isCreatingFromScratch}>
              {isCreatingFromScratch ? t("syllabus.creatingFromTemplate") : t("syllabus.createFromScratchButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const DetailsSection = ({
  isPublishing,
  isSavingRevision,
  isVersionLoading,
  onLoadLessonsIntoEditor,
  onPublish,
  onSaveRevision,
  selectedDraftId,
  selectedSaveSourceId,
  t,
  versionDetails,
}: {
  isPublishing: boolean;
  isSavingRevision: boolean;
  isVersionLoading: boolean;
  onLoadLessonsIntoEditor: () => void;
  onPublish: () => void;
  onSaveRevision: () => void;
  selectedDraftId: string | null;
  selectedSaveSourceId: string | null;
  t: TFunction;
  versionDetails: SyllabusVersionDetails;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("syllabus.selectedVersionDetails")}</CardTitle>
      </CardHeader>
      <CardContent>
        {isVersionLoading && <p className="text-muted-foreground text-sm">{t("syllabus.loadingVersionDetails")}</p>}

        {!isVersionLoading && !versionDetails && (
          <p className="text-muted-foreground text-sm">{t("syllabus.selectVersionFromCatalog")}</p>
        )}

        {versionDetails && (
          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium">{versionDetails.syllabusName}</p>
              <p className="text-muted-foreground text-xs">
                v{versionDetails.version} • {versionDetails.status} • {versionDetails.schoolName ?? t("syllabus.system")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onLoadLessonsIntoEditor}>
                {t("syllabus.loadLessonsIntoEditor")}
              </Button>
              <Button type="button" onClick={onSaveRevision} disabled={!selectedSaveSourceId || isSavingRevision}>
                {isSavingRevision ? t("syllabus.saving") : t("syllabus.saveAsNewDraftRevision")}
              </Button>
              <Button type="button" variant="secondary" onClick={onPublish} disabled={!selectedDraftId || isPublishing}>
                {isPublishing ? t("syllabus.publishing") : t("syllabus.publishAsFinalVersion")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const EditorSection = ({
  isPublishing,
  isSavingRevision,
  lessonDrafts,
  onAddLessonDraft,
  onPublish,
  onRemoveLessonDraft,
  onSaveRevision,
  onUpdateLessonDraft,
  selectedDraftId,
  selectedSaveSourceId,
  t,
  versionDetails,
}: {
  isPublishing: boolean;
  isSavingRevision: boolean;
  lessonDrafts: LessonDraft[];
  onAddLessonDraft: () => void;
  onPublish: () => void;
  onRemoveLessonDraft: (index: number) => void;
  onSaveRevision: () => void;
  onUpdateLessonDraft: (index: number, patch: Partial<LessonDraft>) => void;
  selectedDraftId: string | null;
  selectedSaveSourceId: string | null;
  t: TFunction;
  versionDetails: SyllabusVersionDetails;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("syllabus.lessonEditor")}</CardTitle>
      </CardHeader>
      <CardContent>
        {!versionDetails && <p className="text-muted-foreground text-sm">{t("syllabus.selectSyllabusToEdit")}</p>}

        {versionDetails && (
          <div className="space-y-4">
            <div className="space-y-2">
              <LessonDraftList
                lessonDrafts={lessonDrafts}
                onRemoveLessonDraft={onRemoveLessonDraft}
                onUpdateLessonDraft={onUpdateLessonDraft}
                scope="editor"
                t={t}
              />
              <Button type="button" variant="outline" onClick={onAddLessonDraft}>
                {t("syllabus.addLessonButton")}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onSaveRevision} disabled={!selectedSaveSourceId || isSavingRevision}>
                {isSavingRevision ? t("syllabus.saving") : t("syllabus.saveAsNewDraftRevision")}
              </Button>
              <Button type="button" variant="secondary" onClick={onPublish} disabled={!selectedDraftId || isPublishing}>
                {isPublishing ? t("syllabus.publishing") : t("syllabus.publishAsFinalVersion")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DeleteDraftDialog = ({
  draftPendingDelete,
  isDeletingDraft,
  onDeleteDraft,
  onDraftPendingDeleteChange,
  t,
}: {
  draftPendingDelete: CatalogItem | null;
  isDeletingDraft: boolean;
  onDeleteDraft: () => void;
  onDraftPendingDeleteChange: (item: CatalogItem | null) => void;
  t: TFunction;
}) => {
  return (
    <Dialog
      open={draftPendingDelete !== null}
      onOpenChange={(open) => {
        if (!open && !isDeletingDraft) {
          onDraftPendingDeleteChange(null);
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
          <Button type="button" variant="outline" disabled={isDeletingDraft} onClick={() => onDraftPendingDeleteChange(null)}>
            {t("syllabus.cancel")}
          </Button>
          <Button type="button" variant="destructive" disabled={isDeletingDraft} onClick={onDeleteDraft}>
            {isDeletingDraft ? t("syllabus.deleting") : t("syllabus.confirmDeleteDraftButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteAllDraftsDialog = ({
  isDeleteAllDialogOpen,
  isDeletingAllDrafts,
  onDeleteAllDialogOpenChange,
  onDeleteAllDrafts,
  t,
}: {
  isDeleteAllDialogOpen: boolean;
  isDeletingAllDrafts: boolean;
  onDeleteAllDialogOpenChange: (open: boolean) => void;
  onDeleteAllDrafts: () => void;
  t: TFunction;
}) => {
  return (
    <Dialog open={isDeleteAllDialogOpen} onOpenChange={onDeleteAllDialogOpenChange}>
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
            onClick={() => onDeleteAllDialogOpenChange(false)}
          >
            {t("syllabus.cancel")}
          </Button>
          <Button type="button" variant="destructive" disabled={isDeletingAllDrafts} onClick={onDeleteAllDrafts}>
            {isDeletingAllDrafts ? t("syllabus.deleting") : t("syllabus.confirmDeleteAllDraftsButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ActiveSectionContent = ({
  activeSection,
  createSection,
  catalogSection,
  detailsSection,
  editorSection,
}: {
  activeSection: ManagerSyllabusesSection;
  createSection: ReactNode;
  catalogSection: ReactNode;
  detailsSection: ReactNode;
  editorSection: ReactNode;
}) => {
  if (activeSection === "catalog") {
    return <>{catalogSection}</>;
  }

  if (activeSection === "create") {
    return <>{createSection}</>;
  }

  if (activeSection === "details") {
    return <>{detailsSection}</>;
  }

  if (activeSection === "editor") {
    return <>{editorSection}</>;
  }

  return null;
};

export const ManagerSyllabusesPageContent = ({
  activeSection,
  draftPendingDelete,
  editableDrafts,
  errorMessage,
  finalCandidates,
  obsoleteVersions,
  goToSection,
  isCreatingFromScratch,
  isCreatingFromTemplate,
  isDeleteAllDialogOpen,
  isDeletingAllDrafts,
  isDeletingDraft,
  isLoading,
  isPublishing,
  isSavingRevision,
  isVersionLoading,
  lessonDrafts,
  newSyllabusName,
  onAddLessonDraft,
  onCreateFromScratchSubmit,
  onCreateFromTemplateSubmit,
  onDeleteAllDialogOpenChange,
  onDeleteAllDrafts,
  onDeleteDraft,
  onDraftPendingDeleteChange,
  onLoadLessonsIntoEditor,
  onNewSyllabusNameChange,
  onOpenDeleteAllDialog,
  onPublish,
  onRemoveLessonDraft,
  onSaveRevision,
  onScratchNameChange,
  onSelectVersion,
  onTemplateVersionChange,
  onUpdateLessonDraft,
  scratchName,
  sectionContentRef,
  selectedDraftId,
  selectedSaveSourceId,
  t,
  templateVersionId,
  versionDetails,
}: ManagerSyllabusesPageContentProps) => {
  return (
    <>
      {isLoading && <p className="text-muted-foreground text-sm">{t("syllabus.loadingCatalog")}</p>}
      {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

      <StickyTabs activeSection={activeSection} goToSection={goToSection} t={t} />

      <div ref={sectionContentRef} className="scroll-mt-20">
        <ActiveSectionContent
          activeSection={activeSection}
          catalogSection={
            <CatalogSection
              editableDrafts={editableDrafts}
              finalCandidates={finalCandidates}
              obsoleteVersions={obsoleteVersions}
              isDeletingAllDrafts={isDeletingAllDrafts}
              onOpenDeleteAllDialog={onOpenDeleteAllDialog}
              onDraftPendingDeleteChange={onDraftPendingDeleteChange}
              onSelectVersion={onSelectVersion}
              t={t}
            />
          }
          createSection={
            <CreateSection
              finalCandidates={finalCandidates}
              isCreatingFromScratch={isCreatingFromScratch}
              isCreatingFromTemplate={isCreatingFromTemplate}
              lessonDrafts={lessonDrafts}
              newSyllabusName={newSyllabusName}
              onAddLessonDraft={onAddLessonDraft}
              onCreateFromScratchSubmit={onCreateFromScratchSubmit}
              onCreateFromTemplateSubmit={onCreateFromTemplateSubmit}
              onNewSyllabusNameChange={onNewSyllabusNameChange}
              onRemoveLessonDraft={onRemoveLessonDraft}
              onScratchNameChange={onScratchNameChange}
              onTemplateVersionChange={onTemplateVersionChange}
              onUpdateLessonDraft={onUpdateLessonDraft}
              scratchName={scratchName}
              t={t}
              templateVersionId={templateVersionId}
            />
          }
          detailsSection={
            <DetailsSection
              isPublishing={isPublishing}
              isSavingRevision={isSavingRevision}
              isVersionLoading={isVersionLoading}
              onLoadLessonsIntoEditor={onLoadLessonsIntoEditor}
              onPublish={onPublish}
              onSaveRevision={onSaveRevision}
              selectedDraftId={selectedDraftId}
              selectedSaveSourceId={selectedSaveSourceId}
              t={t}
              versionDetails={versionDetails}
            />
          }
          editorSection={
            <EditorSection
              isPublishing={isPublishing}
              isSavingRevision={isSavingRevision}
              lessonDrafts={lessonDrafts}
              onAddLessonDraft={onAddLessonDraft}
              onPublish={onPublish}
              onRemoveLessonDraft={onRemoveLessonDraft}
              onSaveRevision={onSaveRevision}
              onUpdateLessonDraft={onUpdateLessonDraft}
              selectedDraftId={selectedDraftId}
              selectedSaveSourceId={selectedSaveSourceId}
              t={t}
              versionDetails={versionDetails}
            />
          }
        />

        <DeleteDraftDialog
          draftPendingDelete={draftPendingDelete}
          isDeletingDraft={isDeletingDraft}
          onDeleteDraft={onDeleteDraft}
          onDraftPendingDeleteChange={onDraftPendingDeleteChange}
          t={t}
        />

        <DeleteAllDraftsDialog
          isDeleteAllDialogOpen={isDeleteAllDialogOpen}
          isDeletingAllDrafts={isDeletingAllDrafts}
          onDeleteAllDialogOpenChange={onDeleteAllDialogOpenChange}
          onDeleteAllDrafts={onDeleteAllDrafts}
          t={t}
        />
      </div>
    </>
  );
};
