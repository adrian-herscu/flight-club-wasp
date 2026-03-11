import { VerifyEmailForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";

export function EmailVerification() {
  return (
    <AuthPageLayout>
      <VerifyEmailForm />
      <br />
      <span className="text-sm font-medium text-gray-900">
        Back to{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline">
          login
        </WaspRouterLink>
      </span>
    </AuthPageLayout>
  );
}
