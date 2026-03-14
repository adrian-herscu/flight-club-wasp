import { Heart, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type AuthUser } from "wasp/auth";
import { Button } from "../../../client/components/ui/button";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";

const Buttons = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.buttonsPageTitle")} />

      {/* Button Variants */}
      <div className="border-border bg-card shadow-default mb-10 rounded-sm border">
        <div className="border-border border-b px-7 py-4">
          <h3 className="text-foreground font-medium">{t("admin.buttonVariantsTitle")}</h3>
        </div>

        <div className="p-4 md:p-6 xl:p-9">
          <div className="flex flex-wrap gap-4">
            <Button variant="default">{t("admin.buttonVariants.0")}</Button>
            <Button variant="outline">{t("admin.buttonVariants.1")}</Button>
            <Button variant="secondary">{t("admin.buttonVariants.2")}</Button>
            <Button variant="ghost">{t("admin.buttonVariants.3")}</Button>
            <Button variant="link">{t("admin.buttonVariants.4")}</Button>
            <Button variant="destructive">{t("admin.buttonVariants.5")}</Button>
          </div>
        </div>
      </div>

      {/* Button Sizes */}
      <div className="border-border bg-card shadow-default mb-10 rounded-sm border">
        <div className="border-border border-b px-7 py-4">
          <h3 className="text-foreground font-medium">{t("admin.buttonSizesTitle")}</h3>
        </div>

        <div className="p-4 md:p-6 xl:p-9">
          <div className="flex flex-wrap items-center gap-4">
            <Button size="sm">{t("admin.buttonSizes.0")}</Button>
            <Button size="default">{t("admin.buttonSizes.1")}</Button>
            <Button size="lg">{t("admin.buttonSizes.2")}</Button>
            <Button size="icon">
              <Plus />
            </Button>
          </div>
        </div>
      </div>

      {/* Button with Icon */}
      <div className="border-border bg-card shadow-default mb-10 rounded-sm border">
        <div className="border-border border-b px-7 py-4">
          <h3 className="text-foreground font-medium">{t("admin.buttonWithIconTitle")}</h3>
        </div>

        <div className="p-4 md:p-6 xl:p-9">
          <div className="flex flex-wrap gap-4">
            <Button>
              <Plus />
              {t("admin.addItem")}
            </Button>
            <Button variant="outline">
              <Heart />
              {t("admin.like")}
            </Button>
            <Button variant="destructive">
              <Trash2 />
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default Buttons;
