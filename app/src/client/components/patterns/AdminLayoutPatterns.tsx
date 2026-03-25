import React, { ReactNode } from "react";

/**
 * Main layout wrapper with dark background
 */
export const AdminLayoutRoot = ({ children }: { children: ReactNode }) => {
  return <Root>{children}</Root>;
};

const Root = ({ children }: { children: ReactNode }) => {
  const rootStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--background))",
    color: "hsl(var(--foreground))",
  };

  return <div style={rootStyle}>{children}</div>;
};

/**
 * Two-column layout container (sidebar + main content)
 */
export const AdminTwoColumnLayout = ({ children }: { children: ReactNode }) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  };

  return <div style={containerStyle}>{children}</div>;
};

/**
 * Main content area with flex column layout
 */
export const AdminMainContent = ({
  children,
  reserveSidebarSpace = false,
  sidebarWidth = "18.125rem",
}: {
  children: ReactNode;
  reserveSidebarSpace?: boolean;
  sidebarWidth?: string;
}) => {
  const mainStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflowX: "hidden",
    overflowY: "auto",
    ...(reserveSidebarSpace ? { marginInlineStart: sidebarWidth } : {}),
  };

  return <div style={mainStyle}>{children}</div>;
};

/**
 * Content area inside main, with padding and max-width
 */
export const AdminMainContentInner = ({ children }: { children: ReactNode }) => {
  const innerStyle: React.CSSProperties = {
    marginLeft: "auto",
    marginRight: "auto",
    maxWidth: "calc(var(--breakpoint-2xl))",
    padding: "1rem",
  };

  return (
    <main>
      <div style={innerStyle}>
        {children}
      </div>
    </main>
  );
};
