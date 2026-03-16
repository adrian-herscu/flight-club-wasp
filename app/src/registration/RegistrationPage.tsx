import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { toast } from "../client/hooks/use-toast";

const {
  getMyRegistrationRequests,
  getRegistrationSchoolOptions,
  submitRegistrationRequest,
  useQuery,
} = operations as any;

type RegistrationRole = "SCHOOL_MANAGER" | "INSTRUCTOR" | "STUDENT";

type SchoolOption = {
  id: string;
  name: string;
  city: string;
  country: string;
  websiteUrl: string | null;
};

function normalizeWebsiteUrlForLink(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
  return hasScheme ? trimmed : `https://${trimmed}`;
}

function isValidWebsiteUrl(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    const parsed = new URL(normalizeWebsiteUrlForLink(value));
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export default function RegistrationPage({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const currentUser = user as AuthUser & { fullName?: string | null; phone?: string | null };
  const initialFullName = typeof currentUser.fullName === "string" ? currentUser.fullName : "";
  const initialPhone = typeof user.phone === "string" ? user.phone : "";
  const requestedRoleParam = searchParams.get("role");
  const targetSchoolIdParam = searchParams.get("schoolId") ?? "";
  const initialRequestedRole: RegistrationRole =
    requestedRoleParam === "INSTRUCTOR" ||
    requestedRoleParam === "STUDENT" ||
    requestedRoleParam === "SCHOOL_MANAGER"
      ? requestedRoleParam
      : "SCHOOL_MANAGER";

  const { data: existingRequestsData, isLoading, refetch } = useQuery(getMyRegistrationRequests);
  const { data: schoolOptionsData } = useQuery(getRegistrationSchoolOptions);

  const existingRequests = (existingRequestsData as any[] | undefined) ?? [];
  const schoolOptions = (schoolOptionsData as SchoolOption[] | undefined) ?? [];
  const schoolOptionsById = useMemo(
    () => new Map(schoolOptions.map((school) => [school.id, school])),
    [schoolOptions],
  );

  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [requestedRole, setRequestedRole] = useState<RegistrationRole>(initialRequestedRole);
  const [targetSchoolId, setTargetSchoolId] = useState(targetSchoolIdParam);
  const [requestedSchoolName, setRequestedSchoolName] = useState("");
  const [requestedWebsiteUrl, setRequestedWebsiteUrl] = useState("");
  const [requestedAddressLine1, setRequestedAddressLine1] = useState("");
  const [requestedAddressLine2, setRequestedAddressLine2] = useState("");
  const [requestedCity, setRequestedCity] = useState("");
  const [requestedStateProvince, setRequestedStateProvince] = useState("");
  const [requestedPostalCode, setRequestedPostalCode] = useState("");
  const [requestedCountry, setRequestedCountry] = useState("");
  const [requestedCurrency, setRequestedCurrency] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManagerRequest = requestedRole === "SCHOOL_MANAGER";

  const handleSubmit = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast({
        title: t("registration.missingDetails"),
        description: t("registration.missingDetailsError"),
        variant: "destructive",
      });
      return;
    }

    if (isManagerRequest) {
      const missingFields: string[] = [];

      if (!requestedSchoolName.trim()) missingFields.push(t("registration.schoolName"));
      if (!requestedAddressLine1.trim()) missingFields.push(t("registration.addressLine1"));
      if (!requestedCity.trim()) missingFields.push(t("registration.city"));
      if (!requestedPostalCode.trim()) missingFields.push(t("registration.postalCode"));
      if (!requestedCountry.trim()) missingFields.push(t("registration.countryCode"));
      if (!requestedCurrency.trim()) missingFields.push(t("registration.currencyCode"));

      if (missingFields.length > 0) {
        toast({
          title: t("registration.missingSchoolDetails"),
          description: t("registration.missingFields", { fields: missingFields.join(", ") }),
          variant: "destructive",
        });
        return;
      }

      if (requestedCountry.trim().length !== 2) {
        toast({
          title: t("registration.invalidCountryCode"),
          description: t("registration.invalidCountryCodeError"),
          variant: "destructive",
        });
        return;
      }

      if (requestedCurrency.trim().length !== 3) {
        toast({
          title: t("registration.invalidCurrencyCode"),
          description: t("registration.invalidCurrencyCodeError"),
          variant: "destructive",
        });
        return;
      }

      if (!isValidWebsiteUrl(requestedWebsiteUrl)) {
        toast({
          title: t("registration.invalidWebsiteUrl"),
          description: t("registration.invalidWebsiteUrlError"),
          variant: "destructive",
        });
        return;
      }
    }

    if (!isManagerRequest && !targetSchoolId) {
      toast({
        title: t("registration.schoolRequired"),
        description: t("registration.schoolRequiredError"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRegistrationRequest({
        fullName,
        phone,
        requestedRole,
        targetSchoolId: isManagerRequest ? undefined : targetSchoolId,
        requestedSchoolName: isManagerRequest ? requestedSchoolName.trim() : undefined,
        requestedWebsiteUrl:
          isManagerRequest ? requestedWebsiteUrl.trim() || undefined : undefined,
        requestedAddressLine1: isManagerRequest ? requestedAddressLine1.trim() : undefined,
        requestedAddressLine2: isManagerRequest ? requestedAddressLine2.trim() || undefined : undefined,
        requestedCity: isManagerRequest ? requestedCity.trim() : undefined,
        requestedStateProvince: isManagerRequest ? requestedStateProvince.trim() || undefined : undefined,
        requestedPostalCode: isManagerRequest ? requestedPostalCode.trim() : undefined,
        requestedCountry: isManagerRequest ? requestedCountry.trim().toUpperCase() : undefined,
        requestedCurrency: isManagerRequest ? requestedCurrency.trim().toUpperCase() : undefined,
      });
      await refetch();
      toast({
        title: t("registration.requestSubmitted"),
        description: t("registration.submissionSuccess"),
      });
    } catch (error: unknown) {
      toast({
        title: t("registration.submissionFailed"),
        description: error instanceof Error ? error.message : t("registration.submissionError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto mt-10 max-w-3xl px-6">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">{t("common.loading")}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-3xl px-6 pb-10">
      {existingRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("registration.registration")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {existingRequests.map((request) => {
              const resolvedSchool = request.targetSchoolId
                ? schoolOptionsById.get(request.targetSchoolId)
                : null;

              return (
                <div key={request.id} className="space-y-2 rounded-md border p-4">
                  <p>
                    {t("registration.requestTypeLabel")} <strong>{request.requestedRole}</strong>
                  </p>
                  <p>
                    {t("registration.statusLabel")} <strong>{request.status}</strong>
                  </p>
                  {request.requestedRole === "SCHOOL_MANAGER" ? (
                    <p>
                      {t("registration.schoolLabel")} <strong>{request.requestedSchoolName ?? "-"}</strong>
                    </p>
                  ) : (
                    <p>
                      {t("registration.schoolLabel")} <strong>{resolvedSchool?.name ?? request.targetSchool?.name ?? "-"}</strong>
                    </p>
                  )}
                  {request.rejectionReason && (
                    <div>
                      <p className="font-medium">{t("registration.reasonLabel")}</p>
                      <p className="text-muted-foreground">{request.rejectionReason}</p>
                    </div>
                  )}
                </div>
              );
            })}
            <p className="text-muted-foreground">{t("registration.refreshMessage")}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("registration.registration")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("registration.fullName")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder={t("registration.fullName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("registration.phoneNumber")}</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t("registration.phoneNumber")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("registration.selectRole")}</Label>
            <Select
              value={requestedRole}
              onValueChange={(value) => setRequestedRole(value as RegistrationRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHOOL_MANAGER">{t("registration.schoolManager")}</SelectItem>
                <SelectItem value="INSTRUCTOR">{t("registration.instructor")}</SelectItem>
                <SelectItem value="STUDENT">{t("registration.student")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isManagerRequest ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedSchoolName">{t("registration.schoolName")}</Label>
                <Input
                  id="requestedSchoolName"
                  value={requestedSchoolName}
                  onChange={(event) => setRequestedSchoolName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedWebsiteUrl">{t("registration.websiteUrl")}</Label>
                <Input
                  id="requestedWebsiteUrl"
                  value={requestedWebsiteUrl}
                  onChange={(event) => setRequestedWebsiteUrl(event.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedAddressLine1">{t("registration.addressLine1")}</Label>
                <Input
                  id="requestedAddressLine1"
                  value={requestedAddressLine1}
                  onChange={(event) => setRequestedAddressLine1(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedAddressLine2">{t("registration.addressLine2")}</Label>
                <Input
                  id="requestedAddressLine2"
                  value={requestedAddressLine2}
                  onChange={(event) => setRequestedAddressLine2(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="requestedCity">{t("registration.city")}</Label>
                  <Input
                    id="requestedCity"
                    value={requestedCity}
                    onChange={(event) => setRequestedCity(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedStateProvince">{t("registration.stateProvince")}</Label>
                  <Input
                    id="requestedStateProvince"
                    value={requestedStateProvince}
                    onChange={(event) => setRequestedStateProvince(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="requestedPostalCode">{t("registration.postalCode")}</Label>
                  <Input
                    id="requestedPostalCode"
                    value={requestedPostalCode}
                    onChange={(event) => setRequestedPostalCode(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedCountry">{t("registration.countryCode")}</Label>
                  <Input
                    id="requestedCountry"
                    maxLength={2}
                    value={requestedCountry}
                    onChange={(event) => setRequestedCountry(event.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedCurrency">{t("registration.currencyCode")}</Label>
                  <Input
                    id="requestedCurrency"
                    maxLength={3}
                    value={requestedCurrency}
                    onChange={(event) => setRequestedCurrency(event.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t("registration.selectSchool")}</Label>
              <Select value={targetSchoolId} onValueChange={setTargetSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("registration.chooseSchool")} />
                </SelectTrigger>
                <SelectContent>
                  {schoolOptions.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name} ({school.city}, {school.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolOptions.length === 0 && (
                <p className="text-muted-foreground text-sm">{t("registration.noSchoolsAvailable")}</p>
              )}
              {schoolOptions.some((school) => Boolean(school.websiteUrl)) && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">{t("registration.schoolWebsites")}</p>
                  <ul className="space-y-1 text-sm">
                    {schoolOptions.map((school) => {
                      if (!school.websiteUrl) {
                        return null;
                      }

                      const href = normalizeWebsiteUrlForLink(school.websiteUrl);

                      return (
                        <li key={`school-website-${school.id}`} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <span className="font-medium">{school.name}</span>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            {school.websiteUrl}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            {t("registration.userRoleNotice")}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? t("registration.submitting") : t("registration.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
