import { GoogleSignInButton } from "wasp/client/auth";
import { AuthPageLayout } from "./AuthPageLayout";

export default function Login() {
  return (
    <AuthPageLayout>
      <GoogleSignInButton />
    </AuthPageLayout>
  );
}
