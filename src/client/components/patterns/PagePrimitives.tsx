import { type ReactNode } from "react";
import { CardContent } from "../ui/card";

// ---------------------------------------------------------------------------
// Text atoms
// ---------------------------------------------------------------------------

export const MutedText = ({ children, testId }: { children: ReactNode; testId?: string }) => (
  <p className="text-sm text-muted-foreground" data-testid={testId}>
    {children}
  </p>
);

export const LoadingText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-sm py-2">{children}</p>
);

export const EmptyText = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground text-sm py-8">{children}</p>
);

export const PrimaryText = ({ children, testId }: { children: ReactNode; testId?: string }) => (
  <p className="text-sm font-medium" data-testid={testId}>
    {children}
  </p>
);

export const SmallText = ({ children }: { children: ReactNode }) => (
  <p className="text-sm">{children}</p>
);

// ---------------------------------------------------------------------------
// List container
// ---------------------------------------------------------------------------

export const SimpleList = ({ children, testId }: { children: ReactNode; testId?: string }) => (
  <ul className="space-y-2" data-testid={testId}>
    {children}
  </ul>
);

// ---------------------------------------------------------------------------
// Card content wrapper
// "default" → space-y-4  |  "loose" → space-y-3 pt-6
// ---------------------------------------------------------------------------

type SpacedCardContentVariant = "default" | "loose";

const spacedCardContentClasses: Record<SpacedCardContentVariant, string> = {
  default: "space-y-4",
  loose: "space-y-3 pt-6",
};

export const SpacedCardContent = ({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: SpacedCardContentVariant;
}) => (
  <CardContent className={spacedCardContentClasses[variant]}>{children}</CardContent>
);

// ---------------------------------------------------------------------------
// Layout atoms
// ---------------------------------------------------------------------------

export const EndActionsRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap justify-end gap-2">{children}</div>
);

export const TitledSection = ({
  children,
  testId,
  title,
}: {
  children: ReactNode;
  testId: string;
  title: ReactNode;
}) => (
  <div className="space-y-3" data-testid={testId}>
    <h3 className="text-sm font-semibold">{title}</h3>
    {children}
  </div>
);

export const PageRoot = ({ children, testId }: { children: ReactNode; testId: string }) => (
  <div data-testid={testId}>{children}</div>
);

export const PageTitle = ({ children }: { children: ReactNode }) => (
  <h1 className="text-2xl font-semibold">{children}</h1>
);

// ---------------------------------------------------------------------------
// Error / status text
// ---------------------------------------------------------------------------

export const ErrorText = ({ children }: { children: ReactNode }) => (
  <p className="text-destructive text-sm py-4">{children}</p>
);

// ---------------------------------------------------------------------------
// Header section (page sub-header: title + meta row)
// ---------------------------------------------------------------------------

export const HeaderSection = ({ children }: { children: ReactNode }) => (
  <div className="mb-6 space-y-1">{children}</div>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
);

// ---------------------------------------------------------------------------
// Meta row + inline label:value item
// ---------------------------------------------------------------------------

export const MetaRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">{children}</div>
);

export const MetaItem = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <span>
    <span className="font-medium text-foreground">{label}:</span> {children}
  </span>
);

// Block label: value (for stacked detail lists)
export const DetailRow = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <p>
    <span className="font-medium text-foreground">{label}: </span>
    {children}
  </p>
);

// ---------------------------------------------------------------------------
// Section containers
// ---------------------------------------------------------------------------

export const StackSection = ({ children }: { children: ReactNode }) => (
  <div className="space-y-2">{children}</div>
);

export const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
    {children}
  </h3>
);

export const ActionsBar = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-2 mb-4">{children}</div>
);

// ---------------------------------------------------------------------------
// Sub-section with hardcoded heading  (replaces thin domain wrappers)
// "compact"  → mt-2 space-y-1, xs uppercase muted
// "default"  → mt-3 space-y-2, xs uppercase muted
// "wide"     → mt-4 space-y-2, sm normal
// ---------------------------------------------------------------------------

type SubSectionVariant = "compact" | "default" | "wide";

const subSectionContainerClasses: Record<SubSectionVariant, string> = {
  compact: "mt-2 space-y-1",
  default: "mt-3 space-y-2",
  wide: "mt-4 space-y-2",
};

const subSectionHeadingClasses: Record<SubSectionVariant, string> = {
  compact: "text-xs font-semibold text-muted-foreground uppercase tracking-wide",
  default: "text-xs font-semibold text-muted-foreground uppercase tracking-wide",
  wide: "text-sm font-semibold",
};

export const SubSection = ({
  children,
  heading,
  variant = "default",
}: {
  children: ReactNode;
  heading: string;
  variant?: SubSectionVariant;
}) => (
  <div className={subSectionContainerClasses[variant]}>
    <p className={subSectionHeadingClasses[variant]}>{heading}</p>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Layout helpers  (replaces thin domain wrappers)
// ---------------------------------------------------------------------------

export const TwoColumnFields = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-2">{children}</div>
);

export const TopSpacing = ({ children }: { children: ReactNode }) => (
  <div className="mt-6">{children}</div>
);

export const SummaryGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-3 md:grid-cols-3">{children}</div>
);
