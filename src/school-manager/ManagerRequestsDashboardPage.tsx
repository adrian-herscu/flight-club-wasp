import { type CourseInterestStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { useWaspMutation } from "../client/hooks/useWaspMutation";
import { useManagedSchoolSelection } from "./useManagedSchoolSelection";

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
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [isApprovingEnrollmentId, setIsApprovingEnrollmentId] = useState<string | null>(null);
  const [isCancellingInterestId, setIsCancellingInterestId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [roleFilter, setRoleFilter] = useState<MemberRequestRoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<MemberRequestStatusFilter>("ALL");

  // -------------------------------------------------------------------------
  // Mutations (useWaspMutation — Change 4)
  // -------------------------------------------------------------------------

  const approveMember = useWaspMutation(
    (args: { requestId: string; schoolId: string }) => approveSchoolMemberRequest(args),
    {
      successToast: {
        title: t("admin.requestApproved"),
        description: t("dashboard.theUserHasBeenApproved"),
      },
      errorToast: { title: t("admin.approvalFailed"), fallbackDescription: t("admin.approvalError") },
      onSuccess: () => setIsApprovingId(null),
      onError: () => setIsApprovingId(null),
    },
  );

  const handleApprove = async (requestId: string) => {
    setIsApprovingId(requestId);
    await approveMember.mutate({ requestId, schoolId: selectedSchoolId });
  };

  const rejectMember = useWaspMutation(
    (args: { requestId: string; schoolId: string; rejectionReason?: string }) =>
      rejectSchoolMemberRequest(args),
    {
      successToast: {
        title: t("admin.requestRejected"),
        description: t("dashboard.theRequestHasBeenRejected"),
      },
      errorToast: { title: t("admin.rejectionFailed"), fallbackDescription: t("admin.rejectionError") },
      onSuccess: () => setIsRejectingId(null),
      onError: () => setIsRejectingId(null),
    },
  );

  const handleReject = async (requestId: string) => {
    setIsRejectingId(requestId);
    await rejectMember.mutate({
      requestId,
      schoolId: selectedSchoolId,
      rejectionReason: rejectionReasons[requestId],
    });
  };

  const approveEnrollment = useWaspMutation(
    (args: { interestId: string; schoolId: string }) => approveStudentEnrollmentFromInterest(args),
    {
      successToast: {
        title: t("admin.requestApproved"),
        description: t("admin.studentEnrollmentApproved"),
      },
      errorToast: { title: t("admin.approvalFailed"), fallbackDescription: t("admin.approvalError") },
      onSuccess: () => setIsApprovingEnrollmentId(null),
      onError: () => setIsApprovingEnrollmentId(null),
    },
  );

  const handleApproveEnrollment = async (interestId: string) => {
    setIsApprovingEnrollmentId(interestId);
    await approveEnrollment.mutate({ interestId, schoolId: selectedSchoolId });
  };

  const cancelInterest = useWaspMutation(
    (args: { interestId: string; schoolId: string }) => cancelCourseInterestForManager(args),
    {
      successToast: {
        title: t("admin.interestCancelled"),
        description: t("admin.interestCancelledDescription"),
      },
      errorToast: { title: t("admin.interestCancelFailed"), fallbackDescription: t("admin.approvalError") },
      onSuccess: () => setIsCancellingInterestId(null),
      onError: () => setIsCancellingInterestId(null),
    },
  );

  const handleCancelInterest = async (interestId: string) => {
    setIsCancellingInterestId(interestId);
    await cancelInterest.mutate({ interestId, schoolId: selectedSchoolId });
  };

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

  const renderStudentCoursePairSummary = (pair: StudentCoursePairItem) => (
    <ManagerRequestsSummaryGrid>
      <ManagerRequestsSummaryColumn label={t("dashboard.requesterName")}>
        <ManagerRequestsPrimaryText>
          {pair.student.fullName ?? pair.student.email ?? t("common.unknown")}
        </ManagerRequestsPrimaryText>
        <ManagerRequestsMutedText>{pair.student.email ?? "-"}</ManagerRequestsMutedText>
        <ManagerRequestsMutedText>{pair.student.phone ?? "-"}</ManagerRequestsMutedText>
      </ManagerRequestsSummaryColumn>
      <ManagerRequestsSummaryColumn label={t("admin.courseTitle")}>
        <ManagerRequestsPrimaryText>{pair.course.title}</ManagerRequestsPrimaryText>
      </ManagerRequestsSummaryColumn>
      <ManagerRequestsSummaryColumn label={t("dashboard.status")}>
        <ManagerRequestsPrimaryText>{pair.status}</ManagerRequestsPrimaryText>
      </ManagerRequestsSummaryColumn>
    </ManagerRequestsSummaryGrid>
  );

  const renderStudentCoursePairsSection = (
    sectionTestId: string,
    title: string,
    pairs: StudentCoursePairItem[],
    isPendingSection: boolean,
  ) => (
    <ManagerRequestsSection testId={sectionTestId} title={title}>
      {pairs.length === 0 && !isLoading && (
        <ManagerRequestsMutedText>{t("admin.noMatchingRequests")}</ManagerRequestsMutedText>
      )}

      {pairs.map((pair) => (
        <Card key={pair.interestId} data-testid="manager-member-request-card">
          <ManagerRequestsCardBody>
            {renderStudentCoursePairSummary(pair)}

            {isPendingSection && (
              <ManagerRequestsActionsRow>
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
              </ManagerRequestsActionsRow>
            )}
          </ManagerRequestsCardBody>
        </Card>
      ))}
    </ManagerRequestsSection>
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

          {!isLoading && !isStudentsCoursePairsRoute && filteredRequests.length === 0 && (
            <ManagerRequestsMutedText>{t("admin.noMatchingRequests")}</ManagerRequestsMutedText>
          )}

          {!isLoading && isStudentsCoursePairsRoute && filteredStudentCoursePairs.length === 0 && (
            <ManagerRequestsMutedText>{t("admin.noMatchingRequests")}</ManagerRequestsMutedText>
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
        </ManagerRequestsDashboardCardContent>
      </Card>
    </DefaultLayout>
  );
};

export default ManagerRequestsPage;
