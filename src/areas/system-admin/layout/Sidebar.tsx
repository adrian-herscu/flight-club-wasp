import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  School,
  Sheet,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import * as operations from "wasp/client/operations";
import DarkModeSwitcher from "../../../client/components/DarkModeSwitcher";
import { LanguageSelector } from "../../../client/components/LanguageSelector";
import { DevLoginMenu } from "../../../client/components/NavBar/DevLoginMenu";
import {
  SchoolContextBadgeBox,
  SchoolContextBadgeContainer,
  SchoolLabel,
  SchoolNameText,
  SidebarLogoImage,
  SidebarAccountControlsSection,
  SidebarAccountControlsStack,
  SidebarAccountIdentityText,
  SidebarMobileBackdrop,
} from "../../../client/components/patterns/AdminSidebarPatterns";
import { useManagedSchoolSelection } from "../../../features/school-context/useManagedSchoolSelection";
import { useInstructorSchoolSelection } from "../../../features/school-context/useInstructorSchoolSelection";
import { useStudentSchoolSelection } from "../../../features/school-context/useStudentSchoolSelection";
import {
  SidebarRoot,
  SidebarHeader,
  SidebarContent,
  SidebarNav,
  NavMenuSection,
  NavItem,
} from "../../../client/components/patterns/AdminSidebarPatterns";
import { getRoleKeyFromPath } from "../../../shared/roles";
import {
  DASHBOARD_NAV_ITEMS_BY_ROLE,
  type DashboardNavIconKey,
} from "../../../shared/navigation/dashboardNavigation";
import { UserMenuItems } from "../../account/profile/UserMenuItems";

const { getMyManagedSchool, getInstructorSchools, getStudentSchools, useQuery } = operations as any;

type ManagedSchoolSummary = {
  id: string;
  name: string;
};

type InstructorSchoolSummary = {
  id: string;
  name: string;
};

type StudentSchoolSummary = {
  id: string;
  name: string;
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDesktop: boolean;
  user: AuthUser;
}

const SchoolContextBadge = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(getMyManagedSchool);
  const schools = (data as ManagedSchoolSummary[] | undefined) ?? [];
  const { selectedSchool, selectedSchoolId, setSelectedSchoolId } = useManagedSchoolSelection(schools);
  const currentSchoolName = selectedSchool?.name;

  const handleSchoolSelectorKeyDown = (event: React.KeyboardEvent<HTMLSelectElement>) => {
    if (schools.length < 2) {
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();

    const currentIndex = schools.findIndex((school) => school.id === selectedSchoolId);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (safeCurrentIndex + delta + schools.length) % schools.length;
    setSelectedSchoolId(schools[nextIndex].id);
  };

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
          <select
            aria-label={t("school.selectManagedSchool")}
            value={selectedSchoolId ?? ""}
            onChange={(event) => setSelectedSchoolId(event.target.value)}
            onKeyDown={handleSchoolSelectorKeyDown}
            style={{
              marginTop: "0.25rem",
              height: "2rem",
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--background))",
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        ) : (
          <SchoolNameText>{currentSchoolName}</SchoolNameText>
        )}
      </SchoolContextBadgeBox>
    </SchoolContextBadgeContainer>
  );
};

const InstructorSchoolContextBadge = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(getInstructorSchools);
  const schools = (data as InstructorSchoolSummary[] | undefined) ?? [];
  const { selectedSchool, selectedSchoolId, setSelectedSchoolId } =
    useInstructorSchoolSelection(schools);
  const currentSchoolName = selectedSchool?.name;

  const handleSchoolSelectorKeyDown = (event: React.KeyboardEvent<HTMLSelectElement>) => {
    if (schools.length < 2) {
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const currentIndex = schools.findIndex((school) => school.id === selectedSchoolId);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (safeCurrentIndex + delta + schools.length) % schools.length;
    setSelectedSchoolId(schools[nextIndex].id);
  };

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
          <select
            aria-label={t("school.selectManagedSchool")}
            value={selectedSchoolId ?? ""}
            onChange={(event) => setSelectedSchoolId(event.target.value)}
            onKeyDown={handleSchoolSelectorKeyDown}
            style={{
              marginTop: "0.25rem",
              height: "2rem",
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--background))",
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        ) : (
          <SchoolNameText>{currentSchoolName}</SchoolNameText>
        )}
      </SchoolContextBadgeBox>
    </SchoolContextBadgeContainer>
  );
};

