import { Link as WaspRouterLink, routes } from "wasp/client/router";
interface BreadcrumbProps {
  pageName: string;
  showTitle?: boolean;
}
const Breadcrumb = ({ pageName, showTitle = true }: BreadcrumbProps) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${
        showTitle ? "mb-6 gap-3" : "mb-2 gap-1"
      }`}
    >
      {showTitle ? <h2 className="text-title-md2 text-foreground font-semibold">{pageName}</h2> : null}

      <nav>
        <ul className="flex items-center gap-1">
          <li>
            <WaspRouterLink to={routes.AdminRoute.to}>Dashboard</WaspRouterLink>
          </li>
          <li>/</li>
          <li className="font-medium">{pageName}</li>
        </ul>
      </nav>
    </div>
  );
};

export default Breadcrumb;
