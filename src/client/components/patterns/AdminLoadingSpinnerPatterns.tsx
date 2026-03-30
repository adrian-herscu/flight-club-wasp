import React, { ReactNode } from "react";

/**
 * Loading spinner container
 */
export const LoadingSpinnerContainer = ({ children }: { children: ReactNode }) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: "2.5rem",
    paddingBottom: "2.5rem",
  };

  return <div style={containerStyle}>{children}</div>;
};

/**
 * Animated spinning circle
 */
export const LoadingSpinnerCircle = () => {
  const circleStyle: React.CSSProperties = {
    height: "4rem",
    width: "4rem",
    animation: "spin 1s linear infinite",
    borderRadius: "9999px",
    borderWidth: "4px",
    borderStyle: "solid",
    borderColor: "hsl(var(--primary))",
    borderTopColor: "transparent",
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div style={circleStyle}></div>
    </>
  );
};
