import { ResetPasswordForm } from "wasp/client/auth";
import { routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { AuthInlineLink } from "./AuthInlineLink";

export function PasswordReset() {
  return (
    <AuthPageLayout>
      <ResetPasswordForm />
      <br />
      <AuthInlineLink
        prefix="Back to"
        to={routes.LoginRoute.to}
        linkText="login"
      />
    </AuthPageLayout>
  );
}
