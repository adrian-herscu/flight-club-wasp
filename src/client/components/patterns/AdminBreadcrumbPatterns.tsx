import React, { ReactNode } from "react";

/**
 * Breadcrumb root container
 */
export const BreadcrumbRoot = ({
  children,
  showTitle,
}: {
  children: ReactNode;
  showTitle?: boolean;
}) => {
  const rootStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  };

  const compactStyle: React.CSSProperties = {
    marginBottom: "0.5rem",
    gap: "0.25rem",
  };

  return <div style={showTitle ? rootStyle : compactStyle}>{children}</div>;
};

/**
 * Breadcrumb title/heading
 */
export const BreadcrumbTitle = ({ children }: { children: ReactNode }) => {
  const titleStyle: React.CSSProperties = {
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "hsl(var(--foreground))",
  };

  return <h2 style={titleStyle}>{children}</h2>;
};

/**
 * Breadcrumb navigation
 */
export const BreadcrumbNav = ({ children }: { children: ReactNode }) => {
  return <nav>{children}</nav>;
};

/**
 * Breadcrumb list
 */
export const BreadcrumbList = ({ children }: { children: ReactNode }) => {
  const listStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  };

  return <ul style={listStyle}>{children}</ul>;
};

/**
 * Breadcrumb item
 */
export const BreadcrumbListItem = ({ children }: { children: ReactNode }) => {
  const itemStyle: React.CSSProperties = {
    fontWeight: 500,
  };

  return <li style={itemStyle}>{children}</li>;
};
