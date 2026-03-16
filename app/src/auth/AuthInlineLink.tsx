import { Link as WaspRouterLink } from "wasp/client/router";

type AuthInlineLinkProps = {
  prefix: string;
  to: string;
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
      <WaspRouterLink to={to} className="underline">
        {linkText}
      </WaspRouterLink>
      {suffix}
    </span>
  );
}
