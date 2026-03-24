import { ChevronDown, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { logout } from "wasp/client/auth";
import { type User as UserEntity } from "wasp/entities";
import {
  DropdownItemContent,
  SrOnlyText,
  UserIdentityText,
} from "../client/components/patterns/AppStructure";
import { Button } from "../client/components/ui/button";
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
        <Button type="button" variant="ghost">
          <UserIdentityText>{currentUser.fullName ?? currentUser.email ?? t("common.user")}</UserIdentityText>
          <User size={20} />
          <ChevronDown size={16} />
          <SrOnlyText>{t("common.user")}</SrOnlyText>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {menuItems.map((item) => {
          if (item.isAuthRequired && !user) return null;

          return (
            <DropdownMenuItem key={item.nameKey} asChild>
              <Link to={item.to} onClick={() => setOpen(false)}>
                <DropdownItemContent>
                  <item.icon size="1.1rem" />
                  {t(item.nameKey)}
                </DropdownItemContent>
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem onClick={() => logout()}>
          <DropdownItemContent>
            <LogOut size="1.1rem" />
            {t("auth.logout")}
          </DropdownItemContent>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
