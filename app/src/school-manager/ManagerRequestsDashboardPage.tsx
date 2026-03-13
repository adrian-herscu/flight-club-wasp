import { useMemo, useState } from "react";
import { Navigate } from "react-router";
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
    username: string | null;
    email: string | null;
    phone: string | null;
  };
  targetSchool: {
    id: string;
    name: string;
  } | null;
};

const ManagerRequestsPage = ({ user }: { user: AuthUser }) => {
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
      const name = (request.requester.username ?? request.requester.email ?? "").toLowerCase();
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
        title: "Request approved",
        description: "The user has been approved.",
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
      await rejectSchoolMemberRequest({
        requestId,
        rejectionReason: rejectionReasons[requestId],
      });
      await refetch();
      toast({
        title: "Request rejected",
        description: "The request has been rejected.",
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
      <Breadcrumb pageName="Member Requests" />

      <Card>
        <CardHeader>
          <CardTitle>Pending instructor and student requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-request-search">Filter by name or phone</Label>
            <Input
              id="member-request-search"
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
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Requested role</p>
                      <p className="text-sm font-medium">{request.requestedRole}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Requester</p>
                      <p className="text-sm font-medium">
                        {request.requester.username ?? request.requester.email ?? "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.requester.email ?? "-"}</p>
                      <p className="text-sm text-muted-foreground">{request.requester.phone ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Submitted</p>
                      <p className="text-sm">{new Date(request.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        School: {request.targetSchool?.name ?? "-"}
                      </p>
                    </div>
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

export default ManagerRequestsPage;
