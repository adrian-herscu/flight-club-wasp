import { cloneElement, type FormEvent, type ReactElement, type ReactNode } from "react";

type WithClassName = { className?: string };
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

// ── Layout ────────────────────────────────────────────────────────────────────

export const SettingsPageContent = ({ children }: { children: ReactNode }) => (
  <div className="max-w-270 mx-auto">{children}</div>
);

export const SettingsColumnsGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-5 gap-8">{children}</div>
);

export const SettingsMainColumn = ({ children }: { children: ReactNode }) => (
  <div className="col-span-5 xl:col-span-3">{children}</div>
);

export const SettingsSideColumn = ({ children }: { children: ReactNode }) => (
  <div className="col-span-5 xl:col-span-2">{children}</div>
);

export const SettingsTwoColumnRow = ({ children }: { children: ReactNode }) => (
  <div className="mb-5.5 gap-5.5 flex flex-col sm:flex-row">{children}</div>
);

export const SettingsHalfField = ({ children }: { children: ReactNode }) => (
  <div className="w-full sm:w-1/2">{children}</div>
);

export const SettingsFieldBlock = ({ children }: { children: ReactNode }) => (
  <div className="mb-5.5">{children}</div>
);

export const SettingsActionRow = ({ children }: { children: ReactNode }) => (
  <div className="gap-4.5 flex justify-end">{children}</div>
);

// ── Form ─────────────────────────────────────────────────────────────────────

export const SettingsForm = ({
  onSubmit,
  children,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}) => <form onSubmit={onSubmit}>{children}</form>;

export const PhotoUploadForm = ({ children }: { children: ReactNode }) => (
  <form action="#">{children}</form>
);

// ── Field atoms ───────────────────────────────────────────────────────────────

export const SettingsFieldLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) => (
  <Label htmlFor={htmlFor} className="text-foreground mb-3 block text-sm font-medium">
    {children}
  </Label>
);

type IconInputProps = {
  icon: ReactElement<WithClassName>;
  id: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
};

/** Renders a relative-positioned wrapper with an absolute icon and left-padded Input. */
export const SettingsInputWithIcon = ({
  icon,
  id,
  name,
  type = "text",
  defaultValue,
  placeholder,
}: IconInputProps) => (
  <div className="relative">
    {cloneElement(icon, {
      className: "left-4.5 text-muted-foreground absolute top-2 h-5 w-5",
    })}
    <Input
      className="pl-11.5"
      type={type}
      name={name}
      id={id}
      placeholder={placeholder}
      defaultValue={defaultValue}
    />
  </div>
);

type IconTextareaProps = {
  icon: ReactElement<WithClassName>;
  id: string;
  name: string;
  rows?: number;
  defaultValue?: string;
  placeholder?: string;
};

/** Renders a relative-positioned wrapper with an absolute icon and left-padded Textarea. */
export const SettingsTextareaWithIcon = ({
  icon,
  id,
  name,
  rows,
  defaultValue,
  placeholder,
}: IconTextareaProps) => (
  <div className="relative">
    {cloneElement(icon, {
      className: "left-4.5 text-muted-foreground absolute top-4 h-5 w-5",
    })}
    <Textarea
      className="border-border bg-background pl-11.5 pr-4.5 text-foreground focus:border-primary w-full rounded border py-3 focus-visible:outline-hidden"
      name={name}
      id={id}
      rows={rows}
      placeholder={placeholder}
      defaultValue={defaultValue}
    />
  </div>
);

// ── Photo section ─────────────────────────────────────────────────────────────

type PhotoAvatarRowProps = {
  editText: string;
  deleteLabel: string;
  updateLabel: string;
};

export const PhotoAvatarRow = ({ editText, deleteLabel, updateLabel }: PhotoAvatarRowProps) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="h-14 w-14 rounded-full" />
    <div>
      <span className="text-foreground mb-1.5">{editText}</span>
      <span className="flex gap-2.5">
        <button className="hover:text-primary text-sm">{deleteLabel}</button>
        <button className="hover:text-primary text-sm">{updateLabel}</button>
      </span>
    </div>
  </div>
);

type FileUploadZoneProps = {
  icon: ReactElement<WithClassName>;
  clickLabel: string;
  dragLabel: string;
  formatLabel: string;
  sizeLabel: string;
};

export const FileUploadZone = ({
  icon,
  clickLabel,
  dragLabel,
  formatLabel,
  sizeLabel,
}: FileUploadZoneProps) => (
  <div
    id="FileUpload"
    className="mb-5.5 border-primary bg-background sm:py-7.5 relative block w-full cursor-pointer appearance-none rounded border-2 border-dashed px-4 py-4"
  >
    <input
      type="file"
      accept="image/*"
      className="absolute inset-0 z-50 m-0 h-full w-full cursor-pointer p-0 opacity-0 outline-hidden"
    />
    <div className="flex flex-col items-center justify-center space-y-3">
      <span className="border-border bg-background flex h-10 w-10 items-center justify-center rounded-full border">
        {cloneElement(icon, { className: "text-primary h-4 w-4" })}
      </span>
      <p>
        <span className="text-primary">{clickLabel}</span>
        {dragLabel}
      </p>
      <p className="mt-1.5">{formatLabel}</p>
      <p>{sizeLabel}</p>
    </div>
  </div>
);
