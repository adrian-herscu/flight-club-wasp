import { FC, ReactNode, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { type AuthUser } from "wasp/auth";
import { isDashboardPath } from "../../shared/roles";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

const DefaultLayout: FC<Props> = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();

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
    <div className="bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            user={user}
          />
          <main>
            <div className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6 2xl:p-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default DefaultLayout;
