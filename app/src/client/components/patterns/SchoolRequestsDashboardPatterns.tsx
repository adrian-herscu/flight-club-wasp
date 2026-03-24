import { type ReactNode } from "react";
import { CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import SafeImage from "./SafeImage";

export const SchoolRequestsDashboardCardContent = ({ children }: { children: ReactNode }) => {
  return <CardContent className="space-y-4">{children}</CardContent>;
};

export const SchoolRequestsFilterGroup = ({
  children,
  label,
}: {
  children: ReactNode;
  label?: ReactNode;
}) => {
  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
};

export const SchoolRequestsMutedText = ({ children }: { children: ReactNode }) => {
  return <p className="text-sm text-muted-foreground">{children}</p>;
};

export const SchoolRequestsSection = ({
  children,
  testId,
  title,
}: {
  children: ReactNode;
  testId: string;
  title: ReactNode;
}) => {
  return (
    <div className="space-y-3" data-testid={testId}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
};

export const SchoolRequestsRequestCardBody = ({ children }: { children: ReactNode }) => {
  return <CardContent className="space-y-3 pt-6">{children}</CardContent>;
};

export const SchoolRequestsPrimaryText = ({ children }: { children: ReactNode }) => {
  return <p className="text-sm font-medium">{children}</p>;
};

export const SchoolRequestsRejectionReasonField = ({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
};

export const SchoolRequestsActionsRow = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
};

export const SchoolRequestsRequesterSummary = ({
  requester,
  requesterEmail,
  requesterLabel,
  requesterPhone,
  submittedAt,
  submittedLabel,
}: {
  requester: ReactNode;
  requesterEmail: ReactNode;
  requesterLabel: ReactNode;
  requesterPhone: ReactNode;
  submittedAt: ReactNode;
  submittedLabel: ReactNode;
}) => {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="text-xs uppercase text-muted-foreground">{requesterLabel}</p>
        <p className="text-sm font-medium">{requester}</p>
        <p className="text-sm text-muted-foreground">{requesterEmail}</p>
        <p className="text-sm text-muted-foreground">{requesterPhone}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">{submittedLabel}</p>
        <p className="text-sm">{submittedAt}</p>
      </div>
    </div>
  );
};

export const SchoolRequestsSnapshot = ({
  currency,
  currencyLabel,
  label,
  logoAlt,
  logoUrl,
  phone,
  schoolName,
  summaryAddress,
}: {
  currency: ReactNode;
  currencyLabel: ReactNode;
  label: ReactNode;
  logoAlt: string;
  logoUrl: string | null;
  phone: ReactNode;
  schoolName: ReactNode;
  summaryAddress: ReactNode;
}) => {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{schoolName}</p>
      {phone ? <p className="text-sm text-muted-foreground">{phone}</p> : null}
      {logoUrl ? (
        <SafeImage src={logoUrl} alt={logoAlt} className="mt-1 h-8 w-8 rounded object-cover" />
      ) : null}
      <p className="text-sm text-muted-foreground">{summaryAddress}</p>
      <p className="text-sm text-muted-foreground">
        {currencyLabel}: {currency}
      </p>
    </div>
  );
};

export const SchoolRequestsExpandableDetails = ({
  children,
  summary,
}: {
  children: ReactNode;
  summary: ReactNode;
}) => {
  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">{summary}</summary>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">{children}</div>
    </details>
  );
};

export const SchoolRequestsDetailsRow = ({
  children,
  label,
}: {
  children: ReactNode;
  label: ReactNode;
}) => {
  return (
    <p>
      <span className="font-medium text-foreground">{label}: </span>
      {children}
    </p>
  );
};

export const SchoolRequestsDetailsLogoRow = ({
  label,
  logoAlt,
  logoUrl,
}: {
  label: ReactNode;
  logoAlt: string;
  logoUrl: string;
}) => {
  return (
    <div>
      <span className="font-medium text-foreground">{label}: </span>
      <SafeImage src={logoUrl} alt={logoAlt} className="mt-1 h-10 w-10 rounded object-cover" />
    </div>
  );
};
