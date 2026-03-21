import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  School,
  Sheet,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router";
import * as operations from "wasp/client/operations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../client/components/ui/select";
import Logo from "../../client/static/logo.webp";
import { cn } from "../../client/utils";
import { useManagedSchoolSelection } from "../../school-manager/useManagedSchoolSelection";

const { getMyManagedSchool, useQuery } = operations as any;

type ManagedSchoolSummary = {
  id: string;
  name: string;
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  userRole: string | null;
}

const SchoolContextBadge = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(getMyManagedSchool);
  const schools = (data as ManagedSchoolSummary[] | undefined) ?? [];
  const { selectedSchool, selectedSchoolId, setSelectedSchoolId } = useManagedSchoolSelection(schools);
  const currentSchoolName = selectedSchool?.name;

  if (!isLoading && !currentSchoolName) {
    return null;
  }

  return (
    <div className="px-6 pb-2">
      <div className="rounded-md border bg-background/60 px-3 py-2">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {t("admin.mySchool")}
        </p>
        {isLoading ? (
          <p className="text-sm font-semibold">{t("admin.loading")}</p>
        ) : schools.length > 1 ? (
          <Select value={selectedSchoolId ?? ""} onValueChange={setSelectedSchoolId}>
            <SelectTrigger className="mt-1 h-8 text-xs relative z-50">
              <SelectValue placeholder={t("school.selectManagedSchool")} />
            </SelectTrigger>
            <SelectContent side="bottom" align="start" className="z-10000">
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm font-semibold">{currentSchoolName}</p>
        )}
      </div>
    </div>
  );
};

type NavItem = {
  nameKey: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
};

const SIDEBAR_NAV: Record<string, NavItem[]> = {
  SYSTEM_ADMIN: [
    { nameKey: "admin.dashboard", to: "/system-admin", icon: LayoutDashboard },
    { nameKey: "admin.users", to: "/system-admin/users", icon: Sheet },
    { nameKey: "admin.schools", to: "/system-admin/school-requests", icon: ClipboardList },
    {
      nameKey: "admin.syllabuses",
      to: "/system-admin/syllabuses?section=catalog",
      icon: GraduationCap,
      matchPrefix: "/system-admin/syllabuses",
    },
  ],
  SCHOOL_MANAGER: [
    { nameKey: "admin.dashboard", to: "/school-manager", icon: LayoutDashboard },
    {
      nameKey: "admin.filterInstructors",
      to: "/school-manager/member-requests/instructors",
      icon: ClipboardList,
    },
    {
      nameKey: "admin.filterStudents",
      to: "/school-manager/member-requests/students",
      icon: ClipboardList,
    },
    { nameKey: "admin.schools", to: "/school-manager/school", icon: School },
    {
      nameKey: "admin.courses",
      to: "/school-manager/courses",
      icon: BookOpen,
      matchPrefix: "/school-manager/courses",
    },
    {
      nameKey: "admin.syllabuses",
      to: "/school-manager/syllabuses?section=catalog",
      icon: GraduationCap,
      matchPrefix: "/school-manager/syllabuses",
    },
  ],
  INSTRUCTOR: [
    { nameKey: "admin.dashboard", to: "/instructor", icon: LayoutDashboard },
  ],
  STUDENT: [
    { nameKey: "admin.dashboard", to: "/student", icon: LayoutDashboard },
  ],
};

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
    cn(navItemBaseClass, { "bg-accent text-accent-foreground": isActive });

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

  const navItems = userRole ? (SIDEBAR_NAV[userRole] ?? []) : [];

  return (
    <aside
      ref={sidebar}
      className={cn(
        "bg-muted absolute top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden duration-300 ease-linear lg:static lg:translate-x-0",
        {
          "ltr:left-0 rtl:right-0 border-e ltr:translate-x-0 rtl:translate-x-0": sidebarOpen,
          "ltr:left-0 rtl:right-0 ltr:border-e rtl:border-s max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full":
            !sidebarOpen,
        },
      )}
    >
      {/* SIDEBAR HEADER */}
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

      {userRole === "SCHOOL_MANAGER" && <SchoolContextBadge />}

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mt-5 px-4 py-4 lg:mt-9 lg:px-6">
          {/* Main menu */}
          <div>
            <h3 className="text-muted-foreground mb-4 ms-4 text-sm font-semibold">
              {t("nav.menu")}
            </h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={!item.matchPrefix}
                    className={
                      item.matchPrefix
                        ? () =>
                            cn(navItemBaseClass, {
                              "bg-accent text-accent-foreground":
                                pathname === item.matchPrefix ||
                                pathname.startsWith(item.matchPrefix + "/") ||
                                pathname.startsWith(item.matchPrefix + "?"),
                            })
                        : navItemClassName
                    }
                  >
                    <item.icon />
                    {t(item.nameKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
