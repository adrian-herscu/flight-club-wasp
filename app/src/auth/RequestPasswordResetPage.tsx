import { ForgotPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";

export function RequestPasswordReset() {
  return (
    <AuthPageLayout>
      <ForgotPasswordForm />
      <br />
      <span className="text-sm font-medium text-gray-900">
        Remembered your password?{" "}
        <WaspRouterLink to={routes.LoginRoute.to} className="underline">
          Go to login
        </WaspRouterLink>
      </span>
    </AuthPageLayout>
  );
}
