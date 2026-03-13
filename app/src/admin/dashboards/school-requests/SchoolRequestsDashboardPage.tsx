import { useMemo, useState } from "react";
import { Navigate } from "react-router";
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

type SchoolRequestItem = {
  id: string;
  createdAt: string;
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
};

const SchoolRequestsDashboardPage = ({ user }: { user: AuthUser }) => {
  if (user.role !== "SYSTEM_ADMIN") {
    return <Navigate to="/" replace />;
  }

  const { data, isLoading, refetch } = useQuery(getPendingSchoolManagerRequests);
  const [searchTerm, setSearchTerm] = useState("");
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

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
        title: "Request approved",
        description: "School manager request approved successfully.",
      });
    } catch (error: unknown) {
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Unable to approve request.",
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
        title: "Request rejected",
        description: "School manager request rejected.",
      });
    } catch (error: unknown) {
      toast({
        title: "Rejection failed",
        description: error instanceof Error ? error.message : "Unable to reject request.",
        variant: "destructive",
      });
    } finally {
      setIsRejectingId(null);
    }
  };

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="School Requests" />

      <Card>
        <CardHeader>
          <CardTitle>Pending school manager requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-request-search">Filter by name or phone</Label>
            <Input
              id="school-request-search"
              placeholder="Search by requester name, email, or phone"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          )}

          {!isLoading && filteredRequests.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching requests.</p>
          )}

          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Requester</p>
                      <p className="text-sm font-medium">
                        {request.requester.fullName ?? request.requester.email ?? "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.requester.email ?? "-"}</p>
                      <p className="text-sm text-muted-foreground">{request.requester.phone ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Submitted</p>
                      <p className="text-sm">{new Date(request.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Requested school</p>
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
                      Currency: {request.requestedCurrency ?? "-"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`reason-${request.id}`}>Rejection reason (optional)</Label>
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
                      {isRejectingId === request.id ? "Rejecting..." : "Reject"}
                    </Button>
                    <Button
                      disabled={isApprovingId === request.id}
                      onClick={() => handleApprove(request.id)}
                    >
                      {isApprovingId === request.id ? "Approving..." : "Approve"}
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

export default SchoolRequestsDashboardPage;
