import { type FormEvent, type ReactNode } from "react";
import { Card } from "../ui/card";

const stackGapClasses = {
  none: "space-y-0",
  sm: "space-y-2",
  md: "space-y-4",
  lg: "space-y-5",
} as const;

type StackGap = keyof typeof stackGapClasses;

export const AppPageInset = ({ children }: { children: ReactNode }) => {
  return <div className="mt-10 px-6">{children}</div>;
};

export const AppCard = ({ children }: { children: ReactNode }) => {
  return <Card className="mb-4 lg:m-8">{children}</Card>;
};

export const InsetBlock = ({ children }: { children: ReactNode }) => {
  return <div className="px-6 py-4">{children}</div>;
};

export const ContentStack = ({ children, gap = "md" }: { children: ReactNode; gap?: StackGap }) => {
  return <div className={stackGapClasses[gap]}>{children}</div>;
};

export const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => {
  return (
    <div className="grid grid-cols-1 items-center sm:grid-cols-3 sm:gap-4">
      <div className="text-muted-foreground text-sm font-medium">{label}</div>
      <div className="mt-1 sm:col-span-2 sm:mt-0">{children}</div>
    </div>
  );
};

export const ReadOnlyFieldRow = ({ label, value }: { label: string; value: ReactNode }) => {
  return (
    <FieldRow label={label}>
      <div className="text-foreground text-sm">{value}</div>
    </FieldRow>
  );
};

export const FormStack = ({
  onSubmit,
  children,
  gap = "lg",
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  gap?: StackGap;
}) => {
  return (
    <form onSubmit={onSubmit} className={stackGapClasses[gap]}>
      {children}
    </form>
  );
};

export const EndAlignedActions = ({ children }: { children: ReactNode }) => {
  return <div className="flex justify-end">{children}</div>;
};

export const UserIdentityText = ({ children }: { children: ReactNode }) => {
  return <div className="text-foreground mr-2 hidden text-right text-sm font-medium lg:block">{children}</div>;
};

export const DropdownItemContent = ({ children }: { children: ReactNode }) => {
  return <div className="flex w-full items-center gap-3">{children}</div>;
};

export const SrOnlyText = ({ children }: { children: ReactNode }) => {
  return <span className="sr-only">{children}</span>;
};

export const CenteredPlaceholder = ({
  testId,
  children,
}: {
  testId: string;
  children: ReactNode;
}) => {
  return (
    <div className="flex h-full items-center justify-center">
      <p data-testid={testId} className="text-muted-foreground text-lg">
        {children}
      </p>
    </div>
  );
};