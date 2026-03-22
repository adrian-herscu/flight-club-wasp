import { type FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
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

type ManagedSchoolDraft = {
  name: string;
  websiteUrl: string;
  phone: string;
  logoUrl: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  defaultHourlyRate: string;
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
      phone: school.phone ?? "",
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
        phone: draft.phone,
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
          {(selectedSchool ? [selectedSchool] : []).map((school) => {
            const draft = getSchoolDraft(school);

            return (
              <div key={school.id} className="grid gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("school.schoolProfile")}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-5">
                    <form
                      className="grid gap-3 border-t pt-4"
                      onSubmit={(event) => handleSaveSchoolDetails(event, school)}
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`school-name-${school.id}`}>{t("school.name")}</Label>
                          <Input
                            id={`school-name-${school.id}`}
                            value={draft.name}
                            onChange={(event) => updateSchoolDraft(school, "name", event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`school-phone-${school.id}`}>{t("school.phone")}</Label>
                          <Input
                            id={`school-phone-${school.id}`}
                            value={draft.phone}
                            onChange={(event) => updateSchoolDraft(school, "phone", event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`school-website-${school.id}`}>{t("school.websiteUrl")}</Label>
                          <Input
                            id={`school-website-${school.id}`}
                            value={draft.websiteUrl}
                            onChange={(event) => updateSchoolDraft(school, "websiteUrl", event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`school-logo-${school.id}`}>{t("school.logoUrl")}</Label>
                          <Input
                            id={`school-logo-${school.id}`}
                            value={draft.logoUrl}
                            onChange={(event) => updateSchoolDraft(school, "logoUrl", event.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`school-address-line1-${school.id}`}>{t("school.addressLine1")}</Label>
                        <Input
                          id={`school-address-line1-${school.id}`}
                          value={draft.addressLine1}
                          onChange={(event) =>
                            updateSchoolDraft(school, "addressLine1", event.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`school-address-line2-${school.id}`}>{t("school.addressLine2")}</Label>
                        <Input
                          id={`school-address-line2-${school.id}`}
                          value={draft.addressLine2}
                          onChange={(event) =>
                            updateSchoolDraft(school, "addressLine2", event.target.value)
                          }
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`school-city-${school.id}`}>{t("school.cityLabel")}</Label>
                          <Input
                            id={`school-city-${school.id}`}
                            value={draft.city}
                            onChange={(event) => updateSchoolDraft(school, "city", event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`school-state-${school.id}`}>{t("school.stateProvinceLabel")}</Label>
                          <Input
                            id={`school-state-${school.id}`}
                            value={draft.stateProvince}
                            onChange={(event) =>
                              updateSchoolDraft(school, "stateProvince", event.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`school-postal-code-${school.id}`}>
                            {t("school.postalCodeLabel")}
                          </Label>
                          <Input
                            id={`school-postal-code-${school.id}`}
                            value={draft.postalCode}
                            onChange={(event) =>
                              updateSchoolDraft(school, "postalCode", event.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`school-country-${school.id}`}>{t("school.countryLabel")}</Label>
                          <Input id={`school-country-${school.id}`} value={school.country} disabled />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`school-currency-${school.id}`}>{t("school.schoolCurrency")}</Label>
                          <Input id={`school-currency-${school.id}`} value={school.currency} disabled />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`school-default-hourly-rate-${school.id}`}>
                          {t("school.defaultHourlyRate")}
                        </Label>
                        <Input
                          id={`school-default-hourly-rate-${school.id}`}
                          type="number"
                          min={1}
                          value={draft.defaultHourlyRate}
                          onChange={(event) =>
                            updateSchoolDraft(school, "defaultHourlyRate", event.target.value)
                          }
                          placeholder={t("school.defaultHourlyRatePlaceholder")}
                        />
                      </div>

                      <Button type="submit" disabled={savingSchoolId === school.id}>
                        {savingSchoolId === school.id
                          ? t("school.savingButton")
                          : t("school.saveDetailsButton")}
                      </Button>
                    </form>

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
                      {school.phone ? <p className={valueClassName}>{school.phone}</p> : null}
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
                      {school.addressLine2 ? <p className={valueClassName}>{school.addressLine2}</p> : null}
                      <p className={valueClassName}>{school.city}</p>
                      <p className={valueClassName}>{school.currency}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("school.managerSchoolAccount")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {school.accounts.length === 0 ? (
                      <p className="text-muted-foreground text-sm">{t("school.noAccountLinked")}</p>
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
            );
          })}
        </div>
      )}
    </DefaultLayout>
  );
};

export default ManagerSchoolPage;
