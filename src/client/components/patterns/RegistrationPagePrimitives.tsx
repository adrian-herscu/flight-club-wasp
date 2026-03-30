import { type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import SafeImage from "./SafeImage";

type PageContainerVariant = "loading" | "main";

const pageContainerClasses: Record<PageContainerVariant, string> = {
  loading: "mx-auto mt-10 max-w-3xl px-6",
  main: "mx-auto mt-10 max-w-3xl px-6 pb-10",
};

export const PageContainer = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: PageContainerVariant;
}) => {
  return <div className={pageContainerClasses[variant]}>{children}</div>;
};

type CardVariant = "default" | "withBottomMargin";

const cardClasses: Record<CardVariant, string | undefined> = {
  default: undefined,
  withBottomMargin: "mb-6",
};

export const SurfaceCard = ({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: CardVariant;
}) => {
  return <Card className={cardClasses[variant]}>{children}</Card>;
};

export const SurfaceCardHeader = ({ title }: { title: ReactNode }) => {
  return (
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
  );
};

type CardContentVariant = "loading" | "requests" | "form";

const cardContentClasses: Record<CardContentVariant, string> = {
  loading: "pt-6 text-sm text-muted-foreground",
  requests: "space-y-4 text-sm",
  form: "space-y-5",
};

export const SurfaceCardContent = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: CardContentVariant;
}) => {
  return <CardContent className={cardContentClasses[variant]}>{children}</CardContent>;
};

type StackVariant = "compact" | "fieldGroup" | "selector";

const stackClasses: Record<StackVariant, string> = {
  compact: "space-y-2",
  fieldGroup: "grid gap-4",
  selector: "space-y-2",
};

export const Stack = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: StackVariant;
}) => {
  return <div className={stackClasses[variant]}>{children}</div>;
};

type GridVariant = "twoColumns" | "threeColumns";

const gridClasses: Record<GridVariant, string> = {
  twoColumns: "grid gap-4 sm:grid-cols-2",
  threeColumns: "grid gap-4 sm:grid-cols-3",
};

export const Grid = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: GridVariant;
}) => {
  return <div className={gridClasses[variant]}>{children}</div>;
};

export const Paragraph = ({
  children,
  muted = false,
  strong = false,
}: {
  children: ReactNode;
  muted?: boolean;
  strong?: boolean;
}) => {
  return (
    <p className={muted ? "text-muted-foreground" : undefined}>
      {strong ? <strong>{children}</strong> : children}
    </p>
  );
};

export const LabelValueParagraph = ({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) => {
  return (
    <p>
      {label} <strong>{value}</strong>
    </p>
  );
};

export const RejectionReasonBlock = ({
  label,
  reason,
}: {
  label: ReactNode;
  reason: ReactNode;
}) => {
  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{reason}</p>
    </div>
  );
};

export const InlineLabel = ({ children }: { children: ReactNode }) => {
  return <span className="font-medium">{children}</span>;
};

export const EmptyValue = () => {
  return <span className="text-muted-foreground">-</span>;
};

export const ExternalLinkText = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
      {children}
    </a>
  );
};

export const WebsiteList = ({ children }: { children: ReactNode }) => {
  return <ul className="space-y-1 text-sm">{children}</ul>;
};

export const WebsiteListItem = ({ children }: { children: ReactNode }) => {
  return <li className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">{children}</li>;
};

export const SchoolSelectOptionContent = ({
  schoolName,
  city,
  country,
  logo,
}: {
  schoolName: string;
  city: string;
  country: string;
  logo: ReactNode;
}) => {
  return (
    <span className="flex items-center gap-2">
      {logo}
      <span>
        {schoolName} ({city}, {country})
      </span>
    </span>
  );
};

type SchoolLogoVariant = "selectOption" | "websiteList";

const schoolLogoImageClasses: Record<SchoolLogoVariant, string> = {
  selectOption: "h-5 w-5 rounded object-cover",
  websiteList: "h-8 w-8 rounded object-cover",
};

const schoolLogoFallbackClasses: Record<SchoolLogoVariant, string> = {
  selectOption:
    "bg-muted text-muted-foreground flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold",
  websiteList:
    "bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded text-xs font-semibold",
};

export const SchoolLogo = ({
  schoolName,
  logoUrl,
  variant,
  testId,
}: {
  schoolName: string;
  logoUrl: string | null;
  variant: SchoolLogoVariant;
  testId?: string;
}) => {
  if (logoUrl) {
    return (
      <SafeImage
        src={logoUrl}
        alt={schoolName}
        data-testid={testId}
        className={schoolLogoImageClasses[variant]}
      />
    );
  }

  return (
    <span
      data-testid={testId}
      aria-label={`${schoolName} logo placeholder`}
      className={schoolLogoFallbackClasses[variant]}
    >
      {schoolName.charAt(0).toUpperCase()}
    </span>
  );
};

export const NoticeBox = ({ children }: { children: ReactNode }) => {
  return <div className="rounded-md border p-3 text-sm text-muted-foreground">{children}</div>;
};

export const EndAlignedActions = ({ children }: { children: ReactNode }) => {
  return <div className="flex justify-end">{children}</div>;
};
