import { FileText, Mail, Upload, User } from "lucide-react";
import { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import { Button } from "../../../client/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../client/components/ui/card";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Textarea } from "../../../client/components/ui/textarea";
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
      <div className="max-w-270 mx-auto">
        <Breadcrumb pageName={t("admin.settings")} />

        <div className="grid grid-cols-5 gap-8">
          <div className="col-span-5 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.personalInformation")}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="mb-5.5 gap-5.5 flex flex-col sm:flex-row">
                    <div className="w-full sm:w-1/2">
                      <Label
                        htmlFor="full-name"
                        className="text-foreground mb-3 block text-sm font-medium"
                      >
                        {t("auth.fullName")}
                      </Label>
                      <div className="relative">
                        <User className="left-4.5 text-muted-foreground absolute top-2 h-5 w-5" />
                        <Input
                          className="pl-11.5"
                          type="text"
                          name="fullName"
                          id="full-name"
                          placeholder={t("admin.notSet")}
                          defaultValue={fullName}
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-1/2">
                      <Label
                        htmlFor="phone-number"
                        className="text-foreground mb-3 block text-sm font-medium"
                      >
                        {t("registration.phoneNumber")}
                      </Label>
                      <Input
                        type="tel"
                        name="phoneNumber"
                        id="phone-number"
                        placeholder={t("admin.notSet")}
                        defaultValue={phone}
                      />
                    </div>
                  </div>

                  <div className="mb-5.5">
                    <Label
                      htmlFor="email-address"
                      className="text-foreground mb-3 block text-sm font-medium"
                    >
                      {t("user.emailAddress")}
                    </Label>
                    <div className="relative">
                      <Mail className="left-4.5 text-muted-foreground absolute top-2 h-5 w-5" />
                      <Input
                        className="pl-11.5"
                        type="email"
                        name="emailAddress"
                        id="email-address"
                        placeholder={t("admin.notSet")}
                        defaultValue={email}
                      />
                    </div>
                  </div>
                  <div className="mb-5.5">
                    <Label
                      htmlFor="bio"
                      className="text-foreground mb-3 block text-sm font-medium"
                    >
                      {t("admin.bio")}
                    </Label>
                    <div className="relative">
                      <FileText className="left-4.5 text-muted-foreground absolute top-4 h-5 w-5" />
                      <Textarea
                        className="border-border bg-background pl-11.5 pr-4.5 text-foreground focus:border-primary w-full rounded border py-3 focus-visible:outline-hidden"
                        name="bio"
                        id="bio"
                        rows={6}
                        placeholder={t("admin.writeBioHere")}
                        defaultValue=""
                      ></Textarea>
                    </div>
                  </div>

                  <div className="gap-4.5 flex justify-end">
                    <Button variant="outline" type="submit">
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit">{t("common.save")}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-5 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.yourPhoto")}</CardTitle>
              </CardHeader>
              <CardContent>
                <form action="#">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full">
                      {/* <img src={userThree} alt="User" /> */}
                    </div>
                    <div>
                      <span className="text-foreground mb-1.5">
                        {t("admin.editYourPhoto")}
                      </span>
                      <span className="flex gap-2.5">
                        <button className="hover:text-primary text-sm">
                          {t("common.delete")}
                        </button>
                        <button className="hover:text-primary text-sm">
                          {t("school.update")}
                        </button>
                      </span>
                    </div>
                  </div>

                  <div
                    id="FileUpload"
                    className="mb-5.5 border-primary bg-background sm:py-7.5 relative block w-full cursor-pointer appearance-none rounded border-2 border-dashed px-4 py-4"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 z-50 m-0 h-full w-full cursor-pointer p-0 opacity-0 outline-hidden"
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <span className="border-border bg-background flex h-10 w-10 items-center justify-center rounded-full border">
                        <Upload className="text-primary h-4 w-4" />
                      </span>
                      <p>
                        <span className="text-primary">{t("admin.clickToUpload")}</span>
                        {t("admin.orDragAndDrop")}
                      </p>
                      <p className="mt-1.5">{t("admin.svgPngJpgOrGif")}</p>
                      <p>{t("admin.maxFileSize")}</p>
                    </div>
                  </div>

                  <div className="gap-4.5 flex justify-end">
                    <Button variant="outline" type="submit">
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit">{t("common.save")}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default SettingsPage;
