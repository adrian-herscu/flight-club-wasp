import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router";
import { GoogleSignInButton } from "wasp/client/auth";
import { api, handleApiError } from "wasp/client/api";
import { initSession } from "wasp/auth/helpers/user";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";

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
      navigate("/admin");
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
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm font-medium text-gray-700">{t("auth.continueWithGoogle")}</p>
        <div className="flex justify-center">
          <GoogleSignInButton />
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">{t("auth.orContinueWithEmail")}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 block w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 block w-full"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
        >
          {isLoading ? t("common.loading") : t("auth.login")}
        </Button>
      </form>
    </div>
  );
}
