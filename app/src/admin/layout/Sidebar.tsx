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
import {
  SchoolContextBadgeBox,
  SchoolContextBadgeContainer,
  SchoolLabel,
  SchoolNameText,
  SidebarLogoImage,
  SidebarToggleButton,
} from "../../client/components/patterns/AdminSidebarPatterns";
import { useManagedSchoolSelection } from "../../school-manager/useManagedSchoolSelection";
import {
  SidebarRoot,
  SidebarHeader,
  SidebarContent,
  SidebarNav,
  NavMenuSection,
  NavItem,
} from "../../client/components/patterns/AdminSidebarPatterns";

const { getMyManagedSchool, useQuery } = operations as any;

type ManagedSchoolSummary = {
  id: string;
  name: string;
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  userRole: string | null;
  isDesktop: boolean;
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
    <SchoolContextBadgeContainer>
      <SchoolContextBadgeBox>
        <SchoolLabel>{t("admin.mySchool")}</SchoolLabel>
        {isLoading ? (
          <SchoolNameText>{t("admin.loading")}</SchoolNameText>
        ) : schools.length > 1 ? (
          <Select value={selectedSchoolId ?? ""} onValueChange={setSelectedSchoolId}>
            <SelectTrigger style={{ marginTop: "0.25rem", height: "2rem", fontSize: "0.75rem", position: "relative", zIndex: 50 }}>
              <SelectValue placeholder={t("school.selectManagedSchool")} />
            </SelectTrigger>
            <SelectContent side="bottom" align="start" style={{ zIndex: 10000 }}>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <SchoolNameText>{currentSchoolName}</SchoolNameText>
        )}
      </SchoolContextBadgeBox>
    </SchoolContextBadgeContainer>
  );
};

type SidebarEntry = {
  nameKey: string;
  to: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  matchPrefix?: string;
};

const SIDEBAR_NAV: { [role: string]: SidebarEntry[] } = {
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

const Sidebar = ({ sidebarOpen, setSidebarOpen, userRole, isDesktop }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef(null as HTMLButtonElement | null);
  const sidebar = useRef(null as HTMLElement | null);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true",
  );

  const navItemBaseStyle: React.CSSProperties = {
    color: "hsl(var(--muted-foreground))",
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    borderRadius: "0.125rem",
    paddingLeft: "1rem",
    paddingRight: "1rem",
    paddingTop: "0.5rem",
    paddingBottom: "0.5rem",
    fontWeight: 500,
    transition: "all 0.3s ease-in-out",
  };

  const getNavItemClassName = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
    ...navItemBaseStyle,
    ...(isActive && {
      backgroundColor: "hsl(var(--accent))",
      color: "hsl(var(--accent-foreground))",
    }),
  });

  const getNavItemClassNameForPrefix = (matchesPrefix: boolean): React.CSSProperties => ({
    ...navItemBaseStyle,
    ...(matchesPrefix && {
      backgroundColor: "hsl(var(--accent))",
      color: "hsl(var(--accent-foreground))",
    }),
  });

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (isDesktop) return;

      const targetNode = target as Node | null;
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(targetNode) ||
        trigger.current.contains(targetNode)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  }, [isDesktop, sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (isDesktop) return;
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  }, [isDesktop, sidebarOpen, setSidebarOpen]);

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
    <SidebarRoot
      ref={sidebar}
      style={{
        backgroundColor: "hsl(var(--muted))",
        position: "absolute",
        top: 0,
        zIndex: 9999,
        display: "flex",
        height: "100vh",
        width: "18.125rem",
        flexDirection: "column",
        overflowY: "hidden",
        transition: "all 0.3s ease-in-out",
        borderColor: "hsl(var(--border))",
      }}
      sidebarOpen={sidebarOpen}
    >
      <SidebarHeader>
        <NavLink to="/">
          <SidebarLogoImage src="/favicon.svg" alt="Flight Club" />
        </NavLink>
        {!isDesktop && (
          <SidebarToggleButton
            ref={trigger}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            controls="sidebar"
            expanded={sidebarOpen}
          >
            <X />
          </SidebarToggleButton>
        )}
      </SidebarHeader>

      {userRole === "SCHOOL_MANAGER" && <SchoolContextBadge />}

      <SidebarContent>
        <SidebarNav>
          {/* Main menu */}
          <NavMenuSection
            title={
              t("nav.menu")
            }
          >
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavItem key={item.to}>
                    <NavLink
                      to={item.to}
                      end={!item.matchPrefix}
                      style={({ isActive }) => {
                        if (item.matchPrefix) {
                          const matchesPrefix =
                            pathname === item.matchPrefix ||
                            pathname.startsWith(item.matchPrefix + "/") ||
                            pathname.startsWith(item.matchPrefix + "?");
                          return getNavItemClassNameForPrefix(matchesPrefix);
                        }
                        return getNavItemClassName({ isActive });
                      }}
                    >
                      <Icon />
                      {t(item.nameKey)}
                    </NavLink>
                  </NavItem>
                );
              })}
          </NavMenuSection>
        </SidebarNav>
      </SidebarContent>
    </SidebarRoot>
  );
};

export default Sidebar;
