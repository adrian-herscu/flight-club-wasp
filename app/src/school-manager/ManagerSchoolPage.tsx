import { type FormEvent, useMemo, useState } from "react";
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

const { getMyManagedSchool, updateMyManagedSchool, useQuery } = operations as any;

type ManagedSchool = {
  id: string;
  name: string;
  websiteUrl: string | null;
  phone: string | null;
  logoUrl: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string;
  country: string;
  currency: string;
  defaultHourlyRate: number | null;
  accounts: Array<{
    id: string;
    currency: string;
    balanceMinor: number;
  }>;
};

const labelClassName = "text-muted-foreground text-xs uppercase tracking-wide";
const valueClassName = "text-foreground text-sm font-medium";

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
  const { selectedSchool, selectedSchoolId, setSelectedSchoolId } = useManagedSchoolSelection(schools);
  const [hourlyRateDraftBySchoolId, setHourlyRateDraftBySchoolId] = useState<Record<string, string>>({});
  const [savingSchoolId, setSavingSchoolId] = useState<string | null>(null);

  const getHourlyRateDraft = (school: ManagedSchool) => {
    const cached = hourlyRateDraftBySchoolId[school.id];
    if (cached != null) {
      return cached;
    }

    return school.defaultHourlyRate != null ? String(school.defaultHourlyRate) : "";
  };

  const handleSaveDefaultHourlyRate = async (event: FormEvent, school: ManagedSchool) => {
    event.preventDefault();

    const draft = getHourlyRateDraft(school).trim();
    const parsedDefaultHourlyRate = draft === "" ? null : Number(draft);

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
        name: school.name,
        websiteUrl: school.websiteUrl ?? "",
        phone: school.phone ?? "",
        logoUrl: school.logoUrl ?? "",
        addressLine1: school.addressLine1,
        addressLine2: school.addressLine2 ?? "",
        city: school.city,
        stateProvince: school.stateProvince ?? "",
        postalCode: school.postalCode,
        defaultHourlyRate: parsedDefaultHourlyRate,
      });

      await refetch();

      toast({
        title: t("school.updatedSuccess"),
        description: t("school.defaultHourlyRateUpdatedMessage"),
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

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">{t("school.loadingSchoolDetails")}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-500">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && schools.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">{t("school.noManagedSchools")}</p>
          </CardContent>
        </Card>
      )}

      {schools.length > 0 && (
        <div className="grid gap-6" data-testid="manager-schools-list">
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.schools")}</CardTitle>
            </CardHeader>

          </Card>

          {(selectedSchool ? [selectedSchool] : []).map((school) => (
          <div key={school.id} className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("school.schoolProfile")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="rounded-md border p-4">
                <p className={labelClassName}>{t("school.currentProfile")}</p>
                <p className={valueClassName}>{school.name}</p>
                {school.websiteUrl ? (
                  <p className={valueClassName}>
                    <a
                      href={normalizeWebsiteUrl(school.websiteUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      {school.websiteUrl}
                    </a>
                  </p>
                ) : null}
                {school.phone ? (
                  <p className={valueClassName}>{school.phone}</p>
                ) : null}
                {school.logoUrl ? (
                  <div className="mt-2">
                    <img
                      src={school.logoUrl}
                      alt={school.name}
                      className="h-12 w-12 rounded object-cover"
                      onError={(event) => {
                        (event.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : null}
                <p className={valueClassName}>{school.addressLine1}</p>
                {school.addressLine2 ? (
                  <p className={valueClassName}>{school.addressLine2}</p>
                ) : null}
                <p className={valueClassName}>{school.city}</p>
                <p className={valueClassName}>{school.currency}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={labelClassName}>{t("school.countryLabel")}</p>
                  <p className={valueClassName}>{school.country}</p>
                </div>
                <div>
                  <p className={labelClassName}>{t("school.schoolCurrency")}</p>
                  <p className={valueClassName}>{school.currency}</p>
                </div>
              </div>

              <form
                className="grid gap-3 border-t pt-4"
                onSubmit={(event) => handleSaveDefaultHourlyRate(event, school)}
              >
                <div>
                  <p className={labelClassName}>{t("school.defaultHourlyRate")}</p>
                  <Input
                    type="number"
                    min={1}
                    value={getHourlyRateDraft(school)}
                    onChange={(event) =>
                      setHourlyRateDraftBySchoolId((prev) => ({
                        ...prev,
                        [school.id]: event.target.value,
                      }))
                    }
                    placeholder={t("school.defaultHourlyRatePlaceholder")}
                  />
                </div>

                <Button type="submit" disabled={savingSchoolId === school.id}>
                  {savingSchoolId === school.id ? t("school.savingButton") : t("school.saveDefaultHourlyRateButton")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("school.managerSchoolAccount")}</CardTitle>
            </CardHeader>
            <CardContent>
              {school.accounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("school.noAccountLinked")}
                </p>
              ) : (
                <div className="space-y-4">
                  {school.accounts.map((account) => (
                    <div key={account.id} className="rounded-md border p-4">
                      <p className={labelClassName}>{t("school.accountID")}</p>
                      <p className={valueClassName}>{account.id}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className={labelClassName}>{t("school.currencyLabel")}</p>
                          <p className={valueClassName}>{account.currency}</p>
                        </div>
                        <div>
                          <p className={labelClassName}>{t("school.balance")}</p>
                          <p className={valueClassName}>{account.balanceMinor}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
          ))}
        </div>
      )}
    </DefaultLayout>
  );
};

export default ManagerSchoolPage;
