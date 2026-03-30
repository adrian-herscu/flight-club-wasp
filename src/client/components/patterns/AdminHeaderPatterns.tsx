import React, { ReactNode } from "react";

/**
 * Header wrapper - sticky top bar with flex layout
 */
export const HeaderRoot = ({ children }: { children: ReactNode }) => {
  const headerStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--background))",
    borderColor: "hsl(var(--border))",
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "flex",
    width: "100%",
    borderBottom: "1px solid",
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
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
  isOpen,
}: {
  onClick: (e: React.MouseEvent) => void;
  isOpen: boolean | string | undefined;
}) => {
  const buttonStyle: React.CSSProperties = {
    borderColor: "hsl(var(--border))",
    backgroundColor: "hsl(var(--background))",
    display: "block",
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
    width: isOpen ? "0" : "100%",
    opacity: isOpen ? 0 : 1,
  };

  const line2Style: React.CSSProperties = {
    ...lineBaseStyle,
    width: isOpen ? "0" : "100%",
    opacity: isOpen ? 0 : 1,
  };

  const line3Style: React.CSSProperties = {
    ...lineBaseStyle,
    width: isOpen ? "0" : "100%",
    opacity: isOpen ? 0 : 1,
  };

  const xWrapperStyle: React.CSSProperties = {
    position: "absolute",
    right: 0,
    height: "100%",
    width: "100%",
    transform: "rotate(45deg)",
  };

  const xLine1Style: React.CSSProperties = {
    backgroundColor: "hsl(var(--foreground))",
    position: "absolute",
    left: "0.625rem",
    top: 0,
    display: "block",
    width: "0.125rem",
    height: isOpen ? "100%" : "0",
    opacity: isOpen ? 1 : 0,
    borderRadius: "0.125rem",
    transition: "all 0.2s ease-in-out 0s",
  };

  const xLine2Style: React.CSSProperties = {
    backgroundColor: "hsl(var(--foreground))",
    position: "absolute",
    left: 0,
    top: "0.625rem",
    display: "block",
    width: isOpen ? "100%" : "0",
    height: "0.125rem",
    opacity: isOpen ? 1 : 0,
    borderRadius: "0.125rem",
    transition: "all 0.2s ease-in-out 0s",
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
        <span style={xWrapperStyle}>
          <span style={xLine1Style}></span>
          <span style={xLine2Style}></span>
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
