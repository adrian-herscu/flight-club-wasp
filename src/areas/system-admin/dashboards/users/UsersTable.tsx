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
import {
  UsersBox,
  UsersClearTextButton,
  UsersInlineText,
  UsersLabel,
  UsersPageInput,
  UsersRoleFilterSelectTrigger,
  UsersRoleSelectTrigger,
  UsersStatusSelectContent,
  UsersStatusSelectTrigger,
  UsersText,
} from "../../../../client/components/patterns/UsersDashboardPatterns";
import { Button } from "../../../../client/components/ui/button";
import { Checkbox } from "../../../../client/components/ui/checkbox";
import { Input } from "../../../../client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../../../../client/components/ui/select";
import useDebounce from "../../../../shared/hooks/useDebounce";
import LoadingSpinner from "../../layout/LoadingSpinner";
import DropdownEditDelete from "./DropdownEditDelete";

const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAST_DUE", "PAUSED", "CANCELLED"] as const;
type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

function SystemAdminToggle({ id, isSystemAdmin }: Pick<User, "id" | "isSystemAdmin">) {
  const { data: currentUser } = useAuth();
  const isCurrentUser = currentUser?.id === id;

  return (
    <Checkbox
      checked={isSystemAdmin}
      onCheckedChange={(checked) =>
        updateIsUserAdminById({ id, isSystemAdmin: checked === true })
      }
      disabled={isCurrentUser}
      aria-label="System Admin"
    />
  );
}

