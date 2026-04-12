import { useForm } from "react-hook-form";
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
import { useWaspMutation } from "../client/hooks/useWaspMutation";

const { updateMyUserProfile } = operations as any;

export default function AccountPage({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const currentUser = user as AuthUser & {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
  };

  const form = useForm({
    defaultValues: {
      fullName: currentUser.fullName ?? "",
      phone: currentUser.phone ?? "",
    },
  });

  const saveProfile = useWaspMutation(
    ({ fullName, phone }: { fullName: string; phone: string }) =>
      updateMyUserProfile({ fullName: fullName.trim() || null, phone: phone.trim() || null }),
    {
      successToast: { title: t("user.savedSuccess"), description: t("user.savedSuccessMessage") },
      errorToast: { title: t("user.saveError"), fallbackDescription: t("user.saveErrorMessage") },
    },
  );

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
              <FormStack onSubmit={form.handleSubmit((data) => saveProfile.mutate(data))} gap="lg">
                <FieldRow label={t("user.fullName")}>
                  <Input
                    id="fullName"
                    {...form.register("fullName")}
                  />
                </FieldRow>
                <FieldRow label={t("user.phone")}>
                  <Input
                    id="phone"
                    type="tel"
                    {...form.register("phone")}
                  />
                </FieldRow>
                <EndAlignedActions>
                  <Button type="submit" disabled={saveProfile.isPending}>
                    {saveProfile.isPending ? t("user.saving") : t("user.saveDetails")}
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
