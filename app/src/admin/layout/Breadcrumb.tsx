interface BreadcrumbProps {
  pageName: string;
  showTitle?: boolean;
  showNavigation?: boolean;
}
const Breadcrumb = ({ pageName, showTitle = true, showNavigation = true }: BreadcrumbProps) => {
  if (!showTitle && !showNavigation) {
    return null;
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${
        showTitle ? "mb-6 gap-3" : "mb-2 gap-1"
      }`}
    >
      {showTitle ? <h2 className="text-title-md2 text-foreground font-semibold">{pageName}</h2> : null}

      {showNavigation ? (
        <nav>
          <ul className="flex items-center gap-1">
            <li className="font-medium">{pageName}</li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
};

export default Breadcrumb;
