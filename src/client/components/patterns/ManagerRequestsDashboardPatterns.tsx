import { type ReactNode } from "react";

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

