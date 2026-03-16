import { useMemo, useState } from "react";
import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Textarea } from "../../../client/components/ui/textarea";
import { toast } from "../../../client/hooks/use-toast";

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
  if (user.role !== "SYSTEM_ADMIN") {
    return <Navigate to="/" replace />;
  }

  const { data, isLoading, refetch } = useQuery(getPendingSchoolManagerRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<SchoolRequestStatusFilter>("ALL");

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

  const handleApprove = async (requestId: string) => {
    setIsApprovingId(requestId);
    try {
      await approveSchoolManagerRequest({ requestId });
      await refetch();
      toast({
        title: t("admin.requestApproved"),
        description: t("admin.approvalSuccess"),
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
      await rejectSchoolManagerRequest({
        requestId,
        rejectionReason: rejectionReasons[requestId],
      });
      await refetch();
      toast({
        title: t("admin.requestRejected"),
        description: t("admin.rejectionSuccess"),
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-request-search">{t("admin.filterByNameOrPhone")}</Label>
            <Input
              id="school-request-search"
              placeholder={t("admin.searchByRequesterNameEmailOrPhone")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("admin.filterByStatus")}</Label>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">{t("admin.loadingRequests")}</p>
          )}

          {!isLoading && filteredRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("admin.noMatchingRequests")}</p>
          )}

          {showPendingSection && (
          <div className="space-y-3" data-testid="schools-panel-pending-section">
            <h3 className="text-sm font-semibold">{t("admin.pendingSchoolManagerRequests")}</h3>

            {pendingRequests.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">{t("admin.noPendingSchoolRequests")}</p>
            )}

            {pendingRequests.map((request) => (
              <Card key={request.id} data-testid="school-request-card">
                <CardContent className="space-y-3 pt-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t("admin.requester")}</p>
                      <p className="text-sm font-medium">
                        {request.requester.fullName ?? request.requester.email ?? t("common.unknown")}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.requester.email ?? "-"}</p>
                      <p className="text-sm text-muted-foreground">{request.requester.phone ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t("admin.submitted")}</p>
                      <p className="text-sm">{new Date(request.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-muted-foreground">{t("admin.requestedSchoolSnapshot")}</p>
                    <p className="text-sm font-medium">{request.requestedSchoolName ?? "-"}</p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        request.requestedAddressLine1,
                        request.requestedAddressLine2,
                        request.requestedCity,
                        request.requestedStateProvince,
                        request.requestedPostalCode,
                        request.requestedCountry,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("admin.currency")}: {request.requestedCurrency ?? "-"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`reason-${request.id}`}>{t("admin.rejectionReason")}</Label>
                    <Textarea
                      id={`reason-${request.id}`}
                      value={rejectionReasons[request.id] ?? ""}
                      onChange={(event) =>
                        setRejectionReasons((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}

          {showApprovedSection && (
          <div className="space-y-3" data-testid="schools-panel-approved-section">
            <h3 className="text-sm font-semibold">{t("admin.approvedSchoolRequests")}</h3>

            {approvedRequests.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">{t("admin.noApprovedSchoolRequests")}</p>
            )}

            {approvedRequests.map((request) => (
              <Card key={request.id} data-testid="school-request-card">
                <CardContent className="space-y-3 pt-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t("admin.requester")}</p>
                      <p className="text-sm font-medium">
                        {request.requester.fullName ?? request.requester.email ?? t("common.unknown")}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.requester.email ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t("dashboard.approved")}</p>
                      <p className="text-sm">{new Date(request.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <p className="text-sm font-medium">
                    {request.approvedSchool?.name ?? request.requestedSchoolName ?? "-"}
                  </p>

                  <details className="rounded-md border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {t("admin.schoolDetails")}
                    </summary>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">{t("admin.approvedSchoolDetails")}: </span>
                        {request.approvedSchool?.name ?? "-"}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{t("admin.address")}: </span>
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
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{t("admin.currency")}: </span>
                        {request.approvedSchool?.currency ?? "-"}
                      </p>
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </DefaultLayout>
  );
};

export default SchoolRequestsDashboardPage;