const UsersTable = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState<string | undefined>(undefined);
  const [isSystemAdminFilter, setIsSystemAdminFilter] = useState<boolean | undefined>(
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
      ...(isSystemAdminFilter !== undefined && { isSystemAdmin: isSystemAdminFilter }),
      ...(subscriptionStatusFilter.length > 0 && {
        subscriptionStatusIn: subscriptionStatusFilter,
      }),
    },
  });

  useEffect(
    function backToPageOne() {
      setCurrentPage(1);
    },
    [debouncedEmailFilter, subscriptionStatusFilter, isSystemAdminFilter],
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
    <UsersBox variant="tableRoot">
      <UsersBox variant="card">
        <UsersBox variant="filtersPanel">
          <UsersText variant="filtersTitle">Filters:</UsersText>
          <UsersBox variant="filtersRow">
            <UsersBox variant="filtersGroup">
              <UsersLabel htmlFor="email-filter" variant="muted">
                {t("admin.emailLabel")}
              </UsersLabel>
              <Input
                type="text"
                id="email-filter"
                placeholder={t("admin.emailPlaceholder")}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  setEmailFilter(value === "" ? undefined : value);
                }}
              />
              <UsersLabel htmlFor="status-filter" variant="muted">
                {t("admin.statusLabel")}
              </UsersLabel>
              <UsersBox variant="relative">
                <Select>
                  <UsersStatusSelectTrigger>
                    <SelectValue placeholder={t("admin.statusFilterPlaceholder")} />
                  </UsersStatusSelectTrigger>
                  <UsersStatusSelectContent>
                    <UsersBox variant="statusContentBody">
                      <UsersBox variant="statusHeader">
                        <UsersText variant="statusHeading">
                          {t("admin.subscriptionStatus")}
                        </UsersText>
                        {subscriptionStatusFilter.length > 0 && (
                          <UsersClearTextButton onClick={clearAllStatusFilters}>
                            {t("admin.clearAllFilters")}
                          </UsersClearTextButton>
                        )}
                      </UsersBox>
                      <UsersBox variant="statusOptionsList">
                        <UsersBox variant="checkboxRow">
                          <Checkbox
                            id="all-statuses"
                            checked={subscriptionStatusFilter.length === 0}
                            onCheckedChange={() => clearAllStatusFilters()}
                          />
                          <UsersLabel htmlFor="all-statuses" variant="checkbox">
                            {t("admin.allStatuses")}
                          </UsersLabel>
                        </UsersBox>
                        <UsersBox variant="checkboxRow">
                          <Checkbox
                            id="has-not-subscribed"
                            checked={subscriptionStatusFilter.includes(null)}
                            onCheckedChange={() => handleStatusToggle(null)}
                          />
                          <UsersLabel
                            htmlFor="has-not-subscribed"
                            variant="checkbox"
                          >
                            {t("admin.hasNotSubscribed")}
                          </UsersLabel>
                        </UsersBox>
                        {SUBSCRIPTION_STATUSES.map((status) => (
                          <UsersBox key={status} variant="checkboxRow">
                            <Checkbox
                              id={status}
                              checked={subscriptionStatusFilter.includes(
                                status,
                              )}
                              onCheckedChange={() => handleStatusToggle(status)}
                            />
                            <UsersLabel htmlFor={status} variant="checkbox">
                              {t(`admin.${status.toLowerCase() === "past_due" ? "pastDue" : status.toLowerCase()}`)}
                            </UsersLabel>
                          </UsersBox>
                        ))}
                      </UsersBox>
                    </UsersBox>
                  </UsersStatusSelectContent>
                </Select>
              </UsersBox>
              <UsersBox variant="roleFilterGroup">
                <UsersLabel htmlFor="admin-filter" variant="muted">
                  {t("admin.roleLabel")}
                </UsersLabel>
                <Select
                  onValueChange={(value) => {
                    if (value === "all") {
                      setIsSystemAdminFilter(undefined);
                    } else {
                      setIsSystemAdminFilter(value === "admin");
                    }
                  }}
                >
                  <UsersRoleFilterSelectTrigger>
                    <SelectValue placeholder={t("common.more")} />
                  </UsersRoleFilterSelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.more")}</SelectItem>
                    <SelectItem value="admin">System Admin</SelectItem>
                    <SelectItem value="user">Regular User</SelectItem>
                  </SelectContent>
                </Select>
              </UsersBox>
            </UsersBox>
            {data?.totalPages && (
              <UsersBox variant="pagination">
                <UsersText variant="pagination">{t("admin.page")}</UsersText>
                <UsersPageInput
                  defaultValue={currentPage}
                  min={1}
                  max={data?.totalPages}
                  onChange={(value) => {
                    if (
                      data?.totalPages &&
                      value <= data?.totalPages &&
                      value > 0
                    ) {
                      setCurrentPage(value);
                    }
                  }}
                />
                <UsersInlineText variant="pagination">/{data?.totalPages}</UsersInlineText>
              </UsersBox>
            )}
          </UsersBox>
          {hasActiveFilters && (
            <UsersBox variant="activeFiltersRow">
              <UsersText variant="activeFiltersLabel">
                Active Filters:
              </UsersText>
              <UsersBox variant="activeFiltersChips">
                {subscriptionStatusFilter.map((status) => (
                  <Button
                    key={status ?? "null"}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusToggle(status)}
                  >
                    <X size={12} />
                    {status ?? "Has Not Subscribed"}
                  </Button>
                ))}
              </UsersBox>
            </UsersBox>
          )}
        </UsersBox>

        <UsersBox variant="headerRow">
          <UsersBox variant="headerCell3">
            <UsersText variant="header">{t("admin.emailFullName")}</UsersText>
          </UsersBox>
          <UsersBox variant="headerCell2">
            <UsersText variant="header">{t("admin.subscriptionStatus")}</UsersText>
          </UsersBox>
          <UsersBox variant="headerCell2">
            <UsersText variant="header">{t("admin.stripeID")}</UsersText>
          </UsersBox>
          <UsersBox variant="headerCell1">
            <UsersText variant="header">{t("admin.role")}</UsersText>
          </UsersBox>
          <UsersBox variant="headerCell1">
            <></>
          </UsersBox>
        </UsersBox>
        {isLoading && <LoadingSpinner />}
        {!!data?.users &&
          data?.users?.length > 0 &&
          data.users.map((user) => (
            <UsersBox key={user.id} variant="bodyRow">
              <UsersBox variant="headerCell3">
                <UsersBox variant="identityStack">
                  <UsersText variant="default">{user.email}</UsersText>
                  <UsersText variant="default">{user.fullName}</UsersText>
                </UsersBox>
              </UsersBox>
              <UsersBox variant="headerCell2">
                <UsersText variant="default">{user.subscriptionStatus}</UsersText>
              </UsersBox>
              <UsersBox variant="headerCell2">
                <UsersText variant="muted">{user.paymentProcessorUserId}</UsersText>
              </UsersBox>
              <UsersBox variant="headerCell1">
                <UsersBox variant="roleSelectCell">
                  <SystemAdminToggle id={user.id} isSystemAdmin={user.isSystemAdmin} />
                </UsersBox>
              </UsersBox>
              <UsersBox variant="headerCell1">
                <DropdownEditDelete />
              </UsersBox>
            </UsersBox>
          ))}
      </UsersBox>
    </UsersBox>
  );
};

export default UsersTable;
