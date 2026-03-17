import { Link as WaspRouterLink, routes } from "wasp/client/router";

type RouteTo = (typeof routes)[keyof typeof routes]["to"];

type AuthInlineLinkProps = {
  prefix: string;
  to: RouteTo;
  linkText: string;
  suffix?: string;
};

export function AuthInlineLink({
  prefix,
  to,
  linkText,
  suffix,
}: AuthInlineLinkProps) {
  return (
    <span className="text-sm font-medium text-gray-900">
      {prefix}{" "}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <WaspRouterLink to={to as any} className="underline">
        {linkText}
      </WaspRouterLink>
      {suffix}
    </span>
  );
}
