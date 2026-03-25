import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router";
import { GoogleSignInButton } from "wasp/client/auth";
import { api, handleApiError } from "wasp/client/api";
import { initSession } from "wasp/auth/helpers/user";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { AuthFormSection } from "../client/components/patterns/AuthFormSection";
import { AuthGoogleSection } from "../client/components/patterns/AuthGoogleSection";
import { AuthDivider } from "../client/components/patterns/AuthDivider";
import { AuthForm } from "../client/components/patterns/AuthForm";
import { AuthInputGroup } from "../client/components/patterns/AuthInputGroup";
import { AuthErrorMessage } from "../client/components/patterns/AuthErrorMessage";

export function TranslatedLoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.post("/auth/email/login", { email, password });
      await initSession(response.data.sessionId);
      navigate("/");
    } catch (err) {
      const error = handleApiError(err as Parameters<typeof handleApiError>[0]);
      const message =
        error instanceof Error
          ? error.message
          : t("auth.invalidCredentials");
      setError(message || t("auth.loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFormSection>
      <AuthGoogleSection label={t("auth.continueWithGoogle")}>
        <GoogleSignInButton />
      </AuthGoogleSection>

      <AuthDivider label={t("auth.orContinueWithEmail")} />

      <AuthForm onSubmit={handleSubmit}>
        <AuthInputGroup>
          <Label htmlFor="email">
            {t("auth.emailAddress")}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
            required
            disabled={isLoading}
          />
        </AuthInputGroup>

        <AuthInputGroup>
          <Label htmlFor="password">
            {t("auth.password")}
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder={t("auth.passwordPlaceholder")}
            required
            disabled={isLoading}
          />
        </AuthInputGroup>

        {error && (
          <AuthErrorMessage message={error} />
        )}

        <Button
          type="submit"
          variant="accent"
          size="full"
          disabled={isLoading}
        >
          {isLoading ? t("common.loading") : t("auth.login")}
        </Button>
      </AuthForm>
    </AuthFormSection>
  );
}
