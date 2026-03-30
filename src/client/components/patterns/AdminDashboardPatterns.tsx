import React, { ReactNode } from "react";

/**
 * Dashboard placeholder container - centered flex container
 */
export const DashboardPlaceholderContainer = ({ children }: { children: ReactNode }) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  };

  return <div style={containerStyle}>{children}</div>;
};

/**
 * Dashboard placeholder text
 */
export const DashboardPlaceholderText = ({
  children,
  testId,
}: {
  children: ReactNode;
  testId?: string;
}) => {
  const textStyle: React.CSSProperties = {
    color: "hsl(var(--muted-foreground))",
    fontSize: "1.125rem",
  };

  return (
    <p data-testid={testId} style={textStyle}>
      {children}
    </p>
  );
};
