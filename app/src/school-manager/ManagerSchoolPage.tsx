import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";
import Breadcrumb from "../admin/layout/Breadcrumb";
import DefaultLayout from "../admin/layout/DefaultLayout";

const { getMyManagedSchool, useQuery } = operations as any;

type ManagedSchool = {
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  stateProvince: string | null;
  postalCode: string;
  country: string;
  currency: string;
  accounts: Array<{
    id: string;
    currency: string;
    balanceMinor: number;
  }>;
};

const labelClassName = "text-muted-foreground text-xs uppercase tracking-wide";
const valueClassName = "text-foreground text-sm font-medium";

const ManagerSchoolPage = ({ user }: { user: AuthUser }) => {
  const { data, isLoading, error } = useQuery(getMyManagedSchool);
  const school = data as ManagedSchool | undefined;

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="My School" />

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Loading school details...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-red-500">{error.message}</p>
          </CardContent>
        </Card>
      )}

      {school && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>School Profile</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <p className={labelClassName}>Name</p>
                <p className={valueClassName}>{school.name}</p>
              </div>
              <div>
                <p className={labelClassName}>Address</p>
                <p className={valueClassName}>{school.addressLine1}</p>
                {school.addressLine2 ? (
                  <p className={valueClassName}>{school.addressLine2}</p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={labelClassName}>City</p>
                  <p className={valueClassName}>{school.city}</p>
                </div>
                <div>
                  <p className={labelClassName}>State / Province</p>
                  <p className={valueClassName}>{school.stateProvince ?? "-"}</p>
                </div>
                <div>
                  <p className={labelClassName}>Postal Code</p>
                  <p className={valueClassName}>{school.postalCode}</p>
                </div>
                <div>
                  <p className={labelClassName}>Country</p>
                  <p className={valueClassName}>{school.country}</p>
                </div>
              </div>
              <div>
                <p className={labelClassName}>School Currency</p>
                <p className={valueClassName}>{school.currency}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manager School Account</CardTitle>
            </CardHeader>
            <CardContent>
              {school.accounts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No account is currently linked to this school manager.
                </p>
              ) : (
                <div className="space-y-4">
                  {school.accounts.map((account) => (
                    <div key={account.id} className="rounded-md border p-4">
                      <p className={labelClassName}>Account ID</p>
                      <p className={valueClassName}>{account.id}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className={labelClassName}>Currency</p>
                          <p className={valueClassName}>{account.currency}</p>
                        </div>
                        <div>
                          <p className={labelClassName}>Balance (minor units)</p>
                          <p className={valueClassName}>{account.balanceMinor}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DefaultLayout>
  );
};

export default ManagerSchoolPage;
