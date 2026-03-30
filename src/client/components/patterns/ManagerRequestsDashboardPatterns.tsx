import { type ChangeEvent, type ReactNode } from "react";
import { CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export const ManagerRequestsDashboardCardContent = ({ children }: { children: ReactNode }) => {
  return <CardContent className="space-y-4">{children}</CardContent>;
};

export const ManagerRequestsFilterGroup = ({
  children,
  label,
}: {
  children: ReactNode;
  label: ReactNode;
}) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
};

export const ManagerRequestsSummaryGrid = ({ children }: { children: ReactNode }) => {
  return <div className="grid gap-3 md:grid-cols-3">{children}</div>;
};

export const ManagerRequestsSummaryColumn = ({
  children,
  label,
}: {
  children: ReactNode;
  label: ReactNode;
}) => {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      {children}
    </div>
  );
};

export const ManagerRequestsPrimaryText = ({ children }: { children: ReactNode }) => {
  return <p className="text-sm font-medium">{children}</p>;
};

export const ManagerRequestsText = ({ children }: { children: ReactNode }) => {
  return <p className="text-sm">{children}</p>;
};

export const ManagerRequestsMutedText = ({ children }: { children: ReactNode }) => {
  return <p className="text-sm text-muted-foreground">{children}</p>;
};

export const ManagerRequestsSection = ({
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

export const ManagerRequestsCardBody = ({ children }: { children: ReactNode }) => {
  return <CardContent className="space-y-3 pt-6">{children}</CardContent>;
};

export const ManagerRequestsRejectionReasonField = ({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: ReactNode;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  value: string;
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={onChange} />
    </div>
  );
};

export const ManagerRequestsActionsRow = ({ children }: { children: ReactNode }) => {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
};