import React, { ReactNode } from "react";

/**
 * Message button list item wrapper
 */
export const MessageButtonItem = ({ children }: { children: ReactNode }) => {
  const itemStyle: React.CSSProperties = {
    position: "relative",
  };

  return <li style={itemStyle}>{children}</li>;
};

/**
 * Message button link
 */
export const MessageButtonLink = ({ children }: { children: ReactNode }) => {
  const linkStyle: React.CSSProperties = {
    height: "2.125rem",
    width: "2.125rem",
    borderColor: "hsl(var(--border))",
    backgroundColor: "hsl(var(--muted))",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9999px",
    borderWidth: "0.5px",
  };

  return <div style={linkStyle}>{children}</div>;
};

/**
 * Message notification badge
 */
export const MessageNotificationBadge = () => {
  const badgeStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--destructive))",
    position: "absolute",
    right: "-0.125rem",
    top: "-0.125rem",
    height: "0.5rem",
    width: "0.5rem",
    borderRadius: "9999px",
  };

  const pulseStyle: React.CSSProperties = {
    backgroundColor: "hsl(var(--destructive))",
    position: "absolute",
    zIndex: -1,
    height: "100%",
    width: "100%",
    animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
    borderRadius: "9999px",
    opacity: 0.75,
  };

  return (
    <>
      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
      <span style={badgeStyle}>
        <span style={pulseStyle}></span>
      </span>
    </>
  );
};

/**
 * Messages page text wrapper
 */
export const MessagesPageText = ({ children }: { children: ReactNode }) => {
  return <div>{children}</div>;
};
