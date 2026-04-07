import React, { ReactNode } from "react";

/**
 * Header wrapper - sticky top bar with flex layout
 */
export const HeaderRoot = ({ children }: { children: ReactNode }) => {
  const headerStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--background))",
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    width: "100%",
  };

  return <header style={headerStyle}>{children}</header>;
};

/**
 * Header content container - grows and contains flex items
 */
export const HeaderContent = ({ children }: { children: ReactNode }) => {
  const contentStyle: React.CSSProperties = {
    display: "flex",
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: "2rem",
    paddingRight: "2rem",
    paddingTop: "1.25rem",
    paddingBottom: "1.25rem",
  };

  return <div style={contentStyle}>{children}</div>;
};

/**
 * Header toolbar - flex items center gap
 */
export const HeaderToolbar = ({ children }: { children: ReactNode }) => {
  const toolbarStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  return <ul style={toolbarStyle}>{children}</ul>;
};

/**
 * Header actions - flex items center gap (larger gap)
 */
export const HeaderActions = ({ children }: { children: ReactNode }) => {
  const actionsStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  };

  return <div style={actionsStyle}>{children}</div>;
};

/**
 * Desktop actions alignment container
 */
export const HeaderDesktopActionsContainer = ({ children }: { children: ReactNode }) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  };

  return <div style={containerStyle}>{children}</div>;
};

/**
 * Mobile menu trigger alignment container
 */
export const HeaderMobileMenuContainer = ({ children }: { children: ReactNode }) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
  };

  return <div style={containerStyle}>{children}</div>;
};
