import { useMemo, useState } from "react";
import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Textarea } from "../client/components/ui/textarea";
import { toast } from "../client/hooks/use-toast";

const {
  approveSchoolMemberRequest,
  getPendingSchoolMemberRequests,
  rejectSchoolMemberRequest,
  useQuery,
} = operations as any;

type MemberRequestItem = {
  id: string;
  createdAt: string;
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

const ManagerRequestsPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();

  if (user.role !== "SCHOOL_MANAGER") {
    return <Navigate to="/" replace />;
  }

  const { data, isLoading, refetch } = useQuery(getPendingSchoolMemberRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const requests = (data as MemberRequestItem[] | undefined) ?? [];

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
      await approveSchoolMemberRequest({ requestId });
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

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.memberRequests")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.pendingInstructorStudentRequests")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-request-search">{t("admin.filterByNameOrPhone")}</Label>
            <Input
              id="member-request-search"
              placeholder={t("admin.searchByRequesterNameEmailOrPhone")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">{t("admin.loadingRequests")}</p>
          )}

          {!isLoading && filteredRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("admin.noMatchingRequests")}</p>
          )}

          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t("dashboard.requestedRole")}</p>
                      <p className="text-sm font-medium">{request.requestedRole}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t("dashboard.requesterName")}</p>
                      <p className="text-sm font-medium">
                        {request.requester.fullName ?? request.requester.email ?? t("common.unknown")}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.requester.email ?? "-"}</p>
                      <p className="text-sm text-muted-foreground">{request.requester.phone ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">{t("dashboard.submittedDate")}</p>
                      <p className="text-sm">{new Date(request.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.schoolName")}: {request.targetSchool?.name ?? "-"}
                      </p>
                    </div>
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
        </CardContent>
      </Card>
    </DefaultLayout>
  );
};

export default ManagerRequestsPage;
