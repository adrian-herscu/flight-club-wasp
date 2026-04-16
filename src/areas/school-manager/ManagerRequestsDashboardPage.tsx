import { type CourseInterestStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../system-admin/layout/Breadcrumb";
import DefaultLayout from "../system-admin/layout/DefaultLayout";
import LabeledInputField from "../../client/components/patterns/LabeledInputField";
import {
  ManagerRequestsSummaryColumn,
} from "../../client/components/patterns/ManagerRequestsDashboardPatterns";
import {
  EndActionsRow,
  FilterGroup,
  MutedText,
  PrimaryText,
  RejectionReasonField,
  SmallText,
  SpacedCardContent,
  SummaryGrid,
  TitledSection,
} from "../../client/components/patterns/PagePrimitives";
import { Button } from "../../client/components/ui/button";
import { Card, CardHeader, CardTitle } from "../../client/components/ui/card";
import { usePerItemMutation } from "../../shared/hooks/usePerItemMutation";
import { useManagedSchoolSelection } from "../../features/school-context/useManagedSchoolSelection";

const {
  approveStudentEnrollmentFromInterest,
  cancelCourseInterestForManager,
  approveSchoolMemberRequest,
  getManagerStudentCoursePairs,
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

type StudentCoursePairItem = {
  interestId: string;
  status: CourseInterestStatus;
  student: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  course: {
    title: string;
  };
};

function isPendingInterestStatus(status: CourseInterestStatus): boolean {
  return status !== "ENROLLED" && status !== "CANCELLED";
}

type MemberRequestRoleFilter = "ALL" | "INSTRUCTORS" | "STUDENTS";
type MemberRequestStatusFilter = "ALL" | "PENDING" | "APPROVED";

const ManagerRequestsPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Server operations enforce school manager role; client guard is path-based.
  // The getMyManagedSchool query will return empty if user has no managed school.
  const { data: managedSchoolsData, isLoading: isManagedSchoolsLoading } = useQuery(getMyManagedSchool);
  const managedSchools = (managedSchoolsData as ManagedSchool[] | undefined) ?? [];
  const { selectedSchool, selectedSchoolId } = useManagedSchoolSelection(managedSchools);

  useEffect(() => {
    if (user.isSystemAdmin) {
      navigate("/", { replace: true });
      return;
    }

    if (isManagedSchoolsLoading) {
      return;
    }

    if (managedSchools.length === 0) {
      navigate("/", { replace: true });
    }
  }, [isManagedSchoolsLoading, managedSchools.length, navigate, user.isSystemAdmin]);

  const routeRoleScope: "INSTRUCTOR" | "STUDENT" | null =
    pathname.endsWith("/instructors")
      ? "INSTRUCTOR"
      : pathname.endsWith("/students")
        ? "STUDENT"
        : null;

  const isStudentsCoursePairsRoute = routeRoleScope === "STUDENT";

  const {
    data: memberRequestsData,
    isLoading: isMemberRequestsLoading,
  } = useQuery(getPendingSchoolMemberRequests, {
    schoolId: selectedSchoolId,
  });

  const {
    data: studentCoursePairsData,
    isLoading: isStudentCoursePairsLoading,
  } = useQuery(getManagerStudentCoursePairs, {
    schoolId: selectedSchoolId,
  });

  const [searchTerm, setSearchTerm] = useState("");

  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [roleFilter, setRoleFilter] = useState<MemberRequestRoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<MemberRequestStatusFilter>("ALL");

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const [handleApprove, isApprovingId] = usePerItemMutation(
    (id) => approveSchoolMemberRequest({ requestId: id, schoolId: selectedSchoolId }),
    {
      successToast: {
        title: t("admin.requestApproved"),
        description: t("dashboard.theUserHasBeenApproved"),
      },
      errorToast: { title: t("admin.approvalFailed"), fallbackDescription: t("admin.approvalError") },
    },
  );

  const [handleReject, isRejectingId] = usePerItemMutation(
    (id) => rejectSchoolMemberRequest({ requestId: id, schoolId: selectedSchoolId, rejectionReason: rejectionReasons[id] }),
    {
      successToast: {
        title: t("admin.requestRejected"),
        description: t("dashboard.theRequestHasBeenRejected"),
      },
      errorToast: { title: t("admin.rejectionFailed"), fallbackDescription: t("admin.rejectionError") },
    },
  );

  const [handleApproveEnrollment, isApprovingEnrollmentId] = usePerItemMutation(
    (id) => approveStudentEnrollmentFromInterest({ interestId: id, schoolId: selectedSchoolId }),
    {
      successToast: {
        title: t("admin.requestApproved"),
        description: t("admin.studentEnrollmentApproved"),
      },
      errorToast: { title: t("admin.approvalFailed"), fallbackDescription: t("admin.approvalError") },
    },
  );

  const [handleCancelInterest, isCancellingInterestId] = usePerItemMutation(
    (id) => cancelCourseInterestForManager({ interestId: id, schoolId: selectedSchoolId }),
    {
      successToast: {
        title: t("admin.interestCancelled"),
        description: t("admin.interestCancelledDescription"),
      },
      errorToast: { title: t("admin.interestCancelFailed"), fallbackDescription: t("admin.approvalError") },
    },
  );

  const pageTitle =
    routeRoleScope === "INSTRUCTOR"
      ? t("admin.filterInstructors")
      : routeRoleScope === "STUDENT"
        ? t("admin.filterStudents")
        : t("admin.memberRequests");

  const requests = (memberRequestsData as MemberRequestItem[] | undefined) ?? [];
  const studentCoursePairs =
    (studentCoursePairsData as StudentCoursePairItem[] | undefined) ?? [];

  const isLoading = isStudentsCoursePairsRoute
    ? isStudentCoursePairsLoading
    : isMemberRequestsLoading;

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

  const filteredStudentCoursePairs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const searchFiltered = normalized
      ? studentCoursePairs.filter((pair) => {
          const name = (pair.student.fullName ?? pair.student.email ?? "").toLowerCase();
          const email = (pair.student.email ?? "").toLowerCase();
          const phone = (pair.student.phone ?? "").toLowerCase();
          const courseTitle = pair.course.title.toLowerCase();
          return (
            name.includes(normalized) ||
            email.includes(normalized) ||
            phone.includes(normalized) ||
            courseTitle.includes(normalized)
          );
        })
      : studentCoursePairs;

    return searchFiltered.filter((pair) => {
      if (statusFilter === "ALL") return true;
      if (statusFilter === "PENDING") {
        return isPendingInterestStatus(pair.status);
      }
      return pair.status === "ENROLLED";
    });
  }, [searchTerm, statusFilter, studentCoursePairs]);

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
  const studentsPendingPairs = filteredStudentCoursePairs.filter((pair) =>
    isPendingInterestStatus(pair.status),
  );
  const studentsApprovedPairs = filteredStudentCoursePairs.filter(
    (pair) => pair.status === "ENROLLED",
  );

  const showPendingSections = statusFilter !== "APPROVED";
  const showApprovedSections = statusFilter !== "PENDING";
  const showInstructorSections = routeRoleScope
    ? routeRoleScope === "INSTRUCTOR"
    : roleFilter !== "STUDENTS";
  const showStudentSections = routeRoleScope
    ? routeRoleScope === "STUDENT"
    : roleFilter !== "INSTRUCTORS";

  const renderRequestSummary = (request: MemberRequestItem) => (
    <SummaryGrid>
      <ManagerRequestsSummaryColumn label={t("dashboard.requestedRole")}>
        <PrimaryText>{request.requestedRole}</PrimaryText>
      </ManagerRequestsSummaryColumn>
      <ManagerRequestsSummaryColumn label={t("dashboard.requesterName")}>
        <PrimaryText>
          {request.requester.fullName ?? request.requester.email ?? t("common.unknown")}
        </PrimaryText>
        <MutedText>{request.requester.email ?? "-"}</MutedText>
        <MutedText>{request.requester.phone ?? "-"}</MutedText>
      </ManagerRequestsSummaryColumn>
      <ManagerRequestsSummaryColumn label={t("dashboard.submittedDate")}>
        <SmallText>{new Date(request.createdAt).toLocaleString()}</SmallText>
        <MutedText>
          {t("dashboard.schoolName")}: {request.targetSchool?.name ?? "-"}
        </MutedText>
      </ManagerRequestsSummaryColumn>
    </SummaryGrid>
  );

  const renderStudentCoursePairSummary = (pair: StudentCoursePairItem) => (
    <SummaryGrid>
      <ManagerRequestsSummaryColumn label={t("dashboard.requesterName")}>
        <PrimaryText>
          {pair.student.fullName ?? pair.student.email ?? t("common.unknown")}
        </PrimaryText>
        <MutedText>{pair.student.email ?? "-"}</MutedText>
        <MutedText>{pair.student.phone ?? "-"}</MutedText>
      </ManagerRequestsSummaryColumn>
      <ManagerRequestsSummaryColumn label={t("admin.courseTitle")}>
        <PrimaryText>{pair.course.title}</PrimaryText>
      </ManagerRequestsSummaryColumn>
      <ManagerRequestsSummaryColumn label={t("dashboard.status")}>
        <PrimaryText>{pair.status}</PrimaryText>
      </ManagerRequestsSummaryColumn>
    </SummaryGrid>
  );

  const renderStudentCoursePairsSection = (
    sectionTestId: string,
    title: string,
    pairs: StudentCoursePairItem[],
    isPendingSection: boolean,
  ) => (
    <TitledSection testId={sectionTestId} title={title}>
      {pairs.length === 0 && !isLoading && (
        <MutedText>{t("admin.noMatchingRequests")}</MutedText>
      )}

      {pairs.map((pair) => (
        <Card key={pair.interestId} data-testid="manager-member-request-card">
          <SpacedCardContent variant="loose">
            {renderStudentCoursePairSummary(pair)}

            {isPendingSection && (
              <EndActionsRow>
                <Button
                  variant="outline"
                  disabled={
                    isCancellingInterestId === pair.interestId ||
                    isApprovingEnrollmentId === pair.interestId
                  }
                  onClick={() => handleCancelInterest(pair.interestId)}
                >
                  {isCancellingInterestId === pair.interestId
                    ? t("admin.cancellingInterest")
                    : t("admin.cancelInterest")}
                </Button>
                <Button
                  disabled={
                    isApprovingEnrollmentId === pair.interestId ||
                    isCancellingInterestId === pair.interestId
                  }
                  onClick={() => handleApproveEnrollment(pair.interestId)}
                >
                  {isApprovingEnrollmentId === pair.interestId
                    ? t("admin.approvingEnrollment")
                    : t("admin.approveEnrollment")}
                </Button>
              </EndActionsRow>
            )}
          </SpacedCardContent>
        </Card>
      ))}
    </TitledSection>
  );

  const renderPendingSection = (
    sectionTestId: string,
    title: string,
    sectionRequests: MemberRequestItem[],
  ) => (
    <TitledSection testId={sectionTestId} title={title}>

      {sectionRequests.length === 0 && !isLoading && (
        <MutedText>{t("admin.noMatchingRequests")}</MutedText>
      )}

      {sectionRequests.map((request) => (
        <Card key={request.id} data-testid="manager-member-request-card">
          <SpacedCardContent variant="loose">
            {renderRequestSummary(request)}

            <RejectionReasonField
              id={`reason-${request.id}`}
              label={t("admin.rejectionReason")}
              value={rejectionReasons[request.id] ?? ""}
              onChange={(value) =>
                setRejectionReasons((prev) => ({
                  ...prev,
                  [request.id]: value,
                }))
              }
            />

            <EndActionsRow>
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
            </EndActionsRow>
          </SpacedCardContent>
        </Card>
      ))}
    </TitledSection>
  );

  const renderApprovedSection = (
    sectionTestId: string,
    title: string,
    sectionRequests: MemberRequestItem[],
  ) => (
    <TitledSection testId={sectionTestId} title={title}>

      {sectionRequests.length === 0 && !isLoading && (
        <MutedText>{t("admin.noMatchingRequests")}</MutedText>
      )}

      {sectionRequests.map((request) => (
        <Card key={request.id} data-testid="manager-member-request-card">
          <SpacedCardContent variant="loose">
            {renderRequestSummary(request)}
          </SpacedCardContent>
        </Card>
      ))}
    </TitledSection>
  );

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={pageTitle} showTitle={false} showNavigation={false} />

      <Card>
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
        </CardHeader>
        <SpacedCardContent>


          {!isLoading && selectedSchool && (
            <MutedText>
              {t("dashboard.schoolName")}: {selectedSchool.name}
            </MutedText>
          )}

          <LabeledInputField
            id="member-request-search"
            label={t("admin.filterByNameOrPhone")}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("admin.searchByRequesterNameEmailOrPhone")}
          />

          <FilterGroup label={t("admin.filterByStatus")}>
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
          </FilterGroup>

          {!routeRoleScope && (
            <FilterGroup label={t("admin.filterByRole")}>
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
            </FilterGroup>
          )}

          {isLoading && <MutedText>{t("admin.loadingRequests")}</MutedText>}

          {!isLoading && !isStudentsCoursePairsRoute && filteredRequests.length === 0 && (
            <MutedText>{t("admin.noMatchingRequests")}</MutedText>
          )}

          {!isLoading && isStudentsCoursePairsRoute && filteredStudentCoursePairs.length === 0 && (
            <MutedText>{t("admin.noMatchingRequests")}</MutedText>
          )}

          {!isStudentsCoursePairsRoute &&
            showPendingSections &&
            showInstructorSections &&
            renderPendingSection(
              "manager-requests-instructors-pending-section",
              `${t("admin.filterInstructors")} • ${t("dashboard.pending")}`,
              instructorsPendingRequests,
            )}

          {!isStudentsCoursePairsRoute &&
            showPendingSections &&
            showStudentSections &&
            renderPendingSection(
              "manager-requests-students-pending-section",
              `${t("admin.filterStudents")} • ${t("dashboard.pending")}`,
              studentsPendingRequests,
            )}

          {!isStudentsCoursePairsRoute &&
            showApprovedSections &&
            showInstructorSections &&
            renderApprovedSection(
              "manager-requests-instructors-approved-section",
              `${t("admin.filterInstructors")} • ${t("dashboard.approved")}`,
              instructorsApprovedRequests,
            )}

          {!isStudentsCoursePairsRoute &&
            showApprovedSections &&
            showStudentSections &&
            renderApprovedSection(
              "manager-requests-students-approved-section",
              `${t("admin.filterStudents")} • ${t("dashboard.approved")}`,
              studentsApprovedRequests,
            )}

          {isStudentsCoursePairsRoute &&
            showPendingSections &&
            renderStudentCoursePairsSection(
              "manager-requests-students-pending-section",
              `${t("admin.filterStudents")} • ${t("dashboard.pending")}`,
              studentsPendingPairs,
              true,
            )}

          {isStudentsCoursePairsRoute &&
            showApprovedSections &&
            renderStudentCoursePairsSection(
              "manager-requests-students-approved-section",
              `${t("admin.filterStudents")} • ${t("dashboard.approved")}`,
              studentsApprovedPairs,
              false,
            )}
        </SpacedCardContent>
      </Card>
    </DefaultLayout>
  );
};

export default ManagerRequestsPage;
