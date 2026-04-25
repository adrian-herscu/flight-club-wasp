import { useState } from "react";
import { useNavigate } from "react-router";
import { logout, useAuth } from "wasp/client/auth";
import { api, handleApiError } from "wasp/client/api";
import { initSession } from "wasp/auth/helpers/user";
import * as operations from "wasp/client/operations";
import { AuthErrorMessage } from "../patterns/AuthErrorMessage";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type DevSeedUser = {
  id: string;
  email: string;
  displayName: string;
};

const DEV_PASSWORD = "12345678";

export function DevLoginMenu() {
  if (import.meta.env.REACT_APP_DEV_MODE !== "true") {
    return null;
  }

  return <DevLoginMenuInner />;
}

function DevLoginMenuInner() {
  const navigate = useNavigate();
  const { data: currentUser } = useAuth();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { getDevSeedUsers, useQuery } = operations as any;
  const { data } = useQuery(getDevSeedUsers);
  const users = (data as DevSeedUser[] | undefined) ?? [];

  const loginAs = async (email: string) => {
    setError(null);
    setLoadingEmail(email);
    try {
      if (currentUser) {
        await logout();
      }

      const response = await api.post("/auth/email/login", {
        email,
        password: DEV_PASSWORD,
      });
      await initSession(response.data.sessionId);
      navigate("/");
    } catch (err) {
      const parsed = handleApiError(err as Parameters<typeof handleApiError>[0]);
      setError(parsed instanceof Error ? parsed.message : "Login failed");
    } finally {
      setLoadingEmail(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            DEV LOGIN
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>
            Seeded users
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {users.length === 0 ? (
            <DropdownMenuItem disabled>
              No seeded users found
            </DropdownMenuItem>
          ) : (
            users.map((user) => (
              <DropdownMenuItem
                key={user.id}
                disabled={loadingEmail !== null}
                onSelect={() => {
                  void loginAs(user.email);
                }}
              >
                {loadingEmail === user.email
                  ? `Signing in: ${user.displayName}`
                  : user.displayName}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <AuthErrorMessage message={error} />}
    </>
  );
}