const StudentSchoolContextBadge = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(getStudentSchools);
  const schools = (data as StudentSchoolSummary[] | undefined) ?? [];
  const { selectedSchool, selectedSchoolId, setSelectedSchoolId } =
    useStudentSchoolSelection(schools);
  const currentSchoolName = selectedSchool?.name;

  const handleSchoolSelectorKeyDown = (event: React.KeyboardEvent<HTMLSelectElement>) => {
    if (schools.length < 2) {
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const currentIndex = schools.findIndex((school) => school.id === selectedSchoolId);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (safeCurrentIndex + delta + schools.length) % schools.length;
    setSelectedSchoolId(schools[nextIndex].id);
  };

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
          <select
            aria-label={t("school.selectManagedSchool")}
            value={selectedSchoolId ?? ""}
            onChange={(event) => setSelectedSchoolId(event.target.value)}
            onKeyDown={handleSchoolSelectorKeyDown}
            style={{
              marginTop: "0.25rem",
              height: "2rem",
              width: "100%",
              borderRadius: "0.375rem",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--background))",
              paddingLeft: "0.5rem",
              paddingRight: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        ) : (
          <SchoolNameText>{currentSchoolName}</SchoolNameText>
        )}
      </SchoolContextBadgeBox>
    </SchoolContextBadgeContainer>
  );
};

const DASHBOARD_NAV_ICON_MAP: Record<DashboardNavIconKey, React.ComponentType<{ style?: React.CSSProperties }>> = {
  dashboard: LayoutDashboard,
  users: Sheet,
  schools: School,
  courses: BookOpen,
  syllabuses: GraduationCap,
  instructorRequests: ClipboardList,
  studentRequests: ClipboardList,
};

const Sidebar = ({ sidebarOpen, setSidebarOpen, isDesktop, user }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { pathname } = location;

  const roleFromPath = getRoleKeyFromPath(pathname);

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

  const navItems = roleFromPath ? (DASHBOARD_NAV_ITEMS_BY_ROLE[roleFromPath] ?? []) : [];
  const currentUser = user as AuthUser & {
    fullName?: string | null;
    email?: string | null;
  };

  return (
    <>
      {!isDesktop && sidebarOpen && (
        <SidebarMobileBackdrop
          ariaLabel={t("common.close")}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <SidebarRoot
        isDesktop={isDesktop}
        sidebarOpen={sidebarOpen}
      >
      <SidebarHeader>
        <NavLink to="/" style={!isDesktop ? { marginInlineStart: "auto" } : undefined}>
          <SidebarLogoImage src="/favicon.svg" alt="Flight Club" />
        </NavLink>
      </SidebarHeader>

      {roleFromPath === "SCHOOL_MANAGER" && <SchoolContextBadge />}
  {roleFromPath === "INSTRUCTOR" && <InstructorSchoolContextBadge />}
      {roleFromPath === "STUDENT" && <StudentSchoolContextBadge />}

      <SidebarContent>
        <SidebarNav>
          {/* Main menu */}
          <NavMenuSection
            title={
              t("nav.menu")
            }
          >
              {navItems.map((item) => {
                const Icon = DASHBOARD_NAV_ICON_MAP[item.iconKey];
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

          {!isDesktop && (
            <>
              <NavMenuSection title={t("common.user")}
              >
                <NavItem>
                  <SidebarAccountIdentityText>
                    {currentUser.fullName ?? currentUser.email ?? t("common.user")}
                  </SidebarAccountIdentityText>
                </NavItem>
                <UserMenuItems
                  user={user}
                  includeDashboard={false}
                  onItemClick={() => setSidebarOpen(false)}
                />
              </NavMenuSection>

              <SidebarAccountControlsSection>
                <SidebarAccountControlsStack>
                  <LanguageSelector />
                  <DarkModeSwitcher />
                  <DevLoginMenu />
                </SidebarAccountControlsStack>
              </SidebarAccountControlsSection>
            </>
          )}
        </SidebarNav>
      </SidebarContent>
      </SidebarRoot>
    </>
  );
};

export default Sidebar;
