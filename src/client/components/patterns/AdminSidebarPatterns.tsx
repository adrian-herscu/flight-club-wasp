import React, { ReactNode } from "react";

/**
 * Sidebar root container
 */
export const SidebarRoot = React.forwardRef<
  HTMLElement,
  {
    children: ReactNode;
    sidebarOpen: boolean | string | undefined;
    isDesktop: boolean;
    className?: string;
    style?: React.CSSProperties;
  }
>(({ children, sidebarOpen, isDesktop, style }, ref) => {
  const isRtl =
    typeof document !== "undefined" && document.documentElement.dir === "rtl";

  const defaultSidebarStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--muted))",
    position: "fixed",
    top: 0,
    zIndex: isDesktop ? 30 : 50,
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "18.125rem",
    overflow: "hidden",
    transition: "all 0.3s ease-in-out",
    borderColor: "hsl(var(--border))",
  };

  return (
    <aside
      ref={ref}
      style={{
        ...defaultSidebarStyle,
        ...(style || {}),
        ...(sidebarOpen
          ? isRtl
            ? {
                right: 0,
                left: "auto",
                transform: "translateX(0)",
                borderLeftWidth: "1px",
                borderRightWidth: "0px",
              }
            : {
                left: 0,
                right: "auto",
                transform: "translateX(0)",
                borderRightWidth: "1px",
                borderLeftWidth: "0px",
              }
          : isRtl
            ? {
                right: 0,
                left: "auto",
                borderLeftWidth: "1px",
                borderRightWidth: "0px",
                transform: "translateX(100%)",
              }
            : {
                left: 0,
                right: "auto",
                borderRightWidth: "1px",
                borderLeftWidth: "0px",
                transform: "translateX(-100%)",
              }),
      }}
    >
      {children}
    </aside>
  );
});

SidebarRoot.displayName = "SidebarRoot";

/**
 * Sidebar header - flex between logo and close button
 */
export const SidebarHeader = ({ children }: { children: ReactNode }) => {
  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
    paddingTop: "1.375rem",
    paddingBottom: "1.375rem",
  };

  return <div style={headerStyle}>{children}</div>;
};

/**
 * Sidebar scrollable content area
 */
export const SidebarContent = ({ children }: { children: ReactNode }) => {
  const contentStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    transition: "all 0.3s ease-in-out",
  };

  return <div style={contentStyle}>{children}</div>;
};

/**
 * Navigation area inside sidebar
 */
export const SidebarNav = ({ children }: { children: ReactNode }) => {
  const navStyle: React.CSSProperties = {
    marginTop: "1.25rem",
    paddingLeft: "1rem",
    paddingRight: "1rem",
    paddingTop: "1rem",
    paddingBottom: "1rem",
  };

  return <nav style={navStyle}>{children}</nav>;
};

/**
 * Nav menu section with heading
 */
export const NavMenuSection = ({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) => {
  const headingStyle: React.CSSProperties = {
    color: "hsl(var(--muted-foreground))",
    marginBottom: "1rem",
    marginLeft: "1rem",
    fontSize: "0.875rem",
    fontWeight: 600,
  };

  const listStyle: React.CSSProperties = {
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  };

  return (
    <div>
      <h3 style={headingStyle}>{title}</h3>
      <ul style={listStyle}>{children}</ul>
    </div>
  );
};

/**
 * Nav item (li wrapper)
 */
export const NavItem = ({ children }: { children: ReactNode }) => {
  return <li>{children}</li>;
};

/**
 * School context badge container
 */
export const SchoolContextBadgeContainer = ({ children }: { children: ReactNode }) => {
  const containerStyle: React.CSSProperties = {
    paddingLeft: "1.5rem",
    paddingRight: "1.5rem",
    paddingBottom: "0.5rem",
  };

  return <div style={containerStyle}>{children}</div>;
};

/**
 * School context badge box
 */
export const SchoolContextBadgeBox = ({ children }: { children: ReactNode }) => {
  const boxStyle: React.CSSProperties = {
    borderRadius: "0.375rem",
    borderWidth: "1px",
    borderColor: "hsl(var(--border))",
    backgroundColor: "hsla(var(--background), 0.6)",
    paddingLeft: "0.75rem",
    paddingRight: "0.75rem",
    paddingTop: "0.5rem",
    paddingBottom: "0.5rem",
  };

  return <div style={boxStyle}>{children}</div>;
};

/**
 * School label text
 */
export const SchoolLabel = ({ children }: { children: ReactNode }) => {
  const labelStyle: React.CSSProperties = {
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  };

  return <p style={labelStyle}>{children}</p>;
};

/**
 * School name text
 */
export const SchoolNameText = ({ children }: { children: ReactNode }) => {
  const textStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    fontWeight: 600,
  };

  return <p style={textStyle}>{children}</p>;
};

/**
 * Sidebar logo image
 */
export const SidebarLogoImage = ({ src, alt }: { src: string; alt: string }) => {
  return <img src={src} alt={alt} width={50} />;
};

/**
 * Sidebar close toggle button
 */
export const SidebarToggleButton = React.forwardRef<
  HTMLButtonElement,
  {
    children: ReactNode;
    onClick: () => void;
    controls: string;
    expanded: boolean;
  }
>(({ children, onClick, controls, expanded }, ref) => {
  const buttonStyle: React.CSSProperties = {
    display: "block",
  };

  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-controls={controls}
      aria-expanded={expanded}
      style={buttonStyle}
    >
      {children}
    </button>
  );
});

SidebarToggleButton.displayName = "SidebarToggleButton";

/**
 * Sidebar account identity text
 */
export const SidebarAccountIdentityText = ({ children }: { children: ReactNode }) => {
  const textStyle: React.CSSProperties = {
    color: "hsl(var(--muted-foreground))",
    paddingLeft: "1rem",
    paddingRight: "1rem",
    paddingBottom: "0.5rem",
    fontSize: "0.875rem",
    fontWeight: 600,
  };

  return <p style={textStyle}>{children}</p>;
};

/**
 * Sidebar account controls section
 */
export const SidebarAccountControlsSection = ({ children }: { children: ReactNode }) => {
  const sectionStyle: React.CSSProperties = {
    marginLeft: "1rem",
    marginRight: "1rem",
    marginTop: "0.5rem",
    borderTop: "1px solid hsl(var(--border))",
    paddingTop: "1rem",
  };

  return <div style={sectionStyle}>{children}</div>;
};

/**
 * Sidebar account controls vertical stack
 */
export const SidebarAccountControlsStack = ({ children }: { children: ReactNode }) => {
  const stackStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  };

  return <div style={stackStyle}>{children}</div>;
};

export const SidebarMobileBackdrop = ({
  ariaLabel,
  onClick,
}: {
  ariaLabel: string;
  onClick: () => void;
}) => {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        border: "none",
        padding: 0,
        margin: 0,
        cursor: "pointer",
      }}
    />
  );
};
