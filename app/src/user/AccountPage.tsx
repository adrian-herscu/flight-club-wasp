import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Separator } from "../client/components/ui/separator";
import { toast } from "../client/hooks/use-toast";

const { updateMyUserProfile } = operations as any;

export default function AccountPage({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const currentUser = user as AuthUser & {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
  };

  const [fullName, setFullName] = useState(currentUser.fullName ?? "");
  const [phone, setPhone] = useState(currentUser.phone ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateMyUserProfile({
        fullName: fullName.trim() || null,
        phone: phone.trim() || null,
      });
      toast({
        title: t("user.savedSuccess"),
        description: t("user.savedSuccessMessage"),
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("user.saveError"),
        description: err?.message ?? t("user.saveErrorMessage"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-10 px-6">
      <Card className="mb-4 lg:m-8">
        <CardHeader>
          <CardTitle className="text-foreground text-base font-semibold leading-6">
            {t("user.accountInformation")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {!!currentUser.email && (
              <>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-1 items-center sm:grid-cols-3 sm:gap-4">
                    <span className="text-muted-foreground text-sm font-medium">
                      {t("user.emailAddress")}
                    </span>
                    <div className="text-foreground mt-1 text-sm sm:col-span-2 sm:mt-0">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}
            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-4">
              <div className="grid grid-cols-1 items-center sm:grid-cols-3 sm:gap-4">
                <Label
                  htmlFor="fullName"
                  className="text-muted-foreground text-sm font-medium"
                >
                  {t("user.fullName")}
                </Label>
                <div className="mt-1 sm:col-span-2 sm:mt-0">
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 items-center sm:grid-cols-3 sm:gap-4">
                <Label
                  htmlFor="phone"
                  className="text-muted-foreground text-sm font-medium"
                >
                  {t("user.phone")}
                </Label>
                <div className="mt-1 sm:col-span-2 sm:mt-0">
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? t("user.saving") : t("user.saveDetails")}
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
