import { ReactNode } from "react";
import { Link as WaspRouterLink } from "wasp/client/router";

type RouteTo = any; // Match pattern from original AuthInlineLink

interface AuthInlineTextProps {
  prefix: string;
  to: RouteTo;
  linkText: string;
  suffix?: string;
}

/**
 * Inline text with embedded link, commonly used in auth pages
 */
export function AuthInlineText({
  prefix,
  to,
  linkText,
  suffix,
}: AuthInlineTextProps) {
  return (
    <span className="text-sm font-medium text-gray-900">
      {prefix}{" "}
      <WaspRouterLink to={to} className="underline">
        {linkText}
      </WaspRouterLink>
      {suffix}
    </span>
  );
}
