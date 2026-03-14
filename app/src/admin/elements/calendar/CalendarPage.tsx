import { type AuthUser } from "wasp/auth";
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";

const Calendar = ({ user }: { user: AuthUser }) => {
  const { t } = useTranslation();

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName={t("admin.calendar")} />
      <div className="border-border bg-card shadow-default w-full max-w-full rounded-sm border">
        <table className="w-full">
          <thead>
            <tr className="bg-primary text-primary-foreground grid grid-cols-7 rounded-t-sm">
              <th className="h-15 flex items-center justify-center rounded-tl-sm p-1 text-xs font-semibold sm:text-base xl:p-5">
                <span className="hidden lg:block"> {t("admin.weekdays.sunday")} </span>
                <span className="block lg:hidden"> {t("admin.weekdays.sundayShort")} </span>
              </th>
              <th className="h-15 flex items-center justify-center p-1 text-xs font-semibold sm:text-base xl:p-5">
                <span className="hidden lg:block"> {t("admin.weekdays.monday")} </span>
                <span className="block lg:hidden"> {t("admin.weekdays.mondayShort")} </span>
              </th>
              <th className="h-15 flex items-center justify-center p-1 text-xs font-semibold sm:text-base xl:p-5">
                <span className="hidden lg:block"> {t("admin.weekdays.tuesday")} </span>
                <span className="block lg:hidden"> {t("admin.weekdays.tuesdayShort")} </span>
              </th>
              <th className="h-15 flex items-center justify-center p-1 text-xs font-semibold sm:text-base xl:p-5">
                <span className="hidden lg:block"> {t("admin.weekdays.wednesday")} </span>
                <span className="block lg:hidden"> {t("admin.weekdays.wednesdayShort")} </span>
              </th>
              <th className="h-15 flex items-center justify-center p-1 text-xs font-semibold sm:text-base xl:p-5">
                <span className="hidden lg:block"> {t("admin.weekdays.thursday")} </span>
                <span className="block lg:hidden"> {t("admin.weekdays.thursdayShort")} </span>
              </th>
              <th className="h-15 flex items-center justify-center p-1 text-xs font-semibold sm:text-base xl:p-5">
                <span className="hidden lg:block"> {t("admin.weekdays.friday")} </span>
                <span className="block lg:hidden"> {t("admin.weekdays.fridayShort")} </span>
              </th>
              <th className="h-15 flex items-center justify-center rounded-tr-sm p-1 text-xs font-semibold sm:text-base xl:p-5">
                <span className="hidden lg:block"> {t("admin.weekdays.saturday")} </span>
                <span className="block lg:hidden"> {t("admin.weekdays.saturdayShort")} </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* <!-- Line 1 --> */}
            <tr className="grid grid-cols-7">
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">1</span>
                <div className="md:h-30 group h-16 w-full grow cursor-pointer py-1">
                  <span className="group-hover:text-primary md:hidden">
                    {t("common.more")}
                  </span>
                  <div className="event z-99 border-primary bg-muted invisible absolute left-2 mb-1 flex w-[200%] flex-col rounded-sm border-l-[3px] px-3 py-1 text-left opacity-0 group-hover:visible group-hover:opacity-100 md:visible md:w-[190%] md:opacity-100">
                    <span className="event-name text-foreground text-sm font-semibold">
                      {t("admin.redesignWebsite")}
                    </span>
                    <span className="time text-foreground text-sm font-medium">
                      {t("admin.redesignDates")}
                    </span>
                  </div>
                </div>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">2</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">3</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">4</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">5</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">6</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">7</span>
              </td>
            </tr>
            {/* <!-- Line 1 --> */}
            {/* <!-- Line 2 --> */}
            <tr className="grid grid-cols-7">
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">8</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">9</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">10</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">11</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">12</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">13</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">14</span>
              </td>
            </tr>
            {/* <!-- Line 2 --> */}
            <tr className="grid grid-cols-7">
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">15</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">16</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">17</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">18</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">19</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">20</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">21</span>
              </td>
            </tr>
            {/* <!-- Line 3 --> */}
            <tr className="grid grid-cols-7">
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">22</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">23</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">24</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">25</span>
                <div className="md:h-30 group h-16 w-full grow cursor-pointer py-1">
                  <span className="group-hover:text-primary md:hidden">
                    More
                  </span>
                  <div className="event z-99 border-primary bg-muted invisible absolute left-2 mb-1 flex w-[300%] flex-col rounded-sm border-l-[3px] px-3 py-1 text-left opacity-0 group-hover:visible group-hover:opacity-100 md:visible md:w-[290%] md:opacity-100">
                    <span className="event-name text-foreground text-sm font-semibold">
                      App Design
                    </span>
                    <span className="time text-foreground text-sm font-medium">
                      25 Dec - 27 Dec
                    </span>
                  </div>
                </div>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">26</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">27</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">28</span>
              </td>
            </tr>
            {/* <!-- Line 4 --> */}
            <tr className="grid grid-cols-7">
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">29</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">30</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">31</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">1</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">2</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">3</span>
              </td>
              <td className="ease border-border text-accent hover:bg-accent hover:text-accent-foreground md:h-25 xl:h-31 relative h-20 cursor-pointer border p-2 transition duration-500 md:p-6">
                <span className="font-medium">4</span>
              </td>
            </tr>
            {/* <!-- Line 5 --> */}
          </tbody>
        </table>
      </div>
    </DefaultLayout>
  );
};

export default Calendar;
