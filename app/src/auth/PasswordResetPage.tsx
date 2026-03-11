import { ResetPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";

export function PasswordReset() {
  return (
    <AuthPageLayout>
      <ResetPasswordForm />
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
