import { type FormEvent, useEffect, useState } from "react";
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

const { getMyManagedSchool, updateMyManagedSchool, useQuery } = operations as any;

type ManagedSchool = {
  name: string;
  websiteUrl: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string;
  country: string;
  currency: string;
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

function isValidOptionalWebsiteUrl(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    const parsed = new URL(normalizeWebsiteUrl(value));
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

const ManagerSchoolPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useQuery(getMyManagedSchool);
  const school = data as ManagedSchool | undefined;

  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!school) return;

    setName(school.name);
    setWebsiteUrl(school.websiteUrl ?? "");
    setAddressLine1(school.addressLine1);
    setAddressLine2(school.addressLine2 ?? "");
    setCity(school.city);
    setStateProvince(school.stateProvince ?? "");
    setPostalCode(school.postalCode);
  }, [school]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();

    if (!isValidOptionalWebsiteUrl(websiteUrl)) {
      toast({
        title: t("school.invalidWebsiteUrl"),
        description: t("school.invalidWebsiteUrlError"),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateMyManagedSchool({
        name,
        websiteUrl: websiteUrl.trim() || undefined,
        addressLine1,
        addressLine2,
        city,
        stateProvince,
        postalCode,
      });
      await refetch();
      toast({
        title: t("school.updatedSuccess"),
        description: t("school.updateSuccessMessage"),
      });
    } catch (saveError: unknown) {
      toast({
        title: t("school.updateFailedMessage"),
        description:
          saveError instanceof Error
            ? saveError.message
            : t("school.updateErrorMessage"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("school.mySchool")} />

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

      {school && (
        <div className="grid gap-6 xl:grid-cols-2">
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
                <p className={valueClassName}>{school.addressLine1}</p>
                {school.addressLine2 ? (
                  <p className={valueClassName}>{school.addressLine2}</p>
                ) : null}
                <p className={valueClassName}>{school.city}</p>
                <p className={valueClassName}>{school.currency}</p>
              </div>

              <form onSubmit={handleSave} className="grid gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="school-name">{t("school.name")}</Label>
                  <Input
                    id="school-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="school-website-url">{t("school.websiteUrl")}</Label>
                  <Input
                    id="school-website-url"
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="school-address-line1">{t("school.addressLine1")}</Label>
                  <Input
                    id="school-address-line1"
                    value={addressLine1}
                    onChange={(event) => setAddressLine1(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="school-address-line2">{t("school.addressLine2")}</Label>
                  <Input
                    id="school-address-line2"
                    value={addressLine2}
                    onChange={(event) => setAddressLine2(event.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="school-city">{t("school.cityLabel")}</Label>
                    <Input
                      id="school-city"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="school-state">{t("school.stateProvinceLabel")}</Label>
                    <Input
                      id="school-state"
                      value={stateProvince}
                      onChange={(event) => setStateProvince(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="school-postal-code">{t("school.postalCodeLabel")}</Label>
                  <Input
                    id="school-postal-code"
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                  />
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

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? t("school.savingButton") : t("school.saveDetailsButton")}
                  </Button>
                </div>
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
      )}
    </DefaultLayout>
  );
};

export default ManagerSchoolPage;
