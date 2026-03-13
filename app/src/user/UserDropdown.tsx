import { ChevronDown, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { logout } from "wasp/client/auth";
import { Link as WaspRouterLink } from "wasp/client/router";
import { type User as UserEntity } from "wasp/entities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../client/components/ui/dropdown-menu";
import { isAdmin } from "../shared/admin";
import { userMenuItems } from "./constants";

export function UserDropdown({ user }: { user: Partial<UserEntity> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const currentUser = user as Partial<UserEntity> & {
    fullName?: string | null;
    email?: string | null;
  };

  const getItemLabel = (itemName: string) => {
    const labelMap: Record<string, string> = {
      "Account Settings": t("user.accountInformation"),
      "My School": t("admin.mySchool"),
      "Syllabuses": t("admin.syllabuses"),
      "Admin Dashboard": t("admin.dashboard"),
    };
    return labelMap[itemName] || itemName;
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out">
          <span className="text-foreground mr-2 hidden text-right text-sm font-medium lg:block">
            {currentUser.fullName ?? currentUser.email ?? "User"}
          </span>
          <User className="size-5" />
          <ChevronDown className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {userMenuItems.map((item) => {
          if (item.isAuthRequired && !user) return null;
          if (item.isAdminOnly && !isAdmin(user)) return null;

          return (
            <DropdownMenuItem key={item.name}>
              <WaspRouterLink
                to={item.to}
                onClick={() => {
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3"
              >
                <item.icon size="1.1rem" />
                {getItemLabel(item.name)}
              </WaspRouterLink>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3"
          >
            <LogOut size="1.1rem" />
            {t("auth.logout")}
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
