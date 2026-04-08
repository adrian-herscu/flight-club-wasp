import { ChevronDown, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { logout } from "wasp/client/auth";
import * as operations from "wasp/client/operations";
import { type User as UserEntity } from "wasp/entities";
import { type DashboardPath } from "../shared/roles";
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
  const { getMyDashboardPath, useQuery } = operations as any;
  const { data: dashboardPathData } = useQuery(getMyDashboardPath, undefined, {
    enabled: Boolean(user),
  });
  const dashboardPath = (dashboardPathData as DashboardPath | null | undefined) ?? null;
  const currentUser = user as Partial<UserEntity> & {
    fullName?: string | null;
    email?: string | null;
  };
  const menuItems = getMenuItemsForUser(user ?? null, dashboardPath);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    window.location.assign("/");
  };

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
        <DropdownMenuItem onClick={() => void handleLogout()}>
          <DropdownItemContent>
            <LogOut size="1.1rem" />
            {t("auth.logout")}
          </DropdownItemContent>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
