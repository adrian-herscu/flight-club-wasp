import { useMemo, useState } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import LabeledInputField from "../client/components/patterns/LabeledInputField";
import {
  ManagerRequestsActionsRow,
  ManagerRequestsCardBody,
  ManagerRequestsDashboardCardContent,
  ManagerRequestsFilterGroup,
  ManagerRequestsMutedText,
  ManagerRequestsPrimaryText,
  ManagerRequestsRejectionReasonField,
  ManagerRequestsSection,
  ManagerRequestsSummaryColumn,
  ManagerRequestsSummaryGrid,
  ManagerRequestsText,
} from "../client/components/patterns/ManagerRequestsDashboardPatterns";
import { Button } from "../client/components/ui/button";
import { Card, CardHeader, CardTitle } from "../client/components/ui/card";
import { toast } from "../client/hooks/use-toast";
import { useManagedSchoolSelection } from "./useManagedSchoolSelection";

const {
  approveSchoolMemberRequest,
  getMyManagedSchool,
  getPendingSchoolMemberRequests,
  rejectSchoolMemberRequest,
  useQuery,
} = operations as any;

type ManagedSchool = {
  id: string;
  name: string;
};

type MemberRequestItem = {
  id: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedRole: "INSTRUCTOR" | "STUDENT";
  requester: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  targetSchool: {
    id: string;
    name: string;
  } | null;
};

type MemberRequestRoleFilter = "ALL" | "INSTRUCTORS" | "STUDENTS";
type MemberRequestStatusFilter = "ALL" | "PENDING" | "APPROVED";

const ManagerRequestsPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // Server operations enforce school manager role; client guard is path-based.
  // The getMyManagedSchool query will return empty if user has no managed school.
  const { data: managedSchoolsData } = useQuery(getMyManagedSchool);
  const managedSchools = (managedSchoolsData as ManagedSchool[] | undefined) ?? [];
  const { selectedSchool, selectedSchoolId } = useManagedSchoolSelection(managedSchools);

  const { data, isLoading, refetch } = useQuery(getPendingSchoolMemberRequests, {
    schoolId: selectedSchoolId,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [roleFilter, setRoleFilter] = useState<MemberRequestRoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<MemberRequestStatusFilter>("ALL");

  const routeRoleScope: "INSTRUCTOR" | "STUDENT" | null =
    pathname.endsWith("/instructors")
      ? "INSTRUCTOR"
      : pathname.endsWith("/students")
        ? "STUDENT"
        : null;

  const pageTitle =
    routeRoleScope === "INSTRUCTOR"
      ? t("admin.filterInstructors")
      : routeRoleScope === "STUDENT"
        ? t("admin.filterStudents")
        : t("admin.memberRequests");

  const requests = (data as MemberRequestItem[] | undefined) ?? [];

  const filteredRequests = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const searchFiltered = normalized
      ? requests.filter((request) => {
          const name = (request.requester.fullName ?? request.requester.email ?? "").toLowerCase();
          const phone = (request.requester.phone ?? "").toLowerCase();
          return name.includes(normalized) || phone.includes(normalized);
        })
      : requests;

    const roleFiltered = searchFiltered.filter((request) => {
      if (routeRoleScope) {
        return request.requestedRole === routeRoleScope;
      }
      if (roleFilter === "ALL") return true;
      if (roleFilter === "INSTRUCTORS") return request.requestedRole === "INSTRUCTOR";
      return request.requestedRole === "STUDENT";
    });

    return roleFiltered.filter((request) => {
      if (statusFilter === "ALL") return true;
      return request.status === statusFilter;
    });
  }, [requests, routeRoleScope, roleFilter, searchTerm, statusFilter]);

  const instructorsPendingRequests = filteredRequests.filter(
    (request) => request.requestedRole === "INSTRUCTOR" && request.status === "PENDING",
  );
  const studentsPendingRequests = filteredRequests.filter(
    (request) => request.requestedRole === "STUDENT" && request.status === "PENDING",
  );
  const instructorsApprovedRequests = filteredRequests.filter(
    (request) => request.requestedRole === "INSTRUCTOR" && request.status === "APPROVED",
  );
  const studentsApprovedRequests = filteredRequests.filter(
    (request) => request.requestedRole === "STUDENT" && request.status === "APPROVED",
  );

  const showPendingSections = statusFilter !== "APPROVED";
  const showApprovedSections = statusFilter !== "PENDING";
  const showInstructorSections = routeRoleScope
    ? routeRoleScope === "INSTRUCTOR"
    : roleFilter !== "STUDENTS";
  const showStudentSections = routeRoleScope
    ? routeRoleScope === "STUDENT"
    : roleFilter !== "INSTRUCTORS";

  const handleApprove = async (requestId: string) => {
    setIsApprovingId(requestId);
    try {
      await approveSchoolMemberRequest({ requestId, schoolId: selectedSchoolId });
      await refetch();
      toast({
        title: t("admin.requestApproved"),
        description: t("dashboard.theUserHasBeenApproved"),
      });
    } catch (error: unknown) {
      toast({
        title: t("admin.approvalFailed"),
        description: error instanceof Error ? error.message : t("admin.approvalError"),
        variant: "destructive",
      });
    } finally {
      setIsApprovingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setIsRejectingId(requestId);
    try {
      await rejectSchoolMemberRequest({
        requestId,
        schoolId: selectedSchoolId,
        rejectionReason: rejectionReasons[requestId],
      });
      await refetch();
      toast({
        title: t("admin.requestRejected"),
        description: t("dashboard.theRequestHasBeenRejected"),
      });
    } catch (error: unknown) {
      toast({
        title: t("admin.rejectionFailed"),
        description: error instanceof Error ? error.message : t("admin.rejectionError"),
        variant: "destructive",
      });
    } finally {
      setIsRejectingId(null);
    }
  };

  const renderRequestSummary = (request: MemberRequestItem) => (
    <ManagerRequestsSummaryGrid>
      <ManagerRequestsSummaryColumn label={t("dashboard.requestedRole")}>
        <ManagerRequestsPrimaryText>{request.requestedRole}</ManagerRequestsPrimaryText>
      </ManagerRequestsSummaryColumn>
      <ManagerRequestsSummaryColumn label={t("dashboard.requesterName")}>
        <ManagerRequestsPrimaryText>
          {request.requester.fullName ?? request.requester.email ?? t("common.unknown")}
        </ManagerRequestsPrimaryText>
        <ManagerRequestsMutedText>{request.requester.email ?? "-"}</ManagerRequestsMutedText>
        <ManagerRequestsMutedText>{request.requester.phone ?? "-"}</ManagerRequestsMutedText>
      </ManagerRequestsSummaryColumn>
      <ManagerRequestsSummaryColumn label={t("dashboard.submittedDate")}>
        <ManagerRequestsText>{new Date(request.createdAt).toLocaleString()}</ManagerRequestsText>
        <ManagerRequestsMutedText>
          {t("dashboard.schoolName")}: {request.targetSchool?.name ?? "-"}
        </ManagerRequestsMutedText>
      </ManagerRequestsSummaryColumn>
    </ManagerRequestsSummaryGrid>
  );

  const renderPendingSection = (
    sectionTestId: string,
    title: string,
    sectionRequests: MemberRequestItem[],
  ) => (
    <ManagerRequestsSection testId={sectionTestId} title={title}>

      {sectionRequests.length === 0 && !isLoading && (
        <ManagerRequestsMutedText>{t("admin.noMatchingRequests")}</ManagerRequestsMutedText>
      )}

      {sectionRequests.map((request) => (
        <Card key={request.id} data-testid="manager-member-request-card">
          <ManagerRequestsCardBody>
            {renderRequestSummary(request)}

            <ManagerRequestsRejectionReasonField
              id={`reason-${request.id}`}
              label={t("admin.rejectionReason")}
              value={rejectionReasons[request.id] ?? ""}
              onChange={(event) =>
                setRejectionReasons((prev) => ({
                  ...prev,
                  [request.id]: event.target.value,
                }))
              }
            />

            <ManagerRequestsActionsRow>
              <Button
                variant="outline"
                disabled={isRejectingId === request.id}
                onClick={() => handleReject(request.id)}
              >
                {isRejectingId === request.id ? t("admin.rejecting") : t("admin.reject")}
              </Button>
              <Button disabled={isApprovingId === request.id} onClick={() => handleApprove(request.id)}>
                {isApprovingId === request.id ? t("admin.approving") : t("admin.approve")}
              </Button>
            </ManagerRequestsActionsRow>
          </ManagerRequestsCardBody>
        </Card>
      ))}
    </ManagerRequestsSection>
  );

  const renderApprovedSection = (
    sectionTestId: string,
    title: string,
    sectionRequests: MemberRequestItem[],
  ) => (
    <ManagerRequestsSection testId={sectionTestId} title={title}>

      {sectionRequests.length === 0 && !isLoading && (
        <ManagerRequestsMutedText>{t("admin.noMatchingRequests")}</ManagerRequestsMutedText>
      )}

      {sectionRequests.map((request) => (
        <Card key={request.id} data-testid="manager-member-request-card">
          <ManagerRequestsCardBody>
            {renderRequestSummary(request)}
          </ManagerRequestsCardBody>
        </Card>
      ))}
    </ManagerRequestsSection>
  );

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={pageTitle} showTitle={false} showNavigation={false} />

      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
        </CardHeader>
        <ManagerRequestsDashboardCardContent>


          {!isLoading && selectedSchool && (
            <ManagerRequestsMutedText>
              {t("dashboard.schoolName")}: {selectedSchool.name}
            </ManagerRequestsMutedText>
          )}

          <LabeledInputField
            id="member-request-search"
            label={t("admin.filterByNameOrPhone")}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("admin.searchByRequesterNameEmailOrPhone")}
          />

          <ManagerRequestsFilterGroup label={t("admin.filterByStatus")}>
              <Button
                type="button"
                variant={statusFilter === "ALL" ? "default" : "outline"}
                onClick={() => setStatusFilter("ALL")}
                data-testid="manager-requests-status-filter-all"
              >
                {t("admin.filterAll")}
              </Button>
              <Button
                type="button"
                variant={statusFilter === "PENDING" ? "default" : "outline"}
                onClick={() => setStatusFilter("PENDING")}
                data-testid="manager-requests-status-filter-pending"
              >
                {t("admin.filterPending")}
              </Button>
              <Button
                type="button"
                variant={statusFilter === "APPROVED" ? "default" : "outline"}
                onClick={() => setStatusFilter("APPROVED")}
                data-testid="manager-requests-status-filter-approved"
              >
                {t("admin.filterApproved")}
              </Button>
          </ManagerRequestsFilterGroup>

          {!routeRoleScope && (
            <ManagerRequestsFilterGroup label={t("admin.filterByRole")}>
                <Button
                  type="button"
                  variant={roleFilter === "ALL" ? "default" : "outline"}
                  onClick={() => setRoleFilter("ALL")}
                  data-testid="manager-requests-role-filter-all"
                >
                  {t("admin.filterAll")}
                </Button>
                <Button
                  type="button"
                  variant={roleFilter === "INSTRUCTORS" ? "default" : "outline"}
                  onClick={() => setRoleFilter("INSTRUCTORS")}
                  data-testid="manager-requests-role-filter-instructors"
                >
                  {t("admin.filterInstructors")}
                </Button>
                <Button
                  type="button"
                  variant={roleFilter === "STUDENTS" ? "default" : "outline"}
                  onClick={() => setRoleFilter("STUDENTS")}
                  data-testid="manager-requests-role-filter-students"
                >
                  {t("admin.filterStudents")}
                </Button>
            </ManagerRequestsFilterGroup>
          )}

          {isLoading && <ManagerRequestsMutedText>{t("admin.loadingRequests")}</ManagerRequestsMutedText>}

          {!isLoading && filteredRequests.length === 0 && (
            <ManagerRequestsMutedText>{t("admin.noMatchingRequests")}</ManagerRequestsMutedText>
          )}

          {showPendingSections &&
            showInstructorSections &&
            renderPendingSection(
              "manager-requests-instructors-pending-section",
              `${t("admin.filterInstructors")} • ${t("dashboard.pending")}`,
              instructorsPendingRequests,
            )}

          {showPendingSections &&
            showStudentSections &&
            renderPendingSection(
              "manager-requests-students-pending-section",
              `${t("admin.filterStudents")} • ${t("dashboard.pending")}`,
              studentsPendingRequests,
            )}

          {showApprovedSections &&
            showInstructorSections &&
            renderApprovedSection(
              "manager-requests-instructors-approved-section",
              `${t("admin.filterInstructors")} • ${t("dashboard.approved")}`,
              instructorsApprovedRequests,
            )}

          {showApprovedSections &&
            showStudentSections &&
            renderApprovedSection(
              "manager-requests-students-approved-section",
              `${t("admin.filterStudents")} • ${t("dashboard.approved")}`,
              studentsApprovedRequests,
            )}
        </ManagerRequestsDashboardCardContent>
      </Card>
    </DefaultLayout>
  );
};

export default ManagerRequestsPage;
