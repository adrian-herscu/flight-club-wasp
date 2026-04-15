import { type ChangeEvent, type ReactNode } from "react";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

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

