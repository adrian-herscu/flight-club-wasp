import { type FormEvent, type ReactNode } from "react";
import { CardContent } from "../ui/card";

type GridVariant = "top" | "bottom";

const gridClasses: Record<GridVariant, string> = {
  top: "mb-6 grid gap-6 2xl:grid-cols-2",
  bottom: "grid gap-6 2xl:grid-cols-2",
};

export const ManagerCoursesGrid = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: GridVariant;
}) => {
  return <div className={gridClasses[variant]}>{children}</div>;
};

type CardContentVariant = "default" | "spacious";

const cardContentClasses: Record<CardContentVariant, string | undefined> = {
  default: undefined,
  spacious: "space-y-4",
};

export const ManagerCoursesCardContent = ({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: CardContentVariant;
}) => {
  return <CardContent className={cardContentClasses[variant]}>{children}</CardContent>;
};

type FormVariant = "compact" | "spacious";

const formClasses: Record<FormVariant, string> = {
  compact: "space-y-3",
  spacious: "space-y-4",
};

export const ManagerCoursesForm = ({
  children,
  onSubmit,
  variant,
}: {
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  variant: FormVariant;
}) => {
  return (
    <form onSubmit={onSubmit} className={formClasses[variant]}>
      {children}
    </form>
  );
};

export const ManagerCoursesTwoColumnFields = ({ children }: { children: ReactNode }) => {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
};

export const ManagerCoursesMutedText = ({ children }: { children: ReactNode }) => {
  return <p className="text-muted-foreground text-sm">{children}</p>;
};

export const ManagerCoursesLoadingText = ({ children }: { children: ReactNode }) => {
  return <p className="text-sm text-muted-foreground">{children}</p>;
};

export const ManagerCoursesList = ({ children }: { children: ReactNode }) => {
  return <ul className="space-y-2">{children}</ul>;
};

export const ManagerCoursesCourseListItem = ({
  action,
  summary,
  summaryTestId,
  title,
}: {
  action: ReactNode;
  summary: ReactNode;
  summaryTestId?: string;
  title: ReactNode;
}) => {
  return (
    <li className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        {action}
      </div>
      <p className="text-muted-foreground text-xs" data-testid={summaryTestId}>
        {summary}
      </p>
    </li>
  );
};

export const ManagerCoursesParticipantListItem = ({
  displayName,
  email,
}: {
  displayName: ReactNode;
  email: ReactNode;
}) => {
  return (
    <li className="rounded-md border p-3 text-sm">
      <p className="font-medium">{displayName}</p>
      <p className="text-muted-foreground text-xs">{email}</p>
    </li>
  );
};

export const ManagerCoursesDisclosure = ({
  children,
  summary,
}: {
  children: ReactNode;
  summary: ReactNode;
}) => {
  return (
    <details className="mt-4 rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">{summary}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
};

export const ManagerCoursesDetailsPanel = ({
  children,
  title,
}: {
  children: ReactNode;
  title: ReactNode;
}) => {
  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm font-medium">{title}</p>
      {children}
    </div>
  );
};

export const ManagerCoursesSectionTopSpacing = ({ children }: { children: ReactNode }) => {
  return <div className="mt-6">{children}</div>;
};

export const ManagerCoursesInterestListItem = ({
  action,
  displayName,
  email,
  status,
}: {
  action?: ReactNode;
  displayName: ReactNode;
  email?: ReactNode;
  status: ReactNode;
}) => {
  return (
    <li className="rounded-md border p-3 text-sm flex items-center gap-3">
      <div className="flex-1">
        <p className="font-medium">{displayName}</p>
        {email ? <p className="text-muted-foreground text-xs">{email}</p> : null}
      </div>
      <p className="text-muted-foreground text-xs mr-2" data-testid="interest-status-badge">
        {status}
      </p>
      {action}
    </li>
  );
};