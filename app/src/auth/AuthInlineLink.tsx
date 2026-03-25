import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthInlineText } from "../client/components/patterns/AuthInlineText";

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
    <AuthInlineText
      prefix={prefix}
      to={to as any}
      linkText={linkText}
      suffix={suffix}
    />
  );
}
