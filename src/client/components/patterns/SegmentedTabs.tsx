import { type CSSProperties, type ReactNode } from "react";
import { Button } from "../ui/button";

const getDirectionalMaskStyle = (): CSSProperties | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }

  const isRtl = document.documentElement.dir === "rtl";
  const mask = isRtl
    ? "linear-gradient(to left, black 0, black calc(100% - 20px), transparent 100%)"
    : "linear-gradient(to right, black 0, black calc(100% - 20px), transparent 100%)";

  return {
    maskImage: mask,
    WebkitMaskImage: mask,
  };
};

export const SegmentedTabs = ({
  children,
  sticky = false,
  withMask = false,
}: {
  children: ReactNode;
  sticky?: boolean;
  withMask?: boolean;
}) => {
  return (
    <div
      className={
        sticky
          ? "sticky top-0 z-20 mb-2 backdrop-blur supports-backdrop-filter:bg-background/70"
          : "mb-4 border-b"
      }
    >
      <div className="relative flex overflow-x-auto" style={withMask ? getDirectionalMaskStyle() : undefined}>
        {children}
      </div>
    </div>
  );
};

export const SegmentedTabButton = ({
  active,
  onClick,
  isLast = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  isLast?: boolean;
  children: ReactNode;
}) => {
  return (
    <Button
      type="button"
      className={isLast ? "shrink-0 rounded-none" : "shrink-0 rounded-none border-s"}
      variant={active ? "secondary" : "outline"}
      onClick={onClick}
    >
      {children}
    </Button>
  );
};