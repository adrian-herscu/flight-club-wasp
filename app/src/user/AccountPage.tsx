import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import {
  AppCard,
  AppPageInset,
  ContentStack,
  EndAlignedActions,
  FieldRow,
  FormStack,
  InsetBlock,
  ReadOnlyFieldRow,
} from "../client/components/patterns/AppStructure";
import { Button } from "../client/components/ui/button";
import {
  CardContent,
  CardHeader,
  CardTitle,
} from "../client/components/ui/card";
import { Input } from "../client/components/ui/input";
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
    <AppPageInset>
      <AppCard>
        <CardHeader>
          <CardTitle>{t("user.accountInformation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentStack gap="none">
            {!!currentUser.email && (
              <>
                <InsetBlock>
                  <ReadOnlyFieldRow label={t("user.emailAddress")} value={currentUser.email} />
                </InsetBlock>
                <Separator />
              </>
            )}
            <InsetBlock>
              <FormStack onSubmit={handleSubmit} gap="lg">
                <FieldRow label={t("user.fullName")}>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
                </FieldRow>
                <FieldRow label={t("user.phone")}>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </FieldRow>
                <EndAlignedActions>
                  <Button type="submit" disabled={saving}>
                    {saving ? t("user.saving") : t("user.saveDetails")}
                  </Button>
                </EndAlignedActions>
              </FormStack>
            </InsetBlock>
          </ContentStack>
        </CardContent>
      </AppCard>
    </AppPageInset>
  );
}
