import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "wasp/client/auth";
import {
  getPaginatedUsers,
  updateIsUserAdminById,
  useQuery,
} from "wasp/client/operations";
import { type User } from "wasp/entities";
import { Button } from "../../../client/components/ui/button";
import { Checkbox } from "../../../client/components/ui/checkbox";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import useDebounce from "../../../client/hooks/useDebounce";
import LoadingSpinner from "../../layout/LoadingSpinner";
import DropdownEditDelete from "./DropdownEditDelete";

const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED"] as const;
type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
const USER_ROLES = ["SYSTEM_ADMIN", "SCHOOL_MANAGER", "INSTRUCTOR", "STUDENT", "USER"] as const;
type UserRole = (typeof USER_ROLES)[number];

function RoleSelect({ id, role }: Pick<User, "id" | "role">) {
  const { data: currentUser } = useAuth();
  const isCurrentUser = currentUser?.id === id;

  return (
    <Select
      value={role}
      onValueChange={(value) => updateIsUserAdminById({ id, role: value as UserRole })}
      disabled={isCurrentUser}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {USER_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const UsersTable = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState<string | undefined>(undefined);
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(
    undefined,
  );
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<
    Array<SubscriptionStatus | null>
  >([]);

  const debouncedEmailFilter = useDebounce(emailFilter, 300);

  const skipPages = currentPage - 1;

  const { data, isLoading } = useQuery(getPaginatedUsers, {
    skipPages,
    filter: {
      ...(debouncedEmailFilter && { emailContains: debouncedEmailFilter }),
      ...(roleFilter !== undefined && { roleIn: [roleFilter] }),
      ...(subscriptionStatusFilter.length > 0 && {
        subscriptionStatusIn: subscriptionStatusFilter,
      }),
    },
  });

  useEffect(
    function backToPageOne() {
      setCurrentPage(1);
    },
    [debouncedEmailFilter, subscriptionStatusFilter, roleFilter],
  );

  const handleStatusToggle = (status: SubscriptionStatus | null) => {
    setSubscriptionStatusFilter((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  const clearAllStatusFilters = () => {
    setSubscriptionStatusFilter([]);
  };

  const hasActiveFilters =
    subscriptionStatusFilter && subscriptionStatusFilter.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card rounded-sm border shadow-sm">
        <div className="bg-muted/40 flex w-full flex-col items-start justify-between gap-3 p-6">
          <span className="text-sm font-medium">Filters:</span>
          <div className="flex w-full items-center justify-between gap-3 px-2">
            <div className="relative flex items-center gap-3">
              <Label
                htmlFor="email-filter"
                className="text-muted-foreground text-sm"
              >
                {t("admin.emailLabel")}
              </Label>
              <Input
                type="text"
                id="email-filter"
                placeholder={t("admin.emailPlaceholder")}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setEmailFilter(value === "" ? undefined : value);
                }}
              />
              <Label
                htmlFor="status-filter"
                className="text-muted-foreground ml-2 text-sm"
              >
                {t("admin.statusLabel")}
              </Label>
              <div className="relative">
                <Select>
                  <SelectTrigger className="w-full min-w-50">
                    <SelectValue placeholder={t("admin.statusFilterPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="w-75">
                    <div className="p-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t("admin.subscriptionStatus")}
                        </span>
                        {subscriptionStatusFilter.length > 0 && (
                          <button
                            onClick={clearAllStatusFilters}
                            className="text-muted-foreground hover:text-foreground text-xs"
                          >
                            {t("admin.clearAllFilters")}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="all-statuses"
                            checked={subscriptionStatusFilter.length === 0}
                            onCheckedChange={() => clearAllStatusFilters()}
                          />
                          <Label
                            htmlFor="all-statuses"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {t("admin.allStatuses")}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="has-not-subscribed"
                            checked={subscriptionStatusFilter.includes(null)}
                            onCheckedChange={() => handleStatusToggle(null)}
                          />
                          <Label
                            htmlFor="has-not-subscribed"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {t("admin.hasNotSubscribed")}
                          </Label>
                        </div>
                        {SUBSCRIPTION_STATUSES.map((status) => (
                          <div
                            key={status}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={status}
                              checked={subscriptionStatusFilter.includes(
                                status,
                              )}
                              onCheckedChange={() => handleStatusToggle(status)}
                            />
                            <Label
                              htmlFor={status}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t(`admin.${status.toLowerCase() === "past_due" ? "pastDue" : status.toLowerCase()}`)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="admin-filter"
                  className="text-muted-foreground ml-2 text-sm"
                >
                  {t("admin.roleLabel")}
                </Label>
                <Select
                  onValueChange={(value) => {
                    if (value === "all") {
                      setRoleFilter(undefined);
                    } else {
                      setRoleFilter(value as UserRole);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("common.more")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.more")}</SelectItem>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {data?.totalPages && (
              <div className="flex max-w-60 flex-row items-center">
                <span className="text-md text-foreground mr-2">{t("admin.page")}</span>
                <Input
                  type="number"
                  min={1}
                  defaultValue={currentPage}
                  max={data?.totalPages}
                  onChange={(e) => {
                    const value = parseInt(e.currentTarget.value);
                    if (
                      data?.totalPages &&
                      value <= data?.totalPages &&
                      value > 0
                    ) {
                      setCurrentPage(value);
                    }
                  }}
                  className="w-20"
                />
                <span className="text-md text-foreground">
                  {" "}
                  /{data?.totalPages}{" "}
                </span>
              </div>
            )}
          </div>
          {hasActiveFilters && (
            <div className="border-border flex items-center gap-2 px-2 pt-2">
              <span className="text-muted-foreground text-sm font-medium">
                Active Filters:
              </span>
              <div className="flex flex-wrap gap-2">
                {subscriptionStatusFilter.map((status) => (
                  <Button
                    key={status ?? "null"}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusToggle(status)}
                  >
                    <X className="mr-1 h-3 w-3" />
                    {status ?? "Has Not Subscribed"}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-border py-4.5 grid grid-cols-9 border-t-4 px-4 md:px-6">
          <div className="col-span-3 flex items-center">
            <p className="font-medium">{t("admin.emailFullName")}</p>
          </div>
          <div className="col-span-2 flex items-center">
            <p className="font-medium">{t("admin.subscriptionStatus")}</p>
          </div>
          <div className="col-span-2 flex items-center">
            <p className="font-medium">{t("admin.stripeID")}</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium">{t("admin.role")}</p>
          </div>
          <div className="col-span-1 flex items-center">
            <p className="font-medium"></p>
          </div>
        </div>
        {isLoading && <LoadingSpinner />}
        {!!data?.users &&
          data?.users?.length > 0 &&
          data.users.map((user) => (
            <div
              key={user.id}
              className="py-4.5 grid grid-cols-9 gap-4 px-4 md:px-6"
            >
              <div className="col-span-3 flex items-center">
                <div className="flex flex-col gap-1">
                  <p className="text-foreground text-sm">{user.email}</p>
                  <p className="text-foreground text-sm">{user.fullName}</p>
                </div>
              </div>
              <div className="col-span-2 flex items-center">
                <p className="text-foreground text-sm">
                  {user.subscriptionStatus}
                </p>
              </div>
              <div className="col-span-2 flex items-center">
                <p className="text-muted-foreground text-sm">
                  {user.paymentProcessorUserId}
                </p>
              </div>
              <div className="col-span-1 flex items-center">
                <div className="text-foreground text-sm">
                  <RoleSelect {...user} />
                </div>
              </div>
              <div className="col-span-1 flex items-center">
                <DropdownEditDelete />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default UsersTable;
