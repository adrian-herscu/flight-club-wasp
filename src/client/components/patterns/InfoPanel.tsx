import { type ReactNode } from "react";

type InfoPanelVariant = "default" | "compact" | "requestSummary";

const infoPanelClasses: Record<InfoPanelVariant, string> = {
  default: "rounded-md border p-4",
  compact: "rounded-md border p-4 space-y-2",
  requestSummary: "rounded-md border p-4 space-y-1",
};

type InfoPanelProps = {
  children: ReactNode;
  variant?: InfoPanelVariant;
  className?: string;
};

const InfoPanel = ({
  children,
  variant = "default",
  className = infoPanelClasses[variant],
}: InfoPanelProps) => {
  return <div className={className}>{children}</div>;
};

export default InfoPanel;
