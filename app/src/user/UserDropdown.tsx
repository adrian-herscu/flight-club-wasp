import { ChevronDown, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { logout } from "wasp/client/auth";
import { type User as UserEntity } from "wasp/entities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../client/components/ui/dropdown-menu";
import { getMenuItemsForUser } from "./constants";

export function UserDropdown({ user }: { user: Partial<UserEntity> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const currentUser = user as Partial<UserEntity> & {
    fullName?: string | null;
    email?: string | null;
  };
  const menuItems = getMenuItemsForUser(user?.role ?? null);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out">
          <span className="text-foreground mr-2 hidden text-right text-sm font-medium lg:block">
            {currentUser.fullName ?? currentUser.email ?? t("common.user")}
          </span>
          <User className="size-5" />
          <ChevronDown className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {menuItems.map((item) => {
          if (item.isAuthRequired && !user) return null;

          return (
            <DropdownMenuItem key={item.nameKey}>
              <Link
                to={item.to}
                onClick={() => {
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3"
              >
                <item.icon size="1.1rem" />
                {t(item.nameKey)}
              </Link>
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
