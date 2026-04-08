import { type FormEvent, type ReactNode } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import InfoPair from "./InfoPair";
import InfoPanel from "./InfoPanel";
import LabeledInputField from "./LabeledInputField";
import SafeImage from "./SafeImage";

export type ManagedSchool = {
  id: string;
  name: string;
  websiteUrl: string | null;
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

export type ManagedSchoolDraft = {
  name: string;
  websiteUrl: string;
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

type StateCardProps = {
  children: ReactNode;
  tone?: "default" | "danger";
};

const stateTextClasses: Record<NonNullable<StateCardProps["tone"]>, string> = {
  default: "text-muted-foreground text-sm",
  danger: "text-sm text-red-500",
};

const StateCard = ({ children, tone = "default" }: StateCardProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className={stateTextClasses[tone]}>{children}</p>
      </CardContent>
    </Card>
  );
};

const PageGrid = ({ children, testId }: { children: ReactNode; testId: string }) => {
  return (
    <div className="grid gap-6" data-testid={testId}>
      {children}
    </div>
  );
};

const SchoolSectionsGrid = ({ children }: { children: ReactNode }) => {
  return <div className="grid gap-6 xl:grid-cols-2">{children}</div>;
};

const FormSection = ({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => {
  return (
    <form className="grid gap-3 border-t pt-4" onSubmit={onSubmit}>
      {children}
    </form>
  );
};

const TwoColumnFields = ({ children }: { children: ReactNode }) => {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
};

const ThreeColumnFields = ({ children }: { children: ReactNode }) => {
  return <div className="grid gap-3 sm:grid-cols-3">{children}</div>;
};

const SummaryText = ({ children }: { children: ReactNode }) => {
  return <p className={valueClassName}>{children}</p>;
};

const MutedText = ({ children }: { children: ReactNode }) => {
  return <p className="text-muted-foreground text-sm">{children}</p>;
};

const WebsiteSummaryLink = ({ href, text }: { href: string; text: string }) => {
  return (
    <p className={valueClassName}>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
        {text}
      </a>
    </p>
  );
};

const SchoolLogoPreview = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <div className="mt-2">
      <SafeImage src={src} alt={alt} className="h-12 w-12 rounded object-cover" />
    </div>
  );
};

const AccountsList = ({ children }: { children: ReactNode }) => {
  return <div className="space-y-4">{children}</div>;
};

const AccountDetailsGrid = ({ children }: { children: ReactNode }) => {
  return <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>;
};

type ManagerSchoolPageContentProps = {
  isLoading: boolean;
  error: Error | null;
  schools: ManagedSchool[];
  selectedSchool: ManagedSchool | null | undefined;
  getSchoolDraft: (school: ManagedSchool) => ManagedSchoolDraft;
  updateSchoolDraft: (school: ManagedSchool, field: keyof ManagedSchoolDraft, value: string) => void;
  handleSaveSchoolDetails: (event: FormEvent<HTMLFormElement>, school: ManagedSchool) => void | Promise<void>;
  savingSchoolId: string | null;
  t: (key: string) => string;
  normalizeWebsiteUrl: (value: string) => string;
};

const ManagerSchoolPageContent = ({
  isLoading,
  error,
  schools,
  selectedSchool,
  getSchoolDraft,
  updateSchoolDraft,
  handleSaveSchoolDetails,
  savingSchoolId,
  t,
  normalizeWebsiteUrl,
}: ManagerSchoolPageContentProps) => {
  if (isLoading) {
    return <StateCard>{t("school.loadingSchoolDetails")}</StateCard>;
  }

  if (error) {
    return <StateCard tone="danger">{error.message}</StateCard>;
  }

  if (schools.length === 0) {
    return <StateCard>{t("school.noManagedSchools")}</StateCard>;
  }

  return (
    <PageGrid testId="manager-schools-list">
      {(selectedSchool ? [selectedSchool] : []).map((school) => {
        const draft = getSchoolDraft(school);

        return (
          <SchoolSectionsGrid key={school.id}>
            <Card>
              <CardHeader>
                <CardTitle>{t("school.schoolProfile")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                <FormSection onSubmit={(event) => handleSaveSchoolDetails(event, school)}>
                  <TwoColumnFields>
                    <LabeledInputField
                      id={`school-name-${school.id}`}
                      label={t("school.name")}
                      value={draft.name}
                      onChange={(value) => updateSchoolDraft(school, "name", value)}
                    />
                  </TwoColumnFields>

                  <TwoColumnFields>
                    <LabeledInputField
                      id={`school-website-${school.id}`}
                      label={t("school.websiteUrl")}
                      value={draft.websiteUrl}
                      onChange={(value) => updateSchoolDraft(school, "websiteUrl", value)}
                    />
                    <LabeledInputField
                      id={`school-logo-${school.id}`}
                      label={t("school.logoUrl")}
                      value={draft.logoUrl}
                      onChange={(value) => updateSchoolDraft(school, "logoUrl", value)}
                    />
                  </TwoColumnFields>

                  <LabeledInputField
                    id={`school-address-line1-${school.id}`}
                    label={t("school.addressLine1")}
                    value={draft.addressLine1}
                    onChange={(value) => updateSchoolDraft(school, "addressLine1", value)}
                  />

                  <LabeledInputField
                    id={`school-address-line2-${school.id}`}
                    label={t("school.addressLine2")}
                    value={draft.addressLine2}
                    onChange={(value) => updateSchoolDraft(school, "addressLine2", value)}
                  />

                  <ThreeColumnFields>
                    <LabeledInputField
                      id={`school-city-${school.id}`}
                      label={t("school.cityLabel")}
                      value={draft.city}
                      onChange={(value) => updateSchoolDraft(school, "city", value)}
                    />
                    <LabeledInputField
                      id={`school-state-${school.id}`}
                      label={t("school.stateProvinceLabel")}
                      value={draft.stateProvince}
                      onChange={(value) => updateSchoolDraft(school, "stateProvince", value)}
                    />
                    <LabeledInputField
                      id={`school-postal-code-${school.id}`}
                      label={t("school.postalCodeLabel")}
                      value={draft.postalCode}
                      onChange={(value) => updateSchoolDraft(school, "postalCode", value)}
                    />
                  </ThreeColumnFields>

                  <TwoColumnFields>
                    <LabeledInputField
                      id={`school-country-${school.id}`}
                      label={t("school.countryLabel")}
                      value={school.country}
                      disabled
                    />
                    <LabeledInputField
                      id={`school-currency-${school.id}`}
                      label={t("school.schoolCurrency")}
                      value={school.currency}
                      disabled
                    />
                  </TwoColumnFields>

                  <LabeledInputField
                    id={`school-default-hourly-rate-${school.id}`}
                    label={t("school.defaultHourlyRate")}
                    type="number"
                    min={1}
                    value={draft.defaultHourlyRate}
                    onChange={(value) => updateSchoolDraft(school, "defaultHourlyRate", value)}
                    placeholder={t("school.defaultHourlyRatePlaceholder")}
                  />

                  <Button type="submit" disabled={savingSchoolId === school.id}>
                    {savingSchoolId === school.id ? t("school.savingButton") : t("school.saveDetailsButton")}
                  </Button>
                </FormSection>

                <InfoPanel>
                  <InfoPair
                    label={t("school.currentProfile")}
                    value={school.name}
                    labelClassName={labelClassName}
                    valueClassName={valueClassName}
                  />
                  {school.websiteUrl ? (
                    <WebsiteSummaryLink href={normalizeWebsiteUrl(school.websiteUrl)} text={school.websiteUrl} />
                  ) : null}
                  {school.logoUrl ? <SchoolLogoPreview src={school.logoUrl} alt={school.name} /> : null}
                  <SummaryText>{school.addressLine1}</SummaryText>
                  {school.addressLine2 ? <SummaryText>{school.addressLine2}</SummaryText> : null}
                  <SummaryText>{school.city}</SummaryText>
                  <SummaryText>{school.currency}</SummaryText>
                </InfoPanel>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("school.managerSchoolAccount")}</CardTitle>
              </CardHeader>
              <CardContent>
                {school.accounts.length === 0 ? (
                  <MutedText>{t("school.noAccountLinked")}</MutedText>
                ) : (
                  <AccountsList>
                    {school.accounts.map((account) => (
                      <InfoPanel key={account.id}>
                        <InfoPair
                          label={t("school.accountID")}
                          value={account.id}
                          labelClassName={labelClassName}
                          valueClassName={valueClassName}
                        />
                        <AccountDetailsGrid>
                          <InfoPair
                            label={t("school.currencyLabel")}
                            value={account.currency}
                            labelClassName={labelClassName}
                            valueClassName={valueClassName}
                          />
                          <InfoPair
                            label={t("school.balance")}
                            value={account.balanceMinor}
                            labelClassName={labelClassName}
                            valueClassName={valueClassName}
                          />
                        </AccountDetailsGrid>
                      </InfoPanel>
                    ))}
                  </AccountsList>
                )}
              </CardContent>
            </Card>
          </SchoolSectionsGrid>
        );
      })}
    </PageGrid>
  );
};

export default ManagerSchoolPageContent;