import { type ReactNode } from "react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { SelectContent, SelectTrigger } from "../ui/select";

type UsersBoxVariant =
  | "pageContent"
  | "tableRoot"
  | "card"
  | "filtersPanel"
  | "filtersRow"
  | "filtersGroup"
  | "relative"
  | "statusContentBody"
  | "statusHeader"
  | "statusOptionsList"
  | "checkboxRow"
  | "roleFilterGroup"
  | "pagination"
  | "activeFiltersRow"
  | "activeFiltersChips"
  | "headerRow"
  | "headerCell3"
  | "headerCell2"
  | "headerCell1"
  | "bodyRow"
  | "identityStack"
  | "roleSelectCell"
  | "menuItemContent"
  | "chipContent";

const usersBoxClasses: Record<UsersBoxVariant, string> = {
  pageContent: "flex flex-col gap-10",
  tableRoot: "flex flex-col gap-4",
  card: "border-border bg-card rounded-sm border shadow-sm",
  filtersPanel: "bg-muted/40 flex w-full flex-col items-start justify-between gap-3 p-6",
  filtersRow: "flex w-full items-center justify-between gap-3 px-2",
  filtersGroup: "relative flex items-center gap-3",
  relative: "relative",
  statusContentBody: "p-2",
  statusHeader: "mb-2 flex items-center justify-between",
  statusOptionsList: "space-y-2",
  checkboxRow: "flex items-center space-x-2",
  roleFilterGroup: "flex items-center gap-2",
  pagination: "flex max-w-60 flex-row items-center",
  activeFiltersRow: "border-border flex items-center gap-2 px-2 pt-2",
  activeFiltersChips: "flex flex-wrap gap-2",
  headerRow: "border-border py-4.5 grid grid-cols-9 border-t-4 px-4 md:px-6",
  headerCell3: "col-span-3 flex items-center",
  headerCell2: "col-span-2 flex items-center",
  headerCell1: "col-span-1 flex items-center",
  bodyRow: "py-4.5 grid grid-cols-9 gap-4 px-4 md:px-6",
  identityStack: "flex flex-col gap-1",
  roleSelectCell: "text-foreground text-sm",
  menuItemContent: "flex items-center gap-2",
  chipContent: "flex items-center gap-1",
};

export const UsersBox = ({
  children,
  testId,
  variant,
}: {
  children: ReactNode;
  testId?: string;
  variant: UsersBoxVariant;
}) => {
  return (
    <div data-testid={testId} className={usersBoxClasses[variant]}>
      {children}
    </div>
  );
};

type UsersTextVariant =
  | "filtersTitle"
  | "mutedLabel"
  | "statusHeading"
  | "header"
  | "default"
  | "muted"
  | "pagination"
  | "activeFiltersLabel"
  | "clearFilterButton";

const usersTextClasses: Record<UsersTextVariant, string> = {
  filtersTitle: "text-sm font-medium",
  mutedLabel: "text-muted-foreground text-sm",
  statusHeading: "text-sm font-medium",
  header: "font-medium",
  default: "text-foreground text-sm",
  muted: "text-muted-foreground text-sm",
  pagination: "text-md text-foreground",
  activeFiltersLabel: "text-muted-foreground text-sm font-medium",
  clearFilterButton: "text-muted-foreground hover:text-foreground text-xs",
};

export const UsersText = ({
  children,
  testId,
  variant,
}: {
  children: ReactNode;
  testId?: string;
  variant: UsersTextVariant;
}) => {
  return (
    <p data-testid={testId} className={usersTextClasses[variant]}>
      {children}
    </p>
  );
};

type UsersInlineTextVariant = "pagination";

const usersInlineTextClasses: Record<UsersInlineTextVariant, string> = {
  pagination: "text-md text-foreground",
};

export const UsersInlineText = ({
  children,
  variant,
}: {
  children: ReactNode;
  variant: UsersInlineTextVariant;
}) => {
  return <span className={usersInlineTextClasses[variant]}>{children}</span>;
};

type UsersLabelVariant = "muted" | "checkbox";

const usersLabelClasses: Record<UsersLabelVariant, string> = {
  muted: "text-muted-foreground text-sm",
  checkbox:
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
};

export const UsersLabel = ({
  children,
  htmlFor,
  testId,
  variant,
}: {
  children: ReactNode;
  htmlFor: string;
  testId?: string;
  variant: UsersLabelVariant;
}) => {
  return (
    <Label data-testid={testId} htmlFor={htmlFor} className={usersLabelClasses[variant]}>
      {children}
    </Label>
  );
};

export const UsersClearTextButton = ({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) => {
  return (
    <Button onClick={onClick} size="sm" type="button" variant="ghost">
      <UsersText variant="clearFilterButton">{children}</UsersText>
    </Button>
  );
};

export const UsersStatusSelectTrigger = ({ children }: { children: ReactNode }) => {
  return <SelectTrigger className="w-full min-w-50">{children}</SelectTrigger>;
};

export const UsersStatusSelectContent = ({ children }: { children: ReactNode }) => {
  return <SelectContent className="w-75">{children}</SelectContent>;
};

export const UsersRoleFilterSelectTrigger = ({ children }: { children: ReactNode }) => {
  return <SelectTrigger className="w-full">{children}</SelectTrigger>;
};

export const UsersRoleSelectTrigger = ({ children }: { children: ReactNode }) => {
  return <SelectTrigger className="w-40">{children}</SelectTrigger>;
};

export const UsersPageInput = ({
  defaultValue,
  max,
  min,
  onChange,
}: {
  defaultValue: number;
  max?: number;
  min: number;
  onChange: (value: number) => void;
}) => {
  return (
    <Input
      className="w-20"
      defaultValue={defaultValue}
      max={max}
      min={min}
      onChange={(event) => {
        onChange(parseInt(event.currentTarget.value));
      }}
      type="number"
    />
  );
};

export const UsersMenuTriggerButton = ({ children }: { children: ReactNode }) => {
  return (
    <Button size="icon" type="button" variant="ghost">
      {children}
    </Button>
  );
};

export const UsersDropdownContent = ({ children }: { children: ReactNode }) => {
  return (
    <DropdownMenuContent align="end" className="w-40">
      {children}
    </DropdownMenuContent>
  );
};

export const UsersDropdownMenuItem = ({ children }: { children: ReactNode }) => {
  return (
    <DropdownMenuItem>
      <UsersBox variant="menuItemContent">{children}</UsersBox>
    </DropdownMenuItem>
  );
};