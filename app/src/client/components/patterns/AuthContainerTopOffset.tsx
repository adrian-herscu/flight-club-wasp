import { ReactNode } from "react";

interface AuthContainerTopOffsetProps {
  children: ReactNode;
}

/**
 * Wrapper for auth container content with negative top margin for visual adjustment
 */
export function AuthContainerTopOffset({ children }: AuthContainerTopOffsetProps) {
  return <div className="-mt-8">{children}</div>;
}
