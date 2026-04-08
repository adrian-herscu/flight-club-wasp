import { type FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import ManagerSchoolPageContent, {
  type ManagedSchool,
  type ManagedSchoolDraft,
} from "../client/components/patterns/ManagerSchoolPageContent";
import { toast } from "../client/hooks/use-toast";
import { useManagedSchoolSelection } from "./useManagedSchoolSelection";

const { getMyManagedSchool, updateMyManagedSchool, useQuery } = operations as any;

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  return hasScheme ? trimmed : `https://${trimmed}`;
}

const ManagerSchoolPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useQuery(getMyManagedSchool);
  const schools = useMemo(() => (data as ManagedSchool[] | undefined) ?? [], [data]);
  const { selectedSchool } = useManagedSchoolSelection(schools);
  const [schoolDraftBySchoolId, setSchoolDraftBySchoolId] = useState<
    Record<string, ManagedSchoolDraft>
  >({});
  const [savingSchoolId, setSavingSchoolId] = useState<string | null>(null);

  const getSchoolDraft = (school: ManagedSchool): ManagedSchoolDraft => {
    const cached = schoolDraftBySchoolId[school.id];
    if (cached) {
      return cached;
    }

    return {
      name: school.name,
      websiteUrl: school.websiteUrl ?? "",
      logoUrl: school.logoUrl ?? "",
      addressLine1: school.addressLine1,
      addressLine2: school.addressLine2 ?? "",
      city: school.city,
      stateProvince: school.stateProvince ?? "",
      postalCode: school.postalCode,
      defaultHourlyRate: school.defaultHourlyRate != null ? String(school.defaultHourlyRate) : "",
    };
  };

  const updateSchoolDraft = (
    school: ManagedSchool,
    field: keyof ManagedSchoolDraft,
    value: string,
  ) => {
    setSchoolDraftBySchoolId((prev) => ({
      ...prev,
      [school.id]: {
        ...getSchoolDraft(school),
        [field]: value,
      },
    }));
  };

  const handleSaveSchoolDetails = async (event: FormEvent, school: ManagedSchool) => {
    event.preventDefault();

    const draft = getSchoolDraft(school);
    const parsedDefaultHourlyRate =
      draft.defaultHourlyRate.trim() === "" ? null : Number(draft.defaultHourlyRate.trim());

    if (
      parsedDefaultHourlyRate != null &&
      (!Number.isInteger(parsedDefaultHourlyRate) || parsedDefaultHourlyRate <= 0)
    ) {
      toast({
        title: t("school.invalidDefaultHourlyRate"),
        description: t("school.defaultHourlyRatePositiveInteger"),
        variant: "destructive",
      });
      return;
    }

    setSavingSchoolId(school.id);
    try {
      await updateMyManagedSchool({
        schoolId: school.id,
        name: draft.name,
        websiteUrl: draft.websiteUrl,
        logoUrl: draft.logoUrl,
        addressLine1: draft.addressLine1,
        addressLine2: draft.addressLine2,
        city: draft.city,
        stateProvince: draft.stateProvince,
        postalCode: draft.postalCode,
        defaultHourlyRate: parsedDefaultHourlyRate,
      });

      await refetch();

      toast({
        title: t("school.updatedSuccess"),
        description: t("school.updateSuccessMessage"),
      });
    } catch (updateError: unknown) {
      toast({
        title: t("school.updateFailedMessage"),
        description: updateError instanceof Error ? updateError.message : t("school.updateErrorMessage"),
        variant: "destructive",
      });
    } finally {
      setSavingSchoolId(null);
    }
  };

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.schools")} />
      <ManagerSchoolPageContent
        isLoading={isLoading}
        error={error as Error | null}
        schools={schools}
        selectedSchool={selectedSchool}
        getSchoolDraft={getSchoolDraft}
        updateSchoolDraft={updateSchoolDraft}
        handleSaveSchoolDetails={handleSaveSchoolDetails}
        savingSchoolId={savingSchoolId}
        t={t}
        normalizeWebsiteUrl={normalizeWebsiteUrl}
      />
    </DefaultLayout>
  );
};

export default ManagerSchoolPage;
