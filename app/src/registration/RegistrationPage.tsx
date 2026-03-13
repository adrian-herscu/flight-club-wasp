import { useMemo, useState } from "react";
import { Navigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";
import { toast } from "../client/hooks/use-toast";

const {
  getMyRegistrationRequest,
  getRegistrationSchoolOptions,
  submitRegistrationRequest,
  useQuery,
} = operations as any;

type RegistrationRole = "SCHOOL_MANAGER" | "INSTRUCTOR" | "STUDENT";

type SchoolOption = {
  id: string;
  name: string;
  city: string;
  country: string;
};

export default function RegistrationPage({ user }: { user: AuthUser }) {
  if (user.role && user.role !== "USER") {
    return <Navigate to="/" replace />;
  }

  const currentUser = user as AuthUser & { fullName?: string | null; phone?: string | null };
  const initialFullName = typeof currentUser.fullName === "string" ? currentUser.fullName : "";
  const initialPhone = typeof user.phone === "string" ? user.phone : "";

  const { data: existingRequest, isLoading, refetch } = useQuery(getMyRegistrationRequest);
  const { data: schoolOptionsData } = useQuery(getRegistrationSchoolOptions);

  const schoolOptions = (schoolOptionsData as SchoolOption[] | undefined) ?? [];

  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [requestedRole, setRequestedRole] = useState<RegistrationRole>("SCHOOL_MANAGER");
  const [targetSchoolId, setTargetSchoolId] = useState("");
  const [requestedSchoolName, setRequestedSchoolName] = useState("");
  const [requestedAddressLine1, setRequestedAddressLine1] = useState("");
  const [requestedAddressLine2, setRequestedAddressLine2] = useState("");
  const [requestedCity, setRequestedCity] = useState("");
  const [requestedStateProvince, setRequestedStateProvince] = useState("");
  const [requestedPostalCode, setRequestedPostalCode] = useState("");
  const [requestedCountry, setRequestedCountry] = useState("");
  const [requestedCurrency, setRequestedCurrency] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isManagerRequest = requestedRole === "SCHOOL_MANAGER";

  const selectedSchool = useMemo(() => {
    if (!existingRequest?.targetSchoolId) return null;
    return schoolOptions.find((school) => school.id === existingRequest.targetSchoolId) ?? null;
  }, [existingRequest?.targetSchoolId, schoolOptions]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast({
        title: "Missing details",
        description: "Full name and phone number are required before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (isManagerRequest) {
      const missingFields: string[] = [];

      if (!requestedSchoolName.trim()) missingFields.push("School name");
      if (!requestedAddressLine1.trim()) missingFields.push("Address line 1");
      if (!requestedCity.trim()) missingFields.push("City");
      if (!requestedPostalCode.trim()) missingFields.push("Postal code");
      if (!requestedCountry.trim()) missingFields.push("Country (ISO code)");
      if (!requestedCurrency.trim()) missingFields.push("Currency (ISO code)");

      if (missingFields.length > 0) {
        toast({
          title: "Missing school details",
          description: `Please complete: ${missingFields.join(", ")}.`,
          variant: "destructive",
        });
        return;
      }

      if (requestedCountry.trim().length !== 2) {
        toast({
          title: "Invalid country code",
          description: "Country must be a 2-letter ISO code (for example: US).",
          variant: "destructive",
        });
        return;
      }

      if (requestedCurrency.trim().length !== 3) {
        toast({
          title: "Invalid currency code",
          description: "Currency must be a 3-letter ISO code (for example: USD).",
          variant: "destructive",
        });
        return;
      }
    }

    if (!isManagerRequest && !targetSchoolId) {
      toast({
        title: "School required",
        description: "Select a school before submitting your request.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRegistrationRequest({
        fullName,
        phone,
        requestedRole,
        targetSchoolId: isManagerRequest ? undefined : targetSchoolId,
        requestedSchoolName: isManagerRequest ? requestedSchoolName.trim() : undefined,
        requestedAddressLine1: isManagerRequest ? requestedAddressLine1.trim() : undefined,
        requestedAddressLine2: isManagerRequest ? requestedAddressLine2.trim() || undefined : undefined,
        requestedCity: isManagerRequest ? requestedCity.trim() : undefined,
        requestedStateProvince: isManagerRequest ? requestedStateProvince.trim() || undefined : undefined,
        requestedPostalCode: isManagerRequest ? requestedPostalCode.trim() : undefined,
        requestedCountry: isManagerRequest ? requestedCountry.trim().toUpperCase() : undefined,
        requestedCurrency: isManagerRequest ? requestedCurrency.trim().toUpperCase() : undefined,
      });
      await refetch();
      toast({
        title: "Request submitted",
        description: "Your request is now in process.",
      });
    } catch (error: unknown) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Unable to submit request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto mt-10 max-w-3xl px-6">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading...</CardContent>
        </Card>
      </div>
    );
  }

  if (existingRequest) {
    return (
      <div className="mx-auto mt-10 max-w-3xl px-6">
        <Card>
          <CardHeader>
            <CardTitle>Registration request status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Request type: <strong>{existingRequest.requestedRole}</strong>
            </p>
            <p>
              Status: <strong>{existingRequest.status}</strong>
            </p>
            {existingRequest.requestedRole === "SCHOOL_MANAGER" && (
              <p>
                School: <strong>{existingRequest.requestedSchoolName ?? "-"}</strong>
              </p>
            )}
            {existingRequest.requestedRole !== "SCHOOL_MANAGER" && (
              <p>
                School: <strong>{selectedSchool?.name ?? existingRequest.targetSchool?.name ?? "-"}</strong>
              </p>
            )}
            {existingRequest.rejectionReason && (
              <div>
                <p className="font-medium">Reason:</p>
                <p className="text-muted-foreground">{existingRequest.rejectionReason}</p>
              </div>
            )}
            <p className="text-muted-foreground">
              Refresh the page to see approval updates.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-3xl px-6 pb-10">
      <Card>
        <CardHeader>
          <CardTitle>Complete your registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Register as</Label>
            <Select
              value={requestedRole}
              onValueChange={(value) => setRequestedRole(value as RegistrationRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHOOL_MANAGER">School manager</SelectItem>
                <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isManagerRequest ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestedSchoolName">School name</Label>
                <Input
                  id="requestedSchoolName"
                  value={requestedSchoolName}
                  onChange={(event) => setRequestedSchoolName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedAddressLine1">Address line 1</Label>
                <Input
                  id="requestedAddressLine1"
                  value={requestedAddressLine1}
                  onChange={(event) => setRequestedAddressLine1(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedAddressLine2">Address line 2 (optional)</Label>
                <Input
                  id="requestedAddressLine2"
                  value={requestedAddressLine2}
                  onChange={(event) => setRequestedAddressLine2(event.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="requestedCity">City</Label>
                  <Input
                    id="requestedCity"
                    value={requestedCity}
                    onChange={(event) => setRequestedCity(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedStateProvince">State / Province (optional)</Label>
                  <Input
                    id="requestedStateProvince"
                    value={requestedStateProvince}
                    onChange={(event) => setRequestedStateProvince(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="requestedPostalCode">Postal code</Label>
                  <Input
                    id="requestedPostalCode"
                    value={requestedPostalCode}
                    onChange={(event) => setRequestedPostalCode(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedCountry">Country (ISO code)</Label>
                  <Input
                    id="requestedCountry"
                    maxLength={2}
                    value={requestedCountry}
                    onChange={(event) => setRequestedCountry(event.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestedCurrency">Currency (ISO code)</Label>
                  <Input
                    id="requestedCurrency"
                    maxLength={3}
                    value={requestedCurrency}
                    onChange={(event) => setRequestedCurrency(event.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select school</Label>
              <Select value={targetSchoolId} onValueChange={setTargetSchoolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a school" />
                </SelectTrigger>
                <SelectContent>
                  {schoolOptions.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name} ({school.city}, {school.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schoolOptions.length === 0 && (
                <p className="text-muted-foreground text-sm">No schools are available yet.</p>
              )}
            </div>
          )}

          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            Your role stays <strong>USER</strong> until this request is approved.
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit request"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
