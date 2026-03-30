import { FileText, Mail, Upload, User } from "lucide-react";
import { type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import { Button } from "../../../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import {
  FileUploadZone,
  PhotoAvatarRow,
  PhotoUploadForm,
  SettingsActionRow,
  SettingsColumnsGrid,
  SettingsFieldBlock,
  SettingsFieldLabel,
  SettingsForm,
  SettingsHalfField,
  SettingsInputWithIcon,
  SettingsMainColumn,
  SettingsPageContent,
  SettingsSideColumn,
  SettingsTextareaWithIcon,
  SettingsTwoColumnRow,
} from "../../../client/components/patterns/SettingsPagePatterns";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";

const SettingsPage = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();
  const currentUser = user as AuthUser & {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  const fullName = typeof currentUser.fullName === "string" ? currentUser.fullName : "";
  const phone = typeof currentUser.phone === "string" ? currentUser.phone : "";
  const email = typeof currentUser.email === "string" ? currentUser.email : "";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // TODO implement
    event.preventDefault();
    alert(t("admin.notYetImplemented"));
  };

  return (
    <DefaultLayout user={user}>
      <SettingsPageContent>
        <Breadcrumb pageName={t("admin.settings")} />

        <SettingsColumnsGrid>
          <SettingsMainColumn>
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.personalInformation")}</CardTitle>
              </CardHeader>
              <CardContent>
                <SettingsForm onSubmit={handleSubmit}>
                  <SettingsTwoColumnRow>
                    <SettingsHalfField>
                      <SettingsFieldLabel htmlFor="full-name">
                        {t("auth.fullName")}
                      </SettingsFieldLabel>
                      <SettingsInputWithIcon
                        icon={<User />}
                        type="text"
                        name="fullName"
                        id="full-name"
                        placeholder={t("admin.notSet")}
                        defaultValue={fullName}
                      />
                    </SettingsHalfField>

                    <SettingsHalfField>
                      <SettingsFieldLabel htmlFor="phone-number">
                        {t("registration.phoneNumber")}
                      </SettingsFieldLabel>
                      <Input
                        type="tel"
                        name="phoneNumber"
                        id="phone-number"
                        placeholder={t("admin.notSet")}
                        defaultValue={phone}
                      />
                    </SettingsHalfField>
                  </SettingsTwoColumnRow>

                  <SettingsFieldBlock>
                    <SettingsFieldLabel htmlFor="email-address">
                      {t("user.emailAddress")}
                    </SettingsFieldLabel>
                    <SettingsInputWithIcon
                      icon={<Mail />}
                      type="email"
                      name="emailAddress"
                      id="email-address"
                      placeholder={t("admin.notSet")}
                      defaultValue={email}
                    />
                  </SettingsFieldBlock>

                  <SettingsFieldBlock>
                    <SettingsFieldLabel htmlFor="bio">
                      {t("admin.bio")}
                    </SettingsFieldLabel>
                    <SettingsTextareaWithIcon
                      icon={<FileText />}
                      name="bio"
                      id="bio"
                      rows={6}
                      placeholder={t("admin.writeBioHere")}
                      defaultValue=""
                    />
                  </SettingsFieldBlock>

                  <SettingsActionRow>
                    <Button variant="outline" type="submit">
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit">{t("common.save")}</Button>
                  </SettingsActionRow>
                </SettingsForm>
              </CardContent>
            </Card>
          </SettingsMainColumn>

          <SettingsSideColumn>
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.yourPhoto")}</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUploadForm>
                  <PhotoAvatarRow
                    editText={t("admin.editYourPhoto")}
                    deleteLabel={t("common.delete")}
                    updateLabel={t("school.update")}
                  />

                  <FileUploadZone
                    icon={<Upload />}
                    clickLabel={t("admin.clickToUpload")}
                    dragLabel={t("admin.orDragAndDrop")}
                    formatLabel={t("admin.svgPngJpgOrGif")}
                    sizeLabel={t("admin.maxFileSize")}
                  />

                  <SettingsActionRow>
                    <Button variant="outline" type="submit">
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit">{t("common.save")}</Button>
                  </SettingsActionRow>
                </PhotoUploadForm>
              </CardContent>
            </Card>
          </SettingsSideColumn>
        </SettingsColumnsGrid>
      </SettingsPageContent>
    </DefaultLayout>
  );
};

export default SettingsPage;
