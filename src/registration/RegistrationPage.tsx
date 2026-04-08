import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import InfoPanel from "../client/components/patterns/InfoPanel";
import LabeledInputField from "../client/components/patterns/LabeledInputField";
import LabeledSelectField from "../client/components/patterns/LabeledSelectField";
import {
  EmptyValue,
  EndAlignedActions,
  ExternalLinkText,
  Grid,
  InlineLabel,
  LabelValueParagraph,
  NoticeBox,
  PageContainer,
  Paragraph,
  RejectionReasonBlock,
  SchoolLogo,
  SchoolSelectOptionContent,
  Stack,
  SurfaceCard,
  SurfaceCardContent,
  SurfaceCardHeader,
  WebsiteList,
  WebsiteListItem,
} from "../client/components/patterns/RegistrationPagePrimitives";
import { Button } from "../client/components/ui/button";
import { SelectItem } from "../client/components/ui/select";
import { toast } from "../client/hooks/use-toast";

const {
  getMyRegistrationRequests,
  getRegistrationSchoolOptions,
  submitRegistrationRequest,
  useQuery,
} = operations as any;

type RegistrationRole = "SCHOOL_MANAGER" | "INSTRUCTOR";

type SchoolOption = {
  id: string;
  name: string;
  city: string;
  country: string;
  websiteUrl: string | null;
  logoUrl: string | null;
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

function isValidLogoUrl(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  try {
    const parsed = new URL(normalizeWebsiteUrlForLink(value));
    return (
      Boolean(parsed.hostname) &&
      (parsed.protocol === "https:" || parsed.protocol === "http:")
    );
  } catch {
    return false;
  }
}

export default function RegistrationPage({ user }: { user: AuthUser }) {
  const { t } = useTranslation();

  const currentUser = user as AuthUser & { fullName?: string | null; phone?: string | null };
  const initialFullName = typeof currentUser.fullName === "string" ? currentUser.fullName : "";
  const initialPhone = typeof user.phone === "string" ? user.phone : "";

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
  const [requestedRole, setRequestedRole] = useState<RegistrationRole>("SCHOOL_MANAGER");
  const [targetSchoolId, setTargetSchoolId] = useState("");
  const [requestedSchoolName, setRequestedSchoolName] = useState("");
  const [requestedWebsiteUrl, setRequestedWebsiteUrl] = useState("");
  const [requestedLogoUrl, setRequestedLogoUrl] = useState("");
  const [requestedAddressLine1, setRequestedAddressLine1] = useState("");
  const [requestedAddressLine2, setRequestedAddressLine2] = useState("");
  const [requestedCity, setRequestedCity] = useState("");
  const [requestedStateProvince, setRequestedStateProvince] = useState("");
  const [requestedPostalCode, setRequestedPostalCode] = useState("");
  const [requestedCountry, setRequestedCountry] = useState("");
  const [requestedCurrency, setRequestedCurrency] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasHydratedManagerFields, setHasHydratedManagerFields] = useState(false);

  const isManagerRequest = requestedRole === "SCHOOL_MANAGER";

  useEffect(() => {
    if (!isManagerRequest || hasHydratedManagerFields) {
      return;
    }

    const latestPendingManagerRequest = existingRequests.find(
      (request) =>
        request.requestedRole === "SCHOOL_MANAGER" &&
        request.status === "PENDING",
    );

    if (!latestPendingManagerRequest) {
      return;
    }

    setRequestedSchoolName(latestPendingManagerRequest.requestedSchoolName ?? "");
    setRequestedWebsiteUrl(latestPendingManagerRequest.requestedWebsiteUrl ?? "");
    setRequestedLogoUrl(latestPendingManagerRequest.requestedLogoUrl ?? "");
    setRequestedAddressLine1(latestPendingManagerRequest.requestedAddressLine1 ?? "");
    setRequestedAddressLine2(latestPendingManagerRequest.requestedAddressLine2 ?? "");
    setRequestedCity(latestPendingManagerRequest.requestedCity ?? "");
    setRequestedStateProvince(latestPendingManagerRequest.requestedStateProvince ?? "");
    setRequestedPostalCode(latestPendingManagerRequest.requestedPostalCode ?? "");
    setRequestedCountry((latestPendingManagerRequest.requestedCountry ?? "").toUpperCase());
    setRequestedCurrency((latestPendingManagerRequest.requestedCurrency ?? "").toUpperCase());
    setHasHydratedManagerFields(true);
  }, [existingRequests, hasHydratedManagerFields, isManagerRequest]);

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

      if (!isValidLogoUrl(requestedLogoUrl)) {
        toast({
          title: t("registration.invalidLogoUrl"),
          description: t("registration.invalidLogoUrlError"),
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
        requestedLogoUrl: isManagerRequest ? requestedLogoUrl.trim() || undefined : undefined,
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
      <PageContainer variant="loading">
        <SurfaceCard>
          <SurfaceCardContent variant="loading">{t("common.loading")}</SurfaceCardContent>
        </SurfaceCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="main">
      {existingRequests.length > 0 && (
        <SurfaceCard variant="withBottomMargin">
          <SurfaceCardHeader title={t("registration.registration")} />
          <SurfaceCardContent variant="requests">
            {existingRequests.map((request) => {
              const resolvedSchool = request.targetSchoolId
                ? schoolOptionsById.get(request.targetSchoolId)
                : null;

              return (
                <InfoPanel key={request.id} variant="requestSummary">
                  <LabelValueParagraph
                    label={t("registration.requestTypeLabel")}
                    value={request.requestedRole}
                  />
                  <LabelValueParagraph
                    label={t("registration.statusLabel")}
                    value={request.status}
                  />
                  {request.requestedRole === "SCHOOL_MANAGER" ? (
                    <LabelValueParagraph
                      label={t("registration.schoolLabel")}
                      value={request.requestedSchoolName ?? "-"}
                    />
                  ) : (
                    <LabelValueParagraph
                      label={t("registration.schoolLabel")}
                      value={resolvedSchool?.name ?? request.targetSchool?.name ?? "-"}
                    />
                  )}
                  {request.rejectionReason && (
                    <RejectionReasonBlock
                      label={t("registration.reasonLabel")}
                      reason={request.rejectionReason}
                    />
                  )}
                </InfoPanel>
              );
            })}
            <Paragraph muted>{t("registration.refreshMessage")}</Paragraph>
          </SurfaceCardContent>
        </SurfaceCard>
      )}

      <SurfaceCard>
        <SurfaceCardHeader title={t("registration.registration")} />
        <SurfaceCardContent variant="form">
          <Grid variant="twoColumns">
            <LabeledInputField
              id="fullName"
              label={t("registration.fullName")}
              value={fullName}
              onChange={setFullName}
              placeholder={t("registration.fullName")}
            />
            <LabeledInputField
              id="phone"
              label={t("registration.phoneNumber")}
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder={t("registration.phoneNumber")}
            />
          </Grid>

          <LabeledSelectField
            id="registration-requested-role"
            label={t("registration.selectRole")}
            value={requestedRole}
            onValueChange={(value) => setRequestedRole(value as RegistrationRole)}
          >
            <SelectItem value="SCHOOL_MANAGER">{t("registration.schoolManager")}</SelectItem>
            <SelectItem value="INSTRUCTOR">{t("registration.instructor")}</SelectItem>
          </LabeledSelectField>

          {isManagerRequest ? (
            <Stack variant="fieldGroup">
              <LabeledInputField
                id="requestedSchoolName"
                label={t("registration.schoolName")}
                value={requestedSchoolName}
                onChange={setRequestedSchoolName}
              />
              <LabeledInputField
                id="requestedWebsiteUrl"
                label={t("registration.websiteUrl")}
                value={requestedWebsiteUrl}
                onChange={setRequestedWebsiteUrl}
                placeholder="https://example.com"
              />
              <LabeledInputField
                id="requestedLogoUrl"
                label={t("registration.logoUrl")}
                value={requestedLogoUrl}
                onChange={setRequestedLogoUrl}
                placeholder="https://example.com/logo.png"
              />
              <LabeledInputField
                id="requestedAddressLine1"
                label={t("registration.addressLine1")}
                value={requestedAddressLine1}
                onChange={setRequestedAddressLine1}
              />
              <LabeledInputField
                id="requestedAddressLine2"
                label={t("registration.addressLine2")}
                value={requestedAddressLine2}
                onChange={setRequestedAddressLine2}
              />
              <Grid variant="twoColumns">
                <LabeledInputField
                  id="requestedCity"
                  label={t("registration.city")}
                  value={requestedCity}
                  onChange={setRequestedCity}
                />
                <LabeledInputField
                  id="requestedStateProvince"
                  label={t("registration.stateProvince")}
                  value={requestedStateProvince}
                  onChange={setRequestedStateProvince}
                />
              </Grid>
              <Grid variant="threeColumns">
                <LabeledInputField
                  id="requestedPostalCode"
                  label={t("registration.postalCode")}
                  value={requestedPostalCode}
                  onChange={setRequestedPostalCode}
                />
                <LabeledInputField
                  id="requestedCountry"
                  label={t("registration.countryCode")}
                  value={requestedCountry}
                  maxLength={2}
                  onChange={(value) => setRequestedCountry(value.toUpperCase())}
                />
                <LabeledInputField
                  id="requestedCurrency"
                  label={t("registration.currencyCode")}
                  value={requestedCurrency}
                  maxLength={3}
                  onChange={(value) => setRequestedCurrency(value.toUpperCase())}
                />
              </Grid>
            </Stack>
          ) : (
            <Stack variant="selector">
              <LabeledSelectField
                id="registration-school-select"
                label={t("registration.selectSchool")}
                value={targetSchoolId}
                onValueChange={setTargetSchoolId}
                placeholder={t("registration.chooseSchool")}
              >
                {schoolOptions.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    <SchoolSelectOptionContent
                      schoolName={school.name}
                      city={school.city}
                      country={school.country}
                      logo={
                        <SchoolLogo
                          schoolName={school.name}
                          logoUrl={school.logoUrl}
                          variant="selectOption"
                        />
                      }
                    />
                  </SelectItem>
                ))}
              </LabeledSelectField>
              {schoolOptions.length === 0 && (
                <Paragraph muted>{t("registration.noSchoolsAvailable")}</Paragraph>
              )}
              {schoolOptions.length > 0 && (
                <InfoPanel variant="compact">
                  <Paragraph strong>{t("registration.schoolWebsites")}</Paragraph>
                  <WebsiteList>
                    {schoolOptions.map((school) => {
                      const href = school.websiteUrl
                        ? normalizeWebsiteUrlForLink(school.websiteUrl)
                        : null;

                      return (
                        <WebsiteListItem key={`school-website-${school.id}`}>
                          <SchoolLogo
                            schoolName={school.name}
                            logoUrl={school.logoUrl}
                            variant="websiteList"
                            testId="registration-school-logo"
                          />
                          <InlineLabel>{school.name}</InlineLabel>
                          {href ? (
                            <ExternalLinkText href={href}>
                              {school.websiteUrl}
                            </ExternalLinkText>
                          ) : (
                            <EmptyValue />
                          )}
                        </WebsiteListItem>
                      );
                    })}
                  </WebsiteList>
                </InfoPanel>
              )}
            </Stack>
          )}

          <NoticeBox>{t("registration.userRoleNotice")}</NoticeBox>

          <EndAlignedActions>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? t("registration.submitting") : t("registration.submit")}
            </Button>
          </EndAlignedActions>
        </SurfaceCardContent>
      </SurfaceCard>
    </PageContainer>
  );
}
