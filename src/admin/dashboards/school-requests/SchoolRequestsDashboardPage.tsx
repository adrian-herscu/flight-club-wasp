import { useMemo, useState } from "react";
import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import LabeledInputField from "../../../client/components/patterns/LabeledInputField";
import {
  SchoolRequestsActionsRow,
  SchoolRequestsDashboardCardContent,
  SchoolRequestsDetailsLogoRow,
  SchoolRequestsDetailsRow,
  SchoolRequestsExpandableDetails,
  SchoolRequestsFilterGroup,
  SchoolRequestsMutedText,
  SchoolRequestsPrimaryText,
  SchoolRequestsRejectionReasonField,
  SchoolRequestsRequestCardBody,
  SchoolRequestsRequesterSummary,
  SchoolRequestsSection,
  SchoolRequestsSnapshot,
} from "../../../client/components/patterns/SchoolRequestsDashboardPatterns";
import { Button } from "../../../client/components/ui/button";
import { Card, CardHeader, CardTitle } from "../../../client/components/ui/card";
import { usePerItemMutation } from "../../../client/hooks/usePerItemMutation";

const {
  approveSchoolManagerRequest,
  getPendingSchoolManagerRequests,
  rejectSchoolManagerRequest,
  useQuery,
} = operations as any;

type SchoolRequestStatusFilter = "ALL" | "PENDING" | "APPROVED";

type SchoolRequestItem = {
  id: string;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requester: {
    fullName: string | null;
    email: string | null;
    phone: string | null;
  };
  requestedSchoolName: string | null;
  requestedLogoUrl: string | null;
  requestedAddressLine1: string | null;
  requestedAddressLine2: string | null;
  requestedCity: string | null;
  requestedStateProvince: string | null;
  requestedPostalCode: string | null;
  requestedCountry: string | null;
  requestedCurrency: string | null;
  approvedSchool?: {
    id: string;
    name: string;
    websiteUrl: string | null;
    logoUrl: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    stateProvince: string | null;
    postalCode: string;
    country: string;
    currency: string;
  } | null;
};

const SchoolRequestsDashboardPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  if (!user.isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  const { data, isLoading } = useQuery(getPendingSchoolManagerRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<SchoolRequestStatusFilter>("ALL");

  const [handleApprove, isApprovingId] = usePerItemMutation(
    (id) => approveSchoolManagerRequest({ requestId: id }),
    {
      successToast: { title: t("admin.requestApproved"), description: t("admin.approvalSuccess") },
      errorToast: { title: t("admin.approvalFailed"), fallbackDescription: t("admin.approvalError") },
    },
  );

  const [handleReject, isRejectingId] = usePerItemMutation(
    (id) => rejectSchoolManagerRequest({ requestId: id, rejectionReason: rejectionReasons[id] }),
    {
      successToast: { title: t("admin.requestRejected"), description: t("admin.rejectionSuccess") },
      errorToast: { title: t("admin.rejectionFailed"), fallbackDescription: t("admin.rejectionError") },
    },
  );

  const requests = (data as SchoolRequestItem[] | undefined) ?? [];

  const filteredRequests = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return requests;

    return requests.filter((request) => {
      const name = (request.requester.fullName ?? request.requester.email ?? "").toLowerCase();
      const phone = (request.requester.phone ?? "").toLowerCase();
      return name.includes(normalized) || phone.includes(normalized);
    });
  }, [requests, searchTerm]);

  const statusFilteredRequests = filteredRequests.filter((request) => {
    if (statusFilter === "ALL") return true;
    return request.status === statusFilter;
  });

  const pendingRequests = statusFilteredRequests.filter(
    (request) => request.status === "PENDING",
  );
  const approvedRequests = statusFilteredRequests.filter(
    (request) => request.status === "APPROVED",
  );

  const showPendingSection = statusFilter !== "APPROVED";
  const showApprovedSection = statusFilter !== "PENDING";

  const renderRequesterSummary = (request: SchoolRequestItem, submittedLabel: string) => (
    <SchoolRequestsRequesterSummary
      requester={request.requester.fullName ?? request.requester.email ?? t("common.unknown")}
      requesterEmail={request.requester.email ?? "-"}
      requesterLabel={t("admin.requester")}
      requesterPhone={request.requester.phone ?? "-"}
      submittedAt={new Date(request.createdAt).toLocaleString()}
      submittedLabel={submittedLabel}
    />
  );

  return (
    <DefaultLayout user={user}>
      <Breadcrumb
        pageName={t("admin.schoolsPageTitle")}
        showTitle={false}
        showNavigation={false}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.schoolsPageTitle")}</CardTitle>
        </CardHeader>
        <SchoolRequestsDashboardCardContent>
          <LabeledInputField
            id="school-request-search"
            label={t("admin.filterByNameOrPhone")}
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("admin.searchByRequesterNameEmailOrPhone")}
          />

          <SchoolRequestsFilterGroup label={t("admin.filterByStatus")}>
              <Button
                type="button"
                variant={statusFilter === "ALL" ? "default" : "outline"}
                onClick={() => setStatusFilter("ALL")}
                data-testid="schools-status-filter-all"
              >
                {t("admin.filterAll")}
              </Button>
              <Button
                type="button"
                variant={statusFilter === "PENDING" ? "default" : "outline"}
                onClick={() => setStatusFilter("PENDING")}
                data-testid="schools-status-filter-pending"
              >
                {t("admin.filterPending")}
              </Button>
              <Button
                type="button"
                variant={statusFilter === "APPROVED" ? "default" : "outline"}
                onClick={() => setStatusFilter("APPROVED")}
                data-testid="schools-status-filter-approved"
              >
                {t("admin.filterApproved")}
              </Button>
          </SchoolRequestsFilterGroup>

          {isLoading && (
            <SchoolRequestsMutedText>{t("admin.loadingRequests")}</SchoolRequestsMutedText>
          )}

          {!isLoading && filteredRequests.length === 0 && (
            <SchoolRequestsMutedText>{t("admin.noMatchingRequests")}</SchoolRequestsMutedText>
          )}

          {showPendingSection && (
          <SchoolRequestsSection
            testId="schools-panel-pending-section"
            title={t("admin.pendingSchoolManagerRequests")}
          >

            {pendingRequests.length === 0 && !isLoading && (
              <SchoolRequestsMutedText>{t("admin.noPendingSchoolRequests")}</SchoolRequestsMutedText>
            )}

            {pendingRequests.map((request) => (
              <Card key={request.id} data-testid="school-request-card">
                <SchoolRequestsRequestCardBody>
                  {renderRequesterSummary(request, t("admin.submitted"))}

                  <SchoolRequestsSnapshot
                    label={t("admin.requestedSchoolSnapshot")}
                    schoolName={request.requestedSchoolName ?? "-"}
                    logoUrl={request.requestedLogoUrl}
                    logoAlt="logo"
                    summaryAddress={[
                      request.requestedAddressLine1,
                      request.requestedAddressLine2,
                      request.requestedCity,
                      request.requestedStateProvince,
                      request.requestedPostalCode,
                      request.requestedCountry,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    currencyLabel={t("admin.currency")}
                    currency={request.requestedCurrency ?? "-"}
                  />

                  <SchoolRequestsRejectionReasonField
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

                  <SchoolRequestsActionsRow>
                    <Button
                      variant="outline"
                      disabled={isRejectingId === request.id}
                      onClick={() => handleReject(request.id)}
                    >
                      {isRejectingId === request.id ? t("admin.rejecting") : t("admin.reject")}
                    </Button>
                    <Button
                      disabled={isApprovingId === request.id}
                      onClick={() => handleApprove(request.id)}
                    >
                      {isApprovingId === request.id ? t("admin.approving") : t("admin.approve")}
                    </Button>
                  </SchoolRequestsActionsRow>
                </SchoolRequestsRequestCardBody>
              </Card>
            ))}
          </SchoolRequestsSection>
          )}

          {showApprovedSection && (
          <SchoolRequestsSection
            testId="schools-panel-approved-section"
            title={t("admin.approvedSchoolRequests")}
          >

            {approvedRequests.length === 0 && !isLoading && (
              <SchoolRequestsMutedText>{t("admin.noApprovedSchoolRequests")}</SchoolRequestsMutedText>
            )}

            {approvedRequests.map((request) => (
              <Card key={request.id} data-testid="school-request-card">
                <SchoolRequestsRequestCardBody>
                  {renderRequesterSummary(request, t("dashboard.approved"))}

                  <SchoolRequestsPrimaryText>
                    {request.approvedSchool?.name ?? request.requestedSchoolName ?? "-"}
                  </SchoolRequestsPrimaryText>

                  <SchoolRequestsExpandableDetails summary={t("admin.schoolDetails")}>
                    <SchoolRequestsDetailsRow label={t("admin.approvedSchoolDetails")}>
                      {request.approvedSchool?.name ?? "-"}
                    </SchoolRequestsDetailsRow>
                    <SchoolRequestsDetailsRow label={t("admin.address")}>
                      {[
                        request.approvedSchool?.addressLine1,
                        request.approvedSchool?.addressLine2,
                        request.approvedSchool?.city,
                        request.approvedSchool?.stateProvince,
                        request.approvedSchool?.postalCode,
                        request.approvedSchool?.country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </SchoolRequestsDetailsRow>
                    {request.approvedSchool?.logoUrl && (
                      <SchoolRequestsDetailsLogoRow
                        label="Logo"
                        logoAlt="school logo"
                        logoUrl={request.approvedSchool.logoUrl}
                      />
                    )}
                    <SchoolRequestsDetailsRow label={t("admin.currency")}>
                      {request.approvedSchool?.currency ?? "-"}
                    </SchoolRequestsDetailsRow>
                  </SchoolRequestsExpandableDetails>
                </SchoolRequestsRequestCardBody>
              </Card>
            ))}
          </SchoolRequestsSection>
          )}
        </SchoolRequestsDashboardCardContent>
      </Card>
    </DefaultLayout>
  );
};

export default SchoolRequestsDashboardPage;
