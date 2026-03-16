import { ForgotPasswordForm } from "wasp/client/auth";
import { routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { AuthInlineLink } from "./AuthInlineLink";

export function RequestPasswordReset() {
  return (
    <AuthPageLayout>
      <ForgotPasswordForm />
      <br />
      <AuthInlineLink
        prefix="Remembered your password?"
        to={routes.LoginRoute.to}
        linkText="Go to login"
      />
    </AuthPageLayout>
  );
}
