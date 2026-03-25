import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  AdminLayoutRoot,
  AdminMainContent,
  AdminMainContentInner,
  AdminTwoColumnLayout,
} from "../../client/components/patterns/AdminLayoutPatterns";
import { isDashboardPath } from "../../shared/roles";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

const DefaultLayout: FC<Props> = ({ children, user }) => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const updateDesktopState = () => setIsDesktop(mediaQuery.matches);

    updateDesktopState();
    mediaQuery.addEventListener("change", updateDesktopState);

    return () => {
      mediaQuery.removeEventListener("change", updateDesktopState);
    };
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setMobileSidebarOpen(false);
    }
  }, [isDesktop]);

  const sidebarOpen = useMemo(() => isDesktop || mobileSidebarOpen, [isDesktop, mobileSidebarOpen]);

  // Guard /system-admin paths to system admins only.
  if (pathname.startsWith("/system-admin") && !user.isSystemAdmin) {
    return <Navigate to="/" replace />;
  }

  // All dashboard paths require authentication (enforced by Wasp authRequired).
  // Non-dashboard paths should not render this layout at all.
  if (!isDashboardPath(pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminLayoutRoot>
      <AdminTwoColumnLayout>
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setMobileSidebarOpen}
          isDesktop={isDesktop}
        />
        <AdminMainContent reserveSidebarSpace={isDesktop}>
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setMobileSidebarOpen}
            isDesktop={isDesktop}
            user={user}
          />
          <AdminMainContentInner>{children}</AdminMainContentInner>
        </AdminMainContent>
      </AdminTwoColumnLayout>
    </AdminLayoutRoot>
  );
};

export default DefaultLayout;
