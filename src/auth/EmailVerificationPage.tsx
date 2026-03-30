import { VerifyEmailForm } from "wasp/client/auth";
import { routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { AuthInlineLink } from "./AuthInlineLink";

export function EmailVerification() {
  return (
    <AuthPageLayout>
      <VerifyEmailForm />
      <br />
      <AuthInlineLink
        prefix="Back to"
        to={routes.LoginRoute.to}
        linkText="login"
      />
    </AuthPageLayout>
  );
}
