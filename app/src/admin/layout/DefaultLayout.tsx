import { FC, ReactNode, useState } from "react";
import { Navigate } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  AdminLayoutRoot,
  AdminMainContent,
  AdminMainContentInner,
  AdminTwoColumnLayout,
} from "../../client/components/patterns/AdminLayoutPatterns";
import { hasDashboardAccess } from "../../shared/roles";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface Props {
  user: AuthUser;
  children?: ReactNode;
}

const DefaultLayout: FC<Props> = ({ children, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!hasDashboardAccess(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AdminLayoutRoot>
      <AdminTwoColumnLayout>
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userRole={user.role ?? null}
        />
        <AdminMainContent>
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            user={user}
          />
          <AdminMainContentInner>{children}</AdminMainContentInner>
        </AdminMainContent>
      </AdminTwoColumnLayout>
    </AdminLayoutRoot>
  );
};

export default DefaultLayout;
