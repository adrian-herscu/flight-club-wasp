import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LayoutTemplate,
  School,
  Sheet,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router";
import Logo from "../../client/static/logo.webp";
import { cn } from "../../client/utils";
import SidebarLinkGroup from "./SidebarLinkGroup";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  userRole: string | null;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen, userRole }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true",
  );
  const navItemBaseClass =
    "text-muted-foreground hover:bg-accent hover:text-accent-foreground group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium duration-300 ease-in-out";
  const navItemClassName = ({ isActive }: { isActive: boolean }) =>
    cn(navItemBaseClass, {
      "bg-accent text-accent-foreground": isActive,
    });

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded");
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  return (
    <aside
      ref={sidebar}
      className={cn(
        "bg-muted absolute top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden duration-300 ease-linear lg:static lg:translate-x-0",
        {
          "ltr:left-0 rtl:right-0 border-e ltr:translate-x-0 rtl:translate-x-0": sidebarOpen,
          "ltr:left-0 rtl:right-0 ltr:border-e rtl:border-s max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full": !sidebarOpen,
        },
      )}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <NavLink to="/">
          <img src={Logo} alt="Logo" width={50} />
        </NavLink>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <X />
        </button>
      </div>
      {/* <!-- SIDEBAR HEADER --> */}

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        {/* <!-- Sidebar Menu --> */}
        <nav className="mt-5 px-4 py-4 lg:mt-9 lg:px-6">
          {/* <!-- Menu Group --> */}
          <div>
            <h3 className="text-muted-foreground mb-4 ms-4 text-sm font-semibold">
              {t("nav.menu")}
            </h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              {/* <!-- Menu Item Dashboard --> */}
              <NavLink
                to="/admin"
                end
                className={navItemClassName}
              >
                <LayoutDashboard />
                {t("admin.dashboard")}
              </NavLink>

              {/* <!-- Menu Item Dashboard --> */}

              {/* <!-- Menu Item Users --> */}
              {userRole === "SYSTEM_ADMIN" && (
                <li>
                  <NavLink
                    to="/admin/users"
                    end
                    className={navItemClassName}
                  >
                    <Sheet />
                    {t("admin.users")}
                  </NavLink>
                </li>
              )}
              {/* <!-- Menu Item Users --> */}

              {userRole === "SYSTEM_ADMIN" && (
                <li>
                  <NavLink
                    to="/admin/school-requests"
                    end
                    className={navItemClassName}
                  >
                    <ClipboardList />
                    {t("admin.schools")}
                  </NavLink>
                </li>
              )}

              {userRole === "SCHOOL_MANAGER" && (
                <li>
                  <NavLink
                    to="/admin/member-requests/instructors"
                    end
                    className={navItemClassName}
                  >
                    <ClipboardList />
                    {t("admin.filterInstructors")}
                  </NavLink>
                </li>
              )}

              {userRole === "SCHOOL_MANAGER" && (
                <li>
                  <NavLink
                    to="/admin/member-requests/students"
                    end
                    className={navItemClassName}
                  >
                    <ClipboardList />
                    {t("admin.filterStudents")}
                  </NavLink>
                </li>
              )}

              {/* <!-- Menu Item School --> */}
              {userRole === "SCHOOL_MANAGER" && (
                <li>
                  <NavLink
                    to="/admin/school"
                    end
                    className={navItemClassName}
                  >
                    <School />
                    {t("admin.schools")}
                  </NavLink>
                </li>
              )}
              {/* <!-- Menu Item School --> */}

              {/* <!-- Menu Item Syllabuses --> */}
              {(userRole === "SCHOOL_MANAGER" || userRole === "SYSTEM_ADMIN") && (
                <li>
                <NavLink
                  to="/admin/syllabuses?section=catalog"
                  className={() =>
                    cn(navItemBaseClass, {
                      "bg-accent text-accent-foreground":
                        pathname === "/admin/syllabuses" ||
                        pathname.startsWith("/admin/syllabuses/"),
                    })
                  }
                >
                  <GraduationCap />
                  {t("admin.syllabuses")}
                </NavLink>
                </li>
              )}
              {/* <!-- Menu Item Syllabuses --> */}

            </ul>
          </div>

          {/* <!-- Others Group --> */}
          <div>
            <h3 className="text-muted-foreground mb-4 ms-4 text-sm font-semibold">
              {t("admin.extraComponents")}
            </h3>

            <ul className="mb-6 flex flex-col gap-1.5">
              {/* <!-- Menu Item Calendar --> */}
              <li>
                <NavLink
                  to="/admin/calendar"
                  end
                  className={navItemClassName}
                >
                  <Calendar />
                  {t("admin.calendar")}
                </NavLink>
              </li>
              {/* <!-- Menu Item Calendar --> */}

              {/* <!-- Menu Item Ui Elements --> */}
              <SidebarLinkGroup
                activeCondition={pathname === "/ui" || pathname.includes("ui")}
              >
                {(handleClick, open) => {
                  return (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={cn(navItemBaseClass, {
                          "bg-accent text-accent-foreground": pathname.includes("ui"),
                        })}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!sidebarExpanded) {
                            setSidebarExpanded(true);
                          }
                          handleClick();
                        }}
                      >
                        <LayoutTemplate />
                        UI Elements
                        {open ? <ChevronUp /> : <ChevronDown />}
                      </NavLink>
                      {/* <!-- Dropdown Menu Start --> */}
                      <div
                        className={cn("translate transform overflow-hidden", {
                          hidden: !open,
                        })}
                      >
                        <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                          <li>
                            <NavLink
                              to="/admin/ui/buttons"
                              end
                              className={({ isActive }) =>
                                cn(
                                  "text-muted-foreground hover:text-accent group relative flex items-center gap-2.5 rounded-md px-4 font-medium duration-300 ease-in-out",
                                  { "text-accent!": isActive },
                                )
                              }
                            >
                              Buttons
                            </NavLink>
                          </li>
                        </ul>
                      </div>
                      {/* <!-- Dropdown Menu End --> */}
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>
              {/* <!-- Menu Item Ui Elements --> */}
            </ul>
          </div>
        </nav>
        {/* <!-- Sidebar Menu --> */}
      </div>
    </aside>
  );
};

export default Sidebar;
