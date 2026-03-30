import React, { ReactNode } from "react";

/**
 * Analytics card icon container - circular background with icon
 */
export const AnalyticsCardIconContainer = ({ children }: { children: ReactNode }) => {
  const containerStyle: React.CSSProperties = {
    height: "2.875rem",
    width: "2.875rem",
    backgroundColor: "hsl(var(--muted))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9999px",
  };

  return <div style={containerStyle}>{children}</div>;
};

/**
 * Analytics card value container
 */
export const AnalyticsCardValue = ({ children }: { children: ReactNode }) => {
  const valueStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "hsl(var(--foreground))",
  };

  return <h4 style={valueStyle}>{children}</h4>;
};

/**
 * Analytics card label
 */
export const AnalyticsCardLabel = ({ children }: { children: ReactNode }) => {
  const labelStyle: React.CSSProperties = {
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.875rem",
    fontWeight: 500,
  };

  return <span style={labelStyle}>{children}</span>;
};

/**
 * Analytics card delta indicator
 */
export const AnalyticsCardDelta = ({
  children,
  isPositive,
  isLoading,
}: {
  children: ReactNode;
  isPositive?: boolean;
  isLoading?: boolean;
}) => {
  const deltaStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: isLoading
      ? "hsl(var(--muted-foreground))"
      : isPositive
        ? "hsl(var(--success))"
        : "hsl(var(--destructive))",
  };

  return <span style={deltaStyle}>{children}</span>;
};

/**
 * Analytics card content row
 */
export const AnalyticsCardContentRow = ({ children }: { children: ReactNode }) => {
  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
  };

  return <div style={rowStyle}>{children}</div>;
};

/**
 * Analytics metric block
 */
export const AnalyticsMetricBlock = ({ children }: { children: ReactNode }) => {
  return <div>{children}</div>;
};

/**
 * Chart container
 */
export const ChartContainer = ({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) => {
  const containerStyle: React.CSSProperties = {
    borderColor: "hsl(var(--border))",
    backgroundColor: "hsl(var(--card))",
    paddingTop: "1.875rem",
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    gridColumn: "span 12 / span 12",
    borderRadius: "0.125rem",
    borderWidth: "1px",
    paddingLeft: "1.25rem",
    paddingRight: "1.25rem",
    paddingBottom: "1.25rem",
  };

  return (
    <div style={containerStyle} id={id}>
      {children}
    </div>
  );
};

/**
 * Chart header with title and controls
 */
export const ChartHeader = ({ children }: { children: ReactNode }) => {
  const headerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
  };

  return <div style={headerStyle}>{children}</div>;
};

/**
 * Chart legend group
 */
export const ChartLegendGroup = ({ children }: { children: ReactNode }) => {
  const groupStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  };

  return <div style={groupStyle}>{children}</div>;
};

/**
 * Chart legend item (colored box + label)
 */
export const ChartLegendItem = ({
  children,
  borderColor,
  dotColor,
}: {
  children: ReactNode;
  borderColor: string;
  dotColor: string;
}) => {
  const itemStyle: React.CSSProperties = {
    minWidth: "11.875rem",
    display: "flex",
  };

  const dotWrapperStyle: React.CSSProperties = {
    borderColor: borderColor,
    marginRight: "0.5rem",
    marginTop: "0.25rem",
    display: "flex",
    height: "1rem",
    width: "100%",
    maxWidth: "1rem",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9999px",
    borderWidth: "1px",
  };

  const dotStyle: React.CSSProperties = {
    backgroundColor: dotColor,
    display: "block",
    height: "0.625rem",
    width: "100%",
    maxWidth: "0.625rem",
    borderRadius: "9999px",
  };

  return (
    <div style={itemStyle}>
      <span style={dotWrapperStyle}>
        <span style={dotStyle}></span>
      </span>
      <div>{children}</div>
    </div>
  );
};

/**
 * Chart legend title
 */
export const ChartLegendTitle = ({ children }: { children: ReactNode }) => {
  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
  };

  return <p style={titleStyle}>{children}</p>;
};

/**
 * Chart legend subtitle
 */
export const ChartLegendSubtitle = ({ children }: { children: ReactNode }) => {
  const subtitleStyle: React.CSSProperties = {
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.875rem",
    fontWeight: 500,
  };

  return <p style={subtitleStyle}>{children}</p>;
};

/**
 * Chart time period selector
 */
export const ChartTimePeriodSelector = ({ children }: { children: ReactNode }) => {
  const selectorStyle: React.CSSProperties = {
    maxWidth: "11.25rem",
    display: "flex",
    justifyContent: "flex-end",
  };

  return <div style={selectorStyle}>{children}</div>;
};

/**
 * Chart time period button group
 */
export const ChartTimePeriodButtonGroup = ({
  children,
}: {
  children: ReactNode;
}) => {
  const groupStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--muted))",
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "0.375rem",
    padding: "0.375rem",
  };

  return <div style={groupStyle}>{children}</div>;
};

/**
 * Chart time period button
 */
export const ChartTimePeriodButton = ({
  children,
  isActive,
}: {
  children: ReactNode;
  isActive: boolean;
}) => {
  const buttonStyle: React.CSSProperties = {
    ...(isActive && {
      backgroundColor: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    }),
    borderRadius: "0.25rem",
    paddingLeft: "0.75rem",
    paddingRight: "0.75rem",
    paddingTop: "0.25rem",
    paddingBottom: "0.25rem",
    fontSize: "0.75rem",
    fontWeight: 500,
  };

  return <button style={buttonStyle}>{children}</button>;
};

/**
 * Chart area inside container
 */
export const ChartArea = ({ children, id }: { children: ReactNode; id?: string }) => {
  const areaStyle: React.CSSProperties = {
    marginLeft: "-1.25rem",
  };

  return (
    <div style={areaStyle} id={id}>
      {children}
    </div>
  );
};
