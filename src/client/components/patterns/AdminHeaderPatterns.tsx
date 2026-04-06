import React, { ReactNode } from "react";

export const ADMIN_MOBILE_CHROME_HEIGHT = "4.5rem";

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
 * Hamburger toggle button wrapper
 */
export const HamburgerButtonWrapper = ({ children }: { children: ReactNode }) => {
  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  return <div style={wrapperStyle}>{children}</div>;
};

/**
 * Hamburger button itself
 */
export const HamburgerButton = ({
  onClick,
}: {
  onClick: (e: React.MouseEvent) => void;
  isOpen: boolean | string | undefined;
}) => {
  const buttonStyle: React.CSSProperties = {
    borderColor: "hsl(var(--border))",
    backgroundColor: "hsl(var(--background))",
    display: "block",
    position: "relative",
    borderRadius: "0.125rem",
    borderWidth: "1px",
    padding: "0.375rem",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  };

  const spanWrapperStyle: React.CSSProperties = {
    height: "1.375rem",
    width: "1.375rem",
    position: "relative",
    display: "block",
    cursor: "pointer",
  };

  const lineBaseStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--foreground))",
    position: "relative",
    left: 0,
    top: 0,
    display: "block",
    height: "0.125rem",
    width: 0,
    borderRadius: "0.125rem",
    margin: "0.25rem 0",
    transition: "all 0.2s ease-in-out 0s",
  };

  const line1Style: React.CSSProperties = {
    ...lineBaseStyle,
    width: "100%",
    opacity: 1,
  };

  const line2Style: React.CSSProperties = {
    ...lineBaseStyle,
    width: "100%",
    opacity: 1,
  };

  const line3Style: React.CSSProperties = {
    ...lineBaseStyle,
    width: "100%",
    opacity: 1,
  };

  return (
    <button
      aria-controls="sidebar"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      style={{
        ...buttonStyle,
        zIndex: 99999,
      }}
    >
      <span style={spanWrapperStyle}>
        <span style={{ position: "absolute", right: 0, height: "100%", width: "100%" }}>
          <span style={line1Style}></span>
          <span style={line2Style}></span>
          <span style={line3Style}></span>
        </span>
      </span>
    </button>
  );
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

export const HeaderMobileSpacer = () => {
  return <div aria-hidden="true" style={{ height: ADMIN_MOBILE_CHROME_HEIGHT }} />;
};

export const HeaderMobileFloatingBar = ({ children }: { children: ReactNode }) => {
  const barStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem",
  };

  return <header style={barStyle}>{children}</header>;
};